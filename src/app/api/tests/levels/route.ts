import { NextResponse } from "next/server";
import { requireApiUser, jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { isLevelUnlocked, ensurePlacementUnlocks } from "@/lib/unlock";
import { parsePassingRules } from "@/lib/ielts-scoring";

export async function GET() {
  const { user, error } = await requireApiUser();
  if (error || !user) return error!;

  await ensurePlacementUnlocks(user.id);

  const tests = await prisma.test.findMany({
    where: { type: "FULL_LEVEL", publishedAt: { not: null } },
    include: {
      level: true,
      attempts: {
        where: { userId: user.id },
        orderBy: { startedAt: "desc" },
        take: 5,
      },
    },
    orderBy: { level: { number: "asc" } },
  });

  const items = await Promise.all(
    tests.map(async (t) => {
      const levelNumber = t.level?.number ?? 1;
      const unlocked = await isLevelUnlocked(user.id, levelNumber);
      const last = t.attempts[0] ?? null;
      const inProgress = t.attempts.find((a) => a.status === "IN_PROGRESS");
      const bestBand = t.attempts
        .filter((a) => a.overallBand != null)
        .reduce((m, a) => Math.max(m, a.overallBand ?? 0), 0);

      let status:
        | "locked"
        | "available"
        | "in_progress"
        | "passed"
        | "failed"
        | "cooldown" = "locked";

      const now = Date.now();
      const cooldownActive =
        last &&
        (last.status === "SUBMITTED" || last.status === "SCORED") &&
        last.cooldownUntil &&
        last.cooldownUntil.getTime() > now;

      if (!unlocked) status = "locked";
      else if (inProgress) status = "in_progress";
      else if (cooldownActive) status = "cooldown";
      else if (last?.passed === true) status = "passed";
      else if (last?.passed === false) status = "failed";
      else status = "available";

      return {
        testId: t.id,
        levelNumber,
        title: t.title,
        titleVi: t.level?.titleVi ?? t.title,
        durationMin: t.durationMin,
        status,
        unlocked,
        cooldownUntil: cooldownActive ? last!.cooldownUntil : null,
        inProgressAttemptId: inProgress?.id ?? null,
        lastAttemptId: last?.id ?? null,
        lastPassed: last?.passed ?? null,
        lastOverallBand: last?.overallBand ?? null,
        passingRules: parsePassingRules(t.passingRulesJson, levelNumber),
      };
    })
  );

  return NextResponse.json({ levels: items });
}
