import {
  PrismaClient,
  SkillName,
  type Prisma,
} from "@prisma/client";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { createHash } from "crypto";
import { LEVEL_META, lessonTopicsFor, passageWordTarget } from "../src/lib/curriculum";
import type { LessonContent } from "../src/lib/ai/lesson-schemas";

const prisma = new PrismaClient();

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function buildToneWav(seconds = 1.5): Buffer {
  const sampleRate = 8000;
  const numSamples = Math.floor(sampleRate * seconds);
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
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const sample = Math.sin(2 * Math.PI * 440 * t) * 2500;
    buffer.writeInt16LE(Math.floor(sample), 44 + i * 2);
  }
  return buffer;
}

async function ensureLessonAudio(key: string): Promise<string> {
  const dir = path.join(process.cwd(), "public", "audio", "lessons");
  await mkdir(dir, { recursive: true });
  const hash = createHash("md5").update(key).digest("hex").slice(0, 10);
  const filename = `${hash}.wav`;
  const filePath = path.join(dir, filename);
  await writeFile(filePath, buildToneWav(1.2));
  return `/audio/lessons/${filename}`;
}

function buildSampleLesson(input: {
  level: number;
  skill: SkillName;
  order: number;
  topic: string;
  isCheckpoint: boolean;
  audioUrl?: string;
}): LessonContent {
  const { level, skill, order, topic, isCheckpoint } = input;
  const words = passageWordTarget(level);
  const passage =
    skill === "READING"
      ? `This is a Level ${level} reading passage about ${topic.toLowerCase()}. ` +
        `Everyday English helps learners build confidence step by step. ` +
        `People talk about family, work, travel, and school. ` +
        `Clear topic sentences and simple linking words make ideas easy to follow. ` +
        `When you read, underline key nouns and verbs, then answer with short phrases. ` +
        `Practice regularly and check new words in a notebook. `.repeat(
          Math.max(1, Math.ceil(words / 90))
        )
      : undefined;

  const audioScript =
    skill === "LISTENING"
      ? `A: Hello! How are you today?\nB: I'm fine, thank you. Let's talk about ${topic.toLowerCase()}.\nA: Sure. First, listen carefully and note important details.\nB: Okay. I will write short answers after the conversation.`
      : undefined;

  const baseExercises: LessonContent["exercises"] = [
    {
      type: "mcq",
      prompt: `Which option best matches the topic "${topic}"?`,
      options: [
        topic,
        "Unrelated weather report",
        "Math formula list",
        "Random shopping receipt",
      ],
      correctAnswer: topic,
      explanationVi: "Chọn đáp án trùng với chủ đề bài học.",
      hintVi: "Nhìn lại tiêu đề bài.",
    },
    {
      type: "gap_fill",
      prompt: `Complete: IELTS Level ${level} focuses on ______ skills.`,
      correctAnswer: skill.toLowerCase(),
      explanationVi: `Đáp án là ${skill.toLowerCase()}.`,
      hintVi: "Tên kỹ năng bằng tiếng Anh, chữ thường.",
    },
    {
      type:
        skill === "WRITING"
          ? "rewrite"
          : skill === "SPEAKING"
            ? "short_answer"
            : "short_answer",
      prompt:
        skill === "WRITING"
          ? `Rewrite in clearer English: "I go school every day for learn English."`
          : skill === "SPEAKING"
            ? `Type a short answer (2–3 sentences) about: ${topic}`
            : `Answer briefly: What is one useful tip for ${skill.toLowerCase()} at Level ${level}?`,
      correctAnswer:
        skill === "WRITING"
          ? "I go to school every day to learn English."
          : "Listen for key words and write short notes.",
      explanationVi: "Câu trả lời cần rõ nghĩa và đúng ngữ pháp cơ bản.",
      hintVi: "Viết ngắn gọn, đúng ý chính.",
    },
  ];

  if (skill === "WRITING" && !isCheckpoint) {
    baseExercises.push({
      type: "translation",
      prompt: "Translate to English: Tôi học IELTS mỗi ngày.",
      correctAnswer: "I study IELTS every day.",
      explanationVi: "Dịch sát nghĩa, dùng thì hiện tại đơn.",
      hintVi: "study / every day",
    });
  }

  const checkpoint = {
    type: (skill === "WRITING" ? "rewrite" : "mcq") as LessonContent["checkpoint"]["type"],
    prompt: isCheckpoint
      ? `Checkpoint Level ${level} ${skill}: choose the best study habit.`
      : `Mini check: ${topic}`,
    options: [
      "Review mistakes and practice daily",
      "Never check answers",
      "Skip listening audio",
      "Memorize random words only",
    ],
    correctAnswer: "Review mistakes and practice daily",
    explanationVi: "Ôn lỗi và luyện đều đặn là cách hiệu quả nhất.",
    passingScore: 0.8,
  };

  return {
    title: isCheckpoint
      ? `${skill} Checkpoint L${level}`
      : `${topic} (L${level})`,
    titleVi: isCheckpoint
      ? `Kiểm tra ${skill} — Level ${level}`
      : `${topic} — Bài ${order}`,
    objectiveVi: isCheckpoint
      ? `Đạt ít nhất 80% để vượt checkpoint ${skill} Level ${level}.`
      : `Hiểu và luyện kỹ năng liên quan đến: ${topic}.`,
    warmup: {
      questionVi: `Bạn đã biết gì về chủ đề "${topic}"?`,
      tipsVi: [
        "Đọc kỹ đề trước khi trả lời.",
        "Ghi chú từ khóa quan trọng.",
        "Hỏi AI Tutor nếu cần gợi ý.",
      ],
    },
    sections: [
      {
        headingVi: "Giới thiệu",
        headingEn: "Introduction",
        contentMd: `## ${topic}\n\nBài học Level **${level}** giúp bạn luyện **${skill}**.\n\n${LEVEL_META[level]?.descriptionVi ?? ""}\n\n${
          skill === "SPEAKING"
            ? "Shadowing script: *Hello, my name is Lan. I practice English every morning.*"
            : ""
        }`,
        examplesEn:
          skill === "WRITING"
            ? [
                "I wake up early and review vocabulary.",
                "Paraphrase: Many people believe → It is widely believed that",
              ]
            : skill === "SPEAKING"
              ? ["I usually study in the evening.", "My favourite place is the park."]
              : ["Key tip: focus on meaning first.", "Then check grammar and spelling."],
      },
      {
        headingVi: "Chiến lược",
        headingEn: "Strategy",
        contentMd: `1. Xác định mục tiêu bài.\n2. Luyện ví dụ ngắn.\n3. Làm bài tập và đọc giải thích.\n4. Hỏi Tutor khi chưa rõ.`,
      },
    ],
    exercises: isCheckpoint ? [checkpoint] : baseExercises,
    checkpoint,
    audioUrl: input.audioUrl,
    audioScript,
    passage,
  };
}

