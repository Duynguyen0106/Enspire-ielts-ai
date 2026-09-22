import { NextResponse } from "next/server";
import { Receiver } from "@upstash/qstash";
import { z } from "zod";
import { jsonError } from "@/lib/api";
import { scoreFullLevelAttempt } from "@/lib/score-full-attempt";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  attemptId: z.string().min(1),
});

async function authorize(req: Request): Promise<boolean> {
  const cron =
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    req.headers.get("x-cron-secret");
  const secret = process.env.CRON_SECRET ?? "dev-cron";
  if (cron && cron === secret) return true;

  const current = process.env.QSTASH_CURRENT_SIGNING_KEY;
  const next = process.env.QSTASH_NEXT_SIGNING_KEY;
  if (current && next) {
    try {
      const receiver = new Receiver({
        currentSigningKey: current,
        nextSigningKey: next,
      });
      const signature = req.headers.get("upstash-signature") ?? "";
      const body = await req.clone().text();
      return await receiver.verify({ signature, body });
    } catch {
      return false;
    }
  }

  // Local inline fallback
  if (req.headers.get("x-score-inline") === "1" && process.env.NODE_ENV !== "production") {
    return true;
  }
  if (req.headers.get("x-score-inline") === "1" && cron === secret) {
    return true;
  }
  return false;
}

export async function POST(req: Request) {
  const ok = await authorize(req);
  if (!ok) return jsonError("Unauthorized", 401);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid body");
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid body");

  const attempt = await prisma.testAttempt.findUnique({
    where: { id: parsed.data.attemptId },
  });
  if (!attempt) return jsonError("Attempt not found", 404);

  if (attempt.scoringStatus === "SCORED" && attempt.status === "SCORED") {
    return NextResponse.json({ status: "SCORED", idempotent: true });
  }

  try {
    await scoreFullLevelAttempt(parsed.data.attemptId);
    return NextResponse.json({ status: "SCORED" });
  } catch (e) {
    return jsonError(
      e instanceof Error ? e.message : "Scoring failed",
      500
    );
  }
}
