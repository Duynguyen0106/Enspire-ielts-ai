import { generateObject } from "ai";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  PLACEMENT_MODEL,
  EXAMINER_SYSTEM_PROMPT,
  getOpenAIProvider,
  hashPrompt,
  withTimeout,
} from "@/lib/ai/openai";
import { buildPlacementSummaryPrompt } from "@/lib/ai/prompts";
import {
  placementSummarySchema,
  type PlacementSummary,
} from "@/lib/ai/schemas";

function heuristicSummary(input: {
  listeningBand: number;
  readingBand: number;
  writingBand: number;
  speakingBand: number;
  overallBand: number;
  recommendedLevel: number;
}): PlacementSummary {
  const ranks = [
    { skill: "Listening", band: input.listeningBand, key: "listening" },
    { skill: "Reading", band: input.readingBand, key: "reading" },
    { skill: "Writing", band: input.writingBand, key: "writing" },
    { skill: "Speaking", band: input.speakingBand, key: "speaking" },
  ].sort((a, b) => b.band - a.band);

  const strongest = ranks[0]!;
  const weakest = ranks[ranks.length - 1]!;

  return {
    strengths: [
      `${strongest.skill} là thế mạnh tương đối (band ${strongest.band}).`,
      "Bạn đã hoàn thành đủ 4 kỹ năng trong bài kiểm tra đầu vào.",
    ],
    weaknesses: [
      `${weakest.skill} cần ưu tiên cải thiện (band ${weakest.band}).`,
      "Cần luyện đều đặn để cân bằng điểm 4 kỹ năng.",
    ],
    summaryVi: `Điểm tổng ước lượng của bạn là ${input.overallBand}. Hệ thống đề xuất bắt đầu ở Level ${input.recommendedLevel}. Hãy tập trung vào kỹ năng yếu hơn và duy trì thói quen luyện mỗi ngày.`,
    skillNotes: {
      listening: `Listening: band ${input.listeningBand}.`,
      reading: `Reading: band ${input.readingBand}.`,
      writing: `Writing: band ${input.writingBand}.`,
      speaking: `Speaking: band ${input.speakingBand}.`,
    },
  };
}

export async function generatePlacementSummary(input: {
  listeningBand: number;
  readingBand: number;
  writingBand: number;
  speakingBand: number;
  overallBand: number;
  recommendedLevel: number;
  userId: string;
  attemptId: string;
}): Promise<PlacementSummary> {
  const userPrompt = buildPlacementSummaryPrompt(input);
  const promptHash = hashPrompt(userPrompt);
  let model = PLACEMENT_MODEL;
  let result: PlacementSummary;

  try {
    const openai = getOpenAIProvider();
    const run = async () => {
      const { object } = await generateObject({
        model: openai(PLACEMENT_MODEL),
        schema: placementSummarySchema,
        system: EXAMINER_SYSTEM_PROMPT,
        prompt: userPrompt,
        temperature: 0.3,
      });
      return object;
    };
    try {
      result = await withTimeout(run());
    } catch {
      result = await withTimeout(run());
    }
  } catch {
    model = "heuristic-fallback";
    result = heuristicSummary(input);
  }

  const parsed = placementSummarySchema.safeParse(result);
  result = parsed.success ? parsed.data : heuristicSummary(input);

  await prisma.aIFeedback.create({
    data: {
      userId: input.userId,
      attemptId: input.attemptId,
      kind: "placement_summary",
      model,
      promptHash,
      responseJson: result as unknown as Prisma.InputJsonValue,
    },
  });

  return result;
}
