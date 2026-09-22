import Link from "next/link";
import { Check, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

type LessonListItemProps = {
  id: string;
  order: number;
  titleVi: string;
  estimatedMin: number;
  isCheckpoint?: boolean;
  completed?: boolean;
  locked?: boolean;
};

export function LessonListItem({
  id,
  order,
  titleVi,
  estimatedMin,
  isCheckpoint,
  completed,
  locked,
}: LessonListItemProps) {
  const inner = (
    <div
      className={cn(
        "flex items-center gap-3 border px-3 py-3 transition-colors",
        locked
          ? "cursor-not-allowed border-dashed opacity-60"
          : "hover:border-[var(--brand)]/40 hover:bg-[var(--brand-soft)]/30",
        completed && "border-[var(--brand)]/30 bg-[var(--brand-soft)]/20"
      )}
      title={locked ? "Hoàn thành bài trước để mở khóa" : undefined}
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold">
        {completed ? <Check className="size-4 text-[var(--brand)]" /> : order}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">
          {isCheckpoint ? "Checkpoint · " : ""}
          {titleVi}
        </p>
        <p className="text-xs text-muted-foreground">~{estimatedMin} phút</p>
      </div>
      {locked ? <Lock className="size-4 text-muted-foreground" /> : null}
    </div>
  );

  if (locked) return inner;
  return (
    <Link href={`/lessons/${id}`} className="block">
      {inner}
    </Link>
  );
}
