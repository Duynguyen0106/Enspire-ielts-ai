import { NextResponse } from "next/server";
import { requireApiUser, jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { parsePassingRules } from "@/lib/ielts-scoring";

type Ctx = { params: Promise<{ attemptId: string }> };

/** Mid-exam state without correct answers — for resume / runner hydrate. */
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
      sectionProgress: true,
    },
  });
  if (!attempt) return jsonError("Không tìm thấy bài thi.", 404);
  if (attempt.status !== "IN_PROGRESS") {
    return jsonError("Phiên thi đã kết thúc.", 400);
  }

  const levelNumber = attempt.test.level?.number ?? 1;

  return NextResponse.json({
    attemptId: attempt.id,
    startedAt: attempt.startedAt,
    status: attempt.status,
    test: {
      id: attempt.test.id,
      title: attempt.test.title,
      durationMin: attempt.test.durationMin,
      levelNumber,
      passingRules: parsePassingRules(
        attempt.test.passingRulesJson,
        levelNumber
      ),
      sections: attempt.test.sections.map((s) => ({
        id: s.id,
        order: s.order,
        skill: s.skill.name,
        durationMin: s.durationMin,
        instructionsVi: s.instructionsVi,
        metadataJson: s.metadataJson,
        questions: s.questions.map((q) => ({
          id: q.id,
          type: q.type,
          order: q.order,
          points: q.points,
          contentJson: q.contentJson,
        })),
      })),
    },
    sectionProgress: attempt.sectionProgress.map((p) => ({
      sectionId: p.sectionId,
      startedAt: p.startedAt,
      submittedAt: p.submittedAt,
      timeSpentSec: p.timeSpentSec,
    })),
  });
}
