/**
 * IELTS Academic-style raw score → band conversion for a 10-question section.
 * Maps correct count (0–10) to band 0–9 in 0.5 steps, scaled from published
 * Academic Listening/Reading conversion tables.
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

export function rawToBand(
  _skill: SkillScoreKind,
  raw: number,
  total: number
): number {
  if (total <= 0) return 0;
  const clamped = Math.max(0, Math.min(raw, total));
  const scaled = Math.round((clamped / total) * 10);
  return TEN_ITEM_BAND_TABLE[scaled] ?? 0;
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

export function isHalfStepBand(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 9 && value % 0.5 === 0;
}
