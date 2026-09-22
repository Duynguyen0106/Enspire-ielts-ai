import { EXAMINER_SYSTEM_PROMPT } from "@/lib/ai/openai";

export { EXAMINER_SYSTEM_PROMPT };

export function buildTutorSystemPrompt(input: {
  level: number;
  weakSkills: string[];
  nativeLang?: string;
  lessonTitle?: string;
  lessonObjective?: string;
}): string {
  const weak =
    input.weakSkills.length > 0 ? input.weakSkills.join(", ") : "none specified";
  return `You are VietIELTS Tutor, a patient bilingual Vietnamese-English IELTS teacher.
Rules:
- Explain in Vietnamese. Give examples in English with Vietnamese translation.
- Match your language to the student's IELTS level: ${input.level}/9. Level 1–3 = very simple English, short sentences. Level 4–6 = intermediate. Level 7–9 = natural, near-native.
- Student's weak skills: ${weak}. Prioritize helping with these.
- When correcting, show the mistake, the fix, and why in Vietnamese.
- Never give direct answers to test questions. Guide with questions and hints.
- Keep replies under 200 words unless asked for more.
- Use markdown. No emojis unless the student uses them first.
${input.lessonTitle ? `- Current lesson: ${input.lessonTitle}` : ""}
${input.lessonObjective ? `- Lesson objective: ${input.lessonObjective}` : ""}
Native language preference: ${input.nativeLang ?? "vi"}.`;
}

export const GRADER_SYSTEM = `You are an IELTS exercise grader for Vietnamese learners.
Score objectively from 0 to 1. Explain briefly in Vietnamese.
Return valid JSON only matching the schema. No markdown.`;

export const LESSON_JSON_SCHEMA = `{
  title: string,
  titleVi: string,
  objectiveVi: string,
  warmup: { questionVi: string, tipsVi: string[] },
  sections: [
    { headingVi, headingEn?, contentMd: string, examplesEn?: string[] }
  ],
  exercises: [
    { type: "mcq" | "gap_fill" | "short_answer" | "rewrite" | "translation",
      prompt: string, options?, correctAnswer, explanationVi, hintVi }
  ],
  checkpoint: {
    type: same as above,
    prompt, correctAnswer, explanationVi,
    passingScore: 0.8
  }
}`;

/** @deprecated Prefer buildTutorSystemPrompt */
export function TUTOR_SYSTEM(
  level: number,
  weakSkills: string[],
  nativeLang = "vi"
) {
  return buildTutorSystemPrompt({ level, weakSkills, nativeLang });
}

export function buildLessonGenerationPrompt(input: {
  level: number;
  skill: string;
  topics: string[];
  difficulty: string;
  passageWords?: number;
}): string {
  return [
    `Generate IELTS ${input.skill} lesson content for Level ${input.level}/9.`,
    `Difficulty guide: ${input.difficulty}`,
    `Topics in order (3 lessons + 1 checkpoint): ${input.topics.join(" | ")}`,
    input.passageWords
      ? `For READING, include a passage of about ${input.passageWords} words in content.`
      : "",
    "Return a JSON array of exactly 4 lesson objects matching this schema:",
    `{ title, titleVi, objectiveVi, warmup:{questionVi,tipsVi[]}, sections:[{headingVi,headingEn?,contentMd,examplesEn?}], exercises:[{type,prompt,options?,correctAnswer,explanationVi,hintVi}], checkpoint:{type,prompt,options?,correctAnswer,explanationVi,passingScore}, audioScript?, passage? }`,
    "Exercise types allowed: mcq, gap_fill, short_answer, rewrite, translation.",
    "Each lesson needs 2–4 exercises. Checkpoint has one exercise with passingScore 0.8.",
    "Teaching content in bilingual style; practice prompts in English.",
  ]
    .filter(Boolean)
    .join("\n");
}

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

export function buildPracticeGeneratePrompt(input: {
  skill: "LISTENING" | "READING";
  level: number;
  difficulty: string;
}): string {
  return [
    `Generate one IELTS-style ${input.skill} practice section for Level ${input.level}/9.`,
    `Difficulty: ${input.difficulty}`,
    "Return JSON: { title, instructionsVi, audioScript?, passage?, questions:[{id,type,prompt,options?,correctAnswer,explanationVi}] }",
    "Include 5–8 questions. Types: mcq, gap_fill, true_false_ng, short_answer.",
    input.skill === "LISTENING"
      ? "Include audioScript (short conversation, 120–200 words)."
      : "Include passage (appropriate length for the level).",
  ].join("\n");
}
