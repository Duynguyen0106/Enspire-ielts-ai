import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { sendEmail, subscriptionEmailHtml } from "@/lib/email";
import { jsonError } from "@/lib/api";

export const runtime = "nodejs";

/** Stripe SDK v22+: period end lives on SubscriptionItem. */
function subscriptionPeriodEnd(sub: Stripe.Subscription): Date | null {
  const item = sub.items.data[0] as
    | { current_period_end?: number }
    | undefined;
  const end =
    item?.current_period_end ??
    (sub as unknown as { current_period_end?: number }).current_period_end;
  return typeof end === "number" ? new Date(end * 1000) : null;
}

async function alreadyProcessed(eventId: string) {
  try {
    await prisma.stripeEvent.create({
      data: { id: eventId, type: "pending" },
    });
    return false;
  } catch {
    return true;
  }
}

async function markProcessed(eventId: string, type: string) {
  await prisma.stripeEvent.upsert({
    where: { id: eventId },
    update: { type },
    create: { id: eventId, type },
  });
}

export async function POST(req: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!stripe || !secret) {
    return jsonError("Webhook chưa cấu hình.", 503);
  }

  const raw = await req.text();
  const sig = req.headers.get("stripe-signature") ?? "";
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch (e) {
    return jsonError(
      e instanceof Error ? e.message : "Invalid signature",
      400
    );
  }

  if (await alreadyProcessed(event.id)) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId =
          session.metadata?.userId ||
          (typeof session.client_reference_id === "string"
            ? session.client_reference_id
            : null);
        if (!userId || !session.subscription) break;
        const subId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription.id;
        const sub = await stripe.subscriptions.retrieve(subId);
        const item = sub.items.data[0];
        await prisma.subscription.upsert({
          where: { userId },
          update: {
            plan: "PRO",
            status: sub.status,
            stripeSubId: sub.id,
            stripeCustomerId:
              typeof sub.customer === "string"
                ? sub.customer
                : sub.customer.id,
            priceId: item?.price.id,
            interval: item?.price.recurring?.interval ?? null,
            currentPeriodEnd: subscriptionPeriodEnd(sub),
            cancelAtPeriodEnd: sub.cancel_at_period_end,
          },
          create: {
            userId,
            plan: "PRO",
            status: sub.status,
            stripeSubId: sub.id,
            stripeCustomerId:
              typeof sub.customer === "string"
                ? sub.customer
                : sub.customer.id,
            priceId: item?.price.id,
            interval: item?.price.recurring?.interval ?? null,
            currentPeriodEnd: subscriptionPeriodEnd(sub),
          },
        });
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (user?.email) {
          await sendEmail({
            to: user.email,
            subject: "Đã kích hoạt gói Pro — VietIELTS AI",
            html: subscriptionEmailHtml(true),
          });
        }
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.userId;
        const existing = userId
          ? await prisma.subscription.findUnique({ where: { userId } })
          : await prisma.subscription.findFirst({
              where: { stripeSubId: sub.id },
            });
        if (!existing) break;
        const item = sub.items.data[0];
        const isActive =
          sub.status === "active" || sub.status === "trialing";
        await prisma.subscription.update({
          where: { userId: existing.userId },
          data: {
            status: sub.status,
            plan: isActive ? "PRO" : "FREE",
            currentPeriodEnd: subscriptionPeriodEnd(sub),
            cancelAtPeriodEnd: sub.cancel_at_period_end,
            priceId: item?.price.id,
            interval: item?.price.recurring?.interval ?? null,
          },
        });
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const existing = await prisma.subscription.findFirst({
          where: { stripeSubId: sub.id },
        });
        if (!existing) break;
        await prisma.subscription.update({
          where: { userId: existing.userId },
          data: {
            plan: "FREE",
            status: "canceled",
            cancelAtPeriodEnd: false,
          },
        });
        const user = await prisma.user.findUnique({
          where: { id: existing.userId },
        });
        if (user?.email) {
          await sendEmail({
            to: user.email,
            subject: "Gói Pro đã kết thúc — VietIELTS AI",
            html: subscriptionEmailHtml(false),
          });
        }
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId =
          typeof invoice.customer === "string"
            ? invoice.customer
            : invoice.customer?.id;
        if (!customerId) break;
        await prisma.subscription.updateMany({
          where: { stripeCustomerId: customerId },
          data: { status: "past_due" },
        });
        console.error("[stripe] payment_failed", customerId);
        break;
      }
      default:
        break;
    }
    await markProcessed(event.id, event.type);
  } catch (e) {
    console.error("[stripe:webhook]", e);
    return jsonError("Webhook handler error", 500);
  }

  return NextResponse.json({ received: true });
}
