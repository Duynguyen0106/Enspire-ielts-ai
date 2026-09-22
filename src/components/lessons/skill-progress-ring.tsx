"use client";

type SkillProgressRingProps = {
  value: number;
  size?: number;
  label?: string;
};

export function SkillProgressRing({
  value,
  size = 36,
  label,
}: SkillProgressRingProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const stroke = 3;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (clamped / 100) * c;

  return (
    <div className="flex flex-col items-center gap-1" title={label}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--brand)"
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      {label ? (
        <span className="text-[10px] text-muted-foreground">{label}</span>
      ) : null}
    </div>
  );
}
