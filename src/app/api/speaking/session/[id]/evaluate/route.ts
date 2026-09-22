import { NextResponse } from "next/server";
import { enforceRateLimit, jsonError, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { evaluateSpeakingGym } from "@/lib/ai/speaking-gym";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, context: Ctx) {
  const { user, error } = await requireApiUser();
  if (error || !user) return error!;
  const limited = await enforceRateLimit(user.id, "speaking-eval", 10);
  if (limited) return limited;

  const { id } = await context.params;
  const session = await prisma.speakingSession.findFirst({
    where: { id, userId: user.id },
  });
  if (!session) return jsonError("Không tìm thấy phiên Speaking.", 404);

  try {
    const result = await evaluateSpeakingGym({
      userId: user.id,
      sessionId: session.id,
      sessionType: session.sessionType,
      level: session.level,
    });
    return NextResponse.json(result);
  } catch (e) {
    return jsonError(
      e instanceof Error ? e.message : "Không chấm được Speaking.",
      502
    );
  }
}
