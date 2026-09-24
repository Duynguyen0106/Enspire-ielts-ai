import { NextResponse } from "next/server";
import { markStaleAttemptsAbandoned, retryFailedScorings } from "@/lib/attempt-cleanup";
import { publishScoreJob } from "@/lib/qstash";
import { jsonError } from "@/lib/api";

function authorize(req: Request): boolean {
  const secret = process.env.CRON_SECRET ?? "dev-cron";
  const auth =
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    req.headers.get("x-cron-secret") ??
    new URL(req.url).searchParams.get("secret");
  return auth === secret;
}

export async function GET(req: Request) {
  if (!authorize(req)) return jsonError("Unauthorized", 401);

  const abandoned = await markStaleAttemptsAbandoned();
  const retryIds = await retryFailedScorings(3);
  for (const id of retryIds) {
    await publishScoreJob(id);
  }

  return NextResponse.json({
    abandoned,
    retried: retryIds.length,
    retryIds,
  });
}
