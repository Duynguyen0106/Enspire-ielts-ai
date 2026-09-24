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

type ListeningExamSectionProps = {
  questions: Question[];
  metadataJson: unknown;
  startedAt: string | Date | null;
  durationMin: number;
  onSubmit: (answers: { questionId: string; response: unknown }[]) => void;
  busy?: boolean;
};

export function ListeningExamSection({
  questions,
  metadataJson,
  startedAt,
  durationMin,
  onSubmit,
  busy,
}: ListeningExamSectionProps) {
  const audioSections = useMemo(() => {
    const m = metadataJson as {
      audioSections?: { index: number; audioUrl: string; questionOrders: number[] }[];
    };
    return m?.audioSections ?? [];
  }, [metadataJson]);

  const [audioIndex, setAudioIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [played, setPlayed] = useState<Record<number, boolean>>({});

  const current = audioSections[audioIndex];
  const visibleQs = questions.filter((q) =>
    current ? current.questionOrders.includes(q.order) : true
  );

  function setAns(qid: string, value: string) {
    setAnswers((prev) => ({ ...prev, [qid]: value }));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Nghe · đoạn {Math.min(audioIndex + 1, audioSections.length)}/
          {audioSections.length || 1}
        </p>
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

      {current ? (
        <div className="space-y-2 rounded-xl border p-4">
          <audio
            controls
            src={current.audioUrl}
            onPlay={() => setPlayed((p) => ({ ...p, [audioIndex]: true }))}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            Mỗi đoạn chỉ nên nghe một lần trong điều kiện thi thật.
          </p>
        </div>
      ) : null}

      <div className="space-y-4">
        {visibleQs.map((q) => {
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
                        onChange={() => setAns(q.id, opt)}
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              ) : (
                <Input
                  className="mt-2"
                  value={answers[q.id] ?? ""}
                  onChange={(e) => setAns(q.id, e.target.value)}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        {audioIndex + 1 < audioSections.length ? (
          <Button
            type="button"
            disabled={busy}
            onClick={() => setAudioIndex((i) => i + 1)}
          >
            Đoạn tiếp theo
          </Button>
        ) : (
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
            Nộp phần Nghe
          </Button>
        )}
        {!played[audioIndex] && current ? (
          <p className="self-center text-xs text-muted-foreground">
            Hãy phát audio trước khi chuyển đoạn.
          </p>
        ) : null}
      </div>
    </div>
  );
}
