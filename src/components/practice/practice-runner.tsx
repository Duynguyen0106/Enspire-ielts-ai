"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AudioPlayer } from "@/components/placement/audio-player";
import type { PracticeSection } from "@/lib/ai/lesson-schemas";
import { cn } from "@/lib/utils";

type PracticeRunnerProps = {
  skill: "listening" | "reading";
};

function normalize(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

export function PracticeRunner({ skill }: PracticeRunnerProps) {
  const [section, setSection] = useState<PracticeSection | null>(null);
  const [loading, setLoading] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (forceNew = false) => {
      setLoading(true);
      setError(null);
      setSubmitted(false);
      setScore(null);
      setAnswers({});
      try {
        const res = await fetch(`/api/practice/${skill}/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ forceNew }),
        });
        const data = (await res.json()) as PracticeSection & { error?: string };
        if (!res.ok) {
          setError(data.error ?? "Không tạo được đề luyện.");
          return;
        }
        setSection(data);
      } catch {
        setError("Không tạo được đề luyện.");
      } finally {
        setLoading(false);
      }
    },
    [skill]
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  function submit() {
    if (!section) return;
    let correct = 0;
    for (const q of section.questions) {
      if (normalize(answers[q.id] ?? "") === normalize(q.correctAnswer)) {
        correct += 1;
      }
    }
    setScore(correct / section.questions.length);
    setSubmitted(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          disabled={loading}
          onClick={() => void load(true)}
        >
          Bộ đề mới
        </Button>
        {loading ? (
          <span className="text-sm text-muted-foreground">Đang tạo đề…</span>
        ) : null}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {section ? (
        <>
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
              {section.title}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {section.instructionsVi}
            </p>
          </div>

          {skill === "listening" && section.audioUrl ? (
            <AudioPlayer src={section.audioUrl} maxPlays={1} />
          ) : null}

          {skill === "reading" && section.passage ? (
            <article className="whitespace-pre-wrap leading-relaxed border bg-card p-4 text-[15px]">
              {section.passage}
            </article>
          ) : null}

          <div className="space-y-4">
            {section.questions.map((q, i) => {
              const userAns = answers[q.id] ?? "";
              const ok =
                submitted &&
                normalize(userAns) === normalize(q.correctAnswer);
              return (
                <div key={q.id} className="space-y-2 border p-4">
                  <p className="font-medium">
                    {i + 1}. {q.prompt}
                  </p>
                  {q.options?.length ? (
                    <div className="grid gap-2">
                      {q.options.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          disabled={submitted}
                          onClick={() =>
                            setAnswers((prev) => ({ ...prev, [q.id]: opt }))
                          }
                          className={cn(
                            "rounded-lg border px-3 py-2 text-left text-sm",
                            userAns === opt && "border-[var(--brand)] bg-[var(--brand-soft)]/40"
                          )}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <Input
                      value={userAns}
                      disabled={submitted}
                      onChange={(e) =>
                        setAnswers((prev) => ({
                          ...prev,
                          [q.id]: e.target.value,
                        }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          submit();
                        }
                      }}
                    />
                  )}
                  {submitted ? (
                    <p
                      className={cn(
                        "text-sm",
                        ok ? "text-[var(--brand-deep)]" : "text-destructive"
                      )}
                    >
                      {ok ? "Đúng. " : `Sai — đáp án: ${q.correctAnswer}. `}
                      {q.explanationVi}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>

          {!submitted ? (
            <Button size="lg" onClick={submit}>
              Nộp bài
            </Button>
          ) : (
            <div className="space-y-3 border bg-[var(--brand-soft)]/40 p-4">
              <p className="text-2xl font-semibold text-[var(--brand)]">
                {(score! * 100).toFixed(0)}%
              </p>
              {skill === "listening" && section.audioScript ? (
                <div>
                  <p className="font-medium">Transcript</p>
                  <pre className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                    {section.audioScript}
                  </pre>
                </div>
              ) : null}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
