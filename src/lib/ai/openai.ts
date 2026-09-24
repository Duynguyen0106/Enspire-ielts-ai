import { createHash } from "crypto";
import { createOpenAI } from "@ai-sdk/openai";
import OpenAI from "openai";

export const EXAMINER_SYSTEM_PROMPT =
  "You are a certified IELTS examiner and bilingual Vietnamese-English tutor. You score strictly using the official IELTS band descriptors (0–9 in 0.5 steps). You never inflate scores. You explain in Vietnamese for the learner. You always return valid JSON matching the provided schema. No markdown, no prose outside JSON.";

function isOpenRouterKey(key: string) {
  return key.startsWith("sk-or-");
}

function openAiBaseURL(apiKey: string): string | undefined {
  const fromEnv = process.env.OPENAI_BASE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (isOpenRouterKey(apiKey)) return "https://openrouter.ai/api/v1";
  return undefined;
}

function resolveModel(envName: string, openAiDefault: string, openRouterDefault: string) {
  const fromEnv = process.env[envName]?.trim();
  if (fromEnv) return fromEnv;
  const key = process.env.OPENAI_API_KEY?.trim() ?? "";
  if (isOpenRouterKey(key) || process.env.OPENAI_BASE_URL?.includes("openrouter")) {
    return openRouterDefault;
  }
  return openAiDefault;
}

/** Placement / practice generation (cheaper). */
export const PLACEMENT_MODEL = resolveModel(
  "OPENAI_MODEL_PLACEMENT",
  "gpt-4o-mini",
  "openai/gpt-4o-mini"
);

/** Writing / speaking evaluation (stronger). */
export const EVAL_MODEL = resolveModel(
  "OPENAI_MODEL_EVAL",
  "gpt-4o",
  "openai/gpt-4o"
);

export function hasOpenAIKey(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export function getOpenAIProvider() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY chưa được cấu hình.");
  }
  const baseURL = openAiBaseURL(apiKey);
  return createOpenAI({
    apiKey,
    ...(baseURL ? { baseURL } : {}),
  });
}

export function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY chưa được cấu hình.");
  }
  const baseURL = openAiBaseURL(apiKey);
  return new OpenAI({
    apiKey,
    ...(baseURL ? { baseURL } : {}),
    timeout: 30_000,
    defaultHeaders: baseURL?.includes("openrouter")
      ? {
          "HTTP-Referer":
            process.env.NEXTAUTH_URL ?? "https://enspire-ielts-ai.vercel.app",
          "X-Title": "VietIELTS AI",
        }
      : undefined,
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
