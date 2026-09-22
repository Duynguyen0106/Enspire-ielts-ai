import { z } from "zod";
import { bandSchema, correctionSchema } from "@/lib/ai/schemas";

export const writingGymEvalSchema = z.object({
  overallBand: bandSchema,
  criteria: z.object({
    taskAchievement: z.object({
      band: bandSchema,
      feedbackVi: z.string(),
      evidenceQuote: z.string().default(""),
    }),
    coherenceCohesion: z.object({
      band: bandSchema,
      feedbackVi: z.string(),
      evidenceQuote: z.string().default(""),
    }),
    lexicalResource: z.object({
      band: bandSchema,
      feedbackVi: z.string(),
      evidenceQuote: z.string().default(""),
    }),
    grammaticalRange: z.object({
      band: bandSchema,
      feedbackVi: z.string(),
      evidenceQuote: z.string().default(""),
    }),
  }),
  corrections: z
    .array(
      correctionSchema.extend({
        type: z
          .enum(["grammar", "vocab", "cohesion", "task"])
          .default("grammar"),
      })
    )
    .max(15),
  strengthsVi: z.array(z.string()).max(5).default([]),
  nextSteps: z.array(z.string()).min(3).max(5),
  wordCountNote: z.string().optional(),
});

export type WritingGymEval = z.infer<typeof writingGymEvalSchema>;

export const speakingGymEvalSchema = z.object({
  overallBand: bandSchema,
  criteria: z.object({
    fluencyCoherence: z.object({
      band: bandSchema,
      feedbackVi: z.string(),
      metrics: z
        .object({
          wpm: z.number(),
          pauseCount: z.number(),
          fillerCount: z.number(),
        })
        .optional(),
    }),
    lexicalResource: z.object({
      band: bandSchema,
      feedbackVi: z.string(),
    }),
    grammaticalRange: z.object({
      band: bandSchema,
      feedbackVi: z.string(),
    }),
    pronunciation: z.object({
      band: bandSchema,
      feedbackVi: z.string(),
      noteVi: z
        .string()
        .default(
          "Ước lượng từ transcript — không phải phân tích âm thanh thực."
        ),
    }),
  }),
  corrections: z.array(correctionSchema).max(15),
  strengthsVi: z.array(z.string()).max(5).default([]),
  nextSteps: z.array(z.string()).min(3).max(5),
  recommendedDrills: z
    .array(
      z.object({
        titleVi: z.string(),
        descriptionVi: z.string(),
        practiceUrl: z.string().optional(),
      })
    )
    .max(5)
    .default([]),
});

export type SpeakingGymEval = z.infer<typeof speakingGymEvalSchema>;

export const modelAnswerBandSchema = z.object({
  text: z.string().min(20),
  notesVi: z.array(z.string()).min(1).max(5),
});

export const modelAnswersSchema = z.object({
  band6: modelAnswerBandSchema,
  band75: modelAnswerBandSchema,
  band9: modelAnswerBandSchema,
});

export type ModelAnswers = z.infer<typeof modelAnswersSchema>;
