"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SpeakingRecorder } from "@/components/speaking/speaking-recorder";
import { TranscriptViewer } from "@/components/speaking/transcript-viewer";
import { SessionMetricsCard } from "@/components/speaking/session-metrics-card";
import { ExaminerAvatar } from "@/components/speaking/examiner-avatar";
import { CueCard } from "@/components/speaking/cue-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

type ScriptPart = {
  part: number;
  questions: string[];
  cueCard?: string;
  prepSec?: number;
  speakSec?: number;
};

type SpeakingRunnerProps = {
  mode: "practice" | "sim";
  part?: number;
  level: number;
};

export function SpeakingRunner({ mode, part, level }: SpeakingRunnerProps) {
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [script, setScript] = useState<ScriptPart[]>([]);
  const [partIndex, setPartIndex] = useState(0);
  const [qIndex, setQIndex] = useState(0);
  const [prepDone, setPrepDone] = useState(false);
  const [practiceMode, setPracticeMode] = useState(mode === "practice");
  const [lastTranscript, setLastTranscript] = useState<string | null>(null);
  const [lastMetrics, setLastMetrics] = useState<{
    wpm: number;
    pauseCount: number;
    fillerCount: number;
  } | null>(null);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);

  const currentPart = script[partIndex];
  const currentQ = currentPart?.questions[qIndex];
  const totalQ = script.reduce((s, p) => s + p.questions.length, 0);
  const doneQ =
    script.slice(0, partIndex).reduce((s, p) => s + p.questions.length, 0) +
    qIndex;
  const progressPct = totalQ ? (doneQ / totalQ) * 100 : 0;

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/speaking/session/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionType: mode === "sim" ? "FULL_SIM" : "PART_PRACTICE",
          level,
          part: mode === "practice" ? part : undefined,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        sessionId?: string;
        script?: { parts: ScriptPart[] };
      };
      if (!res.ok || !data.sessionId || !data.script) {
        setError(data.error ?? "Không tạo được phiên.");
        return;
      }
      setSessionId(data.sessionId);
      setScript(data.script.parts);
      setStarted(true);
      setPartIndex(0);
      setQIndex(0);
      setPrepDone(false);
    } finally {
      setBusy(false);
    }
  }

  async function uploadTurn(input: {
    audioBase64?: string;
    typedTranscript?: string;
    durationSec?: number;
    envelopePauses?: { startMs: number; endMs: number }[];
  }) {
    if (!sessionId || !currentPart || !currentQ) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/speaking/turn/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          part: currentPart.part,
          questionText: currentQ,
          ...input,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        transcript?: string;
        metrics?: { wpm: number; pauseCount: number; fillerCount: number };
      };
      if (!res.ok) {
        setError(data.error ?? "Upload thất bại.");
        return;
      }
      setLastTranscript(data.transcript ?? "");
      setLastMetrics(data.metrics ?? null);
      setTyped("");
    } finally {
      setBusy(false);
    }
  }

  function advance() {
    setLastTranscript(null);
    setLastMetrics(null);
    if (!currentPart) return;
    if (qIndex + 1 < currentPart.questions.length) {
      setQIndex((i) => i + 1);
      return;
    }
    if (partIndex + 1 < script.length) {
      setPartIndex((i) => i + 1);
      setQIndex(0);
      setPrepDone(false);
      return;
    }
    void finish();
  }

  async function finish() {
    if (!sessionId) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/speaking/session/${sessionId}/evaluate`, {
        method: "POST",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Chấm điểm thất bại.");
        return;
      }
      router.push(`/speaking/session/${sessionId}`);
    } finally {
      setBusy(false);
    }
  }

  if (!started) {
    return (
      <div className="space-y-4">
        {mode === "sim" ? (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={practiceMode}
              onChange={(e) => setPracticeMode(e.target.checked)}
            />
            Chế độ luyện tập (cho phép ghi lại)
          </label>
        ) : null}
        <Button size="lg" disabled={busy} onClick={() => void start()}>
          Bắt đầu
        </Button>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>
    );
  }

  const isPart2Cue =
    currentPart?.part === 2 &&
    Boolean(currentPart.cueCard) &&
    qIndex === 0;

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">
          Part {currentPart?.part}/{script.length} — Câu {qIndex + 1}/
          {currentPart?.questions.length}
        </p>
        <Progress value={progressPct} />
      </div>

      <ExaminerAvatar speaking={false} />

      {isPart2Cue ? (
        <CueCard
          text={currentPart!.cueCard!}
          prepSec={currentPart!.prepSec ?? 60}
          speakSec={currentPart!.speakSec ?? 120}
          phase={prepDone ? "speak" : "prep"}
          onPrepEnd={() => setPrepDone(true)}
        />
      ) : (
        <div className="border bg-card p-4 text-base leading-relaxed">
          {currentQ}
        </div>
      )}

      {(!isPart2Cue || prepDone) && !lastTranscript ? (
        <SpeakingRecorder
          maxSec={currentPart?.part === 2 ? 120 : 60}
          autoStopAt={currentPart?.part === 2 ? 120 : 45}
          allowRerecord={practiceMode}
          onComplete={async ({ audioBase64, durationSec, envelope }) => {
            await uploadTurn({
              audioBase64,
              durationSec,
              envelopePauses: envelope.pauses,
            });
          }}
        />
      ) : null}

      {!lastTranscript ? (
        <div className="space-y-2 rounded-lg border p-3">
          <p className="text-sm font-medium">Chế độ gõ transcript (nếu Whisper lỗi)</p>
          <Input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="Gõ những gì bạn đã nói…"
          />
          <Button
            type="button"
            variant="outline"
            disabled={!typed.trim() || busy}
            onClick={() =>
              void uploadTurn({ typedTranscript: typed, durationSec: 30 })
            }
          >
            Gửi transcript
          </Button>
        </div>
      ) : null}

      {lastTranscript ? (
        <div className="space-y-3">
          <TranscriptViewer transcript={lastTranscript} />
          {lastMetrics ? <SessionMetricsCard {...lastMetrics} /> : null}
          <Button disabled={busy} onClick={advance}>
            {partIndex === script.length - 1 &&
            qIndex === (currentPart?.questions.length ?? 1) - 1
              ? "Hoàn thành & chấm điểm"
              : "Câu tiếp theo"}
          </Button>
        </div>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
