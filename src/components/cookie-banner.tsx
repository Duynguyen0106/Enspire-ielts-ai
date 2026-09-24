"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const KEY = "vietielts-cookie-consent";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(KEY)) setVisible(true);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] border-t bg-background p-4 shadow-lg">
      <div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Chúng tôi dùng cookie cần thiết và (nếu bạn đồng ý) analytics để cải
          thiện sản phẩm. Xem{" "}
          <a href="/privacy" className="underline">
            Chính sách bảo mật
          </a>
          .
        </p>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              localStorage.setItem(KEY, "essential");
              setVisible(false);
            }}
          >
            Chỉ cần thiết
          </Button>
          <Button
            size="sm"
            onClick={() => {
              localStorage.setItem(KEY, "all");
              setVisible(false);
            }}
          >
            Đồng ý
          </Button>
        </div>
      </div>
    </div>
  );
}
