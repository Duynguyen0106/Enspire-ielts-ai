/**
 * IELTS Academic-style raw score → band conversion.
 * 10-question sections (placement) and 20-question full-level sections.
 */

export type SkillScoreKind = "LISTENING" | "READING";

/** Approximate Academic conversion for a 10-item section (scaled from 40-item). */
const TEN_ITEM_BAND_TABLE: Record<number, number> = {
  0: 0,
  1: 1.5,
  2: 2.5,
  3: 3.5,
  4: 4.5,
  5: 5.0,
  6: 5.5,
  7: 6.5,
  8: 7.5,
  9: 8.5,
  10: 9.0,
};

/** Approximate Academic conversion for a 20-item section (scaled from 40-item). */
const TWENTY_ITEM_BAND_TABLE: Record<number, number> = {
  0: 0,
  1: 1.0,
  2: 1.5,
  3: 2.0,
  4: 2.5,
  5: 3.0,
  6: 3.5,
  7: 4.0,
  8: 4.5,
  9: 5.0,
  10: 5.0,
  11: 5.5,
  12: 6.0,
  13: 6.5,
  14: 7.0,
  15: 7.5,
  16: 8.0,
  17: 8.0,
  18: 8.5,
  19: 9.0,
  20: 9.0,
};

export type PassingRules = {
  minOverallBand: number;
  minSkillBand: number;
};

export function rawToBand(
  _skill: SkillScoreKind,
  raw: number,
  total: number
): number {
  if (total <= 0) return 0;
  const clamped = Math.max(0, Math.min(raw, total));
  if (total === 20) {
    return TWENTY_ITEM_BAND_TABLE[Math.round(clamped)] ?? 0;
  }
  if (total === 10) {
    return TEN_ITEM_BAND_TABLE[Math.round(clamped)] ?? 0;
  }
  const scaled = Math.round((clamped / total) * 10);
  return TEN_ITEM_BAND_TABLE[scaled] ?? 0;
}

/** Alias for 20-question Listening/Reading full-level sections. */
export function rawToBand20(
  skill: SkillScoreKind,
  raw: number
): number {
  return rawToBand(skill, raw, 20);
}

/**
 * Official IELTS overall band rounding:
 * .25 → round up to .5, .75 → round up to next whole number.
 */
export function roundBand(avg: number): number {
  if (!Number.isFinite(avg) || avg <= 0) return 0;
  if (avg >= 9) return 9;

  const whole = Math.floor(avg);
  const fraction = avg - whole;

  if (fraction < 0.25) return whole;
  if (fraction < 0.75) return whole + 0.5;
  return Math.min(9, whole + 1);
}

export function levelFromBand(band: number): number {
  if (band < 1) return 1;
  return Math.max(1, Math.min(9, Math.round(band)));
}

export function averageOverallBand(bands: number[]): number {
  if (bands.length === 0) return 0;
  const sum = bands.reduce((a, b) => a + b, 0);
  return roundBand(sum / bands.length);
}

export function computeOverall(bands: {
  listening: number;
  reading: number;
  writing: number;
  speaking: number;
}): number {
  return averageOverallBand([
    bands.listening,
    bands.reading,
    bands.writing,
    bands.speaking,
  ]);
}

export function evaluatePassing(
  bands: {
    listening: number;
    reading: number;
    writing: number;
    speaking: number;
  },
  rules: PassingRules
): { passed: boolean; overallBand: number; failedSkills: string[] } {
  const overallBand = computeOverall(bands);
  const entries: [string, number][] = [
    ["LISTENING", bands.listening],
    ["READING", bands.reading],
    ["WRITING", bands.writing],
    ["SPEAKING", bands.speaking],
  ];
  const failedSkills = entries
    .filter(([, b]) => b < rules.minSkillBand)
    .map(([name]) => name);
  const passed =
    overallBand >= rules.minOverallBand && failedSkills.length === 0;
  return { passed, overallBand, failedSkills };
}

export function isHalfStepBand(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 9 && value % 0.5 === 0;
}

export function parsePassingRules(
  json: unknown,
  levelNumber: number
): PassingRules {
  if (json && typeof json === "object") {
    const o = json as Record<string, unknown>;
    const minOverall =
      typeof o.minOverallBand === "number" ? o.minOverallBand : levelNumber;
    const minSkill =
      typeof o.minSkillBand === "number"
        ? o.minSkillBand
        : Math.max(0, levelNumber - 0.5);
    return { minOverallBand: minOverall, minSkillBand: minSkill };
  }
  return {
    minOverallBand: levelNumber,
    minSkillBand: Math.max(0, levelNumber - 0.5),
  };
}
