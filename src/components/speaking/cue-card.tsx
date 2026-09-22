"use client";

import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";

type CueCardProps = {
  text: string;
  prepSec?: number;
  speakSec?: number;
  onPrepEnd?: () => void;
  phase: "prep" | "speak" | "idle";
};

export function CueCard({
  text,
  prepSec = 60,
  speakSec = 120,
  onPrepEnd,
  phase,
}: CueCardProps) {
  const [left, setLeft] = useState(phase === "prep" ? prepSec : speakSec);

  useEffect(() => {
    setLeft(phase === "prep" ? prepSec : speakSec);
  }, [phase, prepSec, speakSec]);

  useEffect(() => {
    if (phase === "idle") return;
    const t = setInterval(() => {
      setLeft((s) => {
        if (s <= 1) {
          clearInterval(t);
          if (phase === "prep") onPrepEnd?.();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phase, onPrepEnd]);

  const total = phase === "prep" ? prepSec : speakSec;
  const pct = total ? ((total - left) / total) * 100 : 0;

  return (
    <div className="space-y-3 border bg-[var(--brand-soft)]/40 p-4">
      <div className="flex justify-between text-sm">
        <span className="font-medium">
          {phase === "prep"
            ? "Thời gian chuẩn bị"
            : phase === "speak"
              ? "Thời gian nói"
              : "Cue card"}
        </span>
        <span>
          {left}s / {total}s
        </span>
      </div>
      {phase !== "idle" ? <Progress value={pct} /> : null}
      <pre className="whitespace-pre-wrap text-sm leading-relaxed">{text}</pre>
    </div>
  );
}
