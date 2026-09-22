import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { enforceRateLimit, jsonError, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { gradeExercise } from "@/lib/ai/grade-exercise";
import {
  lessonExerciseSchema,
  type LessonExercise,
} from "@/lib/ai/lesson-schemas";
import { ensureProgressRow } from "@/lib/lesson-progress";

type RouteContext = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  answers: z
    .array(
      z.object({
        exerciseId: z.string().min(1),
        userAnswer: z.string(),
      })
    )
    .min(1),
  timeSpentSec: z.number().int().min(0).optional(),
});

function parseExercise(
  promptJson: unknown,
  answerJson: unknown,
  type: string
): LessonExercise | null {
  const prompt =
    promptJson && typeof promptJson === "object"
      ? (promptJson as Record<string, unknown>)
      : {};
  const answer =
    answerJson && typeof answerJson === "object"
      ? (answerJson as Record<string, unknown>)
      : {};
  const parsed = lessonExerciseSchema.safeParse({
    type: prompt.type ?? (type === "CHECKPOINT" ? "mcq" : type),
    prompt: prompt.prompt ?? "",
    options: prompt.options,
    correctAnswer: answer.correctAnswer ?? "",
    explanationVi: prompt.explanationVi ?? "Xem lại đáp án.",
    hintVi: prompt.hintVi,
  });
  return parsed.success ? parsed.data : null;
}

export async function POST(req: Request, context: RouteContext) {
  const { user, error } = await requireApiUser();
  if (error || !user) return error!;

  const limited = await enforceRateLimit(user.id, "lesson-complete", 60);
  if (limited) return limited;

  const { id } = await context.params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Dữ liệu không hợp lệ.");
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.");
  }

  const lesson = await prisma.lesson.findUnique({
    where: { id },
    include: {
      exercises: { orderBy: { order: "asc" } },
      skill: true,
      level: true,
    },
  });
  if (!lesson || !lesson.publishedAt) {
    return jsonError("Không tìm thấy bài học.", 404);
  }

  const answerMap = new Map(
    parsed.data.answers.map((a) => [a.exerciseId, a.userAnswer])
  );
  const graded: {
    exerciseId: string;
    score: number;
    feedbackVi: string;
    correctedEn?: string;
  }[] = [];

  for (const ex of lesson.exercises) {
    const userAnswer = answerMap.get(ex.id);
    if (userAnswer == null) continue;
    const exercise = parseExercise(ex.promptJson, ex.answerJson, ex.type);
    if (!exercise) continue;
    const result = await gradeExercise({
      exercise,
      userAnswer,
      userId: user.id,
      lessonId: lesson.id,
    });
    graded.push({
      exerciseId: ex.id,
      score: result.score,
      feedbackVi: result.feedbackVi,
      correctedEn: result.correctedEn,
    });
  }

  if (graded.length === 0) {
    return jsonError("Chưa có câu trả lời hợp lệ để chấm.");
  }

  const score =
    graded.reduce((sum, g) => sum + g.score, 0) / graded.length;
  const rounded = Math.round(score * 100) / 100;

  const checkpointEx = lesson.exercises.find((e) => e.type === "CHECKPOINT");
  let passingScore = 0.8;
  if (checkpointEx?.promptJson && typeof checkpointEx.promptJson === "object") {
    const p = checkpointEx.promptJson as Record<string, unknown>;
    if (typeof p.passingScore === "number") passingScore = p.passingScore;
  }

  const checkpointPassed = lesson.isCheckpoint
    ? rounded >= passingScore
    : false;

  const completion = await prisma.lessonCompletion.upsert({
    where: {
      userId_lessonId: { userId: user.id, lessonId: lesson.id },
    },
    update: {
      score: rounded,
      checkpointPassed,
      attemptsJson: {
        answers: parsed.data.answers,
        graded,
        timeSpentSec: parsed.data.timeSpentSec ?? null,
      } as Prisma.InputJsonValue,
      completedAt: new Date(),
    },
    create: {
      userId: user.id,
      lessonId: lesson.id,
      score: rounded,
      checkpointPassed,
      attemptsJson: {
        answers: parsed.data.answers,
        graded,
        timeSpentSec: parsed.data.timeSpentSec ?? null,
      } as Prisma.InputJsonValue,
    },
  });

  await ensureProgressRow({
    userId: user.id,
    levelId: lesson.levelId,
    skillId: lesson.skillId,
  });

  const completedCount = await prisma.lessonCompletion.count({
    where: {
      userId: user.id,
      lesson: { levelId: lesson.levelId, skillId: lesson.skillId },
    },
  });

  await prisma.progress.update({
    where: {
      userId_levelId_skillId: {
        userId: user.id,
        levelId: lesson.levelId,
        skillId: lesson.skillId,
      },
    },
    data: {
      lessonsCompleted: completedCount,
      checkpointPassed: checkpointPassed
        ? true
        : undefined,
      lastActivityAt: new Date(),
    },
  });

  if (checkpointPassed) {
    await prisma.progress.update({
      where: {
        userId_levelId_skillId: {
          userId: user.id,
          levelId: lesson.levelId,
          skillId: lesson.skillId,
        },
      },
      data: { checkpointPassed: true },
    });
  }

  const nextLesson = await prisma.lesson.findFirst({
    where: {
      levelId: lesson.levelId,
      skillId: lesson.skillId,
      order: { gt: lesson.order },
      publishedAt: { not: null },
    },
    orderBy: { order: "asc" },
    select: { id: true },
  });

  const feedbackVi = checkpointPassed
    ? `Xuất sắc! Bạn đã vượt checkpoint với điểm ${(rounded * 100).toFixed(0)}%.`
    : lesson.isCheckpoint
      ? `Chưa đạt checkpoint (${(rounded * 100).toFixed(0)}%). Hãy ôn lại và thử lại.`
      : `Bạn đã hoàn thành bài với điểm ${(rounded * 100).toFixed(0)}%.`;

  return NextResponse.json({
    score: rounded,
    passed: lesson.isCheckpoint ? checkpointPassed : rounded >= 0.5,
    checkpointPassed,
    feedbackVi,
    nextLessonId: nextLesson?.id ?? null,
    completionId: completion.id,
    graded,
  });
}
