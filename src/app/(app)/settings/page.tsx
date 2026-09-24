import type { Metadata } from "next";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { AppHeader } from "@/components/app-header";
import { SettingsTabsClient } from "@/components/auth/settings-tabs-client";
import { prisma } from "@/lib/prisma";
import { getUserPlan } from "@/lib/entitlements";

export const metadata: Metadata = {
  title: "Cài đặt",
};

export default async function SettingsPage() {
  const user = await requireUser();
  const currentLevel = user.profile?.currentLevel ?? 1;
  const plan = await getUserPlan(user.id);
  const sub = await prisma.subscription.findUnique({
    where: { userId: user.id },
  });

  return (
    <>
      <AppHeader title="Cài đặt" currentLevel={currentLevel} />
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        <Suspense fallback={<p className="text-sm text-muted-foreground">Đang tải…</p>}>
          <SettingsTabsClient
            displayName={user.profile?.displayName ?? user.name ?? "Học viên"}
            targetBand={user.profile?.targetBand ?? 6.0}
            plan={plan}
            periodEnd={sub?.currentPeriodEnd?.toISOString() ?? null}
            email={user.email}
          />
        </Suspense>
      </div>
    </>
  );
}
