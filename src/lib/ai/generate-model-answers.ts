import { generateObject } from "ai";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  EVAL_MODEL,
  getOpenAIProvider,
  hashPrompt,
  hasOpenAIKey,
  withTimeout,
} from "@/lib/ai/openai";
import {
  MODEL_ANSWER_SYSTEM,
  buildModelAnswerPrompt,
} from "@/lib/ai/prompts";
import {
  modelAnswersSchema,
  type ModelAnswers,
} from "@/lib/ai/gym-schemas";

function heuristicModels(prompt: string): ModelAnswers {
  return {
    band6: {
      text: `This essay talks about the topic. ${prompt.slice(0, 80)} I think this is important because many people face it. For example, in my country students study hard. Also, government should help. In conclusion, we need to improve this problem step by step.`,
      notesVi: [
        "Ý chính có nhưng phát triển nông.",
        "Từ vựng lặp và lỗi ngữ pháp rõ.",
        "Kết luận chung chung.",
      ],
    },
    band75: {
      text: `The issue raised in the prompt is increasingly relevant in modern societies. While some argue for one approach, others emphasise a balanced strategy. For instance, targeted investment and education can reduce the gap without creating new inequalities. Overall, a carefully designed policy is more effective than extreme measures.`,
      notesVi: [
        "Lập luận rõ, có ví dụ.",
        "Từ vựng linh hoạt hơn band 6.",
        "Còn vài chỗ có thể chính xác hơn.",
      ],
    },
    band9: {
      text: `Addressing the question requires a nuanced appraisal of competing priorities. Evidence from education and labour markets suggests that well-calibrated interventions yield sustainable gains, whereas one-size-fits-all solutions often falter. Ultimately, policymakers should combine structural reform with community-level support to achieve equitable outcomes.`,
      notesVi: [
        "Phát triển ý đầy đủ và logic chặt.",
        "Từ vựng chính xác, tự nhiên.",
        "Cấu trúc câu đa dạng, gần như không lỗi.",
      ],
    },
  };
}

export async function generateModelAnswers(input: {
  userId: string;
  taskType: string;
  prompt: string;
  level: number;
}): Promise<ModelAnswers> {
  const userPrompt = buildModelAnswerPrompt({
    taskType: input.taskType,
    prompt: input.prompt,
    level: input.level,
  });
  const promptHash = hashPrompt(userPrompt);
  let result: ModelAnswers;
  let model = EVAL_MODEL;

  try {
    if (!hasOpenAIKey()) throw new Error("no key");
    const openai = getOpenAIProvider();
    const run = async () => {
      const { object } = await generateObject({
        model: openai(EVAL_MODEL),
        schema: modelAnswersSchema,
        system: MODEL_ANSWER_SYSTEM,
        prompt: userPrompt,
        temperature: 0.4,
      });
      return object;
    };
    try {
      result = await withTimeout(run(), 45_000);
    } catch {
      result = await withTimeout(run(), 45_000);
    }
  } catch {
    model = "heuristic-fallback";
    result = heuristicModels(input.prompt);
  }

  const parsed = modelAnswersSchema.safeParse(result);
  result = parsed.success ? parsed.data : heuristicModels(input.prompt);

  await prisma.aIFeedback.create({
    data: {
      userId: input.userId,
      kind: "MODEL_ANSWER",
      model,
      promptHash,
      responseJson: {
        taskType: input.taskType,
        preview: result.band75.text.slice(0, 200),
      } as Prisma.InputJsonValue,
    },
  });

  return result;
}
