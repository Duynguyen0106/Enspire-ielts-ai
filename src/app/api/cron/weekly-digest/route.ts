import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

export const runtime = "nodejs";

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const users = await prisma.user.findMany({
    where: { deletedAt: null, emailVerified: { not: null } },
    include: { profile: true },
    take: 200,
  });

  let sent = 0;
  for (const user of users) {
    if (!user.email || !user.profile) continue;
    const [lessons, writing, speaking] = await Promise.all([
      prisma.lessonCompletion.count({
        where: { userId: user.id, completedAt: { gte: weekAgo } },
      }),
      prisma.writingSubmission.count({
        where: { userId: user.id, createdAt: { gte: weekAgo } },
      }),
      prisma.speakingSession.count({
        where: { userId: user.id, startedAt: { gte: weekAgo } },
      }),
    ]);
    if (lessons + writing + speaking === 0) continue;

    const ok = await sendEmail({
      to: user.email,
      subject: "Tóm tắt tiến độ tuần này — VietIELTS AI",
      html: `<p>Xin chào ${user.profile.displayName ?? "bạn"},</p>
<p>Tuần này bạn đã:</p>
<ul>
<li>${lessons} bài học hoàn thành</li>
<li>${writing} bài Writing</li>
<li>${speaking} phiên Speaking</li>
</ul>
<p>Level hiện tại: ${user.profile.currentLevel}. <a href="${process.env.NEXTAUTH_URL}/dashboard">Tiếp tục luyện tập</a></p>
<p><a href="${process.env.NEXTAUTH_URL}/settings?tab=notifications">Hủy nhận email</a></p>`,
    });
    if (ok) sent += 1;
  }

  return NextResponse.json({ ok: true, sent });
}
