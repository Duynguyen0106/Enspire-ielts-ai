"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
import { Button } from "@/components/ui/button";
import { LessonRenderer } from "@/components/lessons/lesson-renderer";
import {
  ExerciseCard,
  type ExerciseView,
} from "@/components/lessons/exercise-card";
import { TutorChat } from "@/components/lessons/tutor-chat";

type LessonPayload = {
  id: string;
  titleVi: string;
  isCheckpoint: boolean;
  levelNumber: number;
  skill: string;
  content: Record<string, unknown>;
  exercises: (ExerciseView & {
    correctAnswer?: string;
    explanationVi?: string;
  })[];
};

type LessonPlayerProps = {
  lesson: LessonPayload;
};

export function LessonPlayer({ lesson }: LessonPlayerProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<
    Record<
      string,
      { correct?: boolean; feedbackVi: string; correctedEn?: string }
    >
  >({});
  const [completing, setCompleting] = useState(false);
  const [result, setResult] = useState<{
    score: number;
    passed: boolean;
    checkpointPassed: boolean;
    feedbackVi: string;
    nextLessonId: string | null;
  } | null>(null);

  const content = useMemo(
    () =>
      ({
        objectiveVi:
          typeof lesson.content.objectiveVi === "string"
            ? lesson.content.objectiveVi
            : undefined,
        warmup:
          lesson.content.warmup &&
          typeof lesson.content.warmup === "object"
            ? (lesson.content.warmup as {
                questionVi: string;
                tipsVi: string[];
              })
            : undefined,
        sections: Array.isArray(lesson.content.sections)
          ? (lesson.content.sections as {
              headingVi: string;
              headingEn?: string;
              contentMd: string;
              examplesEn?: string[];
            }[])
          : undefined,
        passage:
          typeof lesson.content.passage === "string"
            ? lesson.content.passage
            : undefined,
        audioUrl:
          typeof lesson.content.audioUrl === "string"
            ? lesson.content.audioUrl
            : undefined,
        audioScript:
          typeof lesson.content.audioScript === "string"
            ? lesson.content.audioScript
            : undefined,
      }),
    [lesson.content]
  );

  async function handleAnswer(exerciseId: string, userAnswer: string) {
    setAnswers((prev) => ({ ...prev, [exerciseId]: userAnswer }));
    try {
      const res = await fetch(`/api/lessons/${lesson.id}/grade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exerciseId, userAnswer }),
      });
      const data = (await res.json()) as {
        error?: string;
        score?: number;
        feedbackVi?: string;
        correctedEn?: string;
        correct?: boolean;
      };
      if (!res.ok) {
        setFeedback((prev) => ({
          ...prev,
          [exerciseId]: {
            feedbackVi: data.error ?? "Không chấm được câu này.",
          },
        }));
        return;
      }
      setFeedback((prev) => ({
        ...prev,
        [exerciseId]: {
          correct: data.correct,
          feedbackVi: data.feedbackVi ?? "",
          correctedEn: data.correctedEn,
        },
      }));
    } catch {
      setFeedback((prev) => ({
        ...prev,
        [exerciseId]: { feedbackVi: "Không chấm được câu này." },
      }));
    }
  }

  async function completeLesson() {
    if (completing) return;
    setCompleting(true);
    try {
      const res = await fetch(`/api/lessons/${lesson.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: Object.entries(answers).map(([exerciseId, userAnswer]) => ({
            exerciseId,
            userAnswer,
          })),
          timeSpentSec: 0,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        score: number;
        passed: boolean;
        checkpointPassed: boolean;
        feedbackVi: string;
        nextLessonId: string | null;
        graded?: {
          exerciseId: string;
          score: number;
          feedbackVi: string;
          correctedEn?: string;
        }[];
      };
      if (!res.ok) {
        setFeedback((prev) => ({
          ...prev,
          __error: {
            feedbackVi: data.error ?? "Không thể hoàn thành bài học.",
          },
        }));
        return;
      }
      if (data.graded) {
        const next: typeof feedback = {};
        for (const g of data.graded) {
          next[g.exerciseId] = {
            correct: g.score >= 0.8,
            feedbackVi: g.feedbackVi,
            correctedEn: g.correctedEn,
          };
        }
        setFeedback(next);
      }
      setResult({
        score: data.score,
        passed: data.passed,
        checkpointPassed: data.checkpointPassed,
        feedbackVi: data.feedbackVi,
        nextLessonId: data.nextLessonId,
      });
      if (data.checkpointPassed) {
        void confetti({ particleCount: 120, spread: 70, origin: { y: 0.7 } });
      }
    } finally {
      setCompleting(false);
    }
  }

  const answeredCount = Object.keys(answers).length;
  const canComplete = answeredCount >= Math.min(1, lesson.exercises.length);

  if (result) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 py-10 text-center">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
          {result.checkpointPassed
            ? "Checkpoint đạt!"
            : "Đã hoàn thành bài học"}
        </h2>
        <p className="text-4xl font-semibold text-[var(--brand)]">
          {(result.score * 100).toFixed(0)}%
        </p>
        <p className="text-muted-foreground">{result.feedbackVi}</p>
        <div className="flex flex-wrap justify-center gap-2">
          {result.nextLessonId ? (
            <Button render={<Link href={`/lessons/${result.nextLessonId}`} />}>
              Bài tiếp theo
            </Button>
          ) : null}
          <Button
            variant="outline"
            render={<Link href={`/levels/${lesson.levelNumber}`} />}
          >
            Về level
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-8">
        <LessonRenderer titleVi={lesson.titleVi} content={content} />
        <div className="space-y-4">
          <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
            Bài tập
          </h2>
          {lesson.exercises.map((ex, index) => (
            <ExerciseCard
              key={ex.id}
              exercise={ex}
              index={index}
              onAnswer={(answer) => handleAnswer(ex.id, answer)}
              feedback={feedback[ex.id] ?? null}
            />
          ))}
          <Button
            size="lg"
            disabled={!canComplete || completing}
            onClick={() => void completeLesson()}
          >
            {completing ? "Đang chấm…" : "Hoàn thành bài học"}
          </Button>
        </div>
      </div>
      <aside className="lg:sticky lg:top-4 lg:h-[calc(100vh-6rem)]">
        <TutorChat lessonId={lesson.id} />
      </aside>
    </div>
  );
}
