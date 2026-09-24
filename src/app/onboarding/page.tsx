import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { OnboardingForm } from "@/components/auth/onboarding-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Thiết lập hồ sơ",
};

export default async function OnboardingPage() {
  const user = await requireUser();

  if (user.profile?.displayName && user.profile.targetBand) {
    // Allow re-visit only if they somehow land here; dashboard is default.
  }

  if (!user.profile) {
    redirect("/register");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top,_color-mix(in_oklab,var(--primary)_18%,transparent)_0%,_#111d20_55%)] px-4 py-10">
      <div className="w-full max-w-lg">
        <Card className="glass-card border-border/60 bg-card/70">
          <CardHeader>
            <CardTitle className="font-display">
              Thiết lập lộ trình của bạn
            </CardTitle>
            <CardDescription>
              Cho chúng tôi biết mục tiêu để cá nhân hóa trải nghiệm học.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <OnboardingForm
              defaultDisplayName={user.profile.displayName ?? user.name}
              defaultTargetBand={user.profile.targetBand}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
