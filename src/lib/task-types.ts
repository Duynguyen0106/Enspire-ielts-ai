import type { WritingTaskType } from "@prisma/client";

export type WritingTaskKey = WritingTaskType;

export const WRITING_TASK_META: Record<
  WritingTaskType,
  {
    title: string;
    titleVi: string;
    minWords: number;
    recommendedMin: number;
    descriptionVi: string;
  }
> = {
  TASK1_ACADEMIC: {
    title: "Task 1 Academic",
    titleVi: "Task 1 Học thuật",
    minWords: 150,
    recommendedMin: 20,
    descriptionVi: "Mô tả biểu đồ, bảng hoặc quy trình.",
  },
  TASK1_GENERAL: {
    title: "Task 1 General",
    titleVi: "Task 1 Tổng quát",
    minWords: 150,
    recommendedMin: 20,
    descriptionVi: "Viết thư formal/semi-formal/informal.",
  },
  TASK2: {
    title: "Task 2 Essay",
    titleVi: "Task 2 Bài luận",
    minWords: 250,
    recommendedMin: 40,
    descriptionVi: "Trình bày quan điểm và lập luận.",
  },
};

export function taskTypeFromSlug(slug: string): WritingTaskType | null {
  const map: Record<string, WritingTaskType> = {
    "task1-academic": "TASK1_ACADEMIC",
    "task1-general": "TASK1_GENERAL",
    task2: "TASK2",
    TASK1_ACADEMIC: "TASK1_ACADEMIC",
    TASK1_GENERAL: "TASK1_GENERAL",
    TASK2: "TASK2",
  };
  return map[slug] ?? null;
}

export function slugFromTaskType(taskType: WritingTaskType): string {
  const map: Record<WritingTaskType, string> = {
    TASK1_ACADEMIC: "task1-academic",
    TASK1_GENERAL: "task1-general",
    TASK2: "task2",
  };
  return map[taskType];
}
