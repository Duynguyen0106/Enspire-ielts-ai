import type { SkillName } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function computeLessonProgress(
  userId: string,
  levelNumber: number,
  skill: SkillName
) {
  const level = await prisma.level.findUnique({ where: { number: levelNumber } });
  const skillRow = await prisma.skill.findUnique({ where: { name: skill } });
  if (!level || !skillRow) {
    return { total: 0, completed: 0, percent: 0, checkpointPassed: false };
  }

  const lessons = await prisma.lesson.findMany({
    where: { levelId: level.id, skillId: skillRow.id, publishedAt: { not: null } },
    select: { id: true, isCheckpoint: true },
  });
  const completions = await prisma.lessonCompletion.findMany({
    where: {
      userId,
      lessonId: { in: lessons.map((l) => l.id) },
    },
  });
  const completedIds = new Set(completions.map((c) => c.lessonId));
  const checkpoint = lessons.find((l) => l.isCheckpoint);
  const checkpointPassed = checkpoint
    ? completions.some((c) => c.lessonId === checkpoint.id && c.checkpointPassed)
    : false;

  const total = lessons.length;
  const completed = completedIds.size;
  return {
    total,
    completed,
    percent: total === 0 ? 0 : Math.round((completed / total) * 100),
    checkpointPassed,
  };
}

export async function isLevelUnlocked(userId: string, levelNumber: number) {
  if (levelNumber <= 1) return true;
  const profile = await prisma.profile.findUnique({ where: { userId } });
  if (!profile) return false;

  // Current level and below are always accessible after placement assignment.
  // Higher levels unlock only when the previous level's 4 skill checkpoints pass.
  if (levelNumber < profile.currentLevel) return true;
  if (levelNumber === profile.currentLevel) return true;

  const prev = levelNumber - 1;
  const skills: SkillName[] = ["LISTENING", "READING", "WRITING", "SPEAKING"];
  for (const skill of skills) {
    const prog = await computeLessonProgress(userId, prev, skill);
    if (!prog.checkpointPassed) return false;
  }
  return true;
}

export async function getNextUnfinishedLesson(
  userId: string,
  levelNumber: number
) {
  const level = await prisma.level.findUnique({ where: { number: levelNumber } });
  if (!level) return null;

  const lessons = await prisma.lesson.findMany({
    where: { levelId: level.id, publishedAt: { not: null } },
    include: { skill: true },
    orderBy: [{ skill: { name: "asc" } }, { order: "asc" }],
  });
  const completions = await prisma.lessonCompletion.findMany({
    where: { userId, lessonId: { in: lessons.map((l) => l.id) } },
    select: { lessonId: true },
  });
  const done = new Set(completions.map((c) => c.lessonId));
  return lessons.find((l) => !done.has(l.id)) ?? null;
}

export async function ensureProgressRow(input: {
  userId: string;
  levelId: string;
  skillId: string;
}) {
  return prisma.progress.upsert({
    where: {
      userId_levelId_skillId: {
        userId: input.userId,
        levelId: input.levelId,
        skillId: input.skillId,
      },
    },
    update: { lastActivityAt: new Date() },
    create: {
      userId: input.userId,
      levelId: input.levelId,
      skillId: input.skillId,
      lessonsCompleted: 0,
      checkpointPassed: false,
    },
  });
}
