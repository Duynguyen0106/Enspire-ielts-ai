export type FeatureKey =
  | "PLACEMENT_TEST"
  | "LESSON_ACCESS"
  | "LISTENING_READING_PRACTICE"
  | "WRITING_SUBMISSION"
  | "SPEAKING_SESSION"
  | "FULL_LEVEL_TEST"
  | "MODEL_ANSWERS"
  | "PROGRESS_EXPORT";

export type UsagePeriodName = "DAY" | "WEEK" | "MONTH" | "LIFETIME";

type FeatureDef = {
  free: number | boolean | string;
  pro: number | boolean | string;
  period: UsagePeriodName;
};

export const FEATURES: Record<FeatureKey, FeatureDef> = {
  PLACEMENT_TEST: { free: 1, pro: 1, period: "LIFETIME" },
  LESSON_ACCESS: { free: "level<=1", pro: "all", period: "LIFETIME" },
  LISTENING_READING_PRACTICE: { free: 5, pro: 100, period: "DAY" },
  WRITING_SUBMISSION: { free: 3, pro: 200, period: "WEEK" },
  SPEAKING_SESSION: { free: 3, pro: 200, period: "WEEK" },
  FULL_LEVEL_TEST: { free: "level<=1", pro: "all", period: "LIFETIME" },
  MODEL_ANSWERS: { free: false, pro: true, period: "LIFETIME" },
  PROGRESS_EXPORT: { free: false, pro: true, period: "LIFETIME" },
};
