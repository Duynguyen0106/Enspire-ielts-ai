type LevelProgressStepperProps = {
  passedLevels: number[];
  currentLevel: number;
};

export function LevelProgressStepper({
  passedLevels,
  currentLevel,
}: LevelProgressStepperProps) {
  const passed = new Set(passedLevels);
  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Tiến độ thi 1 đến 9">
      {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => {
        const isPassed = passed.has(n);
        const isCurrent = n === currentLevel;
        return (
          <div key={n} className="flex items-center gap-2">
            <div
              className={
                isPassed
                  ? "flex size-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
                  : isCurrent
                    ? "flex size-8 items-center justify-center rounded-full border-2 border-primary text-sm font-semibold text-primary"
                    : "flex size-8 items-center justify-center rounded-full border border-border text-sm text-muted-foreground"
              }
            >
              {n}
            </div>
            {n < 9 ? (
              <div
                className={
                  isPassed ? "h-0.5 w-4 bg-primary" : "h-0.5 w-4 bg-border"
                }
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
