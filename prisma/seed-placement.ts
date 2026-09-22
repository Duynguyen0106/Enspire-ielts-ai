import { PrismaClient, SkillName, TestType, type Prisma } from "@prisma/client";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { createHash } from "crypto";

const prisma = new PrismaClient();

/** Minimal silent-ish WAV (0.5s) so HTML audio has a valid source without TTS. */
function buildSilentWav(seconds = 1): Buffer {
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
  // low-amplitude tone so students hear something when TTS is unavailable
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const sample = Math.sin(2 * Math.PI * 440 * t) * 2000;
    buffer.writeInt16LE(Math.floor(sample), 44 + i * 2);
  }
  return buffer;
}

const LISTENING_SCRIPT = `
Librarian: Good morning. How can I help you?
Student: Hi, I'd like to join the university library.
Librarian: Of course. Could I have your student ID?
Student: Yes, it's 482915.
Librarian: Thank you. Do you prefer email or text reminders for overdue books?
Student: Email, please. My address is anna.nguyen@campus.edu.
Librarian: Noted. The borrowing limit for undergraduates is eight books for three weeks.
Student: Can I renew them online?
Librarian: Yes, once, unless someone else has reserved the title.
Student: Perfect. One more thing — where is the quiet study zone?
Librarian: On the second floor, next to the journals section.
Student: Thanks for your help.
`.trim();

const READING_PASSAGE = `
Urban gardens are transforming how city residents relate to food, community, and the environment. In dense neighborhoods where supermarket access is uneven, shared plots on rooftops and vacant lots provide fresh vegetables at lower cost. Volunteers often report that gardening reduces stress and creates friendships across age groups. Municipal governments have begun to support these projects with water subsidies and short-term land leases, although critics argue that temporary agreements leave gardens vulnerable to redevelopment. Researchers note that the educational value may be as important as the harvest: children who help plant and water crops tend to try a wider variety of produce. Still, urban agriculture cannot replace large-scale farming; it complements supply chains and raises awareness about seasonality and waste. The most successful gardens combine clear rules, inclusive leadership, and partnerships with local schools. When these conditions are met, even a small plot can become a durable civic asset rather than a short-lived trend.
`.trim();

type PlacementQuestion = {
  type: string;
  contentJson: Prisma.InputJsonValue;
  correctAnswerJson: Prisma.InputJsonValue;
  points?: number;
};

async function ensureListeningAudio(): Promise<string> {
  const dir = path.join(process.cwd(), "public", "audio");
  await mkdir(dir, { recursive: true });
  const filePath = path.join(dir, "placement-listening.wav");
  const wav = buildSilentWav(2);
  await writeFile(filePath, wav);
  return "/audio/placement-listening.wav";
}

function listeningQuestions(audioUrl: string): PlacementQuestion[] {
  return [
    {
      type: "mcq",
      contentJson: {
        prompt: "What does the student want to do?",
        options: ["Buy a book", "Join the library", "Find a classroom", "Pay a fine"],
        type: "mcq",
        audioUrl,
      },
      correctAnswerJson: { answer: "Join the library" },
    },
    {
      type: "gap_fill",
      contentJson: {
        prompt: "The student's ID number is ________.",
        type: "gap_fill",
        audioUrl,
      },
      correctAnswerJson: { answer: "482915" },
    },
    {
      type: "mcq",
      contentJson: {
        prompt: "How does the student want to receive reminders?",
        options: ["Text", "Phone call", "Email", "Post"],
        type: "mcq",
        audioUrl,
      },
      correctAnswerJson: { answer: "Email" },
    },
    {
      type: "gap_fill",
      contentJson: {
        prompt: "The student's email is ________.",
        type: "gap_fill",
        audioUrl,
      },
      correctAnswerJson: { answer: "anna.nguyen@campus.edu" },
    },
    {
      type: "mcq",
      contentJson: {
        prompt: "What is the undergraduate borrowing limit?",
        options: ["5 books", "6 books", "8 books", "10 books"],
        type: "mcq",
        audioUrl,
      },
      correctAnswerJson: { answer: "8 books" },
    },
    {
      type: "mcq",
      contentJson: {
        prompt: "How long can undergraduates keep books?",
        options: ["One week", "Two weeks", "Three weeks", "One month"],
        type: "mcq",
        audioUrl,
      },
      correctAnswerJson: { answer: "Three weeks" },
    },
    {
      type: "true_false_ng",
      contentJson: {
        prompt: "Students can renew books online more than once.",
        options: ["True", "False", "Not Given"],
        type: "true_false_ng",
        audioUrl,
      },
      correctAnswerJson: { answer: "False" },
    },
    {
      type: "mcq",
      contentJson: {
        prompt: "Renewal is not possible if:",
        options: [
          "The book is overdue",
          "Someone else has reserved it",
          "It is a journal",
          "It is on the second floor",
        ],
        type: "mcq",
        audioUrl,
      },
      correctAnswerJson: { answer: "Someone else has reserved it" },
    },
    {
      type: "gap_fill",
      contentJson: {
        prompt: "The quiet study zone is on the ________ floor.",
        type: "gap_fill",
        audioUrl,
      },
      correctAnswerJson: { answer: "second" },
    },
    {
      type: "mcq",
      contentJson: {
        prompt: "The quiet study zone is next to:",
        options: ["The café", "The entrance", "The journals section", "The computers"],
        type: "mcq",
        audioUrl,
      },
      correctAnswerJson: { answer: "The journals section" },
    },
  ];
}

