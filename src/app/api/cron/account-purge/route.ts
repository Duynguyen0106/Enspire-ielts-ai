import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const header = req.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

/** Soft-deleted accounts older than 30 days are hard-purged. */
export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);

  const stale = await prisma.user.findMany({
    where: { deletedAt: { lte: cutoff, not: null } },
    select: { id: true },
    take: 100,
  });

  let purged = 0;
  for (const u of stale) {
    await prisma.user.delete({ where: { id: u.id } });
    purged += 1;
  }

  return NextResponse.json({ ok: true, purged });
}
