import { generateObject } from "ai";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  PLACEMENT_MODEL,
  getOpenAIProvider,
  hashPrompt,
  hasOpenAIKey,
  withTimeout,
} from "@/lib/ai/openai";
import { GRADER_SYSTEM } from "@/lib/ai/prompts";
import {
  gradeResultSchema,
  type GradeResult,
  type LessonExercise,
} from "@/lib/ai/lesson-schemas";

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array.from({ length: n + 1 }, () => 0)
  );
  for (let i = 0; i <= m; i++) dp[i]![0] = i;
  for (let j = 0; j <= n; j++) dp[0]![j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i]![j] = Math.min(
        dp[i - 1]![j]! + 1,
        dp[i]![j - 1]! + 1,
        dp[i - 1]![j - 1]! + cost
      );
    }
  }
  return dp[m]![n]!;
}

function objectiveGrade(
  exercise: LessonExercise,
  userAnswer: string
): GradeResult {
  const expected = normalize(exercise.correctAnswer);
  const got = normalize(userAnswer);
  const distance = levenshtein(expected, got);
  const ok = got === expected || distance <= 2;
  return {
    score: ok ? 1 : 0,
    feedbackVi: ok
      ? "Chính xác! " + exercise.explanationVi
      : `Chưa đúng. Đáp án: ${exercise.correctAnswer}. ${exercise.explanationVi}`,
    explanationVi: exercise.explanationVi,
  };
}

function heuristicAiGrade(
  exercise: LessonExercise,
  userAnswer: string
): GradeResult {
  const expected = normalize(exercise.correctAnswer);
  const got = normalize(userAnswer);
  if (!got) {
    return {
      score: 0,
      feedbackVi: "Bạn chưa nhập câu trả lời.",
      correctedEn: exercise.correctAnswer,
    };
  }
  const distance = levenshtein(expected, got);
  const ratio =
    1 - distance / Math.max(expected.length, got.length, 1);
  const score = Math.max(0, Math.min(1, ratio));
  return {
    score: Math.round(score * 10) / 10,
    feedbackVi:
      score >= 0.8
        ? "Câu trả lời khá tốt. " + exercise.explanationVi
        : "Cần chỉnh lại nghĩa/ngữ pháp. " + exercise.explanationVi,
    correctedEn: exercise.correctAnswer,
    explanationVi: exercise.explanationVi,
  };
}

export async function gradeExercise(input: {
  exercise: LessonExercise;
  userAnswer: string;
  userId: string;
  lessonId?: string;
}): Promise<GradeResult> {
  const { exercise, userAnswer, userId } = input;

  if (
    exercise.type === "mcq" ||
    exercise.type === "gap_fill"
  ) {
    return objectiveGrade(exercise, userAnswer);
  }

  const prompt = [
    `Exercise type: ${exercise.type}`,
    `Prompt: ${exercise.prompt}`,
    `Expected answer: ${exercise.correctAnswer}`,
    `Learner answer: ${userAnswer}`,
    "Return JSON { score:0-1, feedbackVi, correctedEn?, explanationVi? }.",
  ].join("\n");
  const promptHash = hashPrompt(prompt);

  let result: GradeResult;
  let model = PLACEMENT_MODEL;

  if (
    !hasOpenAIKey() ||
    exercise.type === "short_answer"
  ) {
    // short_answer: try AI if available, else fuzzy
  }

  try {
    if (!hasOpenAIKey()) throw new Error("no key");
    const openai = getOpenAIProvider();
    const run = async () => {
      const { object } = await generateObject({
        model: openai(PLACEMENT_MODEL),
        schema: gradeResultSchema,
        system: GRADER_SYSTEM,
        prompt,
        temperature: 0.1,
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
    result =
      exercise.type === "short_answer"
        ? objectiveGrade(exercise, userAnswer)
        : heuristicAiGrade(exercise, userAnswer);
  }

  const parsed = gradeResultSchema.safeParse(result);
  result = parsed.success
    ? parsed.data
    : heuristicAiGrade(exercise, userAnswer);

  await prisma.aIFeedback.create({
    data: {
      userId,
      kind: "exercise_grade",
      model,
      promptHash,
      responseJson: {
        lessonId: input.lessonId,
        type: exercise.type,
        result,
      } as Prisma.InputJsonValue,
    },
  });

  return result;
}
