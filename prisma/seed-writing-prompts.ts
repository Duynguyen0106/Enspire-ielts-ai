import {
  PrismaClient,
  WritingTaskType,
  type Prisma,
} from "@prisma/client";

const prisma = new PrismaClient();

type PromptSeed = {
  taskType: WritingTaskType;
  levelMin: number;
  levelMax: number;
  levelBucket: string;
  title: string;
  titleVi: string;
  prompt: string;
};

const PROMPTS: PromptSeed[] = [
  // TASK2 low
  {
    taskType: WritingTaskType.TASK2,
    levelMin: 1,
    levelMax: 3,
    levelBucket: "low",
    title: "Online learning",
    titleVi: "Học trực tuyến",
    prompt:
      "Some people think online learning is better than classroom learning. To what extent do you agree or disagree? Give reasons and examples.",
  },
  {
    taskType: WritingTaskType.TASK2,
    levelMin: 1,
    levelMax: 3,
    levelBucket: "low",
    title: "Pets at home",
    titleVi: "Nuôi thú cưng",
    prompt:
      "Many families keep pets. Do the advantages of keeping pets outweigh the disadvantages?",
  },
  {
    taskType: WritingTaskType.TASK2,
    levelMin: 1,
    levelMax: 3,
    levelBucket: "low",
    title: "Sports at school",
    titleVi: "Thể thao ở trường",
    prompt:
      "Schools should make sports compulsory for all students. Discuss both views and give your opinion.",
  },
  {
    taskType: WritingTaskType.TASK2,
    levelMin: 1,
    levelMax: 3,
    levelBucket: "low",
    title: "Fast food",
    titleVi: "Đồ ăn nhanh",
    prompt:
      "Fast food is becoming more popular. What problems does this cause and what solutions can you suggest?",
  },
  {
    taskType: WritingTaskType.TASK2,
    levelMin: 1,
    levelMax: 3,
    levelBucket: "low",
    title: "Reading books",
    titleVi: "Đọc sách",
    prompt:
      "Some people prefer reading books, while others prefer watching films. Which do you prefer and why?",
  },
  // TASK2 mid
  {
    taskType: WritingTaskType.TASK2,
    levelMin: 4,
    levelMax: 6,
    levelBucket: "mid",
    title: "Remote work",
    titleVi: "Làm việc từ xa",
    prompt:
      "Working from home has become common. Discuss the advantages and disadvantages for employees and employers.",
  },
  {
    taskType: WritingTaskType.TASK2,
    levelMin: 4,
    levelMax: 6,
    levelBucket: "mid",
    title: "Public transport",
    titleVi: "Giao thông công cộng",
    prompt:
      "Governments should invest more in public transport than in roads for private cars. To what extent do you agree?",
  },
  {
    taskType: WritingTaskType.TASK2,
    levelMin: 4,
    levelMax: 6,
    levelBucket: "mid",
    title: "University education",
    titleVi: "Giáo dục đại học",
    prompt:
      "Some believe university education should be free for everyone. Others think students should pay. Discuss both views.",
  },
  {
    taskType: WritingTaskType.TASK2,
    levelMin: 4,
    levelMax: 6,
    levelBucket: "mid",
    title: "Social media",
    titleVi: "Mạng xã hội",
    prompt:
      "Social media has changed the way people communicate. Is this a positive or negative development?",
  },
  {
    taskType: WritingTaskType.TASK2,
    levelMin: 4,
    levelMax: 6,
    levelBucket: "mid",
    title: "Tourism impact",
    titleVi: "Tác động du lịch",
    prompt:
      "International tourism can damage local cultures. What are the causes and what measures can be taken?",
  },
  // TASK2 high
  {
    taskType: WritingTaskType.TASK2,
    levelMin: 7,
    levelMax: 9,
    levelBucket: "high",
    title: "AI in education",
    titleVi: "AI trong giáo dục",
    prompt:
      "Artificial intelligence is increasingly used in education. Do the benefits outweigh the risks for learners and teachers?",
  },
  {
    taskType: WritingTaskType.TASK2,
    levelMin: 7,
    levelMax: 9,
    levelBucket: "high",
    title: "Climate policy",
    titleVi: "Chính sách khí hậu",
    prompt:
      "Some argue that individuals cannot solve climate change and only governments can. Discuss both views and give your opinion.",
  },
  {
    taskType: WritingTaskType.TASK2,
    levelMin: 7,
    levelMax: 9,
    levelBucket: "high",
    title: "Cultural heritage",
    titleVi: "Di sản văn hóa",
    prompt:
      "Preserving historic buildings is expensive. Should public money be used for this purpose? Give reasons.",
  },
  {
    taskType: WritingTaskType.TASK2,
    levelMin: 7,
    levelMax: 9,
    levelBucket: "high",
    title: "Globalisation",
    titleVi: "Toàn cầu hóa",
    prompt:
      "Globalisation has made the world more similar. Is this a positive or negative trend for local identities?",
  },
  {
    taskType: WritingTaskType.TASK2,
    levelMin: 7,
    levelMax: 9,
    levelBucket: "high",
    title: "Scientific research",
    titleVi: "Nghiên cứu khoa học",
    prompt:
      "Scientific research should be funded only if it has clear practical benefits. To what extent do you agree?",
  },
  // TASK1 Academic
  ...(["low", "mid", "high"] as const).flatMap((bucket, idx) => {
    const ranges = [
      [1, 3],
      [4, 6],
      [7, 9],
    ] as const;
    const [levelMin, levelMax] = ranges[idx]!;
    return [
      {
        taskType: WritingTaskType.TASK1_ACADEMIC,
        levelMin,
        levelMax,
        levelBucket: bucket,
        title: `Line chart energy ${bucket}`,
        titleVi: `Biểu đồ năng lượng (${bucket})`,
        prompt:
          "The chart below shows energy consumption by sector in a country over 20 years. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
      },
      {
        taskType: WritingTaskType.TASK1_ACADEMIC,
        levelMin,
        levelMax,
        levelBucket: bucket,
        title: `Process recycling ${bucket}`,
        titleVi: `Quy trình tái chế (${bucket})`,
        prompt:
          "The diagram illustrates how plastic bottles are recycled. Summarise the information by selecting and reporting the main features.",
      },
      {
        taskType: WritingTaskType.TASK1_ACADEMIC,
        levelMin,
        levelMax,
        levelBucket: bucket,
        title: `Table education ${bucket}`,
        titleVi: `Bảng giáo dục (${bucket})`,
        prompt:
          "The table compares the percentage of students in three subjects across five countries. Summarise the information and make comparisons where relevant.",
      },
      {
        taskType: WritingTaskType.TASK1_ACADEMIC,
        levelMin,
        levelMax,
        levelBucket: bucket,
        title: `Map town ${bucket}`,
        titleVi: `Bản đồ thị trấn (${bucket})`,
        prompt:
          "The maps show a town centre in 2000 and today. Summarise the main changes.",
      },
      {
        taskType: WritingTaskType.TASK1_ACADEMIC,
        levelMin,
        levelMax,
        levelBucket: bucket,
        title: `Bar tourism ${bucket}`,
        titleVi: `Biểu đồ cột du lịch (${bucket})`,
        prompt:
          "The bar chart shows the number of international visitors to four cities. Summarise the information by selecting and reporting the main features.",
      },
    ] satisfies PromptSeed[];
  }),
  // TASK1 General
  ...(["low", "mid", "high"] as const).flatMap((bucket, idx) => {
    const ranges = [
      [1, 3],
      [4, 6],
      [7, 9],
    ] as const;
    const [levelMin, levelMax] = ranges[idx]!;
    return [
      {
        taskType: WritingTaskType.TASK1_GENERAL,
        levelMin,
        levelMax,
        levelBucket: bucket,
        title: `Complaint letter ${bucket}`,
        titleVi: `Thư khiếu nại (${bucket})`,
        prompt:
          "You recently stayed at a hotel and were unhappy with the service. Write a letter to the manager. Describe the problem, explain how it affected you, and say what you want them to do.",
      },
      {
        taskType: WritingTaskType.TASK1_GENERAL,
        levelMin,
        levelMax,
        levelBucket: bucket,
        title: `Friend invitation ${bucket}`,
        titleVi: `Thư mời bạn (${bucket})`,
        prompt:
          "Write a letter to a friend inviting them to a celebration. Say what the celebration is, when and where it will be, and what they should bring.",
      },
      {
        taskType: WritingTaskType.TASK1_GENERAL,
        levelMin,
        levelMax,
        levelBucket: bucket,
        title: `Job enquiry ${bucket}`,
        titleVi: `Thư hỏi việc (${bucket})`,
        prompt:
          "You saw an advertisement for a part-time job. Write to the employer asking for more information about hours, pay, and responsibilities.",
      },
      {
        taskType: WritingTaskType.TASK1_GENERAL,
        levelMin,
        levelMax,
        levelBucket: bucket,
        title: `Neighbour request ${bucket}`,
        titleVi: `Thư nhờ hàng xóm (${bucket})`,
        prompt:
          "You will be away for two weeks. Write to your neighbour asking them to look after your flat. Explain what needs doing and how to contact you.",
      },
      {
        taskType: WritingTaskType.TASK1_GENERAL,
        levelMin,
        levelMax,
        levelBucket: bucket,
        title: `Course feedback ${bucket}`,
        titleVi: `Thư phản hồi khóa học (${bucket})`,
        prompt:
          "You recently completed an English course. Write to the school to give feedback. Mention what you liked, what could improve, and whether you would recommend it.",
      },
    ] satisfies PromptSeed[];
  }),
];

