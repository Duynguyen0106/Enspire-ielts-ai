import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { AttemptStatus, SkillName } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { enforceAiRateLimit, jsonError, requireApiUser } from "@/lib/api";
import { placementSubmitBodySchema } from "@/lib/ai/schemas";
import {
  averageOverallBand,
  levelFromBand,
  rawToBand,
} from "@/lib/ielts-scoring";
import { evaluateWriting } from "@/lib/ai/evaluate-writing";
import {
  evaluateSpeaking,
  transcribeAudioBase64,
} from "@/lib/ai/evaluate-speaking";
import { generatePlacementSummary } from "@/lib/ai/placement-summary";
import { estimateFluencyFromTranscript, storeAudio, decodeBase64Audio } from "@/lib/audio";
import { grantUnlock } from "@/lib/unlock";

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function normalizeAnswer(value: unknown): string {
  const record = asRecord(value);
  const answer = record.answer ?? record.text ?? record.value ?? value;
  return String(answer ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export async function POST(req: Request) {
  const { user, error } = await requireApiUser();
  if (error || !user) return error!;

  const limited = await enforceAiRateLimit(user.id);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Dữ liệu không hợp lệ.");
  }

  const parsed = placementSubmitBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.");
  }

  const attempt = await prisma.testAttempt.findFirst({
    where: {
      id: parsed.data.attemptId,
      userId: user.id,
      status: AttemptStatus.IN_PROGRESS,
    },
    include: {
      test: {
        include: {
          sections: {
            orderBy: { order: "asc" },
            include: {
              skill: true,
              questions: { orderBy: { order: "asc" } },
            },
          },
        },
      },
    },
  });

  if (!attempt) {
    return jsonError("Không tìm thấy bài làm đang diễn ra.", 404);
  }

  const attemptId = attempt.id;
  const testSections = attempt.test.sections;

  // Persist submitted answers
  for (const item of parsed.data.answers) {
    const belongs = testSections.some((s) =>
      s.questions.some((q) => q.id === item.questionId)
    );
    if (!belongs) continue;

    await prisma.answer.upsert({
      where: {
        attemptId_questionId: {
          attemptId,
          questionId: item.questionId,
        },
      },
      update: {
        userResponseJson: item.userResponseJson as Prisma.InputJsonValue,
      },
      create: {
        attemptId,
        questionId: item.questionId,
        userResponseJson: item.userResponseJson as Prisma.InputJsonValue,
      },
    });
  }

  const allAnswers = await prisma.answer.findMany({
    where: { attemptId },
  });
  const answerByQ = new Map(
    allAnswers.map((a) => [a.questionId, a.userResponseJson])
  );

  const sectionBySkill = Object.fromEntries(
    testSections.map((s) => [s.skill.name, s])
  ) as Partial<Record<SkillName, (typeof testSections)[number]>>;

  // ---- Listening & Reading auto-score ----
  async function scoreObjective(skill: "LISTENING" | "READING") {
    const section = sectionBySkill[skill];
    if (!section) return { band: 0, raw: 0, total: 0 };

    let raw = 0;
    const total = section.questions.length;
    for (const q of section.questions) {
      const userAns = normalizeAnswer(answerByQ.get(q.id));
      const correct = normalizeAnswer(q.correctAnswerJson);
      const isCorrect = userAns.length > 0 && userAns === correct;
      if (isCorrect) raw += 1;
      await prisma.answer.updateMany({
        where: { attemptId, questionId: q.id },
        data: {
          isCorrect,
          awardedPoints: isCorrect ? q.points : 0,
        },
      });
    }
    return {
      band: rawToBand(skill, raw, total),
      raw,
      total,
    };
  }

  const listening = await scoreObjective("LISTENING");
  const reading = await scoreObjective("READING");

  // ---- Writing ----
  const writingSection = sectionBySkill.WRITING;
  const writingQuestion = writingSection?.questions[0];
  const writingContent = asRecord(writingQuestion?.contentJson);
  const writingResponse = asRecord(answerByQ.get(writingQuestion?.id ?? ""));
  const writingText = String(writingResponse.text ?? writingResponse.answer ?? "");
  const writingEval = await evaluateWriting({
    text: writingText || "(empty)",
    taskPrompt: String(writingContent.taskPrompt ?? ""),
    taskType: "task2",
    minWords: Number(writingContent.minWords ?? 200),
    level: user.profile?.currentLevel,
    userId: user.id,
    attemptId: attempt.id,
    skillId: writingSection?.skillId,
  });

  // ---- Speaking ----
  const speakingSection = sectionBySkill.SPEAKING;
  const speakingQuestions = speakingSection?.questions ?? [];
  const speakingParts = speakingQuestions.map((q) => {
    const content = asRecord(q.contentJson);
    const response = asRecord(answerByQ.get(q.id));
    return {
      part: content.part ?? q.order,
      questions: Array.isArray(content.questions)
        ? (content.questions as string[])
        : [],
      transcript: String(response.transcript ?? ""),
    };
  });

  let speakingTranscript = speakingParts
    .map((p) => p.transcript)
    .filter(Boolean)
    .join("\n\n");

  if (parsed.data.speakingAudioBase64) {
    try {
      const bytes = decodeBase64Audio(parsed.data.speakingAudioBase64);
      await storeAudio({
        bytes,
        contentType: "audio/webm",
        extension: "webm",
      });
      const whisperText = await transcribeAudioBase64(
        parsed.data.speakingAudioBase64
      );
      if (whisperText.trim()) {
        speakingTranscript = [speakingTranscript, whisperText]
          .filter(Boolean)
          .join("\n\n");
      }
    } catch {
      // keep existing transcript from client if whisper fails
    }
  }

  if (!speakingTranscript.trim()) {
    speakingTranscript =
      "(Học viên không cung cấp transcript hoặc audio Speaking.)";
  }

  const fluency = estimateFluencyFromTranscript(speakingTranscript);
  const allSpeakingQs = speakingParts.flatMap((p) => p.questions);
  const speakingEval = await evaluateSpeaking({
    transcript: speakingTranscript,
    part: "placement",
    questions:
      allSpeakingQs.length > 0
        ? allSpeakingQs
        : ["Placement speaking response"],
    level: user.profile?.currentLevel,
    wordsPerMinute: fluency.wordsPerMinute,
    pauseCount: fluency.pauseCount,
    userId: user.id,
    attemptId: attempt.id,
    skillId: speakingSection?.skillId,
  });

  const overallBand = averageOverallBand([
    listening.band,
    reading.band,
    writingEval.overallBand,
    speakingEval.overallBand,
  ]);
  const recommendedLevel = levelFromBand(overallBand);

  const summary = await generatePlacementSummary({
    listeningBand: listening.band,
    readingBand: reading.band,
    writingBand: writingEval.overallBand,
    speakingBand: speakingEval.overallBand,
    overallBand,
    recommendedLevel,
    userId: user.id,
    attemptId: attempt.id,
  });

  const rawScoreJson = {
    listening,
    reading,
    writing: writingEval,
    speaking: speakingEval,
    skillNotes: summary.skillNotes,
  };

  const placementResult = await prisma.$transaction(async (tx) => {
    await tx.testAttempt.update({
      where: { id: attempt.id },
      data: {
        status: AttemptStatus.SCORED,
        submittedAt: new Date(),
        overallBand,
        rawScoreJson: rawScoreJson as unknown as Prisma.InputJsonValue,
      },
    });

    await tx.profile.update({
      where: { userId: user.id },
      data: {
        placementCompleted: true,
        currentLevel: recommendedLevel,
      },
    });

    return tx.placementResult.upsert({
      where: { userId: user.id },
      update: {
        attemptId: attempt.id,
        listeningBand: listening.band,
        readingBand: reading.band,
        writingBand: writingEval.overallBand,
        speakingBand: speakingEval.overallBand,
        overallBand,
        recommendedLevel,
        strengthsJson: summary.strengths as unknown as Prisma.InputJsonValue,
        weaknessesJson: summary.weaknesses as unknown as Prisma.InputJsonValue,
        summaryVi: summary.summaryVi,
      },
      create: {
        userId: user.id,
        attemptId: attempt.id,
        listeningBand: listening.band,
        readingBand: reading.band,
        writingBand: writingEval.overallBand,
        speakingBand: speakingEval.overallBand,
        overallBand,
        recommendedLevel,
        strengthsJson: summary.strengths as unknown as Prisma.InputJsonValue,
        weaknessesJson: summary.weaknesses as unknown as Prisma.InputJsonValue,
        summaryVi: summary.summaryVi,
      },
    });
  });

  for (let n = 1; n <= recommendedLevel; n++) {
    await grantUnlock(user.id, n, "PLACEMENT");
  }

  return NextResponse.json({ placementResultId: placementResult.id });
}