function readingQuestions(): PlacementQuestion[] {
  return [
    {
      type: "true_false_ng",
      contentJson: {
        prompt: "Urban gardens only exist on rooftops.",
        options: ["True", "False", "Not Given"],
        type: "true_false_ng",
        passageId: "placement-reading-1",
      },
      correctAnswerJson: { answer: "False" },
    },
    {
      type: "mcq",
      contentJson: {
        prompt: "According to the passage, volunteers often report that gardening:",
        options: [
          "Increases stress",
          "Reduces stress and builds friendships",
          "Replaces supermarket shopping",
          "Requires university degrees",
        ],
        type: "mcq",
        passageId: "placement-reading-1",
      },
      correctAnswerJson: { answer: "Reduces stress and builds friendships" },
    },
    {
      type: "gap_fill",
      contentJson: {
        prompt: "Governments may support gardens with water subsidies and short-term ________.",
        type: "gap_fill",
        passageId: "placement-reading-1",
      },
      correctAnswerJson: { answer: "land leases" },
    },
    {
      type: "true_false_ng",
      contentJson: {
        prompt: "Critics worry temporary agreements make gardens vulnerable to redevelopment.",
        options: ["True", "False", "Not Given"],
        type: "true_false_ng",
        passageId: "placement-reading-1",
      },
      correctAnswerJson: { answer: "True" },
    },
    {
      type: "mcq",
      contentJson: {
        prompt: "Children who help in gardens tend to:",
        options: [
          "Avoid vegetables",
          "Try a wider variety of produce",
          "Leave school early",
          "Prefer imported food",
        ],
        type: "mcq",
        passageId: "placement-reading-1",
      },
      correctAnswerJson: { answer: "Try a wider variety of produce" },
    },
    {
      type: "true_false_ng",
      contentJson: {
        prompt: "Urban agriculture can fully replace large-scale farming.",
        options: ["True", "False", "Not Given"],
        type: "true_false_ng",
        passageId: "placement-reading-1",
      },
      correctAnswerJson: { answer: "False" },
    },
    {
      type: "gap_fill",
      contentJson: {
        prompt: "Urban gardens raise awareness about seasonality and ________.",
        type: "gap_fill",
        passageId: "placement-reading-1",
      },
      correctAnswerJson: { answer: "waste" },
    },
    {
      type: "mcq",
      contentJson: {
        prompt: "Successful gardens combine clear rules, inclusive leadership, and partnerships with:",
        options: ["Factories", "Airports", "Local schools", "Banks"],
        type: "mcq",
        passageId: "placement-reading-1",
      },
      correctAnswerJson: { answer: "Local schools" },
    },
    {
      type: "true_false_ng",
      contentJson: {
        prompt: "The passage says every vacant lot in cities will become a garden by 2030.",
        options: ["True", "False", "Not Given"],
        type: "true_false_ng",
        passageId: "placement-reading-1",
      },
      correctAnswerJson: { answer: "Not Given" },
    },
    {
      type: "mcq",
      contentJson: {
        prompt: "Overall, the writer views small urban plots as:",
        options: [
          "Useless hobbies",
          "Possible durable civic assets when well managed",
          "A threat to farms",
          "Only for tourists",
        ],
        type: "mcq",
        passageId: "placement-reading-1",
      },
      correctAnswerJson: { answer: "Possible durable civic assets when well managed" },
    },
  ];
}

function writingQuestions(): PlacementQuestion[] {
  return [
    {
      type: "writing_task",
      contentJson: {
        type: "writing_task",
        taskTitle: "Writing Task 2",
        taskPrompt:
          "Some people believe that university education should focus mainly on practical job skills. Others believe that universities should prioritise academic knowledge and critical thinking. Discuss both views and give your own opinion. Write at least 200 words.",
        minWords: 200,
        maxWords: 300,
      },
      correctAnswerJson: {},
      points: 0,
    },
  ];
}

