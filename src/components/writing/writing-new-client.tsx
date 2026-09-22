"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { WritingEditor } from "@/components/writing/writing-editor";
import { Button } from "@/components/ui/button";
import { WRITING_TASK_META, type WritingTaskKey } from "@/lib/task-types";
import { wordCount } from "@/lib/writing-metrics";
import { cn } from "@/lib/utils";

type Prompt = {
  id: string;
  title: string;
  titleVi: string;
  prompt: string;
};

type WritingNewClientProps = {
  taskType: WritingTaskKey;
  level: number;
};

export function WritingNewClient({ taskType, level }: WritingNewClientProps) {
  const router = useRouter();
  const meta = WRITING_TASK_META[taskType];
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [selected, setSelected] = useState<Prompt | null>(null);
  const [essay, setEssay] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    void (async () => {
      const res = await fetch(
        `/api/writing/prompts?taskType=${taskType}&level=${level}`
      );
      const data = (await res.json()) as { prompts: Prompt[] };
      setPrompts(data.prompts ?? []);
    })();
  }, [taskType, level]);

  const draftKey = useMemo(
    () => `writing-draft:${taskType}:${selected?.id ?? "none"}`,
    [taskType, selected?.id]
  );

  const count = wordCount(essay);
  const underMin = count < meta.minWords;
  const canSubmit = Boolean(selected) && count >= 40;

  function pickRandom() {
    if (prompts.length === 0) return;
    const p = prompts[Math.floor(Math.random() * prompts.length)]!;
    setSelected(p);
    setEssay("");
  }

  async function submit() {
    if (!selected || !canSubmit) return;
    setSubmitting(true);
    setError(null);
    setStep("Đang chấm 4 tiêu chí…");
    try {
      const res = await fetch("/api/writing/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskType,
          prompt: selected.prompt,
          promptId: selected.id,
          essayText: essay,
          timeSpentSec: seconds,
          level,
        }),
      });
      setStep("Đang tạo bài mẫu 3 band…");
      const data = (await res.json()) as {
        error?: string;
        submissionId?: string;
      };
      if (!res.ok || !data.submissionId) {
        setError(data.error ?? "Nộp bài thất bại.");
        return;
      }
      localStorage.removeItem(draftKey);
      router.push(`/writing/submission/${data.submissionId}`);
    } catch {
      setError("Nộp bài thất bại.");
    } finally {
      setSubmitting(false);
      setStep(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={pickRandom} disabled={!prompts.length}>
          Đề ngẫu nhiên
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setPickerOpen((v) => !v)}
        >
          Chọn đề
        </Button>
      </div>

      {pickerOpen ? (
        <div className="max-h-56 space-y-2 overflow-y-auto border p-3">
          {prompts.map((p) => (
            <button
              key={p.id}
              type="button"
              className={cn(
                "block w-full rounded-md border px-3 py-2 text-left text-sm hover:border-[var(--brand)]/40",
                selected?.id === p.id &&
                  "border-[var(--brand)] bg-[var(--brand-soft)]/40"
              )}
              onClick={() => {
                setSelected(p);
                setPickerOpen(false);
                setEssay("");
              }}
            >
              <span className="font-medium">{p.titleVi}</span>
              <span className="mt-1 line-clamp-2 block text-muted-foreground">
                {p.prompt}
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {selected ? (
        <div className="border bg-card p-4">
          <p className="font-medium">{selected.titleVi}</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
            {selected.prompt}
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Chọn đề hoặc bấm “Đề ngẫu nhiên” để bắt đầu.
        </p>
      )}

      {selected ? (
        <WritingEditor
          value={essay}
          onChange={setEssay}
          minWords={meta.minWords}
          recommendedMin={meta.recommendedMin}
          draftKey={draftKey}
          onTimerTick={setSeconds}
        />
      ) : null}

      {selected && underMin && count > 0 ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Cảnh báo: bài mới có {count}/{meta.minWords} từ. Bạn vẫn có thể nộp,
          nhưng Task Achievement sẽ bị trừ điểm vì dưới mức tối thiểu.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          size="lg"
          disabled={!canSubmit || submitting}
          title={
            underMin
              ? `Dưới ${meta.minWords} từ — vẫn nộp được nhưng sẽ bị trừ điểm`
              : undefined
          }
          onClick={() => void submit()}
        >
          {submitting
            ? "Đang nộp…"
            : underMin
              ? "Nộp bài (dưới số từ)"
              : "Nộp bài"}
        </Button>
        {step ? (
          <p className="animate-pulse text-sm text-muted-foreground">{step}</p>
        ) : null}
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
