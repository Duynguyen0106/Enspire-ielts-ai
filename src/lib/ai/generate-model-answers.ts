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
  const topic = prompt.slice(0, 100).replace(/\s+/g, " ").trim();
  return {
    band6: {
      text: [
        `Nowadays many people talk about this topic: ${topic}`,
        `I think it is important because it affect our daily life. Some people say it is good, but other people say it is bad.`,
        `For example, in my country students have this problem and they feel stress. Also government should do something to help them.`,
        `However, there is also disadvantage. It can be expensive and some people don't have enough money.`,
        `In conclusion, I believe we need to improve this situation step by step and people should try harder.`,
      ].join(" "),
      notesVi: [
        "Có ý chính nhưng câu ngắn, lặp từ (people/good/bad).",
        "Lỗi ngữ pháp rõ: affect → affects; other people → others.",
        "Ví dụ chung chung, kết luận yếu.",
        "Phạm vi từ vựng hạn chế so với band cao hơn.",
      ],
    },
    band75: {
      text: [
        `The issue of ${topic.toLowerCase()} has become increasingly relevant in modern societies.`,
        `While some argue that the benefits are obvious, others emphasise the risks of unequal access and weak implementation.`,
        `For instance, targeted investment in training and infrastructure can reduce the gap without creating new inequalities.`,
        `At the same time, policymakers must monitor unintended consequences and support vulnerable groups.`,
        `Overall, a carefully designed policy that balances opportunity with safeguards is more effective than extreme measures.`,
      ].join(" "),
      notesVi: [
        "Lập luận rõ, có ví dụ và sự cân bằng quan điểm.",
        "Từ vựng linh hoạt hơn band 6 (infrastructure, safeguards).",
        "Còn vài chỗ có thể chính xác/tinh tế hơn để đạt 9.",
      ],
    },
    band9: {
      text: [
        `Addressing ${topic.toLowerCase()} requires a nuanced appraisal of competing social and economic priorities.`,
        `Empirical evidence from education and labour markets suggests that well-calibrated interventions yield sustainable gains, whereas one-size-fits-all solutions often falter under local constraints.`,
        `Moreover, equitable outcomes depend not only on funding but on institutional capacity, transparent evaluation, and community-level participation.`,
        `Where reforms neglect these conditions, short-term improvements tend to erode and public trust declines.`,
        `Ultimately, policymakers should combine structural reform with carefully sequenced support so that progress remains both ambitious and durable.`,
      ].join(" "),
      notesVi: [
        "Phát triển ý đầy đủ, logic chặt, chuyển ý tự nhiên.",
        "Từ vựng chính xác, gần như không lỗi (calibrated, institutional capacity).",
        "Cấu trúc câu đa dạng; lập luận mang tính học thuật cao rõ hơn band 6.",
        "Không chỉ dài hơn — chất lượng ngôn ngữ và tư duy cao hơn hẳn.",
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