const TEMPLATES = [
  {
    taskType: WritingTaskType.TASK2,
    band: 6,
    title: "Opinion essay skeleton",
    titleVi: "Khung bài Opinion band 6",
    structureJson: {
      paragraphs: ["Introduction", "Body 1", "Body 2", "Conclusion"],
    },
    samplePhrasesJson: {
      openers: ["I partly agree that...", "Many people believe that..."],
      linkers: ["Firstly", "In addition", "However", "In conclusion"],
    },
  },
  {
    taskType: WritingTaskType.TASK2,
    band: 7,
    title: "Discussion essay skeleton",
    titleVi: "Khung bài Discussion band 7",
    structureJson: {
      paragraphs: [
        "Paraphrase + outline",
        "View A + example",
        "View B + example",
        "Opinion + conclusion",
      ],
    },
    samplePhrasesJson: {
      openers: ["While some argue..., others contend..."],
      linkers: ["On the one hand", "On the other hand", "Ultimately"],
    },
  },
  {
    taskType: WritingTaskType.TASK1_ACADEMIC,
    band: 7,
    title: "Chart overview + details",
    titleVi: "Khung Task 1 Academic",
    structureJson: {
      paragraphs: ["Intro", "Overview", "Detail 1", "Detail 2"],
    },
    samplePhrasesJson: {
      openers: ["The chart illustrates...", "Overall, ..."],
      comparisons: ["whereas", "compared with", "the most significant"],
    },
  },
  {
    taskType: WritingTaskType.TASK1_GENERAL,
    band: 7,
    title: "Formal letter structure",
    titleVi: "Khung thư formal",
    structureJson: {
      paragraphs: ["Purpose", "Details", "Request/action", "Closing"],
    },
    samplePhrasesJson: {
      openers: ["I am writing to...", "I would be grateful if..."],
      closings: ["Yours faithfully", "Yours sincerely"],
    },
  },
];

