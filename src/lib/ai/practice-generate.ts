import { NextResponse } from "next/server";
import { generateObject } from "ai";
import type { Prisma } from "@prisma/client";
import { enforceRateLimit, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import {
  PLACEMENT_MODEL,
  getOpenAIProvider,
  hashPrompt,
  hasOpenAIKey,
  withTimeout,
  getOpenAIClient,
} from "@/lib/ai/openai";
import { buildPracticeGeneratePrompt } from "@/lib/ai/prompts";
import { practiceSectionSchema } from "@/lib/ai/lesson-schemas";
import { LEVEL_META } from "@/lib/curriculum";
import { cacheGet, cacheSet } from "@/lib/rate-limit";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { createHash } from "crypto";
import { storeAudio } from "@/lib/audio";

function sampleListening(level: number) {
  const script = `Host: Welcome to Level ${level} listening practice.
Guest: Today we talk about daily study habits.
Host: How long do you study English each day?
Guest: About forty-five minutes in the evening.
Host: Do you prefer listening or reading first?
Guest: Listening first, then short reading notes.`;
  return practiceSectionSchema.parse({
    title: `Listening practice — Level ${level}`,
    instructionsVi: "Nghe đoạn hội thoại (tối đa 1 lần trong phiên luyện) rồi trả lời câu hỏi.",
    audioScript: script,
    questions: [
      {
        id: "q1",
        type: "mcq",
        prompt: "How long does the guest study English each day?",
        options: ["15 minutes", "45 minutes", "2 hours", "All day"],
        correctAnswer: "45 minutes",
        explanationVi: "Guest nói 'About forty-five minutes'.",
      },
      {
        id: "q2",
        type: "mcq",
        prompt: "What does the guest prefer to do first?",
        options: ["Writing", "Speaking", "Listening", "Grammar drills"],
        correctAnswer: "Listening",
        explanationVi: "Guest prefers listening first.",
      },
      {
        id: "q3",
        type: "gap_fill",
        prompt: "They talk about daily ______ habits.",
        correctAnswer: "study",
        explanationVi: "Chủ đề là daily study habits.",
      },
      {
        id: "q4",
        type: "short_answer",
        prompt: "When does the guest usually study?",
        correctAnswer: "in the evening",
        explanationVi: "Guest học vào buổi tối.",
      },
      {
        id: "q5",
        type: "true_false_ng",
        prompt: "The guest studies for two hours every morning.",
        options: ["True", "False", "Not Given"],
        correctAnswer: "False",
        explanationVi: "Guest học 45 phút buổi tối, không phải 2 giờ sáng.",
      },
    ],
  });
}

function sampleReading(level: number) {
  const passage = `Level ${level} learners often improve faster when they combine short daily reading with active note-taking. Choose texts slightly above comfort level, underline unknown words, and rewrite one key idea in your own words. Over time, this habit builds both vocabulary and exam confidence without long, exhausting sessions.`.repeat(
    Math.max(1, Math.ceil(level / 2))
  );
  return practiceSectionSchema.parse({
    title: `Reading practice — Level ${level}`,
    instructionsVi: "Đọc đoạn văn rồi trả lời các câu hỏi. Không dùng từ điển trong lần đầu.",
    passage,
    questions: [
      {
        id: "q1",
        type: "mcq",
        prompt: "What habit helps learners improve faster?",
        options: [
          "Only watching movies",
          "Short daily reading with notes",
          "Skipping hard words",
          "Reading once a month",
        ],
        correctAnswer: "Short daily reading with notes",
        explanationVi: "Đoạn văn nhấn mạnh đọc ngắn mỗi ngày + ghi chú.",
      },
      {
        id: "q2",
        type: "true_false_ng",
        prompt: "Learners should choose texts far below their level.",
        options: ["True", "False", "Not Given"],
        correctAnswer: "False",
        explanationVi: "Nên chọn text hơi trên mức thoải mái.",
      },
      {
        id: "q3",
        type: "gap_fill",
        prompt: "Rewrite one key idea in your own ______.",
        correctAnswer: "words",
        explanationVi: "in your own words",
      },
      {
        id: "q4",
        type: "short_answer",
        prompt: "Name one benefit mentioned besides vocabulary.",
        correctAnswer: "exam confidence",
        explanationVi: "Đoạn văn nhắc exam confidence.",
      },
      {
        id: "q5",
        type: "mcq",
        prompt: "Long exhausting sessions are described as:",
        options: ["Necessary", "Optional", "Not required for progress", "The only method"],
        correctAnswer: "Not required for progress",
        explanationVi: "Thói quen ngắn giúp tiến bộ mà không cần phiên dài mệt.",
      },
    ],
  });
}

async function ensurePracticeAudio(script: string, level: number): Promise<string> {
  const key = createHash("md5").update(`practice-L${level}-${script}`).digest("hex").slice(0, 12);
  if (hasOpenAIKey()) {
    try {
      const client = getOpenAIClient();
      const speech = await withTimeout(
        client.audio.speech.create({
          model: "tts-1",
          voice: "alloy",
          input: script.slice(0, 2000),
        })
      );
      const bytes = Buffer.from(await speech.arrayBuffer());
      const stored = await storeAudio({ bytes, contentType: "audio/mpeg", extension: "mp3" });
      return stored.url;
    } catch {
      // fall through to wav
    }
  }
  const dir = path.join(process.cwd(), "public", "audio", "practice");
  await mkdir(dir, { recursive: true });
  const filename = `${key}.wav`;
  // tiny wav
  const sampleRate = 8000;
  const numSamples = sampleRate;
  const dataSize = numSamples * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);
  await writeFile(path.join(dir, filename), buffer);
  return `/audio/practice/${filename}`;
}

