import { NextResponse } from "next/server";
import { SpeakingSessionType, type Prisma } from "@prisma/client";
import { z } from "zod";
import { enforceRateLimit, jsonError, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { buildSpeakingScript } from "@/lib/ai/speaking-gym";

const bodySchema = z.object({
  sessionType: z.nativeEnum(SpeakingSessionType),
  level: z.number().int().min(1).max(9).optional(),
  part: z.number().int().min(1).max(3).optional(),
});

export async function POST(req: Request) {
  const { user, error } = await requireApiUser();
  if (error || !user) return error!;
  const limited = await enforceRateLimit(user.id, "speaking-start", 30);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Dữ liệu không hợp lệ.");
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return jsonError("Dữ liệu không hợp lệ.");

  const level = parsed.data.level ?? user.profile?.currentLevel ?? 1;
  const script = buildSpeakingScript({
    sessionType: parsed.data.sessionType,
    part: parsed.data.part,
    level,
  });

  const session = await prisma.speakingSession.create({
    data: {
      userId: user.id,
      sessionType: parsed.data.sessionType,
      level,
      part: parsed.data.part ?? null,
      scriptJson: script as unknown as Prisma.InputJsonValue,
    },
  });

  return NextResponse.json({
    sessionId: session.id,
    script,
    level,
    sessionType: session.sessionType,
  });
}
