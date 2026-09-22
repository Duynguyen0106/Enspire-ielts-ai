import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, requireApiUser } from "@/lib/api";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: Request, context: RouteContext) {
  const { user, error } = await requireApiUser();
  if (error || !user) return error!;

  const { id } = await context.params;

  const result = await prisma.placementResult.findFirst({
    where: { id, userId: user.id },
    include: {
      attempt: {
        include: {
          feedback: {
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              kind: true,
              model: true,
              responseJson: true,
              createdAt: true,
            },
          },
        },
      },
    },
  });

  if (!result) {
    return jsonError("Không tìm thấy kết quả.", 404);
  }

  return NextResponse.json({
    id: result.id,
    listeningBand: result.listeningBand,
    readingBand: result.readingBand,
    writingBand: result.writingBand,
    speakingBand: result.speakingBand,
    overallBand: result.overallBand,
    recommendedLevel: result.recommendedLevel,
    strengths: result.strengthsJson,
    weaknesses: result.weaknessesJson,
    summaryVi: result.summaryVi,
    createdAt: result.createdAt,
    rawScoreJson: result.attempt.rawScoreJson,
    feedback: result.attempt.feedback,
  });
}
