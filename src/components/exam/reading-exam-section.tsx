"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExamTimer } from "@/components/exam/exam-timer";

type Question = {
  id: string;
  type: string;
  order: number;
  contentJson: Record<string, unknown>;
};

type ReadingExamSectionProps = {
  questions: Question[];
  metadataJson: unknown;
  startedAt: string | Date | null;
  durationMin: number;
  onSubmit: (answers: { questionId: string; response: unknown }[]) => void;
  busy?: boolean;
};

export function ReadingExamSection({
  questions,
  metadataJson,
  startedAt,
  durationMin,
  onSubmit,
  busy,
}: ReadingExamSectionProps) {
  const passages = useMemo(() => {
    const m = metadataJson as { passages?: { index: number; text: string }[] };
    return m?.passages ?? [];
  }, [metadataJson]);

  const [tab, setTab] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const passageQs = questions.filter((q) => {
    const p = String(q.contentJson.passage ?? "");
    // Questions 1-10 for passage 1, 11-20 for passage 2
    if (tab === 0) return q.order <= 10;
    return q.order > 10;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Đọc · 2 đoạn</p>
        <ExamTimer
          totalSec={durationMin * 60}
          startedAt={startedAt}
          onExpire={() =>
            onSubmit(
              questions.map((q) => ({
                questionId: q.id,
                response: { answer: answers[q.id] ?? "" },
              }))
            )
          }
        />
      </div>

      <div className="flex gap-2">
        {passages.map((p, i) => (
          <Button
            key={p.index}
            type="button"
            size="sm"
            variant={tab === i ? "default" : "outline"}
            onClick={() => setTab(i)}
          >
            Passage {p.index}
          </Button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="max-h-[60vh] overflow-y-auto rounded-xl border p-4 text-sm leading-relaxed">
          {passages[tab]?.text ?? "Không có đoạn văn."}
        </div>
        <div className="max-h-[60vh] space-y-3 overflow-y-auto">
          {passageQs.map((q) => {
            const c = q.contentJson;
            const options = Array.isArray(c.options)
              ? (c.options as string[])
              : null;
            return (
              <div key={q.id} className="rounded-lg border p-3">
                <p className="text-sm font-medium">
                  {q.order}. {String(c.prompt ?? "")}
                </p>
                {options ? (
                  <div className="mt-2 space-y-1">
                    {options.map((opt) => (
                      <label key={opt} className="flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name={q.id}
                          checked={answers[q.id] === opt}
                          onChange={() =>
                            setAnswers((prev) => ({ ...prev, [q.id]: opt }))
                          }
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                ) : (
                  <Input
                    className="mt-2"
                    value={answers[q.id] ?? ""}
                    onChange={(e) =>
                      setAnswers((prev) => ({
                        ...prev,
                        [q.id]: e.target.value,
                      }))
                    }
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <Button
        type="button"
        size="lg"
        disabled={busy}
        onClick={() =>
          onSubmit(
            questions.map((q) => ({
              questionId: q.id,
              response: { answer: answers[q.id] ?? "" },
            }))
          )
        }
      >
        Nộp phần Đọc
      </Button>
    </div>
  );
}
