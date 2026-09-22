import { NextResponse } from "next/server";
import { enforceRateLimit, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { user, error } = await requireApiUser();
  if (error || !user) return error!;
  const limited = await enforceRateLimit(user.id, "speaking-list", 100);
  if (limited) return limited;

  const url = new URL(req.url);
  const limit = Math.min(50, Number(url.searchParams.get("limit") ?? 20));

  const sessions = await prisma.speakingSession.findMany({
    where: { userId: user.id, completedAt: { not: null } },
    include: { evaluation: true },
    orderBy: { startedAt: "desc" },
    take: limit,
  });

  return NextResponse.json({
    sessions: sessions.map((s) => ({
      id: s.id,
      sessionType: s.sessionType,
      level: s.level,
      part: s.part,
      startedAt: s.startedAt,
      completedAt: s.completedAt,
      overallBand: s.evaluation?.overallBand ?? null,
    })),
  });
}
