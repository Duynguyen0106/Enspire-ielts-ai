import { z } from "zod";

export const lessonExerciseTypeSchema = z.enum([
  "mcq",
  "gap_fill",
  "short_answer",
  "rewrite",
  "translation",
]);

export const lessonExerciseSchema = z.object({
  type: lessonExerciseTypeSchema,
  prompt: z.string().min(1),
  options: z.array(z.string()).optional(),
  correctAnswer: z.string().min(1),
  explanationVi: z.string().min(1),
  hintVi: z.string().optional(),
});

export const lessonContentSchema = z.object({
  title: z.string(),
  titleVi: z.string(),
  objectiveVi: z.string(),
  warmup: z.object({
    questionVi: z.string(),
    tipsVi: z.array(z.string()),
  }),
  sections: z.array(
    z.object({
      headingVi: z.string(),
      headingEn: z.string().optional(),
      contentMd: z.string(),
      examplesEn: z.array(z.string()).optional(),
    })
  ),
  exercises: z.array(lessonExerciseSchema).min(1),
  checkpoint: lessonExerciseSchema.extend({
    passingScore: z.number().min(0).max(1).default(0.8),
  }),
  audioUrl: z.string().optional(),
  audioScript: z.string().optional(),
  passage: z.string().optional(),
});

export type LessonContent = z.infer<typeof lessonContentSchema>;
export type LessonExercise = z.infer<typeof lessonExerciseSchema>;

export const gradeResultSchema = z.object({
  score: z.number().min(0).max(1),
  feedbackVi: z.string(),
  correctedEn: z.string().optional(),
  explanationVi: z.string().optional(),
});

export type GradeResult = z.infer<typeof gradeResultSchema>;

export const practiceSectionSchema = z.object({
  title: z.string(),
  instructionsVi: z.string(),
  audioScript: z.string().optional(),
  audioUrl: z.string().optional(),
  passage: z.string().optional(),
  questions: z.array(
    z.object({
      id: z.string(),
      type: z.enum(["mcq", "gap_fill", "true_false_ng", "short_answer"]),
      prompt: z.string(),
      options: z.array(z.string()).optional(),
      correctAnswer: z.string(),
      explanationVi: z.string(),
    })
  ),
});

export type PracticeSection = z.infer<typeof practiceSectionSchema>;
