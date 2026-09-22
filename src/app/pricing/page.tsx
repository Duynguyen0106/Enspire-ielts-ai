import type { Metadata } from "next";
import { auth } from "@/auth";
import { PricingClient } from "@/components/billing/pricing-client";
import { isFeatureEnabled } from "@/lib/feature-flags";

export const metadata: Metadata = {
  title: "Bảng giá",
};

export default async function PricingPage() {
  const session = await auth();
  const showYearly = await isFeatureEnabled("enable_yearly_plan", true);

  return (
    <PricingClient
      showYearly={showYearly}
      signedIn={Boolean(session?.user)}
    />
  );
}