async function tryGenerateWithAI(input: {
  level: number;
  skill: SkillName;
}): Promise<LessonContent[] | null> {
  if (!process.env.OPENAI_API_KEY?.trim()) return null;
  try {
    const { generateObject } = await import("ai");
    const { createOpenAI } = await import("@ai-sdk/openai");
    const { z } = await import("zod");
    const { buildLessonGenerationPrompt } = await import("../src/lib/ai/prompts");
    const { lessonContentSchema } = await import("../src/lib/ai/lesson-schemas");

    const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const topics = lessonTopicsFor(input.level, input.skill);
    const batchSchema = z.object({
      lessons: z.array(lessonContentSchema).length(4),
    });
    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: batchSchema,
      prompt: buildLessonGenerationPrompt({
        level: input.level,
        skill: input.skill,
        topics: [...topics],
        difficulty: LEVEL_META[input.level]?.difficulty ?? "intermediate",
        passageWords:
          input.skill === "READING"
            ? passageWordTarget(input.level)
            : undefined,
      }),
      temperature: 0.4,
    });
    return object.lessons;
  } catch (err) {
    console.warn(
      `AI generation failed for L${input.level} ${input.skill}, using samples:`,
      err instanceof Error ? err.message : err
    );
    return null;
  }
}

async function isDuplicate(title: string, objective: string): Promise<boolean> {
  try {
    const { isDuplicateContent } = await import("../src/lib/ai/embeddings");
    return isDuplicateContent(`${title}\n${objective}`, 0.9);
  } catch {
    return false;
  }
}

async function saveEmbedding(refId: string, text: string) {
  try {
    const { saveContentEmbedding } = await import("../src/lib/ai/embeddings");
    await saveContentEmbedding({
      refType: "LESSON",
      refId,
      text,
    });
  } catch {
    // ignore embedding failures in seed
  }
}

