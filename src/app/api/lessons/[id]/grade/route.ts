import { NextResponse } from "next/server";
import { z } from "zod";
import { enforceRateLimit, jsonError, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { gradeExercise } from "@/lib/ai/grade-exercise";
import { lessonExerciseSchema } from "@/lib/ai/lesson-schemas";

type RouteContext = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  exerciseId: z.string().min(1),
  userAnswer: z.string(),
});

export async function POST(req: Request, context: RouteContext) {
  const { user, error } = await requireApiUser();
  if (error || !user) return error!;

  const limited = await enforceRateLimit(user.id, "lesson-grade", 60);
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
    return jsonError("Dữ liệu không hợp lệ.");
  }

  const exercise = await prisma.exercise.findFirst({
    where: { id: parsed.data.exerciseId, lessonId: id },
  });
  if (!exercise) return jsonError("Không tìm thấy bài tập.", 404);

  const prompt =
    exercise.promptJson && typeof exercise.promptJson === "object"
      ? (exercise.promptJson as Record<string, unknown>)
      : {};
  const answer =
    exercise.answerJson && typeof exercise.answerJson === "object"
      ? (exercise.answerJson as Record<string, unknown>)
      : {};

  const exParsed = lessonExerciseSchema.safeParse({
    type: prompt.type ?? (exercise.type === "CHECKPOINT" ? "mcq" : exercise.type),
    prompt: prompt.prompt ?? "",
    options: prompt.options,
    correctAnswer: answer.correctAnswer ?? "",
    explanationVi: prompt.explanationVi ?? "Xem lại đáp án.",
    hintVi: prompt.hintVi,
  });
  if (!exParsed.success) return jsonError("Bài tập không hợp lệ.");

  const result = await gradeExercise({
    exercise: exParsed.data,
    userAnswer: parsed.data.userAnswer,
    userId: user.id,
    lessonId: id,
  });

  return NextResponse.json({
    ...result,
    correct: result.score >= 0.8,
  });
}
