import { NextResponse } from "next/server";
import { enforceRateLimit, jsonError, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, context: Ctx) {
  const { user, error } = await requireApiUser();
  if (error || !user) return error!;
  const limited = await enforceRateLimit(user.id, "speaking-detail", 100);
  if (limited) return limited;

  const { id } = await context.params;
  const session = await prisma.speakingSession.findFirst({
    where: { id, userId: user.id },
    include: {
      turns: { orderBy: { createdAt: "asc" } },
      evaluation: true,
    },
  });
  if (!session) return jsonError("Không tìm thấy phiên Speaking.", 404);

  return NextResponse.json({ session });
}
