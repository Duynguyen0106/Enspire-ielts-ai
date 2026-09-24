import type { UnlockSource } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function grantUnlock(
  userId: string,
  levelNumber: number,
  source: UnlockSource
) {
  const level = await prisma.level.findUnique({
    where: { number: levelNumber },
  });
  if (!level) return null;

  return prisma.levelUnlock.upsert({
    where: {
      userId_levelId: { userId, levelId: level.id },
    },
    update: {},
    create: {
      userId,
      levelId: level.id,
      unlockedBy: source,
    },
  });
}

export async function isLevelUnlocked(
  userId: string,
  levelNumber: number
): Promise<boolean> {
  if (levelNumber <= 1) return true;

  const profile = await prisma.profile.findUnique({ where: { userId } });
  if (!profile) return false;
  if (levelNumber <= profile.currentLevel) return true;

  const level = await prisma.level.findUnique({
    where: { number: levelNumber },
  });
  if (!level) return false;

  const unlock = await prisma.levelUnlock.findUnique({
    where: {
      userId_levelId: { userId, levelId: level.id },
    },
  });
  return Boolean(unlock);
}

export async function ensurePlacementUnlocks(userId: string) {
  const profile = await prisma.profile.findUnique({ where: { userId } });
  if (!profile) return;
  for (let n = 1; n <= profile.currentLevel; n++) {
    await grantUnlock(userId, n, "PLACEMENT");
  }
}
