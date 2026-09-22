import {
  PrismaClient,
  SkillName,
  TestType,
  type Prisma,
} from "@prisma/client";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const prisma = new PrismaClient();

function parseLevelFlag(): number | null {
  const arg = process.argv.find((a) => a.startsWith("--level="));
  if (!arg) return null;
  const n = Number(arg.split("=")[1]);
  return Number.isFinite(n) && n >= 1 && n <= 9 ? n : null;
}

function buildToneWav(seconds = 2, freq = 440): Buffer {
  const sampleRate = 8000;
  const numSamples = sampleRate * seconds;
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
    const sample = Math.sin(2 * Math.PI * freq * t) * 2500;
    buffer.writeInt16LE(Math.floor(sample), 44 + i * 2);
  }
  return buffer;
}

async function ensureAudio(level: number, section: number): Promise<string> {
  const dir = path.join(process.cwd(), "public", "audio", "full-tests");
  await mkdir(dir, { recursive: true });
  const name = `l${level}-s${section}.wav`;
  const filePath = path.join(dir, name);
  await writeFile(filePath, buildToneWav(2, 400 + section * 40));
  return `/audio/full-tests/${name}`;
}

type Q = {
  type: string;
  contentJson: Prisma.InputJsonValue;
  correctAnswerJson: Prisma.InputJsonValue;
};

function mcq(
  prompt: string,
  options: string[],
  answer: string,
  extra: Record<string, unknown> = {}
): Q {
  return {
    type: "mcq",
    contentJson: { prompt, options, type: "mcq", ...extra },
    correctAnswerJson: { answer },
  };
}

function gap(
  prompt: string,
  answer: string,
  extra: Record<string, unknown> = {}
): Q {
  return {
    type: "gap_fill",
    contentJson: { prompt, type: "gap_fill", ...extra },
    correctAnswerJson: { answer },
  };
}

function tfn(
  prompt: string,
  answer: "True" | "False" | "Not Given",
  extra: Record<string, unknown> = {}
): Q {
  return {
    type: "true_false_ng",
    contentJson: {
      prompt,
      options: ["True", "False", "Not Given"],
      type: "true_false_ng",
      ...extra,
    },
    correctAnswerJson: { answer },
  };
}

function listeningQs(audioUrl: string, section: number, level: number): Q[] {
  const topic =
    level <= 2
      ? "daily life"
      : level <= 4
        ? "school and work"
        : level <= 6
          ? "academic study"
          : "specialized research";
  const base = [
    mcq(
      `Section ${section}: What is the main topic?`,
      [topic, "sports news", "weather", "shopping"],
      topic,
      { audioUrl, scriptSection: section }
    ),
    gap(
      `Section ${section}: The speaker mentions the number ________.`,
      String(10 + section * level),
      { audioUrl }
    ),
    mcq(
      `Section ${section}: How does the speaker feel?`,
      ["Happy", "Angry", "Confused", "Bored"],
      "Happy",
      { audioUrl }
    ),
    tfn(`Section ${section}: The conversation happens in the morning.`, "Not Given", {
      audioUrl,
    }),
    mcq(
      `Section ${section}: What should the listener do next?`,
      ["Wait", "Call back", "Write notes", "Leave"],
      "Write notes",
      { audioUrl }
    ),
  ];
  return base;
}

function readingPassage(level: number, n: number): string {
  const sentences = [
    `Passage ${n} for Level ${level} explores how communities adapt to change.`,
    `Researchers study everyday habits, public services, and shared spaces.`,
    `Young people often learn new skills through practice and feedback.`,
    `Clear goals help learners improve listening, reading, writing, and speaking.`,
    `Teachers recommend short daily routines rather than long irregular sessions.`,
    `Evidence suggests that spaced repetition supports long-term memory.`,
    `At the same time, motivation and sleep quality influence outcomes.`,
    `Cities invest in libraries, parks, and transport to support wellbeing.`,
    `Critics argue that funding is uneven across neighbourhoods.`,
    `Nevertheless, small local projects can create lasting social value.`,
    `Technology offers tools for practice, yet human guidance remains essential.`,
    `Finally, reflection turns experience into durable learning.`,
  ];
  const target =
    level <= 2 ? 450 : level <= 4 ? 550 : level <= 6 ? 700 : level <= 8 ? 800 : 900;
  let text = "";
  let i = 0;
  while (text.split(/\s+/).length < target) {
    text += sentences[i % sentences.length] + " ";
    i += 1;
  }
  return text.trim();
}

