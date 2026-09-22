import { NextResponse } from "next/server";
import { requireApiUser, jsonError } from "@/lib/api";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const { user, error } = await requireApiUser();
  if (error || !user) return error!;

  const stripe = getStripe();
  if (!stripe) return jsonError("Stripe chưa cấu hình.", 503);

  const sub = await prisma.subscription.findUnique({
    where: { userId: user.id },
  });
  if (!sub?.stripeCustomerId) {
    return jsonError("Bạn chưa có tài khoản thanh toán Stripe.");
  }

  const base =
    process.env.STRIPE_PORTAL_RETURN_URL ||
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") ||
    "http://localhost:3000";

  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: `${base.replace(/\/$/, "")}/settings?tab=billing`,
  });

  return NextResponse.json({ url: session.url });
}
