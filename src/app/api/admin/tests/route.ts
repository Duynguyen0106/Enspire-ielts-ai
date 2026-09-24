import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser, jsonError } from "@/lib/api";
import { isAdminUser } from "@/lib/content-filter";
import { logAdminAction } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { scoreFullLevelAttempt } from "@/lib/score-full-attempt";

const bodySchema = z.object({
  action: z.enum(["togglePublish", "setRules", "rescore"]),
  testId: z.string().optional(),
  published: z.boolean().optional(),
  passingRulesJson: z.unknown().optional(),
  attemptId: z.string().optional(),
});

export async function POST(req: Request) {
  const { user, error } = await requireApiUser();
  if (error || !user) return error!;
  if (!isAdminUser(user)) return jsonError("Forbidden", 403);

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return jsonError("Invalid body");

  if (parsed.data.action === "togglePublish" && parsed.data.testId) {
    await prisma.test.update({
      where: { id: parsed.data.testId },
      data: {
        publishedAt: parsed.data.published ? new Date() : null,
      },
    });
  }
  if (parsed.data.action === "setRules" && parsed.data.testId) {
    await prisma.test.update({
      where: { id: parsed.data.testId },
      data: {
        passingRulesJson: parsed.data.passingRulesJson as object,
      },
    });
  }
  if (parsed.data.action === "rescore" && parsed.data.attemptId) {
    await prisma.testAttempt.update({
      where: { id: parsed.data.attemptId },
      data: { scoringStatus: "SCORING", status: "SUBMITTED" },
    });
    await scoreFullLevelAttempt(parsed.data.attemptId);
  }

  await logAdminAction({
    adminUserId: user.id,
    action: `tests_${parsed.data.action}`,
    targetType: "Test",
    targetId: parsed.data.testId ?? parsed.data.attemptId,
    payloadJson: parsed.data,
  });

  return NextResponse.json({ ok: true });
}
