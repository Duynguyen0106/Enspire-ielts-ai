import { NextResponse } from "next/server";
import { requireApiUser, jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import {
  canStartAttempt,
  startOrResumeAttempt,
} from "@/lib/exam-orchestrator";
import { parsePassingRules } from "@/lib/ielts-scoring";

type Ctx = { params: Promise<{ testId: string }> };

export async function POST(_req: Request, context: Ctx) {
  const { user, error } = await requireApiUser();
  if (error || !user) return error!;

  const { testId } = await context.params;

  const testMeta = await prisma.test.findUnique({
    where: { id: testId },
    include: { level: true },
  });
  const levelNumber = testMeta?.level?.number ?? 1;
  const { requireEntitlement } = await import("@/lib/entitlements");
  const gate = await requireEntitlement(user.id, "FULL_LEVEL_TEST", {
    level: levelNumber,
    consume: false,
  });
  if (!gate.allowed) {
    return jsonError(gate.reason ?? "Paywall", 402, {
      feature: "FULL_LEVEL_TEST",
      remaining: gate.remaining,
    });
  }

  const check = await canStartAttempt(user.id, testId);
  if (!check.ok) {
    return jsonError(check.reason, check.status, {
      cooldownUntil: check.cooldownUntil?.toISOString(),
    });
  }

  const attempt = await startOrResumeAttempt(user.id, testId);

  const full = await prisma.testAttempt.findUnique({
    where: { id: attempt.id },
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
  if (!full) return jsonError("Không tạo được phiên thi.", 500);

  const resolvedLevel = full.test.level?.number ?? levelNumber;

  return NextResponse.json({
    attemptId: full.id,
    startedAt: full.startedAt,
    status: full.status,
    test: {
      id: full.test.id,
      title: full.test.title,
      durationMin: full.test.durationMin,
      levelNumber: resolvedLevel,
      passingRules: parsePassingRules(
        full.test.passingRulesJson,
        resolvedLevel
      ),
      sections: full.test.sections.map((s) => ({
        id: s.id,
        order: s.order,
        skill: s.skill.name,
        durationMin: s.durationMin,
        instructionsVi: s.instructionsVi,
        metadataJson: s.metadataJson,
        // Strip correctAnswerJson
        questions: s.questions.map((q) => ({
          id: q.id,
          type: q.type,
          order: q.order,
          points: q.points,
          contentJson: q.contentJson,
        })),
      })),
    },
    sectionProgress: full.sectionProgress.map((p) => ({
      sectionId: p.sectionId,
      startedAt: p.startedAt,
      submittedAt: p.submittedAt,
      timeSpentSec: p.timeSpentSec,
    })),
  });
}
