import type { SkillName } from "@prisma/client";
import { SKILL_LABELS, SKILL_LABELS_VI } from "@/lib/constants";

export { SKILL_LABELS, SKILL_LABELS_VI };

export const LEVEL_META: Record<
  number,
  { title: string; titleVi: string; descriptionVi: string; difficulty: string }
> = {
  1: {
    title: "Beginner",
    titleVi: "Người mới bắt đầu",
    descriptionVi: "Từ vựng và ngữ pháp cơ bản về đời sống hàng ngày.",
    difficulty: "very simple English, A1–A2, daily life topics",
  },
  2: {
    title: "Elementary",
    titleVi: "Sơ cấp",
    descriptionVi: "Chủ đề quen thuộc, câu ngắn, từ vựng thiết yếu.",
    difficulty: "elementary A2, familiar topics, short sentences",
  },
  3: {
    title: "Pre-Intermediate",
    titleVi: "Tiền trung cấp",
    descriptionVi: "Mở rộng từ vựng và cấu trúc câu cơ bản.",
    difficulty: "pre-intermediate B1, common IELTS themes",
  },
  4: {
    title: "Intermediate",
    titleVi: "Trung cấp",
    descriptionVi: "Định dạng IELTS chuẩn với chủ đề học thuật nhẹ.",
    difficulty: "intermediate B1–B2, light academic topics",
  },
  5: {
    title: "Upper-Intermediate",
    titleVi: "Trung cấp cao",
    descriptionVi: "Phân tích ý kiến và lập luận rõ ràng.",
    difficulty: "upper-intermediate B2, opinion and argument",
  },
  6: {
    title: "Advanced Foundations",
    titleVi: "Nền tảng nâng cao",
    descriptionVi: "Kỹ năng học thuật và từ vựng chuyên sâu hơn.",
    difficulty: "advanced foundations B2+, academic vocabulary",
  },
  7: {
    title: "Advanced",
    titleVi: "Nâng cao",
    descriptionVi: "Hướng tới band 7 với chiến lược chuyên sâu.",
    difficulty: "advanced C1, nuanced academic discussion",
  },
  8: {
    title: "Expert",
    titleVi: "Chuyên gia",
    descriptionVi: "Độ chính xác cao và ngôn ngữ tự nhiên.",
    difficulty: "expert C1+, precise natural language",
  },
  9: {
    title: "Mastery",
    titleVi: "Thành thạo",
    descriptionVi: "Chủ đề trừu tượng và học thuật phức tạp.",
    difficulty: "mastery C2, abstract academic topics",
  },
};

export const SKILLS: SkillName[] = [
  "LISTENING",
  "READING",
  "WRITING",
  "SPEAKING",
];

export function passageWordTarget(level: number): number {
  return Math.min(900, 150 + (level - 1) * 95);
}

export function lessonTopicsFor(
  level: number,
  skill: SkillName
): [string, string, string, string] {
  const map: Record<SkillName, [string, string, string, string]> = {
    LISTENING: [
      "Greetings and introductions",
      "Daily routines and schedules",
      "Asking for directions",
      "Listening checkpoint",
    ],
    READING: [
      "Short notices and signs",
      "Simple factual paragraphs",
      "Comparing two short texts",
      "Reading checkpoint",
    ],
    WRITING: [
      "Writing clear simple sentences",
      "Paraphrasing basic ideas",
      "Organising a short paragraph",
      "Writing checkpoint",
    ],
    SPEAKING: [
      "Talking about yourself",
      "Describing people and places",
      "Giving simple opinions",
      "Speaking checkpoint",
    ],
  };

  if (level >= 5) {
    return [
      `${skill} strategy for band ${level}`,
      `${skill} academic vocabulary`,
      `${skill} exam technique`,
      `${skill} checkpoint`,
    ];
  }

  return map[skill];
}
