import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "AI Logs" };

const COST: Record<string, number> = {
  "gpt-4o": 0.04,
  "gpt-4o-mini": 0.01,
  "heuristic-fallback": 0,
};

export default async function AdminAiLogsPage() {
  const logs = await prisma.aIFeedback.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: { select: { email: true } } },
  });

  const byKind: Record<string, number> = {};
  let cost = 0;
  for (const l of logs) {
    byKind[l.kind] = (byKind[l.kind] ?? 0) + 1;
    cost += COST[l.model] ?? 0.02;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">AI Logs</h1>
      <p className="text-sm text-muted-foreground">
        Last {logs.length} calls · est. cost ${cost.toFixed(2)} · by kind:{" "}
        {Object.entries(byKind)
          .map(([k, v]) => `${k}=${v}`)
          .join(", ")}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b text-muted-foreground">
              <th className="py-2">When</th>
              <th className="py-2">Kind</th>
              <th className="py-2">Model</th>
              <th className="py-2">User</th>
              <th className="py-2">Hash</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-b">
                <td className="py-2">
                  {l.createdAt.toISOString().slice(0, 16)}
                </td>
                <td className="py-2">{l.kind}</td>
                <td className="py-2">{l.model}</td>
                <td className="py-2">{l.user.email}</td>
                <td className="py-2 font-mono text-xs">
                  {l.promptHash.slice(0, 12)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
