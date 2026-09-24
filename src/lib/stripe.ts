import Stripe from "stripe";
import { PRICING } from "@/lib/pricing";

export { PRICING };

let stripe: Stripe | null = null;

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return null;
  if (!stripe) {
    stripe = new Stripe(key);
  }
  return stripe;
}

export function stripePriceId(interval: "monthly" | "yearly"): string | null {
  if (interval === "yearly") {
    return process.env.STRIPE_PRICE_YEARLY?.trim() || null;
  }
  return process.env.STRIPE_PRICE_MONTHLY?.trim() || null;
}