async function upsertLessonTrack(input: {
  levelNumber: number;
  skill: SkillName;
  useAi: boolean;
  skipDedup?: boolean;
}) {
  const level = await prisma.level.findUnique({
    where: { number: input.levelNumber },
  });
  const skill = await prisma.skill.findUnique({ where: { name: input.skill } });
  if (!level || !skill) {
    throw new Error(`Missing level ${input.levelNumber} or skill ${input.skill}`);
  }

  const topics = lessonTopicsFor(input.levelNumber, input.skill);
  let contents = input.useAi
    ? await tryGenerateWithAI({
        level: input.levelNumber,
        skill: input.skill,
      })
    : null;

  if (!contents) {
    contents = [];
    for (let i = 0; i < 4; i++) {
      const isCheckpoint = i === 3;
      let audioUrl: string | undefined;
      if (input.skill === "LISTENING") {
        audioUrl = await ensureLessonAudio(
          `L${input.levelNumber}-${input.skill}-${i + 1}`
        );
      }
      contents.push(
        buildSampleLesson({
          level: input.levelNumber,
          skill: input.skill,
          order: i + 1,
          topic: topics[i]!,
          isCheckpoint,
          audioUrl,
        })
      );
    }
  } else if (input.skill === "LISTENING") {
    for (let i = 0; i < contents.length; i++) {
      const c = contents[i]!;
      if (!c.audioUrl) {
        c.audioUrl = await ensureLessonAudio(
          `L${input.levelNumber}-${input.skill}-${i + 1}-${c.title}`
        );
      }
    }
  }

  for (let i = 0; i < contents.length; i++) {
    const content = contents[i]!;
    const order = i + 1;
    const isCheckpoint = i === 3 || order === 4;
    const dedupKey = `L${input.levelNumber}|${input.skill}|${order}|${content.title}|${content.objectiveVi}`;

    if (!input.skipDedup) {
      const dup = await isDuplicate(content.title, dedupKey);
      if (dup) {
        console.log(
          `  skip duplicate: L${input.levelNumber} ${input.skill} #${order} ${content.title}`
        );
        continue;
      }
    }

    const contentJson = {
      objectiveVi: content.objectiveVi,
      warmup: content.warmup,
      sections: content.sections,
      checkpoint: content.checkpoint,
      audioUrl: content.audioUrl,
      audioScript: content.audioScript,
      passage: content.passage,
    } as Prisma.InputJsonValue;

    const lesson = await prisma.lesson.upsert({
      where: {
        levelId_skillId_order: {
          levelId: level.id,
          skillId: skill.id,
          order,
        },
      },
      update: {
        title: content.title,
        titleVi: content.titleVi,
        contentJson,
        publishedAt: new Date(),
        isCheckpoint,
        estimatedMin: isCheckpoint ? 20 : 15,
      },
      create: {
        levelId: level.id,
        skillId: skill.id,
        title: content.title,
        titleVi: content.titleVi,
        order,
        contentJson,
        publishedAt: new Date(),
        isCheckpoint,
        estimatedMin: isCheckpoint ? 20 : 15,
      },
    });

    await prisma.exercise.deleteMany({ where: { lessonId: lesson.id } });

    const exercises = isCheckpoint
      ? [content.checkpoint]
      : [...content.exercises, content.checkpoint];

    for (let e = 0; e < exercises.length; e++) {
      const ex = exercises[e]!;
      const isCp = isCheckpoint || e === exercises.length - 1;
      await prisma.exercise.create({
        data: {
          lessonId: lesson.id,
          type: isCp ? "CHECKPOINT" : ex.type,
          order: e + 1,
          promptJson: {
            type: ex.type,
            prompt: ex.prompt,
            options: "options" in ex ? ex.options : undefined,
            hintVi: "hintVi" in ex ? ex.hintVi : undefined,
            explanationVi: ex.explanationVi,
            passingScore:
              "passingScore" in ex && typeof ex.passingScore === "number"
                ? ex.passingScore
                : isCp
                  ? 0.8
                  : undefined,
          } as Prisma.InputJsonValue,
          answerJson: {
            correctAnswer: ex.correctAnswer,
          } as Prisma.InputJsonValue,
        },
      });
    }

    await saveEmbedding(lesson.id, dedupKey);
    console.log(
      `  ✓ L${input.levelNumber} ${input.skill} #${order} ${content.titleVi}`
    );
  }
}

export async function seedLessons(options?: { sample?: boolean }) {
  const sample = options?.sample ?? process.argv.includes("--sample");
  const levels = sample ? [1, 2] : [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const skills: SkillName[] = [
    SkillName.LISTENING,
    SkillName.READING,
    SkillName.WRITING,
    SkillName.SPEAKING,
  ];
  const useAi = Boolean(process.env.OPENAI_API_KEY?.trim()) && !sample;

  console.log(
    `Seeding lessons (${sample ? "sample L1–L2" : "full L1–L9"}, AI=${useAi})…`
  );

  // Clear prior sample embeddings so re-seed is deterministic
  if (sample) {
    await prisma.contentEmbedding.deleteMany({ where: { refType: "LESSON" } });
  }

  for (const levelNumber of levels) {
    for (const skill of skills) {
      console.log(`→ Level ${levelNumber} / ${skill}`);
      await upsertLessonTrack({
        levelNumber,
        skill,
        useAi,
        skipDedup: sample,
      });
      if (useAi) await sleep(2000);
    }
  }

  const count = await prisma.lesson.count({
    where: { publishedAt: { not: null } },
  });
  console.log(`Lesson seed done. Published lessons: ${count}`);
}

const isDirectRun = process.argv[1]?.includes("seed-lessons");
if (isDirectRun) {
  seedLessons()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
