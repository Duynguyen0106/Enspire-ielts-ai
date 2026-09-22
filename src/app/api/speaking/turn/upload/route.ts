import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { enforceRateLimit, jsonError, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { decodeBase64Audio, storeAudio } from "@/lib/audio";
import { transcribeVerbose } from "@/lib/whisper";
import { speakingMetricsFromTranscript } from "@/lib/speaking-metrics";
import { hasOpenAIKey } from "@/lib/ai/openai";

const bodySchema = z.object({
  sessionId: z.string().min(1),
  part: z.number().int().min(1).max(3),
  questionText: z.string().min(1),
  audioBase64: z.string().optional(),
  typedTranscript: z.string().optional(),
  durationSec: z.number().min(0).max(180).optional(),
  envelopePauses: z
    .array(z.object({ startMs: z.number(), endMs: z.number() }))
    .optional(),
});

export async function POST(req: Request) {
  const { user, error } = await requireApiUser();
  if (error || !user) return error!;
  const limited = await enforceRateLimit(user.id, "speaking-upload", 20);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Dữ liệu không hợp lệ.");
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return jsonError("Dữ liệu không hợp lệ.");

  const session = await prisma.speakingSession.findFirst({
    where: { id: parsed.data.sessionId, userId: user.id },
  });
  if (!session) return jsonError("Không tìm thấy phiên Speaking.", 404);

  let audioUrl: string | null = null;
  let transcript = parsed.data.typedTranscript?.trim() ?? "";
  let wordTimestamps: { word: string; start: number; end: number }[] = [];
  let durationSec = parsed.data.durationSec ?? 0;

  if (parsed.data.audioBase64) {
    const bytes = decodeBase64Audio(parsed.data.audioBase64);
    const stored = await storeAudio({
      bytes,
      contentType: "audio/webm",
      extension: "webm",
    });
    audioUrl = stored.url;

    if (hasOpenAIKey()) {
      try {
        const whisper = await transcribeVerbose(bytes);
        if (whisper.text.trim()) transcript = whisper.text.trim();
        wordTimestamps = whisper.words;
        if (whisper.durationSec > 0) durationSec = whisper.durationSec;
      } catch {
        // fall through to typed transcript
      }
    }
  }

  if (!transcript) {
    return jsonError(
      "Không có transcript. Hãy ghi âm lại hoặc nhập transcript thủ công (chế độ gõ)."
    );
  }

  const metrics = speakingMetricsFromTranscript({
    transcript,
    durationSec: durationSec || 30,
    wordTimestamps,
    envelopePauses: parsed.data.envelopePauses,
  });

  const turn = await prisma.speakingTurn.create({
    data: {
      sessionId: session.id,
      part: parsed.data.part,
      questionText: parsed.data.questionText,
      audioUrl,
      transcript,
      wordTimestampsJson: wordTimestamps as unknown as Prisma.InputJsonValue,
      durationSec: durationSec || 30,
      wpm: metrics.wpm,
      pauseCount: metrics.pauseCount,
      fillerCount: metrics.fillerCount,
    },
  });

  return NextResponse.json({
    turnId: turn.id,
    transcript,
    metrics: {
      wpm: metrics.wpm,
      pauseCount: metrics.pauseCount,
      fillerCount: metrics.fillerCount,
      wordCount: metrics.wordCount,
      pauses: metrics.pauses,
    },
    usedTypedFallback: !parsed.data.audioBase64 || !hasOpenAIKey(),
  });
}
