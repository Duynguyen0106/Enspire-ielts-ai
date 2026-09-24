"use client";

import { useEffect, useState } from "react";

type ExamTimerProps = {
  totalSec: number;
  startedAt?: string | Date | null;
  onExpire?: () => void;
  label?: string;
};

export function ExamTimer({
  totalSec,
  startedAt,
  onExpire,
  label,
}: ExamTimerProps) {
  const [left, setLeft] = useState(totalSec);

  useEffect(() => {
    const start = startedAt ? new Date(startedAt).getTime() : Date.now();
    const tick = () => {
      const elapsed = Math.floor((Date.now() - start) / 1000);
      const next = Math.max(0, totalSec - elapsed);
      setLeft(next);
      if (next <= 0) onExpire?.();
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [totalSec, startedAt, onExpire]);

  const m = Math.floor(left / 60);
  const s = left % 60;
  const urgent = left < 5 * 60;

  return (
    <div
      className={
        urgent
          ? "font-mono text-lg font-semibold text-destructive"
          : "font-mono text-lg font-semibold"
      }
      aria-live="polite"
      role="timer"
    >
      {label ? <span className="mr-2 text-sm font-normal text-muted-foreground">{label}</span> : null}
      {String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
    </div>
  );
}
