/**
 * Original Academic-format mock exams (NOT official IELTS papers).
 * Content is written for VietIELTS AI — mirrors exam structure only.
 * Official past papers remain copyright of BC / IDP / Cambridge.
 */
import {
  PrismaClient,
  SkillName,
  TestType,
  type Prisma,
} from "@prisma/client";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { createHash } from "crypto";

const prisma = new PrismaClient();

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

async function ensureAudio(exam: number, section: number): Promise<string> {
  const dir = path.join(process.cwd(), "public", "audio", "practice-exams");
  await mkdir(dir, { recursive: true });
  const name = `mock${exam}-s${section}.wav`;
  await writeFile(path.join(dir, name), buildToneWav(2, 380 + section * 35));
  return `/audio/practice-exams/${name}`;
}

type MockExam = {
  code: string;
  title: string;
  titleVi: string;
  durationMin: number;
  listeningScripts: string[];
  readingPassages: { title: string; text: string }[];
};

const MOCKS: MockExam[] = [
  {
    code: "ACADEMIC-MOCK-01",
    title: "Academic Mock Exam 1 — City Libraries & Urban Habitats",
    titleVi: "Đề thi thử Academic 1 — Thư viện đô thị & môi trường sống",
    durationMin: 165,
    listeningScripts: [
      `Receptionist: Good morning, City Central Library. How can I help?
Caller: Hi, I'd like to renew my membership and ask about weekend workshops.
Receptionist: Membership renewals are online, or you can visit desk B. Workshops run Saturday mornings from ten to twelve.
Caller: Are they free for students?
Receptionist: Students pay half price — five pounds instead of ten. Please bring your student card.`,
      `Guide: Welcome to the riverside museum tour. We will start in Gallery A, move to the textile hall, then finish at the café courtyard.
Visitor: How long does the full tour take?
Guide: About forty minutes, with ten minutes for questions at the end.
Visitor: Is photography allowed?
Guide: Yes, without flash in Gallery A and the textile hall.`,
      `Tutor: Today we compare two study methods for vocabulary: spaced repetition and thematic word lists.
Student A: I prefer spaced repetition because I forget less after two weeks.
Student B: Thematic lists help me in writing Task 2 when I need topic language quickly.
Tutor: Both are useful — combine them for exams.`,
      `Lecturer: Urban heat islands form when concrete and asphalt absorb sunlight. Cities can reduce temperature by planting street trees, using reflective roofing, and expanding shade corridors. Research in Melbourne showed average afternoon temperatures fell by nearly one degree in greener districts.`,
    ],
    readingPassages: [
      {
        title: "The Quiet Return of Public Libraries",
        text: `Across many cities, public libraries are reinventing themselves as community hubs rather than silent book warehouses. In addition to lending physical titles, modern branches host coding clubs, language cafés, and job-application clinics. Librarians report that digital borrowing has not replaced print; instead, the two formats serve different moments in a reader's week. Quiet study rooms remain popular with secondary students, while parents attend weekend story sessions that double as informal parenting networks. Funding, however, is uneven. Some municipalities invest in extended opening hours and laptop loans, whereas others cut staff and shorten schedules. Researchers argue that libraries deliver measurable social returns: higher literacy rates among children who visit weekly, and lower isolation scores among older adults who join reading groups. The challenge is communicating that value to budget committees that often see only rental costs and electricity bills. When libraries publish transparent impact reports — attendance by age, workshop completion rates, and partner-school outcomes — they are more likely to secure multi-year support. Ultimately, the library's future depends less on nostalgia for dusty shelves and more on proving it is infrastructure for lifelong learning.`,
      },
      {
        title: "Designing Cities for Walking",
        text: `Walkable neighbourhoods are associated with better public health and lower household transport costs. Planners define walkability through intersection density, mixed land use, and continuous pavements. A street that offers shade, seating, and safe crossings encourages short trips on foot that would otherwise use cars. Critics warn that beautification projects can raise rents and displace long-term residents if affordable housing policy is ignored. Successful programmes therefore pair street redesign with rent stabilisation and local hiring for construction work. Evidence from several European cities suggests that when walking share rises by ten percentage points, local retail footfall also increases, creating a virtuous cycle for small businesses.`,
      },
    ],
  },
  {
    code: "ACADEMIC-MOCK-02",
    title: "Academic Mock Exam 2 — Sleep Science & Remote Work",
    titleVi: "Đề thi thử Academic 2 — Khoa học giấc ngủ & làm việc từ xa",
    durationMin: 165,
    listeningScripts: [
      `Advisor: Thanks for coming in. You wanted advice on switching to the evening language class.
Student: Yes, my internship finishes at five, so the six-thirty class would be better.
Advisor: That group still has three places. You will need the intermediate workbook — edition three.
Student: Can I buy it on campus?
Advisor: The bookshop has stock, or you can order online with a student discount code.`,
      `Host: Our next guest is Dr Nguyen, who studies sleep and memory.
Dr Nguyen: People often underestimate how much deep sleep supports exam recall. Even one short night can reduce problem-solving speed the next day.
Host: Should students nap before tests?
Dr Nguyen: A twenty-minute nap can help alertness, but avoid long naps late afternoon.`,
      `Manager: Let's review the hybrid work pilot. Team Blue worked from home Mondays and Fridays.
Colleague: Meeting attendance improved, but new staff felt less connected.
Manager: We will add a monthly in-person workshop and keep remote Mondays only.`,
      `Professor: Coral reefs face compounding stress from warming seas and pollution. Restoration projects that transplant heat-tolerant corals show promise, yet they cannot replace rapid cuts to carbon emissions. Community monitoring — training divers to record bleaching — has expanded data coverage in Southeast Asia substantially over the last decade.`,
    ],
    readingPassages: [
      {
        title: "Why Sleep Is Academic Infrastructure",
        text: `Sleep is frequently treated as optional during exam season, yet laboratory and classroom studies converge on a simple finding: memory consolidation is biologically scheduled for the night. During slow-wave sleep, the brain replays patterns learned earlier, strengthening links that later appear as fluent recall. Students who chronically sleep fewer than six hours show slower reading comprehension and more careless errors in timed tasks. Importantly, weekend "catch-up" sleep does not fully reverse weekday deficits. Institutions that shift start times later for adolescents often report modest gains in attendance and mood, though results vary by commuting distance. Practical advice remains unglamorous: consistent bedtimes, limited late caffeine, and a wind-down routine without bright screens. For high-stakes tests, a regular sleep schedule in the week before the exam is a higher-leverage intervention than an extra midnight revision hour.`,
      },
      {
        title: "Remote Work After the Experiment",
        text: `The sudden shift to remote work created a natural experiment in how teams coordinate without shared offices. Early surveys celebrated time saved on commuting and greater schedule flexibility. Later studies painted a more mixed picture: knowledge workers reported higher output on individual tasks, but mentoring of juniors and spontaneous innovation suffered when informal corridor conversations disappeared. Companies that thrived remote tended to invest in deliberate rituals — recorded decision logs, shorter meetings with written agendas, and periodic on-sites with clear purposes. Those that simply moved office habits onto video calls accumulated fatigue without solving collaboration gaps. Looking ahead, hybrid models are likely to dominate, not because compromise is fashionable, but because different tasks have different spatial needs.`,
      },
    ],
  },
];

