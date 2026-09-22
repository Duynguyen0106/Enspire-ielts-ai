import { getCurrentUser } from "@/lib/auth";
import {
  rateLimitExceededResponse,
  rateLimitUser,
  rateLimitUserDaily,
} from "@/lib/rate-limit";
import { NextResponse } from "next/server";

export async function requireApiUser() {
  const user = await getCurrentUser();
  if (!user) {
    return {
      user: null as null,
      error: NextResponse.json(
        { error: "Bạn cần đăng nhập để tiếp tục." },
        { status: 401 }
      ),
    };
  }
  return { user, error: null };
}

export async function enforceAiRateLimit(userId: string, limit = 10) {
  const result = await rateLimitUser(userId, "ai", limit);
  if (!result.success) {
    return rateLimitExceededResponse();
  }
  return null;
}

export async function enforceRateLimit(
  userId: string,
  bucket: string,
  limit: number
) {
  const result = await rateLimitUser(userId, bucket, limit);
  if (!result.success) {
    return rateLimitExceededResponse();
  }
  return null;
}

export async function enforceDailyRateLimit(
  userId: string,
  bucket: string,
  limit: number
) {
  const result = await rateLimitUserDaily(userId, bucket, limit);
  if (!result.success) {
    return Response.json(
      {
        error:
          "Bạn đã đạt giới hạn trong ngày. Vui lòng thử lại vào ngày mai.",
      },
      { status: 429 }
    );
  }
  return null;
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
