import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

type LimiterResult = {
  success: boolean;
  remaining: number;
  reset: number;
};

const memoryHits = new Map<string, number[]>();
const upstashLimiters = new Map<string, Ratelimit>();

function memoryLimit(
  key: string,
  limit: number,
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
      reset: (hits[0] ?? now) + windowMs,
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

function getUpstashLimiter(limit: number): Ratelimit | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;

  const cacheKey = String(limit);
  let limiter = upstashLimiters.get(cacheKey);
  if (!limiter) {
    limiter = new Ratelimit({
      redis: new Redis({ url, token }),
      limiter: Ratelimit.slidingWindow(limit, "1 m"),
      prefix: `vietielts:rl:${limit}`,
      analytics: false,
    });
    upstashLimiters.set(cacheKey, limiter);
  }
  return limiter;
}

export async function rateLimitUser(
  userId: string,
  bucket = "ai",
  limit = 10
): Promise<LimiterResult> {
  const key = `${bucket}:${userId}`;
  const limiter = getUpstashLimiter(limit);
  if (!limiter) {
    return memoryLimit(key, limit);
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

/** Daily window limiter (memory + Upstash when available). */
export async function rateLimitUserDaily(
  userId: string,
  bucket: string,
  limit: number
): Promise<{ success: boolean; remaining: number; reset: number }> {
  const key = `day:${bucket}:${userId}`;
  const windowMs = 24 * 60 * 60 * 1000;
  const redis = getRedis();
  if (!redis) {
    return memoryLimit(key, limit, windowMs);
  }
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, Math.ceil(windowMs / 1000));
  }
  return {
    success: count <= limit,
    remaining: Math.max(0, limit - count),
    reset: Date.now() + windowMs,
  };
}

export function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;
  return new Redis({ url, token });
}

const memoryCache = new Map<string, { value: string; expiresAt: number }>();

export async function cacheGet(key: string): Promise<string | null> {
  const redis = getRedis();
  if (redis) {
    const value = await redis.get<string>(key);
    return value ?? null;
  }
  const hit = memoryCache.get(key);
  if (!hit) return null;
  if (hit.expiresAt < Date.now()) {
    memoryCache.delete(key);
    return null;
  }
  return hit.value;
}

export async function cacheSet(
  key: string,
  value: string,
  ttlSeconds: number
): Promise<void> {
  const redis = getRedis();
  if (redis) {
    await redis.set(key, value, { ex: ttlSeconds });
    return;
  }
  memoryCache.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}
