"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type TestRow = {
  id: string;
  title: string;
  type: string;
  level: number | null;
  published: boolean;
  attemptCount: number;
  avgBand: number | null;
  passRate: number | null;
  passingRulesJson: unknown;
};

export function AdminTestsClient({ tests }: { tests: TestRow[] }) {
  const router = useRouter();

  async function toggle(id: string, published: boolean) {
    await fetch("/api/admin/tests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "togglePublish",
        testId: id,
        published: !published,
      }),
    });
    router.refresh();
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b text-muted-foreground">
            <th className="py-2">Title</th>
            <th className="py-2">Type</th>
            <th className="py-2">Level</th>
            <th className="py-2">Attempts</th>
            <th className="py-2">Avg band</th>
            <th className="py-2">Pass %</th>
            <th className="py-2">Published</th>
          </tr>
        </thead>
        <tbody>
          {tests.map((t) => (
            <tr key={t.id} className="border-b">
              <td className="py-2">{t.title}</td>
              <td className="py-2">{t.type}</td>
              <td className="py-2">{t.level ?? "—"}</td>
              <td className="py-2">{t.attemptCount}</td>
              <td className="py-2">
                {t.avgBand != null ? t.avgBand.toFixed(1) : "—"}
              </td>
              <td className="py-2">
                {t.passRate != null
                  ? `${Math.round(t.passRate * 100)}%`
                  : "—"}
              </td>
              <td className="py-2">
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => void toggle(t.id, t.published)}
                >
                  {t.published ? "Unpublish" : "Publish"}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
