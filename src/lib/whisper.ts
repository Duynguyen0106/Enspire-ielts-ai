import { toFile } from "openai";
import {
  getOpenAIClient,
  hasOpenAIKey,
  withTimeout,
} from "@/lib/ai/openai";
import type { WordTimestamp } from "@/lib/speaking-metrics";

export type WhisperResult = {
  text: string;
  words: WordTimestamp[];
  durationSec: number;
};

export async function transcribeVerbose(
  bytes: Buffer,
  filename = "speaking.webm",
  mimeType = "audio/webm"
): Promise<WhisperResult> {
  if (!hasOpenAIKey()) {
    return {
      text: "",
      words: [],
      durationSec: 0,
    };
  }

  const client = getOpenAIClient();
  const file = await toFile(bytes, filename, { type: mimeType });

  const transcription = await withTimeout(
    client.audio.transcriptions.create({
      file,
      model: "whisper-1",
      language: "en",
      response_format: "verbose_json",
      timestamp_granularities: ["word", "segment"],
    })
  );

  const raw = transcription as unknown as {
    text?: string;
    duration?: number;
    words?: { word: string; start: number; end: number }[];
  };

  const words: WordTimestamp[] = (raw.words ?? []).map((w) => ({
    word: w.word,
    start: w.start,
    end: w.end,
  }));

  return {
    text: raw.text ?? "",
    words,
    durationSec: raw.duration ?? (words.at(-1)?.end ?? 0),
  };
}
