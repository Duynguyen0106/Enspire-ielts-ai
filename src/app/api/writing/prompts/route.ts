import { NextResponse } from "next/server";
import { WritingTaskType } from "@prisma/client";
import { z } from "zod";
import { enforceRateLimit, jsonError, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";

const querySchema = z.object({
  taskType: z.nativeEnum(WritingTaskType).optional(),
  level: z.coerce.number().int().min(1).max(9).optional(),
});

export async function GET(req: Request) {
  const { user, error } = await requireApiUser();
  if (error || !user) return error!;
  const limited = await enforceRateLimit(user.id, "writing-prompts", 100);
  if (limited) return limited;

  const url = new URL(req.url);
  const parsed = querySchema.safeParse({
    taskType: url.searchParams.get("taskType") ?? undefined,
    level: url.searchParams.get("level") ?? undefined,
  });
  if (!parsed.success) return jsonError("Tham số không hợp lệ.");

  const level = parsed.data.level ?? user.profile?.currentLevel ?? 1;
  const where = {
    publishedAt: { not: null },
    ...(parsed.data.taskType ? { taskType: parsed.data.taskType } : {}),
    levelMin: { lte: level },
    levelMax: { gte: level },
  };

  const prompts = await prisma.writingPrompt.findMany({
    where,
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      taskType: true,
      title: true,
      titleVi: true,
      prompt: true,
      promptImageUrl: true,
      levelBucket: true,
      levelMin: true,
      levelMax: true,
    },
  });

  return NextResponse.json({ prompts, level });
}
