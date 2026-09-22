import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser, jsonError } from "@/lib/api";
import { isAdminUser } from "@/lib/content-filter";
import { logAdminAction } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  id: z.string(),
  enabled: z.boolean(),
});

export async function POST(req: Request) {
  const { user, error } = await requireApiUser();
  if (error || !user) return error!;
  if (!isAdminUser(user)) return jsonError("Forbidden", 403);

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return jsonError("Invalid body");

  const flag = await prisma.featureFlag.update({
    where: { id: parsed.data.id },
    data: { enabled: parsed.data.enabled },
  });

  await logAdminAction({
    adminUserId: user.id,
    action: "feature_flag_toggle",
    targetType: "FeatureFlag",
    targetId: flag.id,
    payloadJson: { key: flag.key, enabled: flag.enabled },
  });

  return NextResponse.json({ ok: true, flag });
}
