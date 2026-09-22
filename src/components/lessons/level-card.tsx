import Link from "next/link";
import { Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SkillProgressRing } from "@/components/lessons/skill-progress-ring";
import { cn } from "@/lib/utils";
import { SKILL_LABELS_VI } from "@/lib/constants";
import type { SkillName } from "@prisma/client";

type LevelCardProps = {
  number: number;
  titleVi: string;
  descriptionVi?: string | null;
  locked: boolean;
  isCurrent: boolean;
  skillProgress: Record<SkillName, number>;
};

const skills: SkillName[] = ["LISTENING", "READING", "WRITING", "SPEAKING"];

export function LevelCard({
  number,
  titleVi,
  descriptionVi,
  locked,
  isCurrent,
  skillProgress,
}: LevelCardProps) {
  const content = (
    <div
      className={cn(
        "relative h-full border bg-card p-4 transition-colors",
        !locked && "hover:border-[var(--brand)]/40 hover:bg-[var(--brand-soft)]/20",
        isCurrent && "border-[var(--brand)] ring-2 ring-[var(--brand)]/20",
        locked && "opacity-70"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-3xl font-semibold text-[var(--brand)]">{number}</p>
          <h3 className="mt-1 font-[family-name:var(--font-display)] text-base font-semibold">
            {titleVi}
          </h3>
        </div>
        {locked ? (
          <Lock className="size-4 text-muted-foreground" />
        ) : isCurrent ? (
          <Badge>Hiện tại</Badge>
        ) : null}
      </div>
      {descriptionVi ? (
        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
          {descriptionVi}
        </p>
      ) : null}
      <div className="mt-4 flex justify-between gap-1">
        {skills.map((skill) => (
          <SkillProgressRing
            key={skill}
            value={skillProgress[skill] ?? 0}
            label={SKILL_LABELS_VI[skill]}
          />
        ))}
      </div>
    </div>
  );

  if (locked) return content;
  return (
    <Link href={`/levels/${number}`} className="block h-full">
      {content}
    </Link>
  );
}
