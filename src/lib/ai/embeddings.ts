import { embed, cosineSimilarity } from "ai";
import type { ContentRefType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getOpenAIProvider, hasOpenAIKey } from "@/lib/ai/openai";

function hashEmbedding(text: string): number[] {
  // Deterministic pseudo-embedding for offline/dev (no OpenAI key).
  // Use a larger vector + n-grams so similar templates don't false-positive.
  const dim = 128;
  const vec = new Array<number>(dim).fill(0);
  const normalized = text.toLowerCase();
  for (let i = 0; i < normalized.length; i++) {
    const code = normalized.charCodeAt(i);
    vec[i % dim] += code / 255;
    if (i + 1 < normalized.length) {
      const bigram = code * 31 + normalized.charCodeAt(i + 1);
      vec[(bigram * 17) % dim] += 0.7;
    }
    if (i + 2 < normalized.length) {
      const trigram =
        code * 31 * 31 +
        normalized.charCodeAt(i + 1) * 31 +
        normalized.charCodeAt(i + 2);
      vec[(trigram * 13) % dim] += 0.4;
    }
  }
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
}

export async function embedText(text: string): Promise<number[]> {
  if (!hasOpenAIKey()) {
    return hashEmbedding(text);
  }
  const openai = getOpenAIProvider();
  const { embedding } = await embed({
    model: openai.embedding("text-embedding-3-small"),
    value: text.slice(0, 8000),
  });
  return embedding;
}

export function cosine(a: number[], b: number[]): number {
  if (a.length === b.length && a.length > 0) {
    try {
      return cosineSimilarity(a, b);
    } catch {
      // fall through
    }
  }
  const len = Math.min(a.length, b.length);
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < len; i++) {
    dot += a[i]! * b[i]!;
    na += a[i]! * a[i]!;
    nb += b[i]! * b[i]!;
  }
  return dot / ((Math.sqrt(na) || 1) * (Math.sqrt(nb) || 1));
}

export async function isDuplicateContent(
  text: string,
  threshold = 0.9
): Promise<boolean> {
  const embedding = await embedText(text);
  const existing = await prisma.contentEmbedding.findMany({
    take: 200,
    orderBy: { createdAt: "desc" },
  });
  for (const row of existing) {
    if (cosine(embedding, row.embedding) > threshold) {
      return true;
    }
  }
  return false;
}

export async function saveContentEmbedding(input: {
  refType: ContentRefType;
  refId: string;
  text: string;
}): Promise<void> {
  const embedding = await embedText(input.text);
  await prisma.contentEmbedding.create({
    data: {
      refType: input.refType,
      refId: input.refId,
      embedding,
    },
  });
}
