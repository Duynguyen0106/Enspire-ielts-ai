import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Audit Log" };

export default async function AdminAuditPage() {
  const rows = await prisma.adminAction.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { admin: { select: { email: true } } },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Audit Log</h1>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b text-muted-foreground">
              <th className="py-2">When</th>
              <th className="py-2">Admin</th>
              <th className="py-2">Action</th>
              <th className="py-2">Target</th>
              <th className="py-2">Payload</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b align-top">
                <td className="py-2 whitespace-nowrap">
                  {r.createdAt.toISOString().slice(0, 16)}
                </td>
                <td className="py-2">{r.admin.email}</td>
                <td className="py-2">{r.action}</td>
                <td className="py-2">
                  {r.targetType} {r.targetId ?? ""}
                </td>
                <td className="py-2 font-mono text-xs">
                  {JSON.stringify(r.payloadJson)?.slice(0, 120)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
