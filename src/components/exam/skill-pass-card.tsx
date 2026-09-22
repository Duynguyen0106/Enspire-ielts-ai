type SkillPassCardProps = {
  skill: string;
  labelVi: string;
  band: number;
  threshold: number;
  passed: boolean;
};

export function SkillPassCard({
  skill,
  labelVi,
  band,
  threshold,
  passed,
}: SkillPassCardProps) {
  return (
    <div
      className={
        passed
          ? "rounded-xl border border-emerald-200 bg-emerald-50/50 p-4"
          : "rounded-xl border border-destructive/30 bg-destructive/5 p-4"
      }
    >
      <p className="text-sm text-muted-foreground">{labelVi}</p>
      <p className="mt-1 text-2xl font-semibold">{band.toFixed(1)}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Ngưỡng {threshold.toFixed(1)} · {passed ? "Đạt" : "Chưa đạt"} ({skill})
      </p>
    </div>
  );
}
