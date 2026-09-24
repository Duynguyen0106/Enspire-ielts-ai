"use client";

type ScoringProgressProps = {
  scoringStatus: string;
  scoringError?: string | null;
  onRetry?: () => void;
};

const STEPS = [
  "Đang chấm phần Nghe…",
  "Đang chấm phần Đọc…",
  "Đang chấm phần Viết…",
  "Đang chấm phần Nói…",
  "Đang tổng hợp kết quả…",
];

export function ScoringProgress({
  scoringStatus,
  scoringError,
  onRetry,
}: ScoringProgressProps) {
  const failed = scoringStatus === "FAILED";
  const done = scoringStatus === "SCORED";
  // Animate through steps while scoring
  const active = failed || done ? STEPS.length : Math.min(3, STEPS.length - 1);

  return (
    <div className="mx-auto max-w-md space-y-4 py-16 text-center">
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
        Đang chấm bài thi
      </h1>
      <ul className="space-y-2 text-left text-sm">
        {STEPS.map((step, i) => {
          const complete = i < active || done;
          const current = i === active && !done && !failed;
          return (
            <li key={step} className="flex items-center gap-2">
              <span>
                {complete ? "✓" : current ? "…" : "○"}
              </span>
              <span className={current ? "animate-pulse" : undefined}>{step}</span>
            </li>
          );
        })}
      </ul>
      {failed ? (
        <div className="space-y-3">
          <p className="text-sm text-destructive">
            {scoringError ?? "Chấm điểm thất bại."}
          </p>
          {onRetry ? (
            <button
              type="button"
              className="rounded-md bg-[var(--brand)] px-4 py-2 text-sm text-white"
              onClick={onRetry}
            >
              Thử chấm lại
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
