import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Đăng nhập",
};

type LoginPageProps = {
  searchParams: Promise<{ callbackUrl?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

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
            <CardTitle>Đăng nhập</CardTitle>
            <CardDescription>
              Chào mừng bạn quay lại VietIELTS AI.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm callbackUrl={params.callbackUrl ?? "/dashboard"} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
