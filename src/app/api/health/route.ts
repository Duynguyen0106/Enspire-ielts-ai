import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

export async function GET() {
  let db = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    db = true;
  } catch {
    db = false;
  }

  return NextResponse.json({
    ok: db,
    db,
    stripe: Boolean(process.env.STRIPE_SECRET_KEY?.trim() && getStripe()),
    openai: Boolean(process.env.OPENAI_API_KEY?.trim()),
    qstash: Boolean(process.env.QSTASH_TOKEN?.trim()),
    ts: new Date().toISOString(),
  });
}
