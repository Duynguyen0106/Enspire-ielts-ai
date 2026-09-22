import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import {
  enforceDailyRateLimit,
  enforceRateLimit,
  jsonError,
  requireApiUser,
} from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { evaluateWritingGym } from "@/lib/ai/writing-gym";
import { generateModelAnswers } from "@/lib/ai/generate-model-answers";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, context: Ctx) {
  const { user, error } = await requireApiUser();
  if (error || !user) return error!;
  const limited = await enforceRateLimit(user.id, "writing-reeval", 10);
  if (limited) return limited;
  const daily = await enforceDailyRateLimit(user.id, "writing-reeval-day", 3);
  if (daily) return daily;

  const { id } = await context.params;
  const submission = await prisma.writingSubmission.findFirst({
    where: { id, userId: user.id },
  });
  if (!submission) return jsonError("Không tìm thấy bài nộp.", 404);

  const evaluation = await evaluateWritingGym({
    text: submission.essayText,
    taskPrompt: submission.prompt,
    taskType: submission.taskType,
    level: submission.level,
    userId: user.id,
  });
  const models = await generateModelAnswers({
    userId: user.id,
    taskType: submission.taskType,
    prompt: submission.prompt,
    level: submission.level,
  });

  const saved = await prisma.writingEvaluation.upsert({
    where: { submissionId: submission.id },
    update: {
      overallBand: evaluation.overallBand,
      criteriaJson: evaluation.criteria as unknown as Prisma.InputJsonValue,
      correctionsJson: evaluation.corrections as unknown as Prisma.InputJsonValue,
      nextStepsJson: evaluation.nextSteps as unknown as Prisma.InputJsonValue,
      strengthsJson: evaluation.strengthsVi as unknown as Prisma.InputJsonValue,
      modelBand6: models.band6.text,
      modelBand75: models.band75.text,
      modelBand9: models.band9.text,
      modelNotesJson: {
        band6: models.band6.notesVi,
        band75: models.band75.notesVi,
        band9: models.band9.notesVi,
      } as Prisma.InputJsonValue,
    },
    create: {
      submissionId: submission.id,
      overallBand: evaluation.overallBand,
      criteriaJson: evaluation.criteria as unknown as Prisma.InputJsonValue,
      correctionsJson: evaluation.corrections as unknown as Prisma.InputJsonValue,
      nextStepsJson: evaluation.nextSteps as unknown as Prisma.InputJsonValue,
      strengthsJson: evaluation.strengthsVi as unknown as Prisma.InputJsonValue,
      modelBand6: models.band6.text,
      modelBand75: models.band75.text,
      modelBand9: models.band9.text,
      modelNotesJson: {
        band6: models.band6.notesVi,
        band75: models.band75.notesVi,
        band9: models.band9.notesVi,
      } as Prisma.InputJsonValue,
    },
  });

  return NextResponse.json({
    submissionId: submission.id,
    evaluationId: saved.id,
  });
}
