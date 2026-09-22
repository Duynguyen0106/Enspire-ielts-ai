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

      const lessonStats = await Promise.all(
        skills.map((skill) => computeLessonProgress(user.id, level.number, skill))
      );
      const lessonsDone = lessonStats.reduce((s, p) => s + p.completed, 0);
      const lessonsTotal = lessonStats.reduce((s, p) => s + p.total, 0);
      const checkpointsDone = lessonStats.filter((p) => p.checkpointPassed).length;

      const fullTest = await prisma.test.findFirst({
        where: { type: "FULL_LEVEL", levelId: level.id },
        include: {
          attempts: {
            where: { userId: user.id, status: "SCORED" },
            orderBy: { startedAt: "desc" },
            take: 1,
          },
        },
      });
      let fullTestStatus: "locked" | "available" | "passed" | "failed" | "none" =
        "none";
      if (fullTest) {
        if (!unlocked && level.number !== currentLevel) fullTestStatus = "locked";
        else if (fullTest.attempts[0]?.passed === true) fullTestStatus = "passed";
        else if (fullTest.attempts[0]?.passed === false) fullTestStatus = "failed";
        else fullTestStatus = "available";
      }

      return {
        level,
        locked: !unlocked && level.number !== currentLevel,
        isCurrent: level.number === currentLevel,
        skillProgress,
        lessonsDone,
        lessonsTotal,
        checkpointsDone,
        fullTestStatus,
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
            Mỗi level có 4 kỹ năng · 3 bài học + 1 checkpoint · 1 bài thi cấp độ.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((c) => (
            <LevelCard
              key={c.level.id}
              number={c.level.number}
              titleVi={c.level.titleVi}
              descriptionVi={c.level.descriptionVi}
              locked={c.locked && !c.isCurrent}
              isCurrent={c.isCurrent}
              skillProgress={c.skillProgress}
              lessonsDone={c.lessonsDone}
              lessonsTotal={c.lessonsTotal}
              checkpointsDone={c.checkpointsDone}
              fullTestStatus={c.fullTestStatus}
            />
          ))}
        </div>
      </div>
    </>
  );
}
