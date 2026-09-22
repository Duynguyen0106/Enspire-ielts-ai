import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { SkillName } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/app-header";
import { LessonListItem } from "@/components/lessons/lesson-list-item";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SKILL_LABELS, SKILL_LABELS_VI } from "@/lib/constants";
import {
  computeLessonProgress,
  isLevelUnlocked,
} from "@/lib/lesson-progress";

type LevelPageProps = {
  params: Promise<{ level: string }>;
};

const skills: SkillName[] = ["LISTENING", "READING", "WRITING", "SPEAKING"];

export async function generateMetadata({
  params,
}: LevelPageProps): Promise<Metadata> {
  const { level } = await params;
  return { title: `Level ${level}` };
}

export default async function LevelDetailPage({ params }: LevelPageProps) {
  const user = await requireUser();
  const currentLevel = user.profile?.currentLevel ?? 1;
  const { level: levelParam } = await params;
  const levelNumber = Number(levelParam);
  if (!Number.isInteger(levelNumber) || levelNumber < 1 || levelNumber > 9) {
    notFound();
  }

  const unlocked = await isLevelUnlocked(user.id, levelNumber);
  if (!unlocked && levelNumber !== currentLevel) {
    notFound();
  }

  const level = await prisma.level.findUnique({ where: { number: levelNumber } });
  if (!level) notFound();

  const skillRows = await prisma.skill.findMany();
  const byName = Object.fromEntries(skillRows.map((s) => [s.name, s])) as Record<
    SkillName,
    (typeof skillRows)[number]
  >;

  const tracks = await Promise.all(
    skills.map(async (skill) => {
      const skillRow = byName[skill];
      const lessons = skillRow
        ? await prisma.lesson.findMany({
            where: {
              levelId: level.id,
              skillId: skillRow.id,
              publishedAt: { not: null },
            },
            orderBy: { order: "asc" },
          })
        : [];
      const completions = await prisma.lessonCompletion.findMany({
        where: {
          userId: user.id,
          lessonId: { in: lessons.map((l) => l.id) },
        },
      });
      const done = new Set(completions.map((c) => c.lessonId));
      const prog = await computeLessonProgress(user.id, levelNumber, skill);
      return { skill, lessons, done, prog };
    })
  );

  const overall =
    tracks.reduce((sum, t) => sum + t.prog.percent, 0) / Math.max(tracks.length, 1);
  const allCheckpoints = tracks.every((t) => t.prog.checkpointPassed);

  return (
    <>
      <AppHeader title={`Level ${levelNumber}`} currentLevel={currentLevel} />
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        <div className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
                {level.titleVi}
              </h2>
              <p className="mt-1 text-muted-foreground">{level.descriptionVi}</p>
            </div>
            <Button disabled={!allCheckpoints} title={!allCheckpoints ? "Hoàn thành 4 checkpoint trước" : undefined}>
              Làm bài kiểm tra cấp độ
            </Button>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>Tiến độ level</span>
              <span className="text-muted-foreground">{Math.round(overall)}%</span>
            </div>
            <Progress value={overall} />
          </div>
        </div>

        <Tabs defaultValue="LISTENING">
          <TabsList className="flex w-full flex-wrap justify-start">
            {skills.map((skill) => (
              <TabsTrigger key={skill} value={skill}>
                {SKILL_LABELS_VI[skill]}
              </TabsTrigger>
            ))}
          </TabsList>
          {tracks.map(({ skill, lessons, done, prog }) => (
            <TabsContent key={skill} value={skill} className="space-y-3 pt-3">
              <p className="text-sm text-muted-foreground">
                {SKILL_LABELS[skill]} · {prog.completed}/{prog.total} bài
                {prog.checkpointPassed ? " · Checkpoint ✓" : ""}
              </p>
              {lessons.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Chưa có bài học. Chạy{" "}
                  <code className="text-xs">pnpm db:seed:lessons:sample</code>.
                </p>
              ) : (
                lessons.map((lesson, index) => {
                  const prevDone =
                    index === 0 || done.has(lessons[index - 1]!.id);
                  return (
                    <LessonListItem
                      key={lesson.id}
                      id={lesson.id}
                      order={lesson.order}
                      titleVi={lesson.titleVi}
                      estimatedMin={lesson.estimatedMin}
                      isCheckpoint={lesson.isCheckpoint}
                      completed={done.has(lesson.id)}
                      locked={!prevDone && !done.has(lesson.id)}
                    />
                  );
                })
              )}
            </TabsContent>
          ))}
        </Tabs>

        <Button variant="outline" render={<Link href="/levels" />}>
          ← Tất cả level
        </Button>
      </div>
    </>
  );
}
