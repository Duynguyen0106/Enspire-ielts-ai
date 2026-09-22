import { z } from "zod";

export const bandSchema = z
  .number()
  .min(0)
  .max(9)
  .refine((v) => v % 0.5 === 0, { message: "Band phải là bước 0.5" });

export const criterionSchema = z.object({
  band: bandSchema,
  feedbackVi: z.string().min(1),
});

export const correctionSchema = z.object({
  original: z.string(),
  corrected: z.string(),
  explanationVi: z.string(),
});

export const writingEvalSchema = z.object({
  overallBand: bandSchema,
  criteria: z.object({
    taskAchievement: criterionSchema,
    coherenceCohesion: criterionSchema,
    lexicalResource: criterionSchema,
    grammaticalRange: criterionSchema,
  }),
  corrections: z.array(correctionSchema).max(10),
  nextSteps: z.array(z.string()).min(3).max(5),
});

export const speakingEvalSchema = z.object({
  overallBand: bandSchema,
  criteria: z.object({
    fluencyCoherence: criterionSchema,
    lexicalResource: criterionSchema,
    grammaticalRange: criterionSchema,
    pronunciation: criterionSchema.extend({
      note: z.string().default("Ước lượng từ transcript"),
    }),
  }),
  corrections: z.array(correctionSchema).max(10),
  nextSteps: z.array(z.string()).min(3).max(5),
});

export const placementSummarySchema = z.object({
  strengths: z.array(z.string()).min(2).max(6),
  weaknesses: z.array(z.string()).min(2).max(6),
  summaryVi: z.string().min(20),
  skillNotes: z.object({
    listening: z.string(),
    reading: z.string(),
    writing: z.string(),
    speaking: z.string(),
  }),
});

export type WritingEval = z.infer<typeof writingEvalSchema>;
export type SpeakingEval = z.infer<typeof speakingEvalSchema>;
export type PlacementSummary = z.infer<typeof placementSummarySchema>;

export const writingEvaluateBodySchema = z.object({
  text: z.string().min(1),
  taskPrompt: z.string().min(1),
  taskType: z.enum(["task1", "task2"]).default("task2"),
  level: z.number().int().min(1).max(9).optional(),
});

export const speakingEvaluateBodySchema = z.object({
  transcript: z.string().min(1),
  part: z.union([z.literal(1), z.literal(2), z.literal(3), z.string()]),
  questions: z.array(z.string()).min(1),
  level: z.number().int().min(1).max(9).optional(),
  wordsPerMinute: z.number().optional(),
  pauseCount: z.number().optional(),
});

export const placementAnswerBodySchema = z.object({
  attemptId: z.string().min(1),
  questionId: z.string().min(1),
  userResponseJson: z.unknown(),
});

export const placementSubmitBodySchema = z.object({
  attemptId: z.string().min(1),
  answers: z.array(
    z.object({
      questionId: z.string().min(1),
      userResponseJson: z.unknown(),
    })
  ),
  speakingAudioBase64: z.string().optional(),
});
