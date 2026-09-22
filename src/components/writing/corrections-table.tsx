"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

export type CorrectionRow = {
  original: string;
  corrected: string;
  type?: string;
  explanationVi: string;
};

type CorrectionsTableProps = {
  corrections: CorrectionRow[];
};

const TYPES = ["all", "grammar", "vocab", "cohesion", "task"] as const;

export function CorrectionsTable({ corrections }: CorrectionsTableProps) {
  const [filter, setFilter] = useState<(typeof TYPES)[number]>("all");
  const rows = useMemo(
    () =>
      filter === "all"
        ? corrections
        : corrections.filter((c) => (c.type ?? "grammar") === filter),
    [corrections, filter]
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1">
        {TYPES.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setFilter(t)}
            className={cn(
              "rounded-full border px-2 py-0.5 text-xs",
              filter === t && "border-[var(--brand)] bg-[var(--brand-soft)]"
            )}
          >
            {t}
          </button>
        ))}
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Không có sửa lỗi.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[540px] text-left text-sm">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="py-2 pr-2">Original</th>
                <th className="py-2 pr-2">Corrected</th>
                <th className="py-2 pr-2">Type</th>
                <th className="py-2">Giải thích</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={`${r.original}-${i}`} className="border-b align-top">
                  <td className="py-2 pr-2 text-destructive">{r.original}</td>
                  <td className="py-2 pr-2 text-[var(--brand-deep)]">
                    {r.corrected}
                  </td>
                  <td className="py-2 pr-2">{r.type ?? "grammar"}</td>
                  <td className="py-2">{r.explanationVi}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
