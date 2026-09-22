import { generateObject } from "ai";
import type { Prisma, SpeakingSessionType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  EVAL_MODEL,
  getOpenAIProvider,
  hashPrompt,
  hasOpenAIKey,
  withTimeout,
} from "@/lib/ai/openai";
import {
  SPEAKING_EXAMINER_SYSTEM,
  buildSpeakingGymEvalPrompt,
} from "@/lib/ai/prompts";
import {
  speakingGymEvalSchema,
  type SpeakingGymEval,
} from "@/lib/ai/gym-schemas";

function heuristicSpeakingGym(input: {
  transcript: string;
  wpm: number;
  pauseCount: number;
  fillerCount: number;
}): SpeakingGymEval {
  const words = input.transcript.trim().split(/\s+/).filter(Boolean).length;
  const veryShort = words < 40;
  const base = veryShort ? 3.5 : words < 80 ? 4.5 : input.wpm > 90 ? 6.0 : 5.0;
  return {
    overallBand: base,
    criteria: {
      fluencyCoherence: {
        band: veryShort ? 3.0 : base,
        feedbackVi: veryShort
          ? "Câu trả lời quá ngắn — hãy mở rộng ý và liên kết."
          : `Độ lưu loát trung bình (≈${input.wpm} WPM, ${input.pauseCount} khoảng dừng, ${input.fillerCount} filler).`,
        metrics: {
          wpm: input.wpm,
          pauseCount: input.pauseCount,
          fillerCount: input.fillerCount,
        },
      },
      lexicalResource: {
        band: base,
        feedbackVi: "Từ vựng cơ bản; cần thêm cụm từ tự nhiên theo chủ đề.",
      },
      grammaticalRange: {
        band: Math.max(3, base - 0.5),
        feedbackVi: "Ngữ pháp đủ hiểu; giảm lỗi thì và mạo từ.",
      },
      pronunciation: {
        band: base,
        feedbackVi: "Ước lượng từ transcript — luyện trọng âm và nối âm.",
        noteVi:
          "Ước lượng từ transcript — không phải phân tích âm thanh thực.",
      },
    },
    corrections: [],
    strengthsVi: veryShort ? [] : ["Có ý trả lời đúng chủ đề"],
    nextSteps: [
      "Luyện trả lời Part 1 trong 20–40 giây.",
      "Giảm filler (um/uh/à/ừ).",
      "Dùng cấu trúc intro–detail–example.",
      "Ghi âm lại và nghe để tự sửa.",
    ],
    recommendedDrills: [
      {
        titleVi: "Shadowing 1 phút",
        descriptionVi: "Nghe và nhắc lại ngay một đoạn mẫu Part 1.",
        practiceUrl: "/practice/listening",
      },
      {
        titleVi: "Cue card 2 phút",
        descriptionVi: "Chọn 1 chủ đề Part 2 và nói liên tục 2 phút.",
        practiceUrl: "/speaking/practice/2",
      },
    ],
  };
}

