import { NextResponse } from "next/server";
import { enforceRateLimit, jsonError, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, context: Ctx) {
  const { user, error } = await requireApiUser();
  if (error || !user) return error!;
  const limited = await enforceRateLimit(user.id, "writing-detail", 100);
  if (limited) return limited;

  const { id } = await context.params;
  const submission = await prisma.writingSubmission.findFirst({
    where: { id, userId: user.id },
    include: { evaluation: true },
  });
  if (!submission) return jsonError("Không tìm thấy bài nộp.", 404);

  return NextResponse.json({ submission });
}