function listeningQuestions(audioUrl: string, section: number, script: string): Q[] {
  const hash = createHash("md5").update(script).digest("hex").slice(0, 6);
  return [
    mcq(
      `Section ${section}: What is the main situation?`,
      [
        "A service or information conversation",
        "A weather forecast only",
        "A sports match commentary",
        "A cooking recipe",
      ],
      "A service or information conversation",
      { audioUrl, section, scriptHash: hash }
    ),
    gap(
      `Section ${section}: Listen for a number or time mentioned — write one key detail you heard (e.g. a price, time, or duration).`,
      section === 1 ? "five" : section === 2 ? "forty" : section === 3 ? "two" : "one",
      { audioUrl, section }
    ),
    mcq(
      `Section ${section}: The speakers are primarily`,
      ["exchanging information", "arguing angrily", "singing", "reading poetry"],
      "exchanging information",
      { audioUrl, section }
    ),
    tfn(
      `Section ${section}: The recording includes practical advice or factual content.`,
      "True",
      { audioUrl, section }
    ),
    mcq(
      `Section ${section}: Best listening strategy here is to`,
      [
        "predict the topic then listen for specifics",
        "ignore the first sentence",
        "translate every word immediately",
        "close your eyes and guess",
      ],
      "predict the topic then listen for specifics",
      { audioUrl, section }
    ),
  ];
}

