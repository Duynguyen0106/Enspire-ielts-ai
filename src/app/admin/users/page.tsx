import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Admin Users" };

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const users = await prisma.user.findMany({
    where: {
      deletedAt: null,
      ...(sp.q
        ? {
            OR: [
              { email: { contains: sp.q, mode: "insensitive" } },
              { name: { contains: sp.q, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(sp.plan
        ? { subscription: { plan: sp.plan === "PRO" ? "PRO" : "FREE" } }
        : {}),
    },
    include: {
      profile: true,
      subscription: true,
      _count: { select: { attempts: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Users</h1>
        <form className="flex gap-2">
          <input
            name="q"
            defaultValue={sp.q}
            placeholder="Search email…"
            className="rounded-md border px-2 py-1 text-sm"
          />
          <select
            name="plan"
            defaultValue={sp.plan ?? ""}
            className="rounded-md border px-2 py-1 text-sm"
          >
            <option value="">All plans</option>
            <option value="FREE">FREE</option>
            <option value="PRO">PRO</option>
          </select>
          <Button type="submit" size="sm">
            Filter
          </Button>
        </form>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b text-muted-foreground">
              <th className="py-2">Email</th>
              <th className="py-2">Level</th>
              <th className="py-2">Plan</th>
              <th className="py-2">Attempts</th>
              <th className="py-2">Joined</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b">
                <td className="py-2">{u.email}</td>
                <td className="py-2">{u.profile?.currentLevel ?? 1}</td>
                <td className="py-2">{u.subscription?.plan ?? "FREE"}</td>
                <td className="py-2">{u._count.attempts}</td>
                <td className="py-2">
                  {u.createdAt.toLocaleDateString("vi-VN")}
                </td>
                <td className="py-2">
                  <Link
                    href={`/admin/users/${u.id}`}
                    className="text-[var(--brand)] underline"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