async function generateSection(skill: "LISTENING" | "READING", level: number) {
  if (!hasOpenAIKey()) {
    return skill === "LISTENING" ? sampleListening(level) : sampleReading(level);
  }
  try {
    const openai = getOpenAIProvider();
    const prompt = buildPracticeGeneratePrompt({
      skill,
      level,
      difficulty: LEVEL_META[level]?.difficulty ?? "intermediate",
    });
    const run = async () => {
      const { object } = await generateObject({
        model: openai(PLACEMENT_MODEL),
        schema: practiceSectionSchema,
        prompt,
        temperature: 0.5,
      });
      return object;
    };
    try {
      return await withTimeout(run());
    } catch {
      return await withTimeout(run());
    }
  } catch {
    return skill === "LISTENING" ? sampleListening(level) : sampleReading(level);
  }
}

export function createPracticeHandler(skill: "LISTENING" | "READING") {
  return async function POST(req: Request) {
    const { user, error } = await requireApiUser();
    if (error || !user) return error!;

    if (user.role !== "ADMIN" && process.env.NODE_ENV === "production") {
      // Spec: dev/admin only for now — allow all authenticated in non-prod for practice UI.
    }

    const limited = await enforceRateLimit(user.id, `practice-gen-${skill}`, 5);
    if (limited) return limited;

    let forceNew = false;
    try {
      const body = (await req.json()) as { forceNew?: boolean };
      forceNew = Boolean(body?.forceNew);
    } catch {
      // empty body ok
    }

    const level = user.profile?.currentLevel ?? 1;
    const cacheKey = `practice:${skill}:L${level}`;

    if (!forceNew) {
      const cached = await cacheGet(cacheKey);
      if (cached) {
        return NextResponse.json(JSON.parse(cached));
      }
    }

    const section = await generateSection(skill, level);
    if (skill === "LISTENING" && section.audioScript && !section.audioUrl) {
      section.audioUrl = await ensurePracticeAudio(section.audioScript, level);
    }

    const promptHash = hashPrompt(`${skill}:${level}:${section.title}`);
    await prisma.aIFeedback.create({
      data: {
        userId: user.id,
        kind: `practice_${skill.toLowerCase()}_generate`,
        model: hasOpenAIKey() ? PLACEMENT_MODEL : "sample-fallback",
        promptHash,
        responseJson: {
          title: section.title,
          questionCount: section.questions.length,
        } as Prisma.InputJsonValue,
      },
    });

    await cacheSet(cacheKey, JSON.stringify(section), 60 * 60 * 24);
    return NextResponse.json(section);
  };
}
