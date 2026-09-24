import { NextResponse } from "next/server";
import { enforceRateLimit, jsonError, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { lessonExerciseSchema } from "@/lib/ai/lesson-schemas";
import { isAdminUser, studentVisibleReview } from "@/lib/content-filter";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, context: RouteContext) {
  const { user, error } = await requireApiUser();
  if (error || !user) return error!;

  const limited = await enforceRateLimit(user.id, "lessons-get", 100);
  if (limited) return limited;

  const { id } = await context.params;
  const admin = isAdminUser(user);
  const lesson = await prisma.lesson.findUnique({
    where: { id },
    include: {
      skill: true,
      level: true,
      exercises: { orderBy: { order: "asc" } },
    },
  });
  const visible = studentVisibleReview(admin);
  const statusOk =
    typeof visible === "string"
      ? lesson?.reviewStatus === visible
      : Boolean(lesson && visible.in.includes(lesson.reviewStatus));
  if (!lesson || !lesson.publishedAt || !statusOk) {
    return jsonError("Không tìm thấy bài học.", 404);
  }

  const { requireEntitlement } = await import("@/lib/entitlements");
  const gate = await requireEntitlement(user.id, "LESSON_ACCESS", {
    level: lesson.level.number,
    consume: false,
  });
  if (!gate.allowed) {
    return jsonError(gate.reason ?? "Paywall", 402, {
      feature: "LESSON_ACCESS",
      remaining: gate.remaining,
    });
  }

  const completion = await prisma.lessonCompletion.findUnique({
    where: {
      userId_lessonId: { userId: user.id, lessonId: lesson.id },
    },
  });

  const contentJson =
    lesson.contentJson && typeof lesson.contentJson === "object"
      ? (lesson.contentJson as Record<string, unknown>)
      : {};

  const exercises = lesson.exercises.map((ex) => {
    const prompt =
      ex.promptJson && typeof ex.promptJson === "object"
        ? (ex.promptJson as Record<string, unknown>)
        : {};
    const answer =
      ex.answerJson && typeof ex.answerJson === "object"
        ? (ex.answerJson as Record<string, unknown>)
        : {};
    const parsed = lessonExerciseSchema.safeParse({
      type: prompt.type ?? (ex.type === "CHECKPOINT" ? "mcq" : ex.type),
      prompt: prompt.prompt ?? "",
      options: prompt.options,
      correctAnswer: answer.correctAnswer ?? "",
      explanationVi: prompt.explanationVi ?? "",
      hintVi: prompt.hintVi,
    });
    return {
      id: ex.id,
      order: ex.order,
      isCheckpoint: ex.type === "CHECKPOINT",
      passingScore:
        typeof prompt.passingScore === "number" ? prompt.passingScore : 0.8,
      ...(parsed.success
        ? parsed.data
        : {
            type: "mcq" as const,
            prompt: String(prompt.prompt ?? ""),
            options: Array.isArray(prompt.options)
              ? (prompt.options as string[])
              : undefined,
            correctAnswer: String(answer.correctAnswer ?? ""),
            explanationVi: String(prompt.explanationVi ?? ""),
            hintVi:
              typeof prompt.hintVi === "string" ? prompt.hintVi : undefined,
          }),
      exerciseType: ex.type,
    };
  });

  return NextResponse.json({
    lesson: {
      id: lesson.id,
      title: lesson.title,
      titleVi: lesson.titleVi,
      order: lesson.order,
      estimatedMin: lesson.estimatedMin,
      isCheckpoint: lesson.isCheckpoint,
      levelNumber: lesson.level.number,
      skill: lesson.skill.name,
      content: contentJson,
      exercises,
    },
    completion: completion
      ? {
          score: completion.score,
          checkpointPassed: completion.checkpointPassed,
          completedAt: completion.completedAt,
          attemptsJson: completion.attemptsJson,
        }
      : null,
  });
}