function readingQs(passage: string, n: number): Q[] {
  return [
    tfn(`Passage ${n}: The text discusses community change.`, "True", { passage }),
    tfn(`Passage ${n}: Funding is always equal everywhere.`, "False", { passage }),
    tfn(`Passage ${n}: The author names a specific mayor.`, "Not Given", {
      passage,
    }),
    mcq(
      `Passage ${n}: What supports long-term memory?`,
      ["Spaced repetition", "Only exams", "Skipping sleep", "No practice"],
      "Spaced repetition",
      { passage }
    ),
    mcq(
      `Passage ${n}: What do teachers recommend?`,
      [
        "Short daily routines",
        "One long session yearly",
        "No goals",
        "Avoid feedback",
      ],
      "Short daily routines",
      { passage }
    ),
    gap(
      `Passage ${n}: Technology offers tools for ________.`,
      "practice",
      { passage }
    ),
    mcq(
      `Passage ${n}: What remains essential besides technology?`,
      ["Human guidance", "Louder music", "Longer weekends", "Fewer books"],
      "Human guidance",
      { passage }
    ),
    tfn(`Passage ${n}: Reflection helps learning.`, "True", { passage }),
    mcq(
      `Passage ${n}: Cities invest in libraries and ________.`,
      ["parks", "airports only", "stadiums only", "none"],
      "parks",
      { passage }
    ),
    gap(
      `Passage ${n}: Small local projects can create lasting social ________.`,
      "value",
      { passage }
    ),
  ];
}

function writingQs(level: number): Q[] {
  return [
    {
      type: "essay",
      contentJson: {
        taskType: level % 2 === 0 ? "TASK1_GENERAL" : "TASK1_ACADEMIC",
        prompt:
          level % 2 === 0
            ? "Write a letter to your friend describing a local community event and inviting them to join."
            : "The chart below shows how students spend study time. Summarise the information by selecting and reporting the main features.",
        promptImageUrl: null,
        minWords: 150,
      },
      correctAnswerJson: {},
    },
    {
      type: "essay",
      contentJson: {
        taskType: "TASK2",
        prompt:
          "Some people think schools should focus more on practical skills than academic theory. To what extent do you agree or disagree?",
        minWords: 250,
      },
      correctAnswerJson: {},
    },
  ];
}

function speakingQs(level: number): Q[] {
  return [
    {
      type: "speaking_prompt",
      contentJson: {
        part: 1,
        questions: [
          "Where do you live?",
          "Do you like your neighbourhood? Why?",
          "What do you usually do on weekends?",
          "Have your hobbies changed recently?",
          "What kind of music do you enjoy?",
        ],
      },
      correctAnswerJson: {},
    },
    {
      type: "speaking_prompt",
      contentJson: {
        part: 2,
        cueCard: `Describe a skill you learned at Level ${level} that was useful. You should say:\n- what the skill is\n- how you learned it\n- why it is useful\nand explain how you use it now.`,
        prepSec: 60,
        speakSec: 120,
      },
      correctAnswerJson: {},
    },
    {
      type: "speaking_prompt",
      contentJson: {
        part: 3,
        questions: [
          "Why do some people find learning new skills difficult?",
          "Should schools teach more practical skills?",
          "How has technology changed the way people learn?",
          "What skills will be important in the future?",
          "How can communities support lifelong learning?",
        ],
      },
      correctAnswerJson: {},
    },
  ];
}

