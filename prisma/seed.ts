import { PrismaClient, SkillName, Role } from "@prisma/client";
import { hash } from "bcryptjs";
import { seedPlacement } from "./seed-placement";
import { seedLessons } from "./seed-lessons";
import { seedWritingContent } from "./seed-writing-prompts";
import { seedFullTests } from "./seed-full-tests";
import { seedPracticeExams } from "./seed-practice-exams";

const prisma = new PrismaClient();

const levels = [
  {
    number: 1,
    title: "Level 1 — Beginner",
    titleVi: "Level 1 — Người mới bắt đầu",
    descriptionVi: "Xây dựng nền tảng từ vựng và ngữ pháp cơ bản.",
  },
  {
    number: 2,
    title: "Level 2 — Elementary",
    titleVi: "Level 2 — Sơ cấp",
    descriptionVi: "Luyện kỹ năng nghe và đọc với chủ đề quen thuộc.",
  },
  {
    number: 3,
    title: "Level 3 — Pre-Intermediate",
    titleVi: "Level 3 — Tiền trung cấp",
    descriptionVi: "Mở rộng từ vựng học thuật và cấu trúc câu.",
  },
  {
    number: 4,
    title: "Level 4 — Intermediate",
    titleVi: "Level 4 — Trung cấp",
    descriptionVi: "Luyện đề theo định dạng IELTS chuẩn.",
  },
  {
    number: 5,
    title: "Level 5 — Upper-Intermediate",
    titleVi: "Level 5 — Trung cấp cao",
    descriptionVi: "Nâng band Writing và Speaking với phản hồi AI.",
  },
  {
    number: 6,
    title: "Level 6 — Advanced Foundations",
    titleVi: "Level 6 — Nền tảng nâng cao",
    descriptionVi: "Làm chủ kỹ năng phân tích và lập luận.",
  },
  {
    number: 7,
    title: "Level 7 — Advanced",
    titleVi: "Level 7 — Nâng cao",
    descriptionVi: "Hướng tới band 7.0 với chiến lược chuyên sâu.",
  },
  {
    number: 8,
    title: "Level 8 — Expert",
    titleVi: "Level 8 — Chuyên gia",
    descriptionVi: "Tinh chỉnh độ chính xác và sự tự nhiên.",
  },
  {
    number: 9,
    title: "Level 9 — Mastery",
    titleVi: "Level 9 — Thành thạo",
    descriptionVi: "Đạt mức thành thạo gần như người bản ngữ.",
  },
];

const skills: SkillName[] = [
  SkillName.LISTENING,
  SkillName.READING,
  SkillName.WRITING,
  SkillName.SPEAKING,
];

async function main() {
  for (const level of levels) {
    await prisma.level.upsert({
      where: { number: level.number },
      update: {
        title: level.title,
        titleVi: level.titleVi,
        descriptionVi: level.descriptionVi,
      },
      create: level,
    });
  }

  for (const name of skills) {
    await prisma.skill.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  const passwordHash = await hash("Admin@12345", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@vietielts.ai" },
    update: {
      passwordHash,
      role: Role.ADMIN,
      name: "Admin VietIELTS",
    },
    create: {
      email: "admin@vietielts.ai",
      name: "Admin VietIELTS",
      passwordHash,
      role: Role.ADMIN,
      profile: {
        create: {
          displayName: "Admin",
          nativeLanguage: "vi",
          targetBand: 9.0,
          currentLevel: 1,
          placementCompleted: true,
        },
      },
    },
  });

  await prisma.profile.upsert({
    where: { userId: admin.id },
    update: {
      displayName: "Admin",
      targetBand: 9.0,
      placementCompleted: true,
    },
    create: {
      userId: admin.id,
      displayName: "Admin",
      nativeLanguage: "vi",
      targetBand: 9.0,
      currentLevel: 1,
      placementCompleted: true,
    },
  });

  const DEFAULT_FLAGS = [
    {
      key: "new_tutor_model",
      enabled: false,
      description: "Use alternate tutor model",
    },
    {
      key: "enable_ai_followups_in_speaking",
      enabled: false,
      description: "AI follow-up questions in speaking",
    },
    {
      key: "enable_yearly_plan",
      enabled: true,
      description: "Show yearly pricing option",
    },
    {
      key: "strict_pronunciation_disclaimer",
      enabled: true,
      description: "Show pronunciation estimate disclaimer",
    },
    {
      key: "beta_reading_generator",
      enabled: false,
      description: "Beta reading practice generator",
    },
  ] as const;
  for (const flag of DEFAULT_FLAGS) {
    await prisma.featureFlag.upsert({
      where: { key: flag.key },
      update: { description: flag.description },
      create: {
        key: flag.key,
        enabled: flag.enabled,
        description: flag.description,
      },
    });
  }

  console.log("Seed completed:");
  console.log(`- ${levels.length} levels`);
  console.log(`- ${skills.length} skills`);
  console.log(`- Admin user: ${admin.email}`);
  console.log(`- ${DEFAULT_FLAGS.length} feature flags`);

  await seedPlacement();

  const sample = process.argv.includes("--sample");
  await seedLessons({ sample: sample || !process.env.OPENAI_API_KEY?.trim() });
  await seedWritingContent();

  // Full-level tests: seed Level 1 by default; use --full-tests for all 1–9
  const fullAll = process.argv.includes("--full-tests");
  await seedFullTests(fullAll ? null : 1);
  await seedPracticeExams();
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