function speakingQuestions(): PlacementQuestion[] {
  return [
    {
      type: "speaking_task",
      contentJson: {
        type: "speaking_task",
        part: 1,
        questions: [
          "Where do you live?",
          "What do you like about your neighborhood?",
          "Do you prefer studying at home or in a library? Why?",
        ],
        prepSeconds: 0,
        speakSeconds: 90,
      },
      correctAnswerJson: {},
      points: 0,
    },
    {
      type: "speaking_task",
      contentJson: {
        type: "speaking_task",
        part: 2,
        questions: ["Describe a skill you want to learn."],
        cueCard:
          "Describe a skill you would like to learn.\nYou should say:\n- what the skill is\n- why you want to learn it\n- how you would learn it\nand explain how this skill might help you in the future.",
        prepSeconds: 60,
        speakSeconds: 120,
      },
      correctAnswerJson: {},
      points: 0,
    },
    {
      type: "speaking_task",
      contentJson: {
        type: "speaking_task",
        part: 3,
        questions: [
          "Why do some people find it difficult to learn new skills as adults?",
          "Should schools teach more practical skills? Why or why not?",
        ],
        prepSeconds: 0,
        speakSeconds: 120,
      },
      correctAnswerJson: {},
      points: 0,
    },
  ];
}

export async function seedPlacement() {
  const skills = await prisma.skill.findMany();
  const byName = Object.fromEntries(skills.map((s) => [s.name, s])) as Record<
    SkillName,
    (typeof skills)[number]
  >;

  for (const name of [
    SkillName.LISTENING,
    SkillName.READING,
    SkillName.WRITING,
    SkillName.SPEAKING,
  ]) {
    if (!byName[name]) {
      throw new Error(`Missing skill ${name}. Run base seed first.`);
    }
  }

  const audioUrl = await ensureListeningAudio();

  let test = await prisma.test.findFirst({
    where: { type: TestType.PLACEMENT, title: "IELTS Placement Test" },
  });

  if (!test) {
    test = await prisma.test.create({
      data: {
        type: TestType.PLACEMENT,
        title: "IELTS Placement Test",
        durationMin: 45,
        publishedAt: new Date(),
      },
    });
  } else {
    await prisma.test.update({
      where: { id: test.id },
      data: { durationMin: 45, publishedAt: new Date() },
    });
  }

  // Clear existing sections/questions for idempotent reseeding
  const existingSections = await prisma.testSection.findMany({
    where: { testId: test.id },
    select: { id: true },
  });
  if (existingSections.length > 0) {
    const ids = existingSections.map((s) => s.id);
    await prisma.question.deleteMany({ where: { sectionId: { in: ids } } });
    await prisma.testSection.deleteMany({ where: { testId: test.id } });
  }

  const sections: Array<{
    skill: SkillName;
    order: number;
    durationMin: number;
    instructionsVi: string;
    metadataJson: Prisma.InputJsonValue;
    questions: PlacementQuestion[];
  }> = [
    {
      skill: SkillName.LISTENING,
      order: 1,
      durationMin: 10,
      instructionsVi:
        "Nghe đoạn hội thoại và trả lời 10 câu hỏi. Bạn được nghe tối đa 2 lần.",
      metadataJson: {
        audioUrl,
        transcript: LISTENING_SCRIPT,
        contentHash: createHash("sha256").update(LISTENING_SCRIPT).digest("hex").slice(0, 16),
      },
      questions: listeningQuestions(audioUrl),
    },
    {
      skill: SkillName.READING,
      order: 2,
      durationMin: 12,
      instructionsVi: "Đọc đoạn văn (~500 từ) và trả lời 10 câu hỏi.",
      metadataJson: {
        passage: READING_PASSAGE,
        passageId: "placement-reading-1",
      },
      questions: readingQuestions(),
    },
    {
      skill: SkillName.WRITING,
      order: 3,
      durationMin: 15,
      instructionsVi: "Viết bài Task 2 (200–300 từ) trong 15 phút.",
      metadataJson: {},
      questions: writingQuestions(),
    },
    {
      skill: SkillName.SPEAKING,
      order: 4,
      durationMin: 8,
      instructionsVi:
        "Ghi âm câu trả lời Speaking (Part 1–3). Cho phép ghi lại tối đa 1 lần mỗi phần.",
      metadataJson: {},
      questions: speakingQuestions(),
    },
  ];

  for (const section of sections) {
    const created = await prisma.testSection.create({
      data: {
        testId: test.id,
        skillId: byName[section.skill].id,
        order: section.order,
        durationMin: section.durationMin,
        instructionsVi: section.instructionsVi,
        metadataJson: section.metadataJson,
      },
    });

    for (let i = 0; i < section.questions.length; i++) {
      const q = section.questions[i]!;
      await prisma.question.create({
        data: {
          sectionId: created.id,
          type: q.type,
          contentJson: q.contentJson,
          correctAnswerJson: q.correctAnswerJson,
          points: q.points ?? 1,
          order: i + 1,
        },
      });
    }
  }

  console.log(`Placement test seeded: ${test.id}`);
  return test.id;
}

const isDirectRun = process.argv[1]?.includes("seed-placement");
if (isDirectRun) {
  seedPlacement()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
