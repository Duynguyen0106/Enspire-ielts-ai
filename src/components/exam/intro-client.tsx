"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { startRecording, blobToBase64 } from "@/lib/audio-client";

type IntroClientProps = {
  testId: string;
  title: string;
  levelNumber: number;
};

export function IntroClient({ testId, title, levelNumber }: IntroClientProps) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [micOk, setMicOk] = useState(false);
  const [audioOk, setAudioOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [micMsg, setMicMsg] = useState<string | null>(null);

  async function testMic() {
    setMicMsg(null);
    try {
      const handle = await startRecording();
      await new Promise((r) => setTimeout(r, 3000));
      const { blob } = await handle.stop();
      const b64 = await blobToBase64(blob);
      if (b64.length > 10) {
        setMicOk(true);
        setMicMsg("Micro hoạt động tốt.");
      }
    } catch (e) {
      setMicOk(true); // allow continue via typed transcript in exam
      setMicMsg(
        e instanceof Error
          ? `${e.message} (Bạn vẫn có thể thi bằng chế độ gõ transcript.)`
          : "Không mở được micro — có thể dùng transcript."
      );
    }
  }

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/tests/${testId}/start`, { method: "POST" });
      const json = (await res.json()) as {
        error?: string;
        attemptId?: string;
        cooldownUntil?: string;
      };
      if (!res.ok || !json.attemptId) {
        setError(json.error ?? "Không bắt đầu được bài thi.");
        return;
      }
      router.push(`/tests/attempts/${json.attemptId}/run`);
    } finally {
      setBusy(false);
    }
  }

  const canStart = ready && micOk && audioOk && !busy;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">
          {title}
        </h1>
        <p className="mt-1 text-muted-foreground">Level {levelNumber}</p>
      </div>

      <div className="space-y-2 rounded-xl border p-4 text-sm leading-relaxed">
        <p className="font-medium">Cấu trúc (~75 phút)</p>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li>Nghe: 20 câu · 25 phút</li>
          <li>Đọc: 20 câu · 30 phút</li>
          <li>Viết: Task 1 + Task 2 · 50 phút</li>
          <li>Nói: Part 1–3 · ~12 phút</li>
        </ul>
        <p className="pt-2 text-muted-foreground">
          Một lần ngồi, không tạm dừng, hết giờ tự nộp. Không dùng AI Tutor trong
          lúc thi. Tìm chỗ yên tĩnh cho phần Nói.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="outline" onClick={() => void testMic()}>
          Kiểm tra micro (3s)
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            const a = new Audio("/audio/full-tests/l1-s1.wav");
            void a.play().then(() => setAudioOk(true)).catch(() => setAudioOk(true));
          }}
        >
          Kiểm tra tai nghe
        </Button>
      </div>
      {micMsg ? <p className="text-sm text-muted-foreground">{micMsg}</p> : null}

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={ready}
          onChange={(e) => setReady(e.target.checked)}
          className="mt-1"
        />
        Tôi đã sẵn sàng và hiểu luật thi
      </label>

      <Button size="lg" disabled={!canStart} onClick={() => void start()}>
        {busy ? "Đang bắt đầu…" : "Bắt đầu"}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
