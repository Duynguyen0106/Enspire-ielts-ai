import { cn } from "@/lib/utils";

type CriteriaCardProps = {
  titleVi: string;
  band: number;
  feedback: string;
  evidenceQuote?: string;
  className?: string;
};

export function CriteriaCard({
  titleVi,
  band,
  feedback,
  evidenceQuote,
  className,
}: CriteriaCardProps) {
  return (
    <div className={cn("space-y-2 border bg-card p-4", className)}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-medium">{titleVi}</h3>
        <span className="text-lg font-semibold text-[var(--brand)]">
          {band.toFixed(1)}
        </span>
      </div>
      <p className="text-sm text-muted-foreground">{feedback}</p>
      {evidenceQuote ? (
        <blockquote className="border-l-2 border-[var(--brand)] pl-3 text-sm italic">
          “{evidenceQuote}”
        </blockquote>
      ) : null}
    </div>
  );
}