export async function evaluateSpeakingGym(input: {
  userId: string;
  sessionId: string;
  sessionType: SpeakingSessionType;
  level: number;
}): Promise<{ evaluationId: string; evaluation: SpeakingGymEval }> {
  const session = await prisma.speakingSession.findFirst({
    where: { id: input.sessionId, userId: input.userId },
    include: { turns: { orderBy: { createdAt: "asc" } } },
  });
  if (!session) throw new Error("Không tìm thấy phiên Speaking.");
  if (session.turns.length === 0) {
    throw new Error("Chưa có câu trả lời nào để chấm.");
  }

  const transcript = session.turns
    .map((t, i) => `Q${i + 1} (Part ${t.part}): ${t.questionText}\nA: ${t.transcript}`)
    .join("\n\n");
  const questions = session.turns.map((t) => t.questionText);
  const avgWpm =
    session.turns.reduce((s, t) => s + t.wpm, 0) / session.turns.length;
  const pauseCount = session.turns.reduce((s, t) => s + t.pauseCount, 0);
  const fillerCount = session.turns.reduce((s, t) => s + t.fillerCount, 0);

  const userPrompt = buildSpeakingGymEvalPrompt({
    transcript,
    questions,
    level: input.level,
    wpm: Math.round(avgWpm),
    pauseCount,
    fillerCount,
    sessionType: input.sessionType,
  });
  const promptHash = hashPrompt(userPrompt);

  let result: SpeakingGymEval;
  let model = EVAL_MODEL;
  try {
    if (!hasOpenAIKey()) throw new Error("no key");
    const openai = getOpenAIProvider();
    const run = async () => {
      const { object } = await generateObject({
        model: openai(EVAL_MODEL),
        schema: speakingGymEvalSchema,
        system: SPEAKING_EXAMINER_SYSTEM,
        prompt: userPrompt,
        temperature: 0.1,
      });
      return object;
    };
    try {
      result = await withTimeout(run(), 45_000);
    } catch {
      result = await withTimeout(run(), 45_000);
    }
  } catch {
    model = "heuristic-fallback";
    result = heuristicSpeakingGym({
      transcript,
      wpm: Math.round(avgWpm),
      pauseCount,
      fillerCount,
    });
  }

  const parsed = speakingGymEvalSchema.safeParse(result);
  result = parsed.success
    ? parsed.data
    : heuristicSpeakingGym({
        transcript,
        wpm: Math.round(avgWpm),
        pauseCount,
        fillerCount,
      });

  // Ensure metrics attached
  result.criteria.fluencyCoherence.metrics = {
    wpm: Math.round(avgWpm),
    pauseCount,
    fillerCount,
  };

  await prisma.aIFeedback.create({
    data: {
      userId: input.userId,
      kind: "SPEAKING_EVAL",
      model,
      promptHash,
      responseJson: result as unknown as Prisma.InputJsonValue,
    },
  });

  const saved = await prisma.speakingEvaluation.upsert({
    where: { sessionId: session.id },
    update: {
      overallBand: result.overallBand,
      criteriaJson: result.criteria as unknown as Prisma.InputJsonValue,
      correctionsJson: result.corrections as unknown as Prisma.InputJsonValue,
      nextStepsJson: result.nextSteps as unknown as Prisma.InputJsonValue,
      strengthsJson: result.strengthsVi as unknown as Prisma.InputJsonValue,
      drillsJson: result.recommendedDrills as unknown as Prisma.InputJsonValue,
    },
    create: {
      sessionId: session.id,
      overallBand: result.overallBand,
      criteriaJson: result.criteria as unknown as Prisma.InputJsonValue,
      correctionsJson: result.corrections as unknown as Prisma.InputJsonValue,
      nextStepsJson: result.nextSteps as unknown as Prisma.InputJsonValue,
      strengthsJson: result.strengthsVi as unknown as Prisma.InputJsonValue,
      drillsJson: result.recommendedDrills as unknown as Prisma.InputJsonValue,
    },
  });

  await prisma.speakingSession.update({
    where: { id: session.id },
    data: { completedAt: new Date() },
  });

  return { evaluationId: saved.id, evaluation: result };
}

export function buildSpeakingScript(input: {
  sessionType: SpeakingSessionType;
  part?: number | null;
  level: number;
}) {
  const part1 = [
    "Do you work or are you a student?",
    "What do you usually do in the evenings?",
    "Do you prefer studying alone or with friends?",
    "What kind of music do you enjoy?",
  ];
  const part2 = {
    cueCard:
      "Describe a place you like to visit. You should say:\n- where it is\n- how often you go there\n- what you do there\nand explain why you like this place.",
    followUps: [
      "Would you recommend this place to a visitor?",
      "Has this place changed over the years?",
      "Do people in your country travel a lot?",
      "How can local areas attract more visitors?",
    ],
  };
  const part3 = [
    "Why do some people prefer cities to the countryside?",
    "How has tourism changed your country?",
    "Should governments invest more in public spaces?",
    "What will travel look like in the future?",
  ];

  if (input.sessionType === "PART_PRACTICE") {
    const part = input.part ?? 1;
    if (part === 2) {
      return {
        parts: [
          {
            part: 2,
            prepSec: 60,
            speakSec: 120,
            cueCard: part2.cueCard,
            questions: [part2.cueCard, ...part2.followUps.slice(0, 2)],
          },
        ],
      };
    }
    if (part === 3) {
      return { parts: [{ part: 3, questions: part3 }] };
    }
    return { parts: [{ part: 1, questions: part1 }] };
  }

  return {
    parts: [
      { part: 1, questions: part1 },
      {
        part: 2,
        prepSec: 60,
        speakSec: 120,
        cueCard: part2.cueCard,
        questions: [part2.cueCard],
      },
      { part: 3, questions: part3 },
    ],
  };
}
