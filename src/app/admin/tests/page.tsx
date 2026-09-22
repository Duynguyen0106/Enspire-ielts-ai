import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { AdminTestsClient } from "@/components/admin/tests-client";

export const metadata: Metadata = { title: "Admin Tests" };

export default async function AdminTestsPage() {
  const tests = await prisma.test.findMany({
    include: {
      level: true,
      _count: { select: { attempts: true } },
      attempts: {
        where: { status: "SCORED" },
        select: { overallBand: true, passed: true, startedAt: true, submittedAt: true },
      },
    },
    orderBy: [{ type: "asc" }, { level: { number: "asc" } }],
  });

  const rows = tests.map((t) => {
    const scored = t.attempts;
    const avgBand =
      scored.length === 0
        ? null
        : scored.reduce((s, a) => s + (a.overallBand ?? 0), 0) / scored.length;
    const passRate =
      scored.length === 0
        ? null
        : scored.filter((a) => a.passed).length / scored.length;
    return {
      id: t.id,
      title: t.title,
      type: t.type,
      level: t.level?.number ?? null,
      published: Boolean(t.publishedAt),
      attemptCount: t._count.attempts,
      avgBand,
      passRate,
      passingRulesJson: t.passingRulesJson,
    };
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Tests</h1>
      <AdminTestsClient tests={rows} />
    </div>
  );
}
