import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { rateLimitExceededResponse, rateLimitUser } from "@/lib/rate-limit";

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

export async function enforceAiRateLimit(userId: string) {
  const result = await rateLimitUser(userId, "ai");
  if (!result.success) {
    return rateLimitExceededResponse();
  }
  return null;
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