function readingQuestions(
  passage: { title: string; text: string },
  n: number
): Q[] {
  const { title, text } = passage;
  return [
    tfn(
      `Passage ${n} (${title}): The text discusses a contemporary social or scientific issue.`,
      "True",
      { passage: text, passageTitle: title }
    ),
    tfn(
      `Passage ${n}: The author claims the topic has only disadvantages.`,
      "False",
      { passage: text, passageTitle: title }
    ),
    tfn(
      `Passage ${n}: Exact budget figures for every city are provided.`,
      "Not Given",
      { passage: text, passageTitle: title }
    ),
    mcq(
      `Passage ${n}: The writer's overall tone is best described as`,
      ["analytical", "sarcastic", "purely autobiographical", "fictional fantasy"],
      "analytical",
      { passage: text, passageTitle: title }
    ),
    gap(
      `Passage ${n}: According to the passage, evidence or research is used to ______ claims.`,
      "support",
      { passage: text, passageTitle: title }
    ),
    mcq(
      `Passage ${n}: A key challenge mentioned relates to`,
      [
        "policy, funding, or coordination",
        "outer-space travel",
        "medieval history only",
        "professional football tactics",
      ],
      "policy, funding, or coordination",
      { passage: text, passageTitle: title }
    ),
    tfn(
      `Passage ${n}: Practical recommendations are implied or stated.`,
      "True",
      { passage: text, passageTitle: title }
    ),
    mcq(
      `Passage ${n}: The passage is written for`,
      [
        "an educated general audience",
        "pre-school children only",
        "machine-code programmers exclusively",
        "a private diary",
      ],
      "an educated general audience",
      { passage: text, passageTitle: title }
    ),
    gap(
      `Passage ${n}: Fill one word — lifelong ______ is mentioned as a broader goal in related civic themes.`,
      "learning",
      { passage: text, passageTitle: title }
    ),
    mcq(
      `Passage ${n}: Which reading skill is most useful here?`,
      [
        "skimming for structure then scanning for detail",
        "reading only the last sentence",
        "ignoring topic sentences",
        "memorising every adjective",
      ],
      "skimming for structure then scanning for detail",
      { passage: text, passageTitle: title }
    ),
  ];
}

function writingQuestions(examIndex: number): Q[] {
  const task1 =
    examIndex === 0
      ? "The charts below show how adults in one city spent free time in 2010 and 2020 (reading, sports, screen media, volunteering). Summarise the information by selecting and reporting the main features, and make comparisons where relevant. (You should write at least 150 words.)"
      : "The diagram shows the process of turning recycled paper into new notebooks. Summarise the information by selecting and reporting the main features, and make comparisons where relevant. (You should write at least 150 words.)";
  const task2 =
    examIndex === 0
      ? "Some people think public libraries are no longer necessary because information is available online. To what extent do you agree or disagree? Give reasons for your answer and include relevant examples from your own knowledge or experience. (You should write at least 250 words.)"
      : "Many employers now allow staff to work from home for part of the week. Do the advantages of this development outweigh the disadvantages? Give reasons for your answer and include relevant examples. (You should write at least 250 words.)";
  return [
    {
      type: "writing_prompt",
      contentJson: {
        taskType: "TASK1_ACADEMIC",
        prompt: task1,
        minWords: 150,
      },
      correctAnswerJson: {},
    },
    {
      type: "writing_prompt",
      contentJson: {
        taskType: "TASK2",
        prompt: task2,
        minWords: 250,
      },
      correctAnswerJson: {},
    },
  ];
}

function speakingQuestions(): Q[] {
  return [
    {
      type: "speaking_prompt",
      contentJson: {
        part: 1,
        questions: [
          "Do you live in a house or an apartment?",
          "What do you like about your neighbourhood?",
          "How do you usually travel to work or school?",
          "What kind of books or articles do you read?",
          "Do you prefer mornings or evenings? Why?",
        ],
      },
      correctAnswerJson: {},
    },
    {
      type: "speaking_prompt",
      contentJson: {
        part: 2,
        cueCard: `Describe a place in your city that is good for studying or working quietly. You should say:\n- where it is\n- how often you go there\n- what you do there\nand explain why it is a good place for concentration.`,
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
          "Why do some people find it hard to concentrate in public places?",
          "How has technology changed the way people study?",
          "Should cities invest more in quiet public spaces?",
          "What makes a workplace productive?",
          "How might study habits change in the next twenty years?",
        ],
      },
      correctAnswerJson: {},
    },
  ];
}

