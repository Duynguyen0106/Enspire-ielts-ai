"use client";

import { useEffect, useState } from "react";

type SectionTransitionProps = {
  nextSectionTitle: string;
  seconds?: number;
  onDone: () => void;
};

export function SectionTransition({
  nextSectionTitle,
  seconds = 10,
  onDone,
}: SectionTransitionProps) {
  const [left, setLeft] = useState(seconds);

  useEffect(() => {
    const id = setInterval(() => {
      setLeft((s) => {
        if (s <= 1) {
          clearInterval(id);
          onDone();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [onDone]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <p className="text-sm uppercase tracking-wide text-muted-foreground">
        Chuyển phần thi…
      </p>
      <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold">
        {nextSectionTitle}
      </h2>
      <p className="text-muted-foreground">Bắt đầu sau {left}s</p>
      <ul className="space-y-1 text-sm text-muted-foreground">
        <li>✓ Không quay lại phần trước</li>
        <li>✓ Đồng hồ vẫn chạy</li>
        <li>✓ Giữ tập trung</li>
      </ul>
    </div>
  );
}
