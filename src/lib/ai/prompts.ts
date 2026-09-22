import { EXAMINER_SYSTEM_PROMPT } from "@/lib/ai/openai";

export { EXAMINER_SYSTEM_PROMPT };

export function buildWritingEvalPrompt(input: {
  text: string;
  taskPrompt: string;
  taskType: string;
  wordCount: number;
  minWords: number;
  level?: number;
}): string {
  return [
    "Evaluate this IELTS Writing response.",
    `Task type: ${input.taskType}`,
    `Task prompt: ${input.taskPrompt}`,
    `Word count: ${input.wordCount} (minimum expected: ${input.minWords})`,
    input.level ? `Learner approximate level: ${input.level}` : "",
    input.wordCount < input.minWords
      ? "IMPORTANT: Word count is below minimum — deduct from Task Achievement and mention this in feedbackVi."
      : "",
    "Learner response:",
    input.text,
    "Return JSON only with keys: overallBand, criteria (taskAchievement, coherenceCohesion, lexicalResource, grammaticalRange each with band+feedbackVi), corrections (max 10), nextSteps (3-5 Vietnamese strings).",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildSpeakingEvalPrompt(input: {
  transcript: string;
  part: string | number;
  questions: string[];
  wordsPerMinute?: number;
  pauseCount?: number;
  level?: number;
}): string {
  return [
    "Evaluate this IELTS Speaking response from a transcript.",
    `Part: ${input.part}`,
    `Questions: ${JSON.stringify(input.questions)}`,
    input.wordsPerMinute != null
      ? `Estimated WPM: ${input.wordsPerMinute}`
      : "",
    input.pauseCount != null ? `Estimated pause count: ${input.pauseCount}` : "",
    input.level ? `Learner approximate level: ${input.level}` : "",
    "Transcript:",
    input.transcript,
    "Pronunciation must be estimated from transcript only; set criteria.pronunciation.note to 'Ước lượng từ transcript'.",
    "Return JSON only with keys: overallBand, criteria (fluencyCoherence, lexicalResource, grammaticalRange, pronunciation), corrections, nextSteps (Vietnamese).",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildPlacementSummaryPrompt(input: {
  listeningBand: number;
  readingBand: number;
  writingBand: number;
  speakingBand: number;
  overallBand: number;
  recommendedLevel: number;
}): string {
  return [
    "Create a Vietnamese placement summary for an IELTS learner.",
    `Listening: ${input.listeningBand}`,
    `Reading: ${input.readingBand}`,
    `Writing: ${input.writingBand}`,
    `Speaking: ${input.speakingBand}`,
    `Overall: ${input.overallBand}`,
    `Recommended level: ${input.recommendedLevel}`,
    "Return JSON only: { strengths: string[], weaknesses: string[], summaryVi: string, skillNotes: { listening, reading, writing, speaking } }.",
    "strengths/weaknesses in Vietnamese, 2–6 items each. summaryVi 2–4 sentences.",
  ].join("\n");
}
