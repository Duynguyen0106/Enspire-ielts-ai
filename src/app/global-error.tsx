"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="vi">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
        <h1 className="text-xl font-semibold">Đã xảy ra lỗi</h1>
        <p className="max-w-md text-center text-sm text-muted-foreground">
          Hệ thống gặp sự cố tạm thời. Bạn có thể thử lại hoặc quay về trang chủ.
        </p>
        <div className="flex gap-3">
          <Button onClick={reset}>Thử lại</Button>
          <Button variant="outline" render={<Link href="/" />}>
            Trang chủ
          </Button>
        </div>
      </body>
    </html>
  );
}
