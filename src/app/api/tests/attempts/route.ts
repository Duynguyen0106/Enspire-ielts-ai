import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { user, error } = await requireApiUser();
  if (error || !user) return error!;

  const attempts = await prisma.testAttempt.findMany({
    where: {
      userId: user.id,
      test: { type: "FULL_LEVEL" },
    },
    include: {
      test: { include: { level: true } },
    },
    orderBy: { startedAt: "desc" },
    take: 50,
  });

  return NextResponse.json({
    attempts: attempts.map((a) => ({
      id: a.id,
      testId: a.testId,
      levelNumber: a.test.level?.number ?? null,
      title: a.test.title,
      status: a.status,
      scoringStatus: a.scoringStatus,
      passed: a.passed,
      overallBand: a.overallBand,
      startedAt: a.startedAt,
      submittedAt: a.submittedAt,
      cooldownUntil: a.cooldownUntil,
    })),
  });
}
