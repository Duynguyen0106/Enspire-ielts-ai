"use client";

import { useEffect, useState } from "react";
import { WordCountBadge } from "@/components/writing/word-count-badge";
import { wordCount } from "@/lib/writing-metrics";
import { cn } from "@/lib/utils";

type WritingEditorProps = {
  value: string;
  onChange: (value: string) => void;
  minWords: number;
  draftKey?: string;
  recommendedMin: number;
  onTimerTick?: (sec: number) => void;
  serif?: boolean;
};

export function WritingEditor({
  value,
  onChange,
  minWords,
  draftKey,
  recommendedMin,
  onTimerTick,
  serif,
}: WritingEditorProps) {
  const [seconds, setSeconds] = useState(0);
  const count = wordCount(value);

  useEffect(() => {
    if (!draftKey) return;
    const saved = localStorage.getItem(draftKey);
    if (saved && !value) onChange(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

  useEffect(() => {
    if (!draftKey) return;
    const t = setInterval(() => {
      localStorage.setItem(draftKey, value);
    }, 5000);
    return () => clearInterval(t);
  }, [draftKey, value]);

  useEffect(() => {
    const t = setInterval(() => {
      setSeconds((s) => {
        const next = s + 1;
        onTimerTick?.(next);
        return next;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [onTimerTick]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <WordCountBadge count={count} min={minWords} />
        <p className="text-muted-foreground">
          Thời gian: {mm}:{ss} · gợi ý {recommendedMin} phút
        </p>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={18}
        placeholder="Viết bài của bạn tại đây…"
        className={cn(
          "min-h-[50vh] w-full resize-y rounded-lg border bg-background p-4 text-base leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-ring",
          serif && "font-[family-name:var(--font-display)]"
        )}
      />
    </div>
  );
}
