import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const metadata: Metadata = { title: "Admin Overview" };

export default async function AdminOverviewPage() {
  const since7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [
    signups,
    placements,
    lessons,
    writing,
    speaking,
    fullTests,
    fullPassed,
    proSubs,
    aiCalls,
  ] = await Promise.all([
    prisma.user.count({ where: { createdAt: { gte: since7 }, deletedAt: null } }),
    prisma.placementResult.count({ where: { createdAt: { gte: since7 } } }),
    prisma.lessonCompletion.count({ where: { completedAt: { gte: since7 } } }),
    prisma.writingSubmission.count({ where: { createdAt: { gte: since7 } } }),
    prisma.speakingSession.count({ where: { startedAt: { gte: since7 } } }),
    prisma.testAttempt.count({
      where: {
        startedAt: { gte: since7 },
        test: { type: "FULL_LEVEL" },
      },
    }),
    prisma.testAttempt.count({
      where: {
        startedAt: { gte: since7 },
        test: { type: "FULL_LEVEL" },
        passed: true,
      },
    }),
    prisma.subscription.count({
      where: { plan: "PRO", status: { in: ["active", "trialing"] } },
    }),
    prisma.aIFeedback.count({ where: { createdAt: { gte: since7 } } }),
  ]);

  const mrrEst = proSubs * 7.99;
  const aiSpendEst = aiCalls * 0.02;

  const recent = await prisma.adminAction.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { admin: { select: { email: true } } },
  });

  const kpis = [
    { label: "New signups (7d)", value: signups },
    { label: "Placements (7d)", value: placements },
    { label: "Lessons done (7d)", value: lessons },
    { label: "Writing (7d)", value: writing },
    { label: "Speaking (7d)", value: speaking },
    { label: "Full tests (7d)", value: `${fullPassed}/${fullTests}` },
    { label: "Active Pro", value: proSubs },
    { label: "Est. MRR", value: `$${mrrEst.toFixed(0)}` },
    { label: "AI calls / est $", value: `${aiCalls} / $${aiSpendEst.toFixed(2)}` },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Overview</h1>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border p-4">
            <p className="text-xs text-muted-foreground">{k.label}</p>
            <p className="mt-1 text-2xl font-semibold">{k.value}</p>
          </div>
        ))}
      </div>
      <div>
        <h2 className="mb-2 font-medium">Recent admin actions</h2>
        <ul className="space-y-1 text-sm">
          {recent.length === 0 ? (
            <li className="text-muted-foreground">No actions yet.</li>
          ) : (
            recent.map((a) => (
              <li key={a.id}>
                {a.createdAt.toISOString().slice(0, 16)} · {a.admin.email} ·{" "}
                {a.action} · {a.targetType}
              </li>
            ))
          )}
        </ul>
      </div>
      <p className="text-sm">
        <Link href="/admin/content" className="text-[var(--brand)] underline">
          Review pending content →
        </Link>
      </p>
    </div>
  );
}
