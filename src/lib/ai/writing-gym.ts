import { generateObject } from "ai";
import type { Prisma, WritingTaskType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  EVAL_MODEL,
  getOpenAIProvider,
  hashPrompt,
  hasOpenAIKey,
  withTimeout,
} from "@/lib/ai/openai";
import {
  WRITING_EXAMINER_SYSTEM,
  buildWritingGymEvalPrompt,
} from "@/lib/ai/prompts";
import {
  writingGymEvalSchema,
  type WritingGymEval,
} from "@/lib/ai/gym-schemas";
import { wordCount } from "@/lib/writing-metrics";
import { WRITING_TASK_META } from "@/lib/task-types";
import { generateModelAnswers } from "@/lib/ai/generate-model-answers";

function heuristicWritingGym(
  text: string,
  minWords: number
): WritingGymEval {
  const words = wordCount(text);
  const under = words < minWords;
  const veryShort = words < 80;
  const base = veryShort ? 3.5 : under ? 4.5 : words >= minWords + 50 ? 6.0 : 5.5;
  const taskBand = veryShort ? 3.0 : under ? 4.0 : base;
  const snippet = text.trim().slice(0, 80) || "(empty)";
  return {
    overallBand: base,
    criteria: {
      taskAchievement: {
        band: taskBand,
        feedbackVi: under
          ? `Bài chỉ có ${words}/${minWords} từ — Task Achievement bị trừ vì chưa đủ độ dài.`
          : "Bạn đã trả lời đề ở mức chấp nhận được.",
        evidenceQuote: snippet,
      },
      coherenceCohesion: {
        band: base,
        feedbackVi: "Bố cục cơ bản rõ; nên dùng liên từ đa dạng hơn.",
        evidenceQuote: snippet,
      },
      lexicalResource: {
        band: base,
        feedbackVi: "Từ vựng đủ dùng; hãy mở rộng cụm từ học thuật.",
        evidenceQuote: snippet,
      },
      grammaticalRange: {
        band: Math.max(3, base - 0.5),
        feedbackVi: "Có câu đúng; cần đa dạng hóa cấu trúc phức tạp.",
        evidenceQuote: snippet,
      },
    },
    corrections: under
      ? [
          {
            original: snippet,
            corrected: snippet,
            type: "task",
            explanationVi: "Hãy viết thêm ý và ví dụ để đạt số từ tối thiểu.",
          },
        ]
      : [],
    strengthsVi: under
      ? []
      : ["Có ý chính", "Câu văn nhìn chung dễ hiểu"],
    nextSteps: [
      "Viết đủ số từ tối thiểu.",
      "Thêm ví dụ cụ thể cho mỗi ý chính.",
      "Ôn paraphrase và liên từ.",
      "Kiểm tra thì và mạo từ trước khi nộp.",
    ],
    wordCountNote: under
      ? `Bài dưới mức tối thiểu (${words}/${minWords} từ).`
      : undefined,
  };
}

export async function evaluateWritingGym(input: {
  text: string;
  taskPrompt: string;
  taskType: WritingTaskType;
  level: number;
  userId: string;
}): Promise<WritingGymEval> {
  const meta = WRITING_TASK_META[input.taskType];
  const words = wordCount(input.text);
  const userPrompt = buildWritingGymEvalPrompt({
    text: input.text,
    taskPrompt: input.taskPrompt,
    taskType: input.taskType,
    wordCount: words,
    minWords: meta.minWords,
    level: input.level,
  });
  const promptHash = hashPrompt(userPrompt);
  let result: WritingGymEval;
  let model = EVAL_MODEL;

  try {
    if (!hasOpenAIKey()) throw new Error("no key");
    const openai = getOpenAIProvider();
    const run = async () => {
      const { object } = await generateObject({
        model: openai(EVAL_MODEL),
        schema: writingGymEvalSchema,
        system: WRITING_EXAMINER_SYSTEM,
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
    result = heuristicWritingGym(input.text, meta.minWords);
  }

  const parsed = writingGymEvalSchema.safeParse(result);
  result = parsed.success
    ? parsed.data
    : heuristicWritingGym(input.text, meta.minWords);

  await prisma.aIFeedback.create({
    data: {
      userId: input.userId,
      kind: "WRITING_EVAL",
      model,
      promptHash,
      responseJson: result as unknown as Prisma.InputJsonValue,
    },
  });

  return result;
}

export async function submitWritingPipeline(input: {
  userId: string;
  taskType: WritingTaskType;
  prompt: string;
  promptId?: string | null;
  promptImageUrl?: string | null;
  essayText: string;
  timeSpentSec: number;
  level: number;
  attemptId?: string | null;
}) {
  const meta = WRITING_TASK_META[input.taskType];
  const words = wordCount(input.essayText);

  const submission = await prisma.writingSubmission.create({
    data: {
      userId: input.userId,
      taskType: input.taskType,
      level: input.level,
      promptId: input.promptId ?? null,
      prompt: input.prompt,
      promptImageUrl: input.promptImageUrl ?? null,
      essayText: input.essayText,
      wordCount: words,
      timeSpentSec: input.timeSpentSec,
      attemptId: input.attemptId ?? null,
    },
  });

  const evaluation = await evaluateWritingGym({
    text: input.essayText,
    taskPrompt: input.prompt,
    taskType: input.taskType,
    level: input.level,
    userId: input.userId,
  });

  const models = await generateModelAnswers({
    userId: input.userId,
    taskType: input.taskType,
    prompt: input.prompt,
    level: input.level,
  });

  const saved = await prisma.writingEvaluation.create({
    data: {
      submissionId: submission.id,
      overallBand: evaluation.overallBand,
      criteriaJson: evaluation.criteria as unknown as Prisma.InputJsonValue,
      correctionsJson: evaluation.corrections as unknown as Prisma.InputJsonValue,
      nextStepsJson: evaluation.nextSteps as unknown as Prisma.InputJsonValue,
      strengthsJson: evaluation.strengthsVi as unknown as Prisma.InputJsonValue,
      modelBand6: models.band6.text,
      modelBand75: models.band75.text,
      modelBand9: models.band9.text,
      modelNotesJson: {
        band6: models.band6.notesVi,
        band75: models.band75.notesVi,
        band9: models.band9.notesVi,
      } as Prisma.InputJsonValue,
    },
  });

  if (input.promptId) {
    await prisma.writingModelAnswer.upsert({
      where: { promptId: input.promptId },
      update: {
        band6Json: models.band6 as unknown as Prisma.InputJsonValue,
        band75Json: models.band75 as unknown as Prisma.InputJsonValue,
        band9Json: models.band9 as unknown as Prisma.InputJsonValue,
      },
      create: {
        promptId: input.promptId,
        band6Json: models.band6 as unknown as Prisma.InputJsonValue,
        band75Json: models.band75 as unknown as Prisma.InputJsonValue,
        band9Json: models.band9 as unknown as Prisma.InputJsonValue,
      },
    });
  }

  return {
    submissionId: submission.id,
    evaluationId: saved.id,
    underLength: words < meta.minWords,
    wordCount: words,
    minWords: meta.minWords,
  };
}
