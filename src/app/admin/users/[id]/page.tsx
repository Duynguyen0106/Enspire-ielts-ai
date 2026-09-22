import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AdminUserActions } from "@/components/admin/user-actions";

export const metadata: Metadata = { title: "User detail" };

type Props = { params: Promise<{ id: string }> };

export default async function AdminUserDetailPage({ params }: Props) {
  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      profile: true,
      subscription: true,
      attempts: {
        where: { test: { type: "FULL_LEVEL" } },
        orderBy: { startedAt: "desc" },
        take: 20,
        include: { test: { include: { level: true } } },
      },
      writingSubmissions: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { evaluation: true },
      },
      usageLogs: { orderBy: { periodStart: "desc" }, take: 20 },
    },
  });
  if (!user) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{user.email}</h1>
        <p className="text-sm text-muted-foreground">
          {user.name} · role {user.role} · level{" "}
          {user.profile?.currentLevel ?? 1} · plan{" "}
          {user.subscription?.plan ?? "FREE"}
        </p>
      </div>
      <AdminUserActions
        userId={user.id}
        role={user.role}
        currentLevel={user.profile?.currentLevel ?? 1}
        plan={user.subscription?.plan ?? "FREE"}
      />
      <section>
        <h2 className="font-medium">Full-level attempts</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {user.attempts.map((a) => (
            <li key={a.id}>
              L{a.test.level?.number} · band {a.overallBand ?? "—"} ·{" "}
              {a.passed == null ? a.status : a.passed ? "PASS" : "FAIL"}
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="font-medium">Writing</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {user.writingSubmissions.map((w) => (
            <li key={w.id}>
              {w.createdAt.toLocaleDateString("vi-VN")} · band{" "}
              {w.evaluation?.overallBand ?? "—"}
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="font-medium">Usage</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {user.usageLogs.map((u) => (
            <li key={u.id}>
              {u.feature}: {u.count} ({u.periodStart.toISOString().slice(0, 10)})
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
