import { NextResponse } from "next/server";
import { enforceRateLimit, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { user, error } = await requireApiUser();
  if (error || !user) return error!;
  const limited = await enforceRateLimit(user.id, "writing-history", 100);
  if (limited) return limited;

  const url = new URL(req.url);
  const limit = Math.min(50, Number(url.searchParams.get("limit") ?? 20));
  const offset = Math.max(0, Number(url.searchParams.get("offset") ?? 0));

  const [total, rows] = await Promise.all([
    prisma.writingSubmission.count({ where: { userId: user.id } }),
    prisma.writingSubmission.findMany({
      where: { userId: user.id },
      include: { evaluation: true },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
  ]);

  return NextResponse.json({
    total,
    submissions: rows.map((s) => ({
      id: s.id,
      taskType: s.taskType,
      level: s.level,
      wordCount: s.wordCount,
      timeSpentSec: s.timeSpentSec,
      createdAt: s.createdAt,
      overallBand: s.evaluation?.overallBand ?? null,
    })),
  });
}
