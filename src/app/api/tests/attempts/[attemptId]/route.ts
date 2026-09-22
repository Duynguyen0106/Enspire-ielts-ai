import { NextResponse } from "next/server";
import { requireApiUser, jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { parsePassingRules } from "@/lib/ielts-scoring";
import { scoreFullLevelAttempt } from "@/lib/score-full-attempt";

type Ctx = { params: Promise<{ attemptId: string }> };

export async function GET(_req: Request, context: Ctx) {
  const { user, error } = await requireApiUser();
  if (error || !user) return error!;
  const { attemptId } = await context.params;

  const attempt = await prisma.testAttempt.findFirst({
    where: { id: attemptId, userId: user.id },
    include: {
      test: {
        include: {
          level: true,
          sections: {
            orderBy: { order: "asc" },
            include: {
              skill: true,
              questions: { orderBy: { order: "asc" } },
            },
          },
        },
      },
      answers: true,
      sectionProgress: true,
    },
  });
  if (!attempt) return jsonError("Không tìm thấy bài thi.", 404);

  const levelNumber = attempt.test.level?.number ?? 1;

  if (
    attempt.scoringStatus === "SCORING" ||
    attempt.scoringStatus === "NOT_STARTED"
  ) {
    return NextResponse.json({
      attemptId: attempt.id,
      status: attempt.status,
      scoringStatus: attempt.scoringStatus,
      scoringError: attempt.scoringError,
    });
  }

  if (attempt.scoringStatus === "FAILED") {
    return NextResponse.json({
      attemptId: attempt.id,
      status: attempt.status,
      scoringStatus: attempt.scoringStatus,
      scoringError: attempt.scoringError,
    });
  }

  // SCORED — include review data with correct answers
  return NextResponse.json({
    attemptId: attempt.id,
    status: attempt.status,
    scoringStatus: attempt.scoringStatus,
    passed: attempt.passed,
    unlockGranted: attempt.unlockGranted,
    overallBand: attempt.overallBand,
    cooldownUntil: attempt.cooldownUntil,
    rawScoreJson: attempt.rawScoreJson,
    levelNumber,
    passingRules: parsePassingRules(
      attempt.test.passingRulesJson,
      levelNumber
    ),
    testTitle: attempt.test.title,
    sections: attempt.test.sections.map((s) => ({
      id: s.id,
      order: s.order,
      skill: s.skill.name,
      durationMin: s.durationMin,
      instructionsVi: s.instructionsVi,
      metadataJson: s.metadataJson,
      questions: s.questions.map((q) => {
        const ans = attempt.answers.find((a) => a.questionId === q.id);
        return {
          id: q.id,
          type: q.type,
          order: q.order,
          contentJson: q.contentJson,
          correctAnswerJson: q.correctAnswerJson,
          userResponseJson: ans?.userResponseJson ?? null,
          isCorrect: ans?.isCorrect ?? null,
        };
      }),
    })),
    sectionProgress: attempt.sectionProgress,
  });
}

export async function POST(req: Request, context: Ctx) {
  // Retry scoring
  const { user, error } = await requireApiUser();
  if (error || !user) return error!;
  const { attemptId } = await context.params;

  const attempt = await prisma.testAttempt.findFirst({
    where: { id: attemptId, userId: user.id },
  });
  if (!attempt) return jsonError("Không tìm thấy bài thi.", 404);
  if (attempt.scoringStatus !== "FAILED") {
    return jsonError("Chỉ retry khi chấm điểm thất bại.", 400);
  }

  await prisma.testAttempt.update({
    where: { id: attemptId },
    data: {
      scoringStatus: "SCORING",
      scoringRetries: { increment: 1 },
      scoringError: null,
    },
  });

  try {
    await scoreFullLevelAttempt(attemptId);
    return NextResponse.json({ status: "SCORED" });
  } catch (e) {
    return jsonError(
      e instanceof Error ? e.message : "Retry thất bại.",
      500
    );
  }
}
