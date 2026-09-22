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
import {
  avgSentenceLength,
  lexicalDiversity,
  sentenceCount,
  wordCount,
} from "@/lib/writing-metrics";
import { WRITING_TASK_META } from "@/lib/task-types";
import { generateModelAnswers } from "@/lib/ai/generate-model-answers";

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function pickQuote(sentences: string[], index: number, fallback: string): string {
  if (sentences.length === 0) return fallback.slice(0, 120);
  return sentences[Math.min(index, sentences.length - 1)]!.slice(0, 160);
}

function roundBand(n: number): number {
  const clamped = Math.max(0, Math.min(9, n));
  return Math.round(clamped * 2) / 2;
}

function heuristicWritingGym(
  text: string,
  minWords: number
): WritingGymEval {
  const words = wordCount(text);
  const under = words < minWords;
  const sentences = splitSentences(text);
  const sCount = sentenceCount(text);
  const avgLen = avgSentenceLength(text);
  const ttr = lexicalDiversity(text);
  const lower = text.toLowerCase();

  const hasThesis =
    /\b(i (partly )?agree|in my opinion|this essay|while some|although)\b/i.test(
      text
    );
  const hasExample = /\b(for example|for instance|such as|in my country)\b/i.test(
    text
  );
  const hasConclusion = /\b(in conclusion|to conclude|overall|ultimately)\b/i.test(
    text
  );
  const linkers =
    (lower.match(
      /\b(however|moreover|furthermore|therefore|whereas|on the other hand|in addition)\b/g
    ) ?? []).length;
  const complexMarks =
    (text.match(/\b(which|although|because|while|if|that)\b/gi) ?? []).length;

  // Quality score 0–1 from structure + language signals
  let quality = 0.35;
  if (words >= minWords) quality += 0.1;
  if (words >= minWords + 40) quality += 0.08;
  if (hasThesis) quality += 0.08;
  if (hasExample) quality += 0.08;
  if (hasConclusion) quality += 0.06;
  if (linkers >= 2) quality += 0.08;
  if (linkers >= 4) quality += 0.04;
  if (ttr >= 0.45) quality += 0.08;
  if (ttr >= 0.55) quality += 0.05;
  if (avgLen >= 12 && avgLen <= 24) quality += 0.06;
  if (complexMarks >= 4) quality += 0.06;
  if (sCount >= 8) quality += 0.05;
  quality = Math.min(1, quality);

  let overall = 4.0 + quality * 4.0; // maps ~4.0–8.0
  // Under-length: short/weak → 4.0–5.0 band range (Task Achievement penalty)
  if (under) {
    if (words < 80) overall = 4.0;
    else if (words < 120) overall = Math.min(overall, 4.5);
    else overall = Math.min(overall, 5.0);
  }
  // Strong, full-length essays land 7.0–7.5 (heuristic ceiling; live GPT may go higher)
  if (!under && quality >= 0.7) overall = Math.max(overall, 7.0);
  if (!under && quality >= 0.82) overall = Math.max(overall, 7.5);
  if (!under) overall = Math.min(overall, 7.5);
  if (!under && quality < 0.55) overall = Math.min(overall, 5.5);
  overall = roundBand(overall);

  const taskBand = roundBand(
    under ? Math.min(overall, words < 120 ? 4.0 : 4.5) : overall
  );
  const ccBand = roundBand(
    linkers >= 2 ? overall : Math.max(4, overall - 0.5)
  );
  const lrBand = roundBand(ttr >= 0.5 ? overall : Math.max(4, overall - 0.5));
  const grBand = roundBand(
    complexMarks >= 3 ? overall : Math.max(3.5, overall - 0.5)
  );

  const qThesis = pickQuote(sentences, 0, text);
  const qBody = pickQuote(sentences, Math.floor(sentences.length / 2), text);
  const qEnd = pickQuote(sentences, sentences.length - 1, text);
  const qLex = sentences.find((s) => /\b(however|although|therefore)\b/i.test(s))
    ?? qBody;

  return {
    overallBand: overall,
    criteria: {
      taskAchievement: {
        band: taskBand,
        feedbackVi: under
          ? `Bài chỉ có ${words}/${minWords} từ — Task Achievement bị trừ vì chưa phát triển đủ ý. Câu mở đầu: “${qThesis}”`
          : hasThesis && hasExample
            ? `Bạn trả lời đề khá đầy đủ với luận điểm và ví dụ. Dẫn chứng: “${qThesis}”`
            : `Có ý chính nhưng cần thêm ví dụ cụ thể. Dẫn chứng: “${qThesis}”`,
        evidenceQuote: qThesis,
      },
      coherenceCohesion: {
        band: ccBand,
        feedbackVi:
          linkers >= 2
            ? `Liên kết ý khá tốt (${linkers} liên từ). Ví dụ: “${qLex}”`
            : `Bố cục cơ bản có, nhưng thiếu liên từ đa dạng. Câu giữa bài: “${qBody}”`,
        evidenceQuote: qLex,
      },
      lexicalResource: {
        band: lrBand,
        feedbackVi:
          ttr >= 0.5
            ? `Từ vựng khá đa dạng (TTR≈${ttr}). Đoạn thể hiện: “${qBody}”`
            : `Từ vựng còn lặp; hãy paraphrase nhiều hơn. Đoạn: “${qBody}”`,
        evidenceQuote: qBody,
      },
      grammaticalRange: {
        band: grBand,
        feedbackVi:
          complexMarks >= 3
            ? `Có câu phức hợp. Kết bài: “${qEnd}”`
            : `Cần thêm mệnh đề phụ / câu phức. Kết bài: “${qEnd}”`,
        evidenceQuote: qEnd,
      },
    },
    corrections: under
      ? [
          {
            original: qThesis,
            corrected: qThesis,
            type: "task" as const,
            explanationVi: `Thiếu khoảng ${minWords - words} từ so với mức tối thiểu Task 2.`,
          },
        ]
      : [],
    strengthsVi: [
      ...(hasThesis ? ["Có câu nêu quan điểm rõ"] : []),
      ...(hasExample ? ["Có ví dụ minh họa"] : []),
      ...(linkers >= 2 ? ["Dùng liên từ hỗ trợ mạch lạc"] : []),
    ].slice(0, 5),
    nextSteps: [
      under
        ? `Viết đủ ít nhất ${minWords} từ trước khi nộp.`
        : "Thêm 1 ví dụ cụ thể cho mỗi ý thân bài.",
      "Dùng thêm liên từ: however, furthermore, whereas.",
      "Paraphrase từ khóa đề bài trong mở bài và kết bài.",
      "Kiểm tra thì và mạo từ trước khi nộp.",
    ],
    wordCountNote: under
      ? `Bài dưới mức tối thiểu (${words}/${minWords} từ) nên Task Achievement bị trừ điểm.`
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

  if (words < meta.minWords && !result.wordCountNote) {
    result.wordCountNote = `Bài dưới mức tối thiểu (${words}/${meta.minWords} từ) nên Task Achievement bị trừ điểm.`;
  }

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
      criteriaJson: {
        ...evaluation.criteria,
        wordCountNote: evaluation.wordCountNote,
      } as unknown as Prisma.InputJsonValue,
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
    wordCountNote: evaluation.wordCountNote ?? null,
  };
}
