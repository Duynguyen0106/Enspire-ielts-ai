import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser, jsonError } from "@/lib/api";
import { isAdminUser } from "@/lib/content-filter";
import { logAdminAction } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { grantUnlock } from "@/lib/unlock";

type Ctx = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  action: z.enum([
    "setRole",
    "grantPro",
    "setLevel",
    "resetPlacement",
    "hardDelete",
    "grantUnlock",
  ]),
  role: z.enum(["USER", "ADMIN"]).optional(),
  level: z.number().int().min(1).max(9).optional(),
});

export async function POST(req: Request, context: Ctx) {
  const { user, error } = await requireApiUser();
  if (error || !user) return error!;
  if (!isAdminUser(user)) return jsonError("Forbidden", 403);

  const { id } = await context.params;
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return jsonError("Invalid body");

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return jsonError("User not found", 404);

  switch (parsed.data.action) {
    case "setRole":
      await prisma.user.update({
        where: { id },
        data: { role: parsed.data.role ?? "USER" },
      });
      break;
    case "grantPro":
      await prisma.subscription.upsert({
        where: { userId: id },
        update: { plan: "PRO", status: "active" },
        create: { userId: id, plan: "PRO", status: "active" },
      });
      break;
    case "setLevel":
      await prisma.profile.update({
        where: { userId: id },
        data: { currentLevel: parsed.data.level ?? 1 },
      });
      await grantUnlock(id, parsed.data.level ?? 1, "ADMIN");
      break;
    case "resetPlacement":
      await prisma.placementResult.deleteMany({ where: { userId: id } });
      await prisma.profile.update({
        where: { userId: id },
        data: { placementCompleted: false, currentLevel: 1 },
      });
      break;
    case "hardDelete":
      await prisma.user.delete({ where: { id } });
      break;
    case "grantUnlock":
      await grantUnlock(id, parsed.data.level ?? 1, "ADMIN");
      break;
  }

  await logAdminAction({
    adminUserId: user.id,
    action: parsed.data.action,
    targetType: "User",
    targetId: id,
    payloadJson: parsed.data,
  });

  return NextResponse.json({ ok: true });
}
