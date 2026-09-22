"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, RotateCcw } from "lucide-react";

type AudioRecorderProps = {
  maxRerecords?: number;
  maxSeconds?: number;
  onRecorded: (payload: {
    blob: Blob;
    base64: string;
    transcriptHint?: string;
  }) => void;
};

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

export function AudioRecorder({
  maxRerecords = 1,
  maxSeconds = 120,
  onRecorded,
}: AudioRecorderProps) {
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [rerecords, setRerecords] = useState(0);
  const [hasRecording, setHasRecording] = useState(false);

  useEffect(() => {
    if (!recording) return;
    const id = window.setInterval(() => {
      setSeconds((s) => {
        if (s + 1 >= maxSeconds) {
          stop();
          return s;
        }
        return s + 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [recording, maxSeconds]);

  async function start() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const base64 = await blobToBase64(blob);
        setHasRecording(true);
        onRecorded({ blob, base64 });
      };
      mediaRef.current = recorder;
      recorder.start();
      setSeconds(0);
      setRecording(true);
    } catch {
      setError(
        "Không thể truy cập micro. Hãy cấp quyền microphone trong trình duyệt."
      );
    }
  }

  function stop() {
    const recorder = mediaRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
    setRecording(false);
  }

  function rerecord() {
    if (rerecords >= maxRerecords) return;
    setRerecords((n) => n + 1);
    setHasRecording(false);
    void start();
  }

  return (
    <div className="space-y-3 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        {!recording ? (
          <Button type="button" onClick={() => void start()}>
            <Mic className="size-4" />
            {hasRecording ? "Ghi lại" : "Bắt đầu ghi"}
          </Button>
        ) : (
          <Button type="button" variant="destructive" onClick={stop}>
            <Square className="size-4" />
            Dừng ({seconds}s)
          </Button>
        )}
        {hasRecording && rerecords < maxRerecords && !recording ? (
          <Button type="button" variant="outline" onClick={rerecord}>
            <RotateCcw className="size-4" />
            Ghi lại (còn {maxRerecords - rerecords})
          </Button>
        ) : null}
      </div>
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {recording
          ? `Đang ghi… ${seconds}/${maxSeconds}s`
          : hasRecording
            ? "Đã lưu bản ghi."
            : "Nhấn để ghi âm câu trả lời."}
      </p>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
