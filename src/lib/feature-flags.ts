import { prisma } from "@/lib/prisma";

export async function isFeatureEnabled(key: string, defaultEnabled = false) {
  const flag = await prisma.featureFlag.findUnique({ where: { key } });
  if (!flag) return defaultEnabled;
  return flag.enabled;
}

export const DEFAULT_FLAGS = [
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
