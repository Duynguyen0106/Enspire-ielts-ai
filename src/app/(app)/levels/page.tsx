import type { Metadata } from "next";
import type { SkillName } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/app-header";
import { LevelCard } from "@/components/lessons/level-card";
import {
  computeLessonProgress,
  isLevelUnlocked,
} from "@/lib/lesson-progress";

export const metadata: Metadata = {
  title: "Lộ trình",
};

const skills: SkillName[] = ["LISTENING", "READING", "WRITING", "SPEAKING"];

export default async function LevelsPage() {
  const user = await requireUser();
  const currentLevel = user.profile?.currentLevel ?? 1;
  const levels = await prisma.level.findMany({
    orderBy: { number: "asc" },
  });

  const cards = await Promise.all(
    levels.map(async (level) => {
      const unlocked = await isLevelUnlocked(user.id, level.number);
      const skillProgress = Object.fromEntries(
        await Promise.all(
          skills.map(async (skill) => {
            const prog = await computeLessonProgress(
              user.id,
              level.number,
              skill
            );
            return [skill, prog.percent] as const;
          })
        )
      ) as Record<SkillName, number>;

      return {
        level,
        locked: !unlocked && level.number !== currentLevel,
        isCurrent: level.number === currentLevel,
        skillProgress,
      };
    })
  );

  return (
    <>
      <AppHeader title="Lộ trình" currentLevel={currentLevel} />
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
            9 cấp độ IELTS
          </h2>
          <p className="mt-1 text-muted-foreground">
            Mỗi level có 4 kỹ năng · 3 bài học + 1 checkpoint.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map(({ level, locked, isCurrent, skillProgress }) => (
            <LevelCard
              key={level.id}
              number={level.number}
              titleVi={level.titleVi}
              descriptionVi={level.descriptionVi}
              locked={locked && !isCurrent}
              isCurrent={isCurrent}
              skillProgress={skillProgress}
            />
          ))}
        </div>
      </div>
    </>
  );
}
