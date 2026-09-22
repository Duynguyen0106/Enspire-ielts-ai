import { prisma } from "@/lib/prisma";

const STALE_MS = 4 * 60 * 60 * 1000;

export async function markStaleAttemptsAbandoned(): Promise<number> {
  const cutoff = new Date(Date.now() - STALE_MS);
  const result = await prisma.testAttempt.updateMany({
    where: {
      status: "IN_PROGRESS",
      test: { type: "FULL_LEVEL" },
      startedAt: { lt: cutoff },
    },
    data: {
      status: "ABANDONED",
      scoringStatus: "FAILED",
      scoringError: "Abandoned after 4h inactivity",
    },
  });
  return result.count;
}

export async function retryFailedScorings(maxRetries = 3): Promise<string[]> {
  const cutoff = new Date(Date.now() - 60 * 60 * 1000);
  const failed = await prisma.testAttempt.findMany({
    where: {
      scoringStatus: "FAILED",
      scoringRetries: { lt: maxRetries },
      submittedAt: { lt: cutoff },
      test: { type: "FULL_LEVEL" },
    },
    take: 20,
    select: { id: true },
  });

  const ids: string[] = [];
  for (const a of failed) {
    await prisma.testAttempt.update({
      where: { id: a.id },
      data: {
        scoringStatus: "SCORING",
        scoringRetries: { increment: 1 },
        scoringError: null,
      },
    });
    ids.push(a.id);
  }
  return ids;
}
