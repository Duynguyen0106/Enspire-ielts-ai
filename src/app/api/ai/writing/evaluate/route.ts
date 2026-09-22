import { NextResponse } from "next/server";
import { enforceAiRateLimit, jsonError, requireApiUser } from "@/lib/api";
import { writingEvaluateBodySchema } from "@/lib/ai/schemas";
import { evaluateWriting } from "@/lib/ai/evaluate-writing";

export async function POST(req: Request) {
  const { user, error } = await requireApiUser();
  if (error || !user) return error!;

  const limited = await enforceAiRateLimit(user.id);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Dữ liệu không hợp lệ.");
  }

  const parsed = writingEvaluateBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.");
  }

  try {
    const result = await evaluateWriting({
      text: parsed.data.text,
      taskPrompt: parsed.data.taskPrompt,
      taskType: parsed.data.taskType,
      level: parsed.data.level,
      userId: user.id,
    });
    return NextResponse.json(result);
  } catch {
    return jsonError(
      "Không thể chấm Writing lúc này. Vui lòng thử lại sau.",
      502
    );
  }
}
