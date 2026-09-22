import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "@/components/auth/register-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Đăng ký",
};

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top,_#d8f3e7_0%,_#f7fbf9_50%)] px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Link
            href="/"
            className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--brand-deep)]"
          >
            VietIELTS AI
          </Link>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Tạo tài khoản</CardTitle>
            <CardDescription>
              Bắt đầu lộ trình IELTS cá nhân hóa chỉ trong vài phút.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RegisterForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
