"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  analyzeVolumeEnvelope,
  blobToBase64,
  startRecording,
  type VolumeEnvelope,
} from "@/lib/audio-client";

type SpeakingRecorderProps = {
  maxSec?: number;
  autoStopAt?: number;
  allowRerecord?: boolean;
  onComplete: (result: {
    audioBase64: string;
    durationSec: number;
    envelope: VolumeEnvelope;
  }) => void | Promise<void>;
};

export function SpeakingRecorder({
  maxSec = 120,
  autoStopAt,
  allowRerecord = true,
  onComplete,
}: SpeakingRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const handleRef = useRef<Awaited<ReturnType<typeof startRecording>> | null>(
    null
  );
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  async function finish() {
    if (!handleRef.current) return;
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
    try {
      const { blob, durationSec } = await handleRef.current.stop();
      handleRef.current = null;
      const envelope = await analyzeVolumeEnvelope(blob);
      const audioBase64 = await blobToBase64(blob);
      setDone(true);
      await onComplete({ audioBase64, durationSec, envelope });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ghi âm thất bại.");
    }
  }

  async function begin() {
    setError(null);
    setElapsed(0);
    setDone(false);
    try {
      handleRef.current = await startRecording();
      setRecording(true);
      timerRef.current = setInterval(() => {
        setElapsed((s) => {
          const next = s + 1;
          const limit = autoStopAt ?? maxSec;
          if (next >= limit) {
            void finish();
          }
          return next;
        });
      }, 1000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không mở được micro.");
    }
  }

  const warn =
    autoStopAt != null && elapsed >= Math.max(0, autoStopAt - 15) && recording;

  return (
    <div className="space-y-3 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-center gap-3">
        {!recording && (!done || allowRerecord) ? (
          <Button type="button" size="lg" onClick={() => void begin()}>
            <Mic className="size-5" />
            {done ? "Ghi lại" : "Bắt đầu ghi"}
          </Button>
        ) : null}
        {recording ? (
          <Button type="button" size="lg" variant="destructive" onClick={() => void finish()}>
            <Square className="size-4" />
            Dừng
          </Button>
        ) : null}
        <p className={warn ? "font-medium text-destructive" : "text-sm text-muted-foreground"}>
          {elapsed}s / {autoStopAt ?? maxSec}s
          {warn ? " — sắp hết giờ" : ""}
        </p>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {done && !allowRerecord ? (
        <p className="text-sm text-muted-foreground">
          Đã ghi — chế độ thi thử không cho ghi lại.
        </p>
      ) : null}
    </div>
  );
}
