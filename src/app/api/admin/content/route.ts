import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser, jsonError } from "@/lib/api";
import { isAdminUser } from "@/lib/content-filter";
import { logAdminAction } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  action: z.enum(["approve", "reject", "needs_edit", "publish_level"]),
  ids: z.array(z.string()).default([]),
  notesVi: z.string().optional(),
  levelNumber: z.number().int().optional(),
});

export async function POST(req: Request) {
  const { user, error } = await requireApiUser();
  if (error || !user) return error!;
  if (!isAdminUser(user)) return jsonError("Forbidden", 403);

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return jsonError("Invalid body");

  const status =
    parsed.data.action === "approve"
      ? "APPROVED"
      : parsed.data.action === "reject"
        ? "REJECTED"
        : "NEEDS_EDIT";

  if (parsed.data.action === "publish_level" && parsed.data.levelNumber) {
    const level = await prisma.level.findUnique({
      where: { number: parsed.data.levelNumber },
    });
    if (level) {
      await prisma.lesson.updateMany({
        where: { levelId: level.id },
        data: { reviewStatus: "APPROVED" },
      });
    }
  } else {
    await prisma.lesson.updateMany({
      where: { id: { in: parsed.data.ids } },
      data: { reviewStatus: status },
    });
    await prisma.contentReview.updateMany({
      where: { id: { in: parsed.data.ids } },
      data: {
        status,
        reviewedByUserId: user.id,
        reviewedAt: new Date(),
        notesVi: parsed.data.notesVi,
      },
    });
  }

  await logAdminAction({
    adminUserId: user.id,
    action: `content_${parsed.data.action}`,
    targetType: "Content",
    payloadJson: parsed.data,
  });

  return NextResponse.json({ ok: true });
}
