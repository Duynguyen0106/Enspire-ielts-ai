"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PRICING } from "@/lib/pricing";
import { FEATURES, type FeatureKey } from "@/lib/feature-matrix";

const FEATURE_LABELS: Record<FeatureKey, string> = {
  PLACEMENT_TEST: "Bài kiểm tra đầu vào",
  LESSON_ACCESS: "Bài học theo level",
  LISTENING_READING_PRACTICE: "Luyện Nghe/Đọc mỗi ngày",
  WRITING_SUBMISSION: "Chấm Writing / tuần",
  SPEAKING_SESSION: "Chấm Speaking / tuần",
  FULL_LEVEL_TEST: "Bài thi cấp độ",
  MODEL_ANSWERS: "Bài mẫu Writing",
  PROGRESS_EXPORT: "Xuất báo cáo CSV",
};

type PricingClientProps = {
  showYearly: boolean;
  signedIn: boolean;
};

export function PricingClient({ showYearly, signedIn }: PricingClientProps) {
  const [interval, setInterval] = useState<"monthly" | "yearly">("monthly");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function checkout() {
    if (!signedIn) {
      window.location.href = `/login?callbackUrl=${encodeURIComponent("/pricing")}`;
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interval }),
      });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) {
        setError(json.error ?? "Không tạo được phiên thanh toán.");
        return;
      }
      window.location.href = json.url;
    } finally {
      setBusy(false);
    }
  }

  const price =
    interval === "yearly"
      ? `${PRICING.yearlyVnd.toLocaleString("vi-VN")}₫ / năm (~$${PRICING.yearlyUsd})`
      : `${PRICING.monthlyVnd.toLocaleString("vi-VN")}₫ / tháng (~$${PRICING.monthlyUsd})`;

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-4 py-12">
      <div className="text-center">
        <h1 className="font-display text-4xl font-semibold">
          Chọn gói phù hợp
        </h1>
        <p className="mt-2 text-muted-foreground">
          Bắt đầu miễn phí. Nâng cấp Pro khi sẵn sàng chinh phục cả 9 level.
        </p>
        {showYearly ? (
          <div className="mt-6 inline-flex rounded-lg border border-border bg-card/60 p-1">
            <button
              type="button"
              className={
                interval === "monthly"
                  ? "rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground"
                  : "px-4 py-1.5 text-sm text-muted-foreground"
              }
              onClick={() => setInterval("monthly")}
            >
              Tháng
            </button>
            <button
              type="button"
              className={
                interval === "yearly"
                  ? "rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground"
                  : "px-4 py-1.5 text-sm text-muted-foreground"
              }
              onClick={() => setInterval("yearly")}
            >
              Năm (tiết kiệm 2 tháng)
            </button>
          </div>
        ) : null}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-xl font-semibold">Free</h2>
          <p className="mt-2 text-3xl font-semibold">0₫</p>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li>Level 1 đầy đủ</li>
            <li>5 lần luyện Nghe/Đọc / ngày</li>
            <li>3 bài Writing / tuần</li>
            <li>3 phiên Speaking / tuần</li>
            <li>1 bài thi cấp độ Level 1</li>
          </ul>
          <Button className="mt-6 w-full" variant="outline" render={<Link href="/register" />}>
            Đăng ký miễn phí
          </Button>
        </div>

        <div className="glass-card rounded-2xl border-primary/50 p-6 glow-primary">
          <h2 className="text-xl font-semibold">Pro</h2>
          <p className="mt-2 text-3xl font-semibold">{price}</p>
          <ul className="mt-4 space-y-2 text-sm">
            <li>Cả 9 level + bài thi đầy đủ</li>
            <li>Luyện tập gần như không giới hạn</li>
            <li>Bài mẫu Writing mọi đề</li>
            <li>Xuất báo cáo tiến độ CSV</li>
          </ul>
          <Button className="mt-6 w-full" disabled={busy} onClick={() => void checkout()}>
            {busy ? "Đang chuyển…" : "Nâng cấp Pro"}
          </Button>
          {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead>
            <tr className="border-b">
              <th className="py-2">Tính năng</th>
              <th className="py-2">Free</th>
              <th className="py-2">Pro</th>
            </tr>
          </thead>
          <tbody>
            {(Object.keys(FEATURES) as FeatureKey[]).map((key) => (
              <tr key={key} className="border-b">
                <td className="py-2">{FEATURE_LABELS[key]}</td>
                <td className="py-2 text-muted-foreground">
                  {String(FEATURES[key].free)}
                </td>
                <td className="py-2">{String(FEATURES[key].pro)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 text-sm text-muted-foreground">
        <h3 className="font-medium text-foreground">Câu hỏi thường gặp</h3>
        <p>
          <strong>Hủy gói?</strong> Bạn có thể hủy bất cứ lúc nào trong cổng
          thanh toán Stripe. Quyền Pro giữ đến hết kỳ đã trả.
        </p>
        <p>
          <strong>Hoàn tiền?</strong> Liên hệ trong 7 ngày nếu chưa dùng Pro
          đáng kể; chúng tôi hỗ trợ theo từng trường hợp.
        </p>
        <p>
          <strong>Thanh toán?</strong> Thẻ quốc tế qua Stripe (Visa, Mastercard,
          …). Hiển thị giá VND tham khảo.
        </p>
      </div>
    </div>
  );
}
