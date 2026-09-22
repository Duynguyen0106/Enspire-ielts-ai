import { NextResponse } from "next/server";
import { requireApiUser, jsonError } from "@/lib/api";
import { finishAttempt } from "@/lib/exam-orchestrator";

type Ctx = { params: Promise<{ attemptId: string }> };

export async function POST(_req: Request, context: Ctx) {
  const { user, error } = await requireApiUser();
  if (error || !user) return error!;
  const { attemptId } = await context.params;

  try {
    await finishAttempt({ attemptId, userId: user.id });
    return NextResponse.json({ status: "SCORING" });
  } catch (e) {
    const status =
      e && typeof e === "object" && "status" in e
        ? Number((e as { status: number }).status)
        : 400;
    return jsonError(
      e instanceof Error ? e.message : "Không kết thúc được bài thi.",
      status
    );
  }
}
