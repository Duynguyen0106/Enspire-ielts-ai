import { prisma } from "@/lib/prisma";
import { isAdminUser } from "@/lib/content-filter";
import { requireUser } from "@/lib/auth";
import { notFound } from "next/navigation";

export async function requireAdminAccess() {
  const user = await requireUser();
  if (!isAdminUser(user)) notFound();
  return user;
}

export async function logAdminAction(input: {
  adminUserId: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  payloadJson?: unknown;
}) {
  return prisma.adminAction.create({
    data: {
      adminUserId: input.adminUserId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId ?? null,
      payloadJson: input.payloadJson as object | undefined,
    },
  });
}
