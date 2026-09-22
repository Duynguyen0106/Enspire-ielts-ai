"use client";

import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { CookieBanner } from "@/components/cookie-banner";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { PostHogProvider } from "@/components/analytics/posthog-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <PostHogProvider>
        <TooltipProvider>
          {children}
          <CookieBanner />
          <Toaster richColors position="top-center" />
          <Analytics />
          <SpeedInsights />
        </TooltipProvider>
      </PostHogProvider>
    </ThemeProvider>
  );
}
