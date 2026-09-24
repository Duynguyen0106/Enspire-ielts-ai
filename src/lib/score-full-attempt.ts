import type { Prisma, WritingTaskType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  evaluatePassing,
  parsePassingRules,
  rawToBand20,
  roundBand,
} from "@/lib/ielts-scoring";
import { evaluateWritingGym } from "@/lib/ai/writing-gym";
import { evaluateSpeakingGym } from "@/lib/ai/speaking-gym";
import { grantUnlock } from "@/lib/unlock";
import { ensureProgressRow } from "@/lib/lesson-progress";

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

function normalizeAnswer(v: unknown): string {
  if (typeof v === "string") return v.trim().toLowerCase();
  if (v && typeof v === "object") {
    const r = v as Record<string, unknown>;
    if (typeof r.answer === "string") return r.answer.trim().toLowerCase();
    if (typeof r.value === "string") return r.value.trim().toLowerCase();
  }
  return "";
}

export async function scoreFullLevelAttempt(attemptId: string): Promise<void> {
  const attempt = await prisma.testAttempt.findUnique({
    where: { id: attemptId },
    include: {
      test: { include: { level: true, sections: { include: { skill: true, questions: true } } } },
      answers: true,
    },
  });

  if (!attempt) throw new Error("Attempt not found");
  if (
    attempt.test.type !== "FULL_LEVEL" &&
    attempt.test.type !== "PRACTICE_EXAM"
  ) {
    throw new Error("Not a full exam attempt");
  }
  const isPracticeExam = attempt.test.type === "PRACTICE_EXAM";

  // Idempotency: already scored
  if (attempt.scoringStatus === "SCORED" && attempt.status === "SCORED") {
    return;
  }

  await prisma.testAttempt.update({
    where: { id: attemptId },
    data: { scoringStatus: "SCORING" },
  });

  try {
    const levelNumber = attempt.test.level?.number ?? 1;
    const answersByQ = new Map(
      attempt.answers.map((a) => [a.questionId, a])
    );

    let listeningRaw = 0;
    let listeningTotal = 0;
    let readingRaw = 0;
    let readingTotal = 0;

    for (const section of attempt.test.sections) {
      const skill = section.skill.name;
      if (skill !== "LISTENING" && skill !== "READING") continue;

      for (const q of section.questions) {
        if (skill === "LISTENING") listeningTotal += 1;
        else readingTotal += 1;

        const ans = answersByQ.get(q.id);
        const userAns = normalizeAnswer(ans?.userResponseJson);
        const correct = normalizeAnswer(q.correctAnswerJson);
        const isCorrect = userAns.length > 0 && userAns === correct;
        if (isCorrect) {
          if (skill === "LISTENING") listeningRaw += 1;
          else readingRaw += 1;
        }
        if (ans) {
          await prisma.answer.update({
            where: { id: ans.id },
            data: {
              isCorrect,
              awardedPoints: isCorrect ? q.points : 0,
            },
          });
        }
      }
    }

    const listeningBand = rawToBand20(
      "LISTENING",
      listeningTotal ? listeningRaw : 0
    );
    const readingBand = rawToBand20(
      "READING",
      readingTotal ? readingRaw : 0
    );

    // Writing: average of Task 1 + Task 2 from answers / submissions
    const writingSection = attempt.test.sections.find(
      (s) => s.skill.name === "WRITING"
    );
    const writingBands: number[] = [];
    const writingFeedback: unknown[] = [];

    if (writingSection) {
      for (const q of writingSection.questions) {
        const content = asRecord(q.contentJson);
        const ans = answersByQ.get(q.id);
        const resp = asRecord(ans?.userResponseJson);
        const essayText =
          typeof resp.essayText === "string"
            ? resp.essayText
            : typeof resp.text === "string"
              ? resp.text
              : typeof resp.answer === "string"
                ? resp.answer
                : "";
        const taskType = (typeof content.taskType === "string"
          ? content.taskType
          : "TASK2") as WritingTaskType;
        const prompt =
          typeof content.prompt === "string"
            ? content.prompt
            : typeof content.promptText === "string"
              ? content.promptText
              : "Write an essay.";

        if (essayText.trim().length >= 20) {
          const evaluation = await evaluateWritingGym({
            text: essayText,
            taskPrompt: prompt,
            taskType,
            level: levelNumber,
            userId: attempt.userId,
          });
          writingBands.push(evaluation.overallBand);
          writingFeedback.push({
            questionId: q.id,
            taskType,
            evaluation,
          });
          await prisma.aIFeedback.create({
            data: {
              userId: attempt.userId,
              attemptId,
              kind: "FULL_TEST_WRITING",
              model: "writing-gym",
              promptHash: `${attemptId}:${q.id}`,
              responseJson: evaluation as unknown as Prisma.InputJsonValue,
            },
          });
        } else {
          writingBands.push(3.0);
          writingFeedback.push({
            questionId: q.id,
            taskType,
            evaluation: { overallBand: 3.0, note: "Bài quá ngắn hoặc trống." },
          });
        }
      }
    }

    const writingBand =
      writingBands.length > 0
        ? roundBand(
            writingBands.reduce((a, b) => a + b, 0) / writingBands.length
          )
        : 3.0;

    // Speaking: reuse session linked by attemptId, or score from answers
    let speakingBand = 3.0;
    let speakingFeedback: unknown = null;

    const speakingSession = await prisma.speakingSession.findFirst({
      where: { attemptId, userId: attempt.userId },
      include: { turns: true, evaluation: true },
      orderBy: { startedAt: "desc" },
    });

    if (speakingSession?.evaluation) {
      speakingBand = speakingSession.evaluation.overallBand;
      speakingFeedback = speakingSession.evaluation;
    } else if (speakingSession) {
      const result = await evaluateSpeakingGym({
        userId: attempt.userId,
        sessionId: speakingSession.id,
        sessionType: "FULL_TEST",
        level: levelNumber,
      });
      speakingBand = result.evaluation.overallBand;
      speakingFeedback = result.evaluation;
    } else {
      // Fallback: typed transcripts stored on speaking questions
      const speakingSection = attempt.test.sections.find(
        (s) => s.skill.name === "SPEAKING"
      );
      if (speakingSection) {
        const transcripts: string[] = [];
        for (const q of speakingSection.questions) {
          const ans = answersByQ.get(q.id);
          const resp = asRecord(ans?.userResponseJson);
          const t =
            typeof resp.transcript === "string"
              ? resp.transcript
              : typeof resp.answer === "string"
                ? resp.answer
                : "";
          if (t.trim()) transcripts.push(t.trim());
        }
        // Heuristic band from length/fillers when no session
        const joined = transcripts.join(" ");
        const words = joined.split(/\s+/).filter(Boolean).length;
        speakingBand = roundBand(
          Math.min(7.5, Math.max(3, 3 + words / 40))
        );
        speakingFeedback = {
          overallBand: speakingBand,
          note: "Chấm từ transcript gõ (không có phiên ghi âm).",
          transcripts,
        };
      }
    }

    const bands = {
      listening: listeningBand,
      reading: readingBand,
      writing: writingBand,
      speaking: speakingBand,
    };

    const rules = parsePassingRules(
      attempt.test.passingRulesJson,
      levelNumber
    );
    const { passed, overallBand, failedSkills } = evaluatePassing(bands, rules);

    const rawScoreJson = {
      listening: { raw: listeningRaw, total: listeningTotal || 20, band: listeningBand },
      reading: { raw: readingRaw, total: readingTotal || 20, band: readingBand },
      writing: { band: writingBand, tasks: writingFeedback },
      speaking: { band: speakingBand, detail: speakingFeedback },
      failedSkills,
      rules,
    } as Prisma.InputJsonValue;

    let unlockGranted = false;
    if (passed && !isPracticeExam && attempt.test.level) {
      if (levelNumber < 9) {
        await grantUnlock(attempt.userId, levelNumber + 1, "TEST_PASS");
        unlockGranted = true;
        const profile = await prisma.profile.findUnique({
          where: { userId: attempt.userId },
        });
        if (profile && profile.currentLevel === levelNumber) {
          await prisma.profile.update({
            where: { userId: attempt.userId },
            data: { currentLevel: levelNumber + 1 },
          });
        }
      } else {
        await prisma.profile.update({
          where: { userId: attempt.userId },
          data: {
            graduatedAt: new Date(),
            bestFullTestBand: overallBand,
          },
        });
        unlockGranted = true;
      }

      const skills = ["LISTENING", "READING", "WRITING", "SPEAKING"] as const;
      const level = attempt.test.level;
      for (const skill of skills) {
        const skillRow = await prisma.skill.findUnique({
          where: { name: skill },
        });
        if (!skillRow) continue;
        await ensureProgressRow({
          userId: attempt.userId,
          levelId: level.id,
          skillId: skillRow.id,
        });
        await prisma.progress.update({
          where: {
            userId_levelId_skillId: {
              userId: attempt.userId,
              levelId: level.id,
              skillId: skillRow.id,
            },
          },
          data: {
            checkpointPassed: true,
            lastActivityAt: new Date(),
          },
        });
      }
    }

    const profile = await prisma.profile.findUnique({
      where: { userId: attempt.userId },
    });
    if (
      profile &&
      (profile.bestFullTestBand == null ||
        overallBand > profile.bestFullTestBand)
    ) {
      await prisma.profile.update({
        where: { userId: attempt.userId },
        data: { bestFullTestBand: overallBand },
      });
    }

    await prisma.testAttempt.update({
      where: { id: attemptId },
      data: {
        status: "SCORED",
        scoringStatus: "SCORED",
        scoringError: null,
        passed,
        unlockGranted,
        overallBand,
        rawScoreJson,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Scoring failed";
    await prisma.testAttempt.update({
      where: { id: attemptId },
      data: {
        scoringStatus: "FAILED",
        scoringError: message,
      },
    });
    throw err;
  }
}
