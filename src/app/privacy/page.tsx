import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-12 text-sm leading-relaxed">
      <h1 className="text-3xl font-semibold">Privacy Policy / Chính sách bảo mật</h1>
      <p>
        VietIELTS AI thu thập email, tiến độ học, bài làm và phản hồi AI để cung
        cấp dịch vụ luyện thi. Chúng tôi không bán dữ liệu cá nhân.
      </p>
      <p>
        We collect account, progress, and AI feedback data to deliver the
        product. You may export or delete your account in Settings.
      </p>
      <p>
        Audio and essays are processed for scoring and may be stored securely.
        Third parties: Stripe (payments), OpenAI (AI), Vercel/Sentry/PostHog
        (hosting/analytics) when configured.
      </p>
      <Link href="/" className="text-[var(--brand)] underline">
        ← Home
      </Link>
    </div>
  );
}
