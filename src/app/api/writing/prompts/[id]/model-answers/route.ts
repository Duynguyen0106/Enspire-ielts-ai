import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import {
  enforceDailyRateLimit,
  enforceRateLimit,
  jsonError,
  requireApiUser,
} from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { generateModelAnswers } from "@/lib/ai/generate-model-answers";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, context: Ctx) {
  const { user, error } = await requireApiUser();
  if (error || !user) return error!;
  const limited = await enforceRateLimit(user.id, "model-answers", 5);
  if (limited) return limited;

  const { id } = await context.params;
  const prompt = await prisma.writingPrompt.findUnique({ where: { id } });
  if (!prompt) return jsonError("Không tìm thấy đề bài.", 404);

  let cached = await prisma.writingModelAnswer.findUnique({
    where: { promptId: id },
  });

  if (!cached) {
    const daily = await enforceDailyRateLimit(user.id, "model-answers-gen", 20);
    if (daily) return daily;
    const models = await generateModelAnswers({
      userId: user.id,
      taskType: prompt.taskType,
      prompt: prompt.prompt,
      level: user.profile?.currentLevel ?? 1,
    });
    cached = await prisma.writingModelAnswer.create({
      data: {
        promptId: id,
        band6Json: models.band6 as unknown as Prisma.InputJsonValue,
        band75Json: models.band75 as unknown as Prisma.InputJsonValue,
        band9Json: models.band9 as unknown as Prisma.InputJsonValue,
      },
    });
  }

  return NextResponse.json({
    promptId: id,
    band6: cached.band6Json,
    band75: cached.band75Json,
    band9: cached.band9Json,
  });
}
