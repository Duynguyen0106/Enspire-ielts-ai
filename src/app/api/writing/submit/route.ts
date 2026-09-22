import { NextResponse } from "next/server";
import { WritingTaskType } from "@prisma/client";
import { z } from "zod";
import { enforceRateLimit, jsonError, requireApiUser } from "@/lib/api";
import { submitWritingPipeline } from "@/lib/ai/writing-gym";
import { WRITING_TASK_META } from "@/lib/task-types";
import { wordCount } from "@/lib/writing-metrics";

const bodySchema = z.object({
  taskType: z.nativeEnum(WritingTaskType),
  prompt: z.string().min(10),
  promptId: z.string().optional().nullable(),
  promptImageUrl: z.string().optional().nullable(),
  essayText: z.string().min(20),
  timeSpentSec: z.number().int().min(0).default(0),
  level: z.number().int().min(1).max(9).optional(),
  attemptId: z.string().optional().nullable(),
});

export async function POST(req: Request) {
  const { user, error } = await requireApiUser();
  if (error || !user) return error!;
  const limited = await enforceRateLimit(user.id, "writing-submit", 10);
  if (limited) return limited;

  const { requireEntitlement } = await import("@/lib/entitlements");
  const gate = await requireEntitlement(user.id, "WRITING_SUBMISSION", {
    level: user.profile?.currentLevel ?? 1,
  });
  if (!gate.allowed) {
    return jsonError(gate.reason ?? "Paywall", 402, {
      feature: "WRITING_SUBMISSION",
      remaining: gate.remaining,
    });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Dữ liệu không hợp lệ.");
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.");
  }

  const level = parsed.data.level ?? user.profile?.currentLevel ?? 1;
  const minWords = WRITING_TASK_META[parsed.data.taskType].minWords;
  const words = wordCount(parsed.data.essayText);

  try {
    const result = await submitWritingPipeline({
      userId: user.id,
      taskType: parsed.data.taskType,
      prompt: parsed.data.prompt,
      promptId: parsed.data.promptId,
      promptImageUrl: parsed.data.promptImageUrl,
      essayText: parsed.data.essayText,
      timeSpentSec: parsed.data.timeSpentSec,
      level,
      attemptId: parsed.data.attemptId,
    });
    return NextResponse.json({
      ...result,
      flaggedUnderLength: words < minWords,
    });
  } catch {
    return jsonError("Không chấm được bài Writing lúc này.", 502);
  }
}
