"use client";

import { useEffect, useState } from "react";

type ResultHeroProps = {
  band: number;
  passed: boolean;
  level: number;
  minOverall: number;
  minSkill: number;
};

export function ResultHero({
  band,
  passed,
  level,
  minOverall,
  minSkill,
}: ResultHeroProps) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    let frame = 0;
    const frames = 24;
    const id = setInterval(() => {
      frame += 1;
      setShown(Math.round((band * frame) / frames * 2) / 2);
      if (frame >= frames) {
        setShown(band);
        clearInterval(id);
      }
    }, 40);
    return () => clearInterval(id);
  }, [band]);

  return (
    <div
      className={
        passed
          ? "rounded-2xl bg-emerald-50 p-8 text-center"
          : "rounded-2xl bg-orange-50 p-8 text-center"
      }
    >
      <p className="text-sm text-muted-foreground">Overall band</p>
      <p className="mt-2 font-[family-name:var(--font-display)] text-6xl font-semibold text-[var(--brand)]">
        {shown.toFixed(1)}
      </p>
      <p
        className={
          passed
            ? "mt-4 text-lg font-semibold text-emerald-700"
            : "mt-4 text-lg font-semibold text-orange-700"
        }
      >
        {passed ? "PASSED" : "FAILED"}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        {passed
          ? `Bạn đã vượt qua Level ${level}!`
          : `Cần đạt ${minOverall.toFixed(1)} tổng và không kỹ năng nào dưới ${minSkill.toFixed(1)}`}
      </p>
    </div>
  );
}