async function seedLevel(levelNumber: number) {
  const level = await prisma.level.findUnique({
    where: { number: levelNumber },
  });
  if (!level) throw new Error(`Level ${levelNumber} missing — run base seed first`);

  const skills = await prisma.skill.findMany();
  const byName = Object.fromEntries(skills.map((s) => [s.name, s]));

  const existing = await prisma.test.findFirst({
    where: { type: TestType.FULL_LEVEL, levelId: level.id },
  });
  if (existing) {
    await prisma.testSection.deleteMany({ where: { testId: existing.id } });
    await prisma.test.delete({ where: { id: existing.id } });
  }

  const test = await prisma.test.create({
    data: {
      levelId: level.id,
      type: TestType.FULL_LEVEL,
      title: `Full Level Test — Level ${levelNumber}`,
      durationMin: 75,
      publishedAt: new Date(),
      passingRulesJson: {
        minOverallBand: levelNumber,
        minSkillBand: Math.max(0, levelNumber - 0.5),
      },
    },
  });

  // LISTENING — 4 subsections as metadata, 20 questions in one section
  const listeningQuestions: Q[] = [];
  const audioUrls: string[] = [];
  for (let s = 1; s <= 4; s++) {
    const url = await ensureAudio(levelNumber, s);
    audioUrls.push(url);
    listeningQuestions.push(...listeningQs(url, s, levelNumber));
  }

  const listeningSection = await prisma.testSection.create({
    data: {
      testId: test.id,
      skillId: byName[SkillName.LISTENING]!.id,
      order: 1,
      durationMin: 25,
      instructionsVi:
        "Nghe 4 đoạn (conversation, monologue, discussion, lecture). Mỗi đoạn phát 1 lần.",
      metadataJson: {
        audioSections: audioUrls.map((url, i) => ({
          index: i + 1,
          audioUrl: url,
          questionOrders: [i * 5 + 1, i * 5 + 2, i * 5 + 3, i * 5 + 4, i * 5 + 5],
        })),
      },
    },
  });
  for (let i = 0; i < listeningQuestions.length; i++) {
    const q = listeningQuestions[i]!;
    await prisma.question.create({
      data: {
        sectionId: listeningSection.id,
        type: q.type,
        contentJson: q.contentJson,
        correctAnswerJson: q.correctAnswerJson,
        order: i + 1,
        points: 1,
      },
    });
  }

  // READING — 2 passages, 20 questions
  const p1 = readingPassage(levelNumber, 1);
  const p2 = readingPassage(levelNumber, 2);
  const readingQuestions = [...readingQs(p1, 1), ...readingQs(p2, 2)];
  const readingSection = await prisma.testSection.create({
    data: {
      testId: test.id,
      skillId: byName[SkillName.READING]!.id,
      order: 2,
      durationMin: 30,
      instructionsVi: "Đọc 2 đoạn văn và trả lời 20 câu hỏi.",
      metadataJson: {
        passages: [
          { index: 1, text: p1 },
          { index: 2, text: p2 },
        ],
      },
    },
  });
  for (let i = 0; i < readingQuestions.length; i++) {
    const q = readingQuestions[i]!;
    await prisma.question.create({
      data: {
        sectionId: readingSection.id,
        type: q.type,
        contentJson: q.contentJson,
        correctAnswerJson: q.correctAnswerJson,
        order: i + 1,
        points: 1,
      },
    });
  }

  // WRITING
  const wQs = writingQs(levelNumber);
  const writingSection = await prisma.testSection.create({
    data: {
      testId: test.id,
      skillId: byName[SkillName.WRITING]!.id,
      order: 3,
      durationMin: 50,
      instructionsVi: "Viết Task 1 (≥150 từ) và Task 2 (≥250 từ).",
      metadataJson: {},
    },
  });
  for (let i = 0; i < wQs.length; i++) {
    const q = wQs[i]!;
    await prisma.question.create({
      data: {
        sectionId: writingSection.id,
        type: q.type,
        contentJson: q.contentJson,
        correctAnswerJson: q.correctAnswerJson,
        order: i + 1,
        points: 1,
      },
    });
  }

  // SPEAKING
  const sQs = speakingQs(levelNumber);
  const speakingSection = await prisma.testSection.create({
    data: {
      testId: test.id,
      skillId: byName[SkillName.SPEAKING]!.id,
      order: 4,
      durationMin: 12,
      instructionsVi: "Trả lời Part 1–3. Không ghi lại trong chế độ thi.",
      metadataJson: { script: sQs.map((q) => q.contentJson) },
    },
  });
  for (let i = 0; i < sQs.length; i++) {
    const q = sQs[i]!;
    await prisma.question.create({
      data: {
        sectionId: speakingSection.id,
        type: q.type,
        contentJson: q.contentJson,
        correctAnswerJson: q.correctAnswerJson,
        order: i + 1,
        points: 1,
      },
    });
  }

  console.log(`Seeded FULL_LEVEL test for Level ${levelNumber}: ${test.id}`);
  return test.id;
}

export async function seedFullTests(onlyLevel?: number | null) {
  const levels =
    onlyLevel != null
      ? [onlyLevel]
      : [1, 2, 3, 4, 5, 6, 7, 8, 9];
  for (const n of levels) {
    await seedLevel(n);
    await new Promise((r) => setTimeout(r, 200));
  }
}

const isDirect =
  typeof process !== "undefined" &&
  process.argv[1] &&
  process.argv[1].includes("seed-full-tests");

if (isDirect) {
  const only = parseLevelFlag();
  seedFullTests(only)
    .then(() => prisma.$disconnect())
    .catch(async (e) => {
      console.error(e);
      await prisma.$disconnect();
      process.exit(1);
    });
}

