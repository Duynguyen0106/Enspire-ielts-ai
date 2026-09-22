import { generateObject } from "ai";
import type { Prisma } from "@prisma/client";
import { toFile } from "openai";
import { prisma } from "@/lib/prisma";
import {
  EVAL_MODEL,
  EXAMINER_SYSTEM_PROMPT,
  getOpenAIClient,
  getOpenAIProvider,
  hashPrompt,
  hasOpenAIKey,
  withTimeout,
} from "@/lib/ai/openai";
import { buildSpeakingEvalPrompt } from "@/lib/ai/prompts";
import {
  speakingEvalSchema,
  type SpeakingEval,
} from "@/lib/ai/schemas";
import {
  decodeBase64Audio,
  estimateFluencyFromTranscript,
} from "@/lib/audio";

function heuristicSpeakingEval(transcript: string): SpeakingEval {
  const { wordsPerMinute, wordCount } = estimateFluencyFromTranscript(
    transcript
  );
  const base = wordCount < 40 ? 4.0 : wordsPerMinute > 100 ? 6.0 : 5.0;
  return {
    overallBand: base,
    criteria: {
      fluencyCoherence: {
        band: base,
        feedbackVi: "Độ lưu loát ở mức trung bình; hãy nói dài hơn và liên kết ý.",
      },
      lexicalResource: {
        band: base,
        feedbackVi: "Từ vựng cơ bản; cần thêm cụm từ tự nhiên.",
      },
      grammaticalRange: {
        band: Math.max(4, base - 0.5),
        feedbackVi: "Ngữ pháp đủ hiểu; giảm lỗi thì và mạo từ.",
      },
      pronunciation: {
        band: base,
        feedbackVi: "Ước lượng từ transcript — cần luyện trọng âm và nối âm.",
        note: "Ước lượng từ transcript",
      },
    },
    corrections: [],
    nextSteps: [
      "Luyện trả lời Part 1 trong 20–30 giây mỗi câu.",
      "Ghi âm lại và nghe để phát hiện chỗ ngập ngừng.",
      "Học 5 cụm từ chủ đề mỗi ngày.",
      "Luyện cue card với cấu trúc intro–detail–example–conclude.",
    ],
  };
}

export async function transcribeAudioBase64(
  audioBase64: string
): Promise<string> {
  if (!hasOpenAIKey()) {
    return "[Không có OPENAI_API_KEY — không thể phiên âm. Học viên đã nộp bài Speaking.]";
  }

  const bytes = decodeBase64Audio(audioBase64);
  const client = getOpenAIClient();
  const file = await toFile(bytes, "speaking.webm", { type: "audio/webm" });

  const transcription = await withTimeout(
    client.audio.transcriptions.create({
      file,
      model: "whisper-1",
      language: "en",
    })
  );

  return transcription.text;
}

export async function evaluateSpeaking(input: {
  transcript: string;
  part: string | number;
  questions: string[];
  level?: number;
  wordsPerMinute?: number;
  pauseCount?: number;
  userId: string;
  attemptId?: string;
  skillId?: string;
}): Promise<SpeakingEval> {
  const fluency =
    input.wordsPerMinute != null
      ? {
          wordsPerMinute: input.wordsPerMinute,
          pauseCount: input.pauseCount ?? 0,
        }
      : estimateFluencyFromTranscript(input.transcript);

  const userPrompt = buildSpeakingEvalPrompt({
    transcript: input.transcript,
    part: input.part,
    questions: input.questions,
    wordsPerMinute: fluency.wordsPerMinute,
    pauseCount: fluency.pauseCount,
    level: input.level,
  });
  const promptHash = hashPrompt(userPrompt);

  let result: SpeakingEval;
  let model = EVAL_MODEL;

  try {
    const openai = getOpenAIProvider();
    const run = async () => {
      const { object } = await generateObject({
        model: openai(EVAL_MODEL),
        schema: speakingEvalSchema,
        system: EXAMINER_SYSTEM_PROMPT,
        prompt: userPrompt,
        temperature: 0.2,
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
    result = heuristicSpeakingEval(input.transcript);
  }

  const parsed = speakingEvalSchema.safeParse(result);
  result = parsed.success
    ? parsed.data
    : heuristicSpeakingEval(input.transcript);

  await prisma.aIFeedback.create({
    data: {
      userId: input.userId,
      attemptId: input.attemptId,
      skillId: input.skillId,
      kind: "speaking_evaluate",
      model,
      promptHash,
      responseJson: result as unknown as Prisma.InputJsonValue,
    },
  });

  return result;
}
