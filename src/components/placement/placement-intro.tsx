"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AiDisclaimer } from "@/components/placement/ai-disclaimer";
import type { PlacementPayload } from "@/components/placement/placement-runner";

export function PlacementIntro({ alreadyCompleted }: { alreadyCompleted: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function start() {
    if (alreadyCompleted) {
      toast.message("Bạn đã hoàn thành bài kiểm tra đầu vào.");
      router.push("/dashboard");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/placement/start", { method: "POST" });
      const data = (await res.json()) as PlacementPayload & { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Không thể bắt đầu bài kiểm tra");
      }
      sessionStorage.setItem(
        `placement:${data.attemptId}`,
        JSON.stringify(data)
      );
      router.push(`/placement/run/${data.attemptId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-[family-name:var(--font-display)] text-2xl">
            Bài kiểm tra đầu vào
          </CardTitle>
          <CardDescription>
            Khoảng 45 phút · 4 kỹ năng · Nên làm một lần ngồi
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-relaxed">
          <ol className="list-decimal space-y-2 pl-5">
            <li>
              <strong>Listening (10 phút)</strong> — 10 câu, nghe hội thoại ngắn.
            </li>
            <li>
              <strong>Reading (12 phút)</strong> — 1 đoạn văn ~500 từ, 10 câu hỏi.
            </li>
            <li>
              <strong>Writing (15 phút)</strong> — Task 2, viết 200–300 từ.
            </li>
            <li>
              <strong>Speaking (8 phút)</strong> — 3 phần, ghi âm bằng micro.
            </li>
          </ol>
          <p>
            Hãy tìm chỗ yên tĩnh trước khi làm phần Speaking. Cho phép trình
            duyệt truy cập microphone.
          </p>
          <AiDisclaimer />
          <Button size="lg" disabled={loading} onClick={() => void start()}>
            {loading ? "Đang chuẩn bị…" : "Bắt đầu"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
