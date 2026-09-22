import { NextResponse } from "next/server";
import { enforceAiRateLimit, jsonError, requireApiUser } from "@/lib/api";
import { speakingEvaluateBodySchema } from "@/lib/ai/schemas";
import { evaluateSpeaking } from "@/lib/ai/evaluate-speaking";

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

  const parsed = speakingEvaluateBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.");
  }

  try {
    const result = await evaluateSpeaking({
      transcript: parsed.data.transcript,
      part: parsed.data.part,
      questions: parsed.data.questions,
      level: parsed.data.level,
      wordsPerMinute: parsed.data.wordsPerMinute,
      pauseCount: parsed.data.pauseCount,
      userId: user.id,
    });
    return NextResponse.json(result);
  } catch {
    return jsonError(
      "Không thể chấm Speaking lúc này. Vui lòng thử lại sau.",
      502
    );
  }
}
