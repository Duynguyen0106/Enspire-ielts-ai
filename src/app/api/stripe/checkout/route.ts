import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser, jsonError } from "@/lib/api";
import { getStripe, stripePriceId } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  interval: z.enum(["monthly", "yearly"]),
});

export async function POST(req: Request) {
  const { user, error } = await requireApiUser();
  if (error || !user) return error!;

  const stripe = getStripe();
  if (!stripe) {
    return jsonError(
      "Thanh toán chưa được cấu hình (thiếu STRIPE_SECRET_KEY).",
      503
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Dữ liệu không hợp lệ.");
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return jsonError("Dữ liệu không hợp lệ.");

  const priceId = stripePriceId(parsed.data.interval);
  if (!priceId) {
    return jsonError("Chưa cấu hình Stripe Price ID.", 503);
  }

  const base =
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") || "http://localhost:3000";

  let customerId =
    (
      await prisma.subscription.findUnique({ where: { userId: user.id } })
    )?.stripeCustomerId ?? undefined;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { userId: user.id },
    });
    customerId = customer.id;
    await prisma.subscription.upsert({
      where: { userId: user.id },
      update: { stripeCustomerId: customerId },
      create: {
        userId: user.id,
        plan: "FREE",
        stripeCustomerId: customerId,
        status: "inactive",
      },
    });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${base}/settings?tab=billing&success=1`,
    cancel_url: `${base}/pricing?canceled=1`,
    metadata: { userId: user.id },
    subscription_data: { metadata: { userId: user.id } },
  });

  return NextResponse.json({ url: session.url });
}
