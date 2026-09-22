import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-12 text-sm leading-relaxed">
      <h1 className="text-3xl font-semibold">Terms of Service / Điều khoản</h1>
      <p>
        VietIELTS AI cung cấp công cụ luyện tập và ước lượng band mang tính tham
        khảo, không phải điểm IELTS chính thức.
      </p>
      <p>
        Band scores are AI estimates only and are not official IELTS results.
      </p>
      <p>
        IELTS is a registered trademark of the British Council, IDP: IELTS
        Australia and Cambridge Assessment English. VietIELTS AI is not
        affiliated with or endorsed by any of these organizations.
      </p>
      <p>
        Gói Pro được thanh toán qua Stripe; hủy bất cứ lúc nào trước kỳ tiếp
        theo.
      </p>
      <Link href="/" className="text-[var(--brand)] underline">
        ← Home
      </Link>
    </div>
  );
}
