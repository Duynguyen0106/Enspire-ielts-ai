import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type LimiterResult = {
  success: boolean;
  remaining: number;
  reset: number;
};

const memoryHits = new Map<string, number[]>();

function memoryLimit(
  key: string,
  limit = 10,
  windowMs = 60_000
): LimiterResult {
  const now = Date.now();
  const windowStart = now - windowMs;
  const hits = (memoryHits.get(key) ?? []).filter((t) => t > windowStart);
  if (hits.length >= limit) {
    memoryHits.set(key, hits);
    return {
      success: false,
      remaining: 0,
      reset: hits[0]! + windowMs,
    };
  }
  hits.push(now);
  memoryHits.set(key, hits);
  return {
    success: true,
    remaining: limit - hits.length,
    reset: now + windowMs,
  };
}

let upstashLimiter: Ratelimit | null = null;

function getUpstashLimiter(): Ratelimit | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;

  if (!upstashLimiter) {
    upstashLimiter = new Ratelimit({
      redis: new Redis({ url, token }),
      limiter: Ratelimit.slidingWindow(10, "1 m"),
      prefix: "vietielts:rl",
      analytics: false,
    });
  }
  return upstashLimiter;
}

/** 10 requests / minute per user (Upstash if configured, else in-memory). */
export async function rateLimitUser(
  userId: string,
  bucket = "ai"
): Promise<LimiterResult> {
  const key = `${bucket}:${userId}`;
  const limiter = getUpstashLimiter();
  if (!limiter) {
    return memoryLimit(key);
  }

  const result = await limiter.limit(key);
  return {
    success: result.success,
    remaining: result.remaining,
    reset: result.reset,
  };
}

export function rateLimitExceededResponse() {
  return Response.json(
    {
      error:
        "Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau khoảng 1 phút.",
    },
    { status: 429 }
  );
}