async function seedOneMock(exam: MockExam, index: number) {
  const skills = await prisma.skill.findMany();
  const byName = Object.fromEntries(skills.map((s) => [s.name, s]));

  const existing = await prisma.test.findFirst({
    where: { type: TestType.PRACTICE_EXAM, title: exam.title },
  });
  if (existing) {
    await prisma.testSection.deleteMany({ where: { testId: existing.id } });
    await prisma.test.delete({ where: { id: existing.id } });
  }

  const test = await prisma.test.create({
    data: {
      levelId: null,
      type: TestType.PRACTICE_EXAM,
      title: exam.title,
      durationMin: exam.durationMin,
      publishedAt: new Date(),
      passingRulesJson: {
        minOverallBand: 0,
        minSkillBand: 0,
        practiceOnly: true,
        code: exam.code,
        titleVi: exam.titleVi,
        disclaimer:
          "Original mock exam for practice. Not an official IELTS test and not affiliated with British Council, IDP or Cambridge.",
      },
    },
  });

  const audioUrls: string[] = [];
  const listeningQs: Q[] = [];
  for (let s = 0; s < 4; s++) {
    const url = await ensureAudio(index + 1, s + 1);
    audioUrls.push(url);
    listeningQs.push(
      ...listeningQuestions(url, s + 1, exam.listeningScripts[s]!)
    );
  }

  const listeningSection = await prisma.testSection.create({
    data: {
      testId: test.id,
      skillId: byName[SkillName.LISTENING]!.id,
      order: 1,
      durationMin: 30,
      instructionsVi:
        "Listening (~30 phút). 4 đoạn theo format Academic. Mỗi đoạn nghe 1 lần. (Đề gốc VietIELTS — không phải đề thi chính thức.)",
      metadataJson: {
        audioSections: audioUrls.map((url, i) => ({
          index: i + 1,
          audioUrl: url,
          script: exam.listeningScripts[i],
          questionOrders: [
            i * 5 + 1,
            i * 5 + 2,
            i * 5 + 3,
            i * 5 + 4,
            i * 5 + 5,
          ],
        })),
      },
    },
  });
  for (let i = 0; i < listeningQs.length; i++) {
    const q = listeningQs[i]!;
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

  const readingQsAll = [
    ...readingQuestions(exam.readingPassages[0]!, 1),
    ...readingQuestions(exam.readingPassages[1]!, 2),
  ];
  const readingSection = await prisma.testSection.create({
    data: {
      testId: test.id,
      skillId: byName[SkillName.READING]!.id,
      order: 2,
      durationMin: 60,
      instructionsVi:
        "Reading (~60 phút). 2 passages Academic. (Đề luyện tập gốc — không phải IELTS chính thức.)",
      metadataJson: {
        passages: exam.readingPassages.map((p, i) => ({
          index: i + 1,
          title: p.title,
          text: p.text,
        })),
      },
    },
  });
  for (let i = 0; i < readingQsAll.length; i++) {
    const q = readingQsAll[i]!;
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

  const writingSection = await prisma.testSection.create({
    data: {
      testId: test.id,
      skillId: byName[SkillName.WRITING]!.id,
      order: 3,
      durationMin: 60,
      instructionsVi: "Writing (60 phút): Task 1 (~20 phút) + Task 2 (~40 phút).",
    },
  });
  const wqs = writingQuestions(index);
  for (let i = 0; i < wqs.length; i++) {
    const q = wqs[i]!;
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

  const speakingSection = await prisma.testSection.create({
    data: {
      testId: test.id,
      skillId: byName[SkillName.SPEAKING]!.id,
      order: 4,
      durationMin: 15,
      instructionsVi: "Speaking (~11–14 phút): Part 1, 2 và 3.",
    },
  });
  const sqs = speakingQuestions();
  for (let i = 0; i < sqs.length; i++) {
    const q = sqs[i]!;
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

  console.log(`Seeded PRACTICE_EXAM: ${exam.code} → ${test.id}`);
  return test.id;
}

export async function seedPracticeExams() {
  for (let i = 0; i < MOCKS.length; i++) {
    await seedOneMock(MOCKS[i]!, i);
  }
}

if (require.main === module) {
  seedPracticeExams()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
