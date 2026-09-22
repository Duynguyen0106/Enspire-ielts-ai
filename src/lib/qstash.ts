import { Client } from "@upstash/qstash";

let cached: Client | null = null;

export function hasQStash(): boolean {
  return Boolean(process.env.QSTASH_TOKEN?.trim());
}

export function getQStashClient(): Client | null {
  if (!hasQStash()) return null;
  if (!cached) {
    cached = new Client({ token: process.env.QSTASH_TOKEN! });
  }
  return cached;
}

export async function publishScoreJob(attemptId: string): Promise<{
  queued: boolean;
  mode: "qstash" | "inline";
}> {
  const base =
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") ||
    process.env.APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000";
  const url = `${base}/api/jobs/score-attempt`;
  const client = getQStashClient();

  if (client) {
    await client.publishJSON({
      url,
      body: { attemptId },
      retries: 3,
    });
    return { queued: true, mode: "qstash" };
  }

  // Dev / missing QStash: fire-and-forget inline scoring
  void fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.CRON_SECRET ?? "dev-cron"}`,
      "x-score-inline": "1",
    },
    body: JSON.stringify({ attemptId }),
  }).catch((err) => {
    console.error("[qstash-fallback] score job failed to start", err);
  });

  return { queued: true, mode: "inline" };
}
