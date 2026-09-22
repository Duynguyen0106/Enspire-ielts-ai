import { generateObject } from "ai";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  EVAL_MODEL,
  EXAMINER_SYSTEM_PROMPT,
  getOpenAIProvider,
  hashPrompt,
  withTimeout,
} from "@/lib/ai/openai";
import { buildWritingEvalPrompt } from "@/lib/ai/prompts";
import {
  writingEvalSchema,
  type WritingEval,
} from "@/lib/ai/schemas";

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function heuristicWritingEval(
  text: string,
  minWords: number
): WritingEval {
  const words = countWords(text);
  const under = words < minWords;
  const base = under ? 4.5 : words > 250 ? 6.0 : 5.5;
  return {
    overallBand: base,
    criteria: {
      taskAchievement: {
        band: under ? 4.0 : base,
        feedbackVi: under
          ? `Bài viết chỉ có ${words} từ (tối thiểu ${minWords}). Cần phát triển ý đầy đủ hơn.`
          : "Bạn đã trả lời đề bài ở mức chấp nhận được.",
      },
      coherenceCohesion: {
        band: base,
        feedbackVi: "Bố cục cơ bản rõ; nên dùng liên từ đa dạng hơn.",
      },
      lexicalResource: {
        band: base,
        feedbackVi: "Từ vựng đủ dùng; hãy mở rộng cụm từ học thuật.",
      },
      grammaticalRange: {
        band: Math.max(4, base - 0.5),
        feedbackVi: "Có câu đúng; cần đa dạng hóa cấu trúc phức tạp.",
      },
    },
    corrections: [],
    nextSteps: [
      "Viết đủ số từ tối thiểu mỗi bài Task 2.",
      "Luyện paraphrase ý chính thay vì lặp từ.",
      "Thêm ví dụ cụ thể để hỗ trợ quan điểm.",
      "Ôn thì và mệnh đề quan hệ.",
    ],
  };
}

export async function evaluateWriting(input: {
  text: string;
  taskPrompt: string;
  taskType?: string;
  minWords?: number;
  level?: number;
  userId: string;
  attemptId?: string;
  skillId?: string;
}): Promise<WritingEval> {
  const minWords = input.minWords ?? 200;
  const wordCount = countWords(input.text);
  const userPrompt = buildWritingEvalPrompt({
    text: input.text,
    taskPrompt: input.taskPrompt,
    taskType: input.taskType ?? "task2",
    wordCount,
    minWords,
    level: input.level,
  });
  const promptHash = hashPrompt(userPrompt);

  let result: WritingEval;
  let model = EVAL_MODEL;

  try {
    const openai = getOpenAIProvider();
    const run = async () => {
      const { object } = await generateObject({
        model: openai(EVAL_MODEL),
        schema: writingEvalSchema,
        system: EXAMINER_SYSTEM_PROMPT,
        prompt: userPrompt,
        temperature: 0.2,
      });
      return object;
    };

    try {
      result = await withTimeout(run());
    } catch {
      result = await withTimeout(run());
    }
  } catch {
    model = "heuristic-fallback";
    result = heuristicWritingEval(input.text, minWords);
  }

  const parsed = writingEvalSchema.safeParse(result);
  if (!parsed.success) {
    result = heuristicWritingEval(input.text, minWords);
  } else {
    result = parsed.data;
  }

  await prisma.aIFeedback.create({
    data: {
      userId: input.userId,
      attemptId: input.attemptId,
      skillId: input.skillId,
      kind: "writing_evaluate",
      model,
      promptHash,
      responseJson: result as unknown as Prisma.InputJsonValue,
    },
  });

  return result;
}
