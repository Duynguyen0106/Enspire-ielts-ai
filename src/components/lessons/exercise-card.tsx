"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type ExerciseView = {
  id: string;
  type: string;
  prompt: string;
  options?: string[];
  hintVi?: string;
  explanationVi?: string;
  isCheckpoint?: boolean;
};

type ExerciseCardProps = {
  exercise: ExerciseView;
  index: number;
  disabled?: boolean;
  onAnswer: (answer: string) => void | Promise<void>;
  feedback?: {
    correct?: boolean;
    feedbackVi: string;
    correctedEn?: string;
  } | null;
};

export function ExerciseCard({
  exercise,
  index,
  disabled,
  onAnswer,
  feedback,
}: ExerciseCardProps) {
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const needsCheck =
    exercise.type === "short_answer" ||
    exercise.type === "rewrite" ||
    exercise.type === "translation" ||
    exercise.type === "gap_fill";

  async function submit(answer: string) {
    if (!answer.trim() || submitting || disabled) return;
    setSubmitting(true);
    try {
      await onAnswer(answer.trim());
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3 border border-border/80 bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-muted-foreground">
          Câu {index + 1}
          {exercise.isCheckpoint ? " · Checkpoint" : ""}
        </p>
        <span className="text-xs uppercase tracking-wide text-muted-foreground">
          {exercise.type}
        </span>
      </div>
      <p className="text-base leading-relaxed">{exercise.prompt}</p>

      {exercise.options?.length ? (
        <div className="grid gap-2">
          {exercise.options.map((opt) => (
            <button
              key={opt}
              type="button"
              disabled={disabled || submitting || Boolean(feedback)}
              onClick={() => void submit(opt)}
              className={cn(
                "rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                "hover:border-[var(--brand)]/40 hover:bg-[var(--brand-soft)]/50",
                "disabled:opacity-60",
                feedback && value === opt && "border-[var(--brand)]"
              )}
            >
              {opt}
            </button>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={disabled || Boolean(feedback)}
            placeholder="Nhập câu trả lời…"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void submit(value);
              }
            }}
          />
          {needsCheck ? (
            <Button
              type="button"
              disabled={disabled || submitting || !value.trim() || Boolean(feedback)}
              onClick={() => void submit(value)}
            >
              Kiểm tra
            </Button>
          ) : null}
        </div>
      )}

      {exercise.hintVi && !feedback ? (
        <p className="text-xs text-muted-foreground">Gợi ý: {exercise.hintVi}</p>
      ) : null}

      {feedback ? (
        <div
          className={cn(
            "rounded-lg px-3 py-2 text-sm",
            feedback.correct === false
              ? "bg-destructive/10 text-destructive"
              : "bg-[var(--brand-soft)] text-[var(--brand-deep)]"
          )}
        >
          <p>{feedback.feedbackVi}</p>
          {feedback.correctedEn ? (
            <p className="mt-1 font-medium">Gợi ý đúng: {feedback.correctedEn}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
