import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { requireApiUser, jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { submitSection, finishAttempt } from "@/lib/exam-orchestrator";

type Ctx = {
  params: Promise<{ attemptId: string; sectionId: string }>;
};

const bodySchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.string().min(1),
        response: z.unknown(),
      })
    )
    .default([]),
  timeSpentSec: z.number().int().nonnegative().optional(),
  speakingSessionId: z.string().optional(),
});

export async function POST(req: Request, context: Ctx) {
  const { user, error } = await requireApiUser();
  if (error || !user) return error!;

  const { attemptId, sectionId } = await context.params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Dữ liệu không hợp lệ.");
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return jsonError("Dữ liệu không hợp lệ.");

  try {
    if (parsed.data.speakingSessionId) {
      await prisma.speakingSession.updateMany({
        where: {
          id: parsed.data.speakingSessionId,
          userId: user.id,
        },
        data: { attemptId },
      });
    }

    const result = await submitSection({
      attemptId,
      sectionId,
      userId: user.id,
      answers: parsed.data.answers.map((a) => ({
        questionId: a.questionId,
        response: a.response as Prisma.InputJsonValue,
      })),
      timeSpentSec: parsed.data.timeSpentSec,
    });

    if (!result.nextSectionId) {
      await finishAttempt({ attemptId, userId: user.id });
      return NextResponse.json({
        nextSectionId: null,
        status: "SCORING",
      });
    }

    return NextResponse.json(result);
  } catch (e) {
    const status =
      e && typeof e === "object" && "status" in e
        ? Number((e as { status: number }).status)
        : 400;
    return jsonError(
      e instanceof Error ? e.message : "Nộp phần thi thất bại.",
      status
    );
  }
}
