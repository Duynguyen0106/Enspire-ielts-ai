import { NextResponse } from "next/server";
import { AttemptStatus, TestType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { enforceAiRateLimit, jsonError, requireApiUser } from "@/lib/api";

export async function POST() {
  const { user, error } = await requireApiUser();
  if (error || !user) return error!;

  const limited = await enforceAiRateLimit(user.id);
  if (limited) return limited;

  if (user.profile?.placementCompleted) {
    const fullLevelAttempt = await prisma.testAttempt.findFirst({
      where: {
        userId: user.id,
        test: { type: TestType.FULL_LEVEL },
      },
      select: { id: true },
    });
    if (fullLevelAttempt) {
      return jsonError(
        "Bạn đã bắt đầu lộ trình, không thể làm lại bài kiểm tra đầu vào.",
        400
      );
    }
    // Retake allowed: mark incomplete so a new attempt can be scored again
    await prisma.profile.update({
      where: { userId: user.id },
      data: { placementCompleted: false },
    });
  }

  const test = await prisma.test.findFirst({
    where: { type: TestType.PLACEMENT, publishedAt: { not: null } },
    include: {
      sections: {
        orderBy: { order: "asc" },
        include: {
          skill: true,
          questions: { orderBy: { order: "asc" } },
        },
      },
    },
  });

  if (!test || test.sections.length === 0) {
    return jsonError(
      "Bài kiểm tra đầu vào chưa sẵn sàng. Vui lòng thử lại sau.",
      503
    );
  }

  const existing = await prisma.testAttempt.findFirst({
    where: {
      userId: user.id,
      testId: test.id,
      status: AttemptStatus.IN_PROGRESS,
    },
    orderBy: { startedAt: "desc" },
  });

  const attempt =
    existing ??
    (await prisma.testAttempt.create({
      data: {
        userId: user.id,
        testId: test.id,
        status: AttemptStatus.IN_PROGRESS,
      },
    }));

  const savedAnswers = await prisma.answer.findMany({
    where: { attemptId: attempt.id },
  });

  const structure = {
    attemptId: attempt.id,
    test: {
      id: test.id,
      title: test.title,
      durationMin: test.durationMin,
      sections: test.sections.map((section) => ({
        id: section.id,
        order: section.order,
        durationMin: section.durationMin,
        instructionsVi: section.instructionsVi,
        skill: section.skill.name,
        metadataJson: section.metadataJson,
        questions: section.questions.map((q) => ({
          id: q.id,
          type: q.type,
          order: q.order,
          points: q.points,
          contentJson: q.contentJson,
          // correctAnswerJson intentionally omitted
        })),
      })),
    },
    savedAnswers: savedAnswers.map((a) => ({
      questionId: a.questionId,
      userResponseJson: a.userResponseJson,
    })),
  };

  return NextResponse.json(structure);
}
