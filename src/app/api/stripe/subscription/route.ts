import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import {
  entitlementsSummary,
  getUserPlan,
} from "@/lib/entitlements";

export async function GET() {
  const { user, error } = await requireApiUser();
  if (error || !user) return error!;

  const sub = await prisma.subscription.findUnique({
    where: { userId: user.id },
  });
  const plan = await getUserPlan(user.id);

  return NextResponse.json({
    plan,
    subscription: sub
      ? {
          status: sub.status,
          interval: sub.interval,
          currentPeriodEnd: sub.currentPeriodEnd,
          cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
        }
      : null,
    entitlements: entitlementsSummary(plan),
  });
}
