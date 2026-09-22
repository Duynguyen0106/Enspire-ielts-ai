import { createHash } from "crypto";
import { createOpenAI } from "@ai-sdk/openai";
import OpenAI from "openai";

export const EXAMINER_SYSTEM_PROMPT =
  "You are a certified IELTS examiner and bilingual Vietnamese-English tutor. You score strictly using the official IELTS band descriptors (0–9 in 0.5 steps). You never inflate scores. You explain in Vietnamese for the learner. You always return valid JSON matching the provided schema. No markdown, no prose outside JSON.";

export const PLACEMENT_MODEL = "gpt-4o-mini";
export const EVAL_MODEL = "gpt-4o";

export function hasOpenAIKey(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export function getOpenAIProvider() {
  if (!hasOpenAIKey()) {
    throw new Error("OPENAI_API_KEY chưa được cấu hình.");
  }
  return createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export function getOpenAIClient(): OpenAI {
  if (!hasOpenAIKey()) {
    throw new Error("OPENAI_API_KEY chưa được cấu hình.");
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 30_000,
  });
}

export function hashPrompt(input: string): string {
  return createHash("sha256").update(input).digest("hex").slice(0, 32);
}

export function withTimeout<T>(
  promise: Promise<T>,
  ms = 30_000,
  message = "Yêu cầu AI hết thời gian chờ."
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err: unknown) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}