export async function seedWritingContent() {
  console.log("Seeding writing prompts + templates…");
  for (const p of PROMPTS) {
    const existing = await prisma.writingPrompt.findFirst({
      where: { title: p.title, taskType: p.taskType },
    });
    if (existing) {
      await prisma.writingPrompt.update({
        where: { id: existing.id },
        data: {
          titleVi: p.titleVi,
          prompt: p.prompt,
          levelMin: p.levelMin,
          levelMax: p.levelMax,
          levelBucket: p.levelBucket,
          publishedAt: new Date(),
        },
      });
    } else {
      await prisma.writingPrompt.create({ data: p });
    }
  }

  for (const t of TEMPLATES) {
    const existing = await prisma.writingTemplate.findFirst({
      where: { title: t.title, taskType: t.taskType },
    });
    if (existing) {
      await prisma.writingTemplate.update({
        where: { id: existing.id },
        data: {
          titleVi: t.titleVi,
          band: t.band,
          structureJson: t.structureJson as Prisma.InputJsonValue,
          samplePhrasesJson: t.samplePhrasesJson as Prisma.InputJsonValue,
        },
      });
    } else {
      await prisma.writingTemplate.create({
        data: {
          ...t,
          structureJson: t.structureJson as Prisma.InputJsonValue,
          samplePhrasesJson: t.samplePhrasesJson as Prisma.InputJsonValue,
        },
      });
    }
  }

  const count = await prisma.writingPrompt.count();
  console.log(`Writing seed done. Prompts: ${count}`);
}

const isDirect = process.argv[1]?.includes("seed-writing");
if (isDirect) {
  seedWritingContent()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
