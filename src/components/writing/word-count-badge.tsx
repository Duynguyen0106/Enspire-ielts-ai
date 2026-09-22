"use client";

import { cn } from "@/lib/utils";

type WordCountBadgeProps = {
  count: number;
  min: number;
};

export function WordCountBadge({ count, min }: WordCountBadgeProps) {
  const ok = count >= min;
  return (
    <span
      className={cn(
        "rounded-md px-2 py-1 text-sm font-medium",
        ok
          ? "bg-[var(--brand-soft)] text-[var(--brand-deep)]"
          : "bg-destructive/10 text-destructive"
      )}
    >
      {count} / {min} từ
    </span>
  );
}
