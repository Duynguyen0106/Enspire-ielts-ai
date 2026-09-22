import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { AttemptStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { jsonError, requireApiUser } from "@/lib/api";
import { placementAnswerBodySchema } from "@/lib/ai/schemas";

export async function POST(req: Request) {
  const { user, error } = await requireApiUser();
  if (error || !user) return error!;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Dữ liệu không hợp lệ.");
  }

  const parsed = placementAnswerBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.");
  }

  const attempt = await prisma.testAttempt.findFirst({
    where: {
      id: parsed.data.attemptId,
      userId: user.id,
      status: AttemptStatus.IN_PROGRESS,
    },
  });

  if (!attempt) {
    return jsonError("Không tìm thấy bài làm đang diễn ra.", 404);
  }

  const question = await prisma.question.findUnique({
    where: { id: parsed.data.questionId },
    include: { section: true },
  });

  if (!question || question.section.testId !== attempt.testId) {
    return jsonError("Câu hỏi không thuộc bài kiểm tra này.", 400);
  }

  await prisma.answer.upsert({
    where: {
      attemptId_questionId: {
        attemptId: attempt.id,
        questionId: question.id,
      },
    },
    update: {
      userResponseJson: parsed.data.userResponseJson as Prisma.InputJsonValue,
    },
    create: {
      attemptId: attempt.id,
      questionId: question.id,
      userResponseJson: parsed.data.userResponseJson as Prisma.InputJsonValue,
    },
  });

  return NextResponse.json({ ok: true });
}
