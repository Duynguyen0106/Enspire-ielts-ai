"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CountdownTimer } from "@/components/placement/countdown-timer";
import { AudioPlayer } from "@/components/placement/audio-player";
import {
  QuestionRenderer,
  type QuestionContent,
} from "@/components/placement/question-renderer";
import { AiDisclaimer } from "@/components/placement/ai-disclaimer";
import { Skeleton } from "@/components/ui/skeleton";

export type PlacementQuestion = {
  id: string;
  type: string;
  order: number;
  points: number;
  contentJson: QuestionContent;
};

export type PlacementSection = {
  id: string;
  order: number;
  durationMin: number;
  instructionsVi: string | null;
  skill: string;
  metadataJson: Record<string, unknown> | null;
  questions: PlacementQuestion[];
};

export type PlacementPayload = {
  attemptId: string;
  test: {
    id: string;
    title: string;
    durationMin: number;
    sections: PlacementSection[];
  };
  savedAnswers: { questionId: string; userResponseJson: unknown }[];
};

type PlacementRunnerProps = {
  initial: PlacementPayload;
};

export function PlacementRunner({ initial }: PlacementRunnerProps) {
  const router = useRouter();
  const sections = initial.test.sections;
  const [sectionIndex, setSectionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, unknown>>(() => {
    const map: Record<string, unknown> = {};
    for (const a of initial.savedAnswers) {
      map[a.questionId] = a.userResponseJson;
    }
    return map;
  });
  const [autosaveState, setAutosaveState] = useState<"idle" | "saving" | "saved">(
    "idle"
  );
  const [submitting, setSubmitting] = useState(false);
  const [progressMsg, setProgressMsg] = useState("");
  const answersRef = useRef(answers);
  answersRef.current = answers;

  const section = sections[sectionIndex]!;
  const timerKey = `${section.id}-${sectionIndex}`;

  const audioUrl = useMemo(() => {
    const meta = section.metadataJson ?? {};
    if (typeof meta.audioUrl === "string") return meta.audioUrl;
    const first = section.questions[0]?.contentJson.audioUrl;
    return typeof first === "string" ? first : null;
  }, [section]);

  const passage = useMemo(() => {
    const meta = section.metadataJson ?? {};
    return typeof meta.passage === "string" ? meta.passage : null;
  }, [section]);

  const persistAnswer = useCallback(
    async (questionId: string, userResponseJson: unknown) => {
      setAutosaveState("saving");
      try {
        const res = await fetch("/api/placement/answer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            attemptId: initial.attemptId,
            questionId,
            userResponseJson,
          }),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(data?.error ?? "Không lưu được câu trả lời");
        }
        setAutosaveState("saved");
      } catch (err) {
        setAutosaveState("idle");
        toast.error(
          err instanceof Error ? err.message : "Lỗi lưu câu trả lời"
        );
      }
    },
    [initial.attemptId]
  );

  function setAnswer(questionId: string, value: unknown) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  // Autosave every 5s
  useEffect(() => {
    const id = window.setInterval(() => {
      const entries = Object.entries(answersRef.current);
      void (async () => {
        for (const [questionId, userResponseJson] of entries) {
          await persistAnswer(questionId, userResponseJson);
        }
      })();
    }, 5000);
    return () => window.clearInterval(id);
  }, [persistAnswer]);

  async function flushSectionAnswers() {
    for (const q of section.questions) {
      const value = answersRef.current[q.id];
      if (value !== undefined) {
        await persistAnswer(q.id, value);
      }
    }
  }

  async function goNext() {
    await flushSectionAnswers();
    if (sectionIndex < sections.length - 1) {
      setSectionIndex((i) => i + 1);
      return;
    }
    await submitAll();
  }

  async function submitAll() {
    setSubmitting(true);
    setProgressMsg("Đang lưu câu trả lời…");
    try {
      await flushSectionAnswers();

      const payloadAnswers = Object.entries(answersRef.current).map(
        ([questionId, userResponseJson]) => ({
          questionId,
          userResponseJson,
        })
      );

      // Prefer last speaking audio if present
      let speakingAudioBase64: string | undefined;
      for (const q of sections.flatMap((s) => s.questions)) {
        if (q.type !== "speaking_task") continue;
        const val = answersRef.current[q.id];
        if (
          typeof val === "object" &&
          val &&
          "audioBase64" in val &&
          typeof (val as { audioBase64?: unknown }).audioBase64 === "string"
        ) {
          speakingAudioBase64 = (val as { audioBase64: string }).audioBase64;
        }
      }

      setProgressMsg("Đang chấm Listening & Reading…");
      await new Promise((r) => setTimeout(r, 400));
      setProgressMsg("Đang chấm Writing…");

      const res = await fetch("/api/placement/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId: initial.attemptId,
          answers: payloadAnswers,
          speakingAudioBase64,
        }),
      });

      setProgressMsg("Đang chấm Speaking…");
      const data = (await res.json()) as {
        error?: string;
        placementResultId?: string;
      };

      if (!res.ok || !data.placementResultId) {
        throw new Error(data.error ?? "Nộp bài thất bại");
      }

      setProgressMsg("Đang tạo nhận xét…");
      toast.success("Đã chấm xong bài kiểm tra đầu vào");
      router.push(`/placement/result/${data.placementResultId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Có lỗi khi nộp bài");
      setSubmitting(false);
      setProgressMsg("");
    }
  }

  if (submitting) {
    return (
      <div className="mx-auto flex max-w-lg flex-col gap-4 p-6">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-24 w-full" />
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {progressMsg || "Đang xử lý…"}
        </p>
        <AiDisclaimer />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            Phần {sectionIndex + 1}/{sections.length}
          </Badge>
          <span className="font-medium">{section.skill}</span>
        </div>
        <CountdownTimer
          key={timerKey}
          seconds={section.durationMin * 60}
          onExpire={() => {
            toast.message("Hết giờ phần này — chuyển phần tiếp theo.");
            void goNext();
          }}
        />
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {autosaveState === "saving"
            ? "Đang lưu…"
            : autosaveState === "saved"
              ? "Đã lưu"
              : "Tự động lưu"}
        </p>
      </div>

      <AiDisclaimer />

      {section.instructionsVi ? (
        <p className="text-sm text-muted-foreground">{section.instructionsVi}</p>
      ) : null}

      {section.skill === "LISTENING" && audioUrl ? (
        <AudioPlayer src={audioUrl} maxPlays={2} />
      ) : null}

      <div
        className={
          section.skill === "READING"
            ? "grid gap-4 lg:grid-cols-2"
            : "grid gap-4"
        }
      >
        {passage ? (
          <Card className="h-fit lg:sticky lg:top-20">
            <CardHeader>
              <CardTitle className="text-base">Reading passage</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {passage}
              </p>
            </CardContent>
          </Card>
        ) : null}

        <div className="space-y-4">
          {section.questions.map((q, idx) => (
            <Card key={q.id}>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">
                  Câu {idx + 1}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <QuestionRenderer
                  questionId={q.id}
                  type={q.type}
                  content={q.contentJson}
                  value={answers[q.id]}
                  onChange={(value) => setAnswer(q.id, value)}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap justify-between gap-2 border-t pt-4">
        <Button
          type="button"
          variant="outline"
          disabled={sectionIndex === 0}
          onClick={() => {
            void flushSectionAnswers().then(() =>
              setSectionIndex((i) => Math.max(0, i - 1))
            );
          }}
        >
          Phần trước
        </Button>
        <Button type="button" onClick={() => void goNext()}>
          {sectionIndex === sections.length - 1
            ? "Nộp bài"
            : "Phần tiếp theo"}
        </Button>
      </div>
    </div>
  );
}
