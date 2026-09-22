export type WordTimestamp = {
  word: string;
  start: number;
  end: number;
  probability?: number;
};

const FILLERS = [
  "um",
  "uh",
  "erm",
  "ah",
  "à",
  "ừ",
  "ờ",
  "like",
  "you know",
];

export function computeWpm(wordCount: number, durationSec: number): number {
  if (durationSec <= 0) return 0;
  return Math.round((wordCount / durationSec) * 60);
}

export function countFillers(transcript: string): number {
  const lower = transcript.toLowerCase();
  let count = 0;
  for (const filler of FILLERS) {
    const re = new RegExp(`\\b${filler.replace(/\s+/g, "\\s+")}\\b`, "gi");
    count += (lower.match(re) ?? []).length;
  }
  return count;
}

export function detectPausesFromTimestamps(
  words: WordTimestamp[],
  gapSec = 1.5
): { startMs: number; endMs: number }[] {
  const pauses: { startMs: number; endMs: number }[] = [];
  for (let i = 1; i < words.length; i++) {
    const prev = words[i - 1]!;
    const cur = words[i]!;
    const gap = cur.start - prev.end;
    if (gap >= gapSec) {
      pauses.push({
        startMs: Math.round(prev.end * 1000),
        endMs: Math.round(cur.start * 1000),
      });
    }
  }
  return pauses;
}

export function speakingMetricsFromTranscript(input: {
  transcript: string;
  durationSec: number;
  wordTimestamps?: WordTimestamp[];
  envelopePauses?: { startMs: number; endMs: number }[];
}) {
  const words = input.transcript.trim().split(/\s+/).filter(Boolean);
  const wpm = computeWpm(words.length, input.durationSec);
  const fillerCount = countFillers(input.transcript);
  const tsPauses = input.wordTimestamps
    ? detectPausesFromTimestamps(input.wordTimestamps)
    : [];
  const pauseCount = Math.max(
    tsPauses.length,
    input.envelopePauses?.length ?? 0
  );
  return {
    wordCount: words.length,
    wpm,
    fillerCount,
    pauseCount,
    pauses: tsPauses.length > 0 ? tsPauses : (input.envelopePauses ?? []),
  };
}
