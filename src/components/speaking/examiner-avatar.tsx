"use client";

import { cn } from "@/lib/utils";

type ExaminerAvatarProps = {
  speaking?: boolean;
};

export function ExaminerAvatar({ speaking }: ExaminerAvatarProps) {
  return (
    <div className="flex items-center gap-3">
      <svg
        width="56"
        height="56"
        viewBox="0 0 56 56"
        className="shrink-0"
        aria-hidden
      >
        <circle cx="28" cy="28" r="26" fill="var(--brand-soft)" stroke="var(--brand)" />
        <circle cx="20" cy="24" r="3" fill="var(--brand-deep)" />
        <circle cx="36" cy="24" r="3" fill="var(--brand-deep)" />
        <path
          d={speaking ? "M18 36 Q28 46 38 36" : "M18 38 Q28 34 38 38"}
          fill="none"
          stroke="var(--brand-deep)"
          strokeWidth="2"
          className={cn(speaking && "animate-pulse")}
        />
      </svg>
      <div>
        <p className="font-medium">Examiner</p>
        <p className="text-xs text-muted-foreground">
          {speaking ? "Đang đọc câu hỏi…" : "Đang chờ câu trả lời"}
        </p>
      </div>
    </div>
  );
}
