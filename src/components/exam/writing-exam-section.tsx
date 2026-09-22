"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ExamTimer } from "@/components/exam/exam-timer";
import { wordCount } from "@/lib/writing-metrics";

type Question = {
  id: string;
  type: string;
  order: number;
  contentJson: Record<string, unknown>;
};

type WritingExamSectionProps = {
  questions: Question[];
  startedAt: string | Date | null;
  durationMin: number;
  onSubmit: (answers: { questionId: string; response: unknown }[]) => void;
  busy?: boolean;
};

export function WritingExamSection({
  questions,
  startedAt,
  durationMin,
  onSubmit,
  busy,
}: WritingExamSectionProps) {
  const task1 = questions[0];
  const task2 = questions[1] ?? questions[0];
  const [tab, setTab] = useState<0 | 1>(0);
  const [essays, setEssays] = useState<Record<string, string>>({});

  const current = tab === 0 ? task1 : task2;
  const minWords =
    typeof current?.contentJson.minWords === "number"
      ? current.contentJson.minWords
      : tab === 0
        ? 150
        : 250;
  const text = current ? essays[current.id] ?? "" : "";
  const count = wordCount(text);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={tab === 0 ? "default" : "outline"}
            onClick={() => setTab(0)}
          >
            Task 1
          </Button>
          <Button
            type="button"
            size="sm"
            variant={tab === 1 ? "default" : "outline"}
            onClick={() => setTab(1)}
          >
            Task 2
          </Button>
        </div>
        <ExamTimer
          totalSec={durationMin * 60}
          startedAt={startedAt}
          onExpire={() =>
            onSubmit(
              questions.map((q) => ({
                questionId: q.id,
                response: { essayText: essays[q.id] ?? "" },
              }))
            )
          }
        />
      </div>

      {current ? (
        <div className="rounded-xl border p-4">
          <p className="text-sm font-medium">
            {String(current.contentJson.taskType ?? "WRITING")}
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
            {String(current.contentJson.prompt ?? "")}
          </p>
        </div>
      ) : null}

      <textarea
        className="min-h-[40vh] w-full rounded-xl border bg-background p-4 text-base leading-relaxed"
        value={text}
        onChange={(e) =>
          current &&
          setEssays((prev) => ({ ...prev, [current.id]: e.target.value }))
        }
        placeholder="Viết bài của bạn tại đây…"
      />
      <p
        className={
          count < minWords
            ? "text-sm text-destructive"
            : "text-sm text-muted-foreground"
        }
      >
        {count} / {minWords} từ
      </p>

      <div className="flex flex-wrap gap-2">
        {tab === 0 ? (
          <Button type="button" variant="outline" onClick={() => setTab(1)}>
            Chuyển sang Task 2
          </Button>
        ) : (
          <Button type="button" variant="outline" onClick={() => setTab(0)}>
            Quay lại Task 1
          </Button>
        )}
        <Button
          type="button"
          size="lg"
          disabled={busy}
          onClick={() =>
            onSubmit(
              questions.map((q) => ({
                questionId: q.id,
                response: { essayText: essays[q.id] ?? "" },
              }))
            )
          }
        >
          Nộp phần Viết
        </Button>
      </div>
    </div>
  );
}
