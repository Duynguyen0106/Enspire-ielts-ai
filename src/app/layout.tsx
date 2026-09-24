import type { Metadata } from "next";
import { Be_Vietnam_Pro, Literata, Sora, JetBrains_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const sans = Be_Vietnam_Pro({
  variable: "--font-sans",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
});

const display = Literata({
  variable: "--font-display",
  subsets: ["latin", "vietnamese"],
  weight: ["500", "600", "700"],
});

const landingDisplay = Sora({
  variable: "--font-landing-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const landingMono = JetBrains_Mono({
  variable: "--font-landing-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: {
    default: "VietIELTS AI",
    template: "%s · VietIELTS AI",
  },
  description:
    "Học IELTS cùng AI dành cho người Việt — 4 kỹ năng, 9 cấp độ, lộ trình cá nhân hóa.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`dark ${sans.variable} ${display.variable} ${landingDisplay.variable} ${landingMono.variable} h-full`}
    >
      <body className="min-h-full font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
