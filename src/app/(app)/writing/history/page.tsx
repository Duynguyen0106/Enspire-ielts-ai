import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/app-header";
import { BandProgressChart } from "@/components/writing/band-progress-chart";
import { WRITING_TASK_META } from "@/lib/task-types";

export const metadata: Metadata = { title: "Lịch sử Writing" };

export default async function WritingHistoryPage() {
  const user = await requireUser();
  const currentLevel = user.profile?.currentLevel ?? 1;
  const rows = await prisma.writingSubmission.findMany({
    where: { userId: user.id },
    include: { evaluation: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const chart = [...rows]
    .reverse()
    .filter((r) => r.evaluation)
    .map((r, i) => ({ label: `#${i + 1}`, band: r.evaluation!.overallBand }));

  return (
    <>
      <AppHeader title="Lịch sử Writing" currentLevel={currentLevel} />
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        <BandProgressChart data={chart} title="Band progression" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="py-2">Ngày</th>
                <th className="py-2">Task</th>
                <th className="py-2">Band</th>
                <th className="py-2">Từ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b">
                  <td className="py-2">
                    <Link
                      href={`/writing/submission/${r.id}`}
                      className="text-[var(--brand)] underline"
                    >
                      {r.createdAt.toLocaleDateString("vi-VN")}
                    </Link>
                  </td>
                  <td className="py-2">
                    {WRITING_TASK_META[r.taskType].titleVi}
                  </td>
                  <td className="py-2">
                    {r.evaluation?.overallBand.toFixed(1) ?? "—"}
                  </td>
                  <td className="py-2">{r.wordCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
