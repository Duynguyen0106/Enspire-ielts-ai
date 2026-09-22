"use client";

import { useEffect, useState } from "react";

type CountdownTimerProps = {
  seconds: number;
  onExpire?: () => void;
  className?: string;
};

export function CountdownTimer({
  seconds,
  onExpire,
  className,
}: CountdownTimerProps) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    setRemaining(seconds);
  }, [seconds]);

  useEffect(() => {
    if (remaining <= 0) {
      onExpire?.();
      return;
    }
    const id = window.setInterval(() => {
      setRemaining((r) => r - 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [remaining, onExpire]);

  const mm = String(Math.floor(Math.max(remaining, 0) / 60)).padStart(2, "0");
  const ss = String(Math.max(remaining, 0) % 60).padStart(2, "0");
  const urgent = remaining > 0 && remaining <= 60;

  return (
    <div
      className={className}
      role="timer"
      aria-live="polite"
      aria-atomic="true"
    >
      <span
        className={
          urgent
            ? "font-mono text-lg font-semibold text-destructive"
            : "font-mono text-lg font-semibold"
        }
      >
        {mm}:{ss}
      </span>
    </div>
  );
}
