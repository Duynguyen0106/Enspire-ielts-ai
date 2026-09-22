import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getUserPlan } from "@/lib/entitlements";

export async function GET() {
  const { user, error } = await requireApiUser();
  if (error || !user) return error!;

  // GDPR-style account export is always available; CSV progress reports use PROGRESS_EXPORT.

  const [
    profile,
    attempts,
    writing,
    speaking,
    completions,
    subscription,
    usage,
  ] = await Promise.all([
    prisma.profile.findUnique({ where: { userId: user.id } }),
    prisma.testAttempt.findMany({ where: { userId: user.id } }),
    prisma.writingSubmission.findMany({ where: { userId: user.id } }),
    prisma.speakingSession.findMany({ where: { userId: user.id } }),
    prisma.lessonCompletion.findMany({ where: { userId: user.id } }),
    prisma.subscription.findUnique({ where: { userId: user.id } }),
    prisma.usageLog.findMany({ where: { userId: user.id } }),
  ]);

  const plan = await getUserPlan(user.id);

  return new NextResponse(
    JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          plan,
        },
        profile,
        subscription,
        attempts,
        writing,
        speaking,
        completions,
        usage,
      },
      null,
      2
    ),
    {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": 'attachment; filename="vietielts-data.json"',
      },
    }
  );
}
