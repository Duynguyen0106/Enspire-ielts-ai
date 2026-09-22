"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ExamTimer } from "@/components/exam/exam-timer";
import { SectionTransition } from "@/components/exam/section-transition";
import { ListeningExamSection } from "@/components/exam/listening-exam-section";
import { ReadingExamSection } from "@/components/exam/reading-exam-section";
import { WritingExamSection } from "@/components/exam/writing-exam-section";
import { SpeakingExamSection } from "@/components/exam/speaking-exam-section";

type Section = {
  id: string;
  order: number;
  skill: string;
  durationMin: number;
  instructionsVi: string | null;
  metadataJson: unknown;
  questions: {
    id: string;
    type: string;
    order: number;
    points: number;
    contentJson: Record<string, unknown>;
  }[];
};

type AttemptPayload = {
  attemptId: string;
  startedAt: string;
  test: {
    title: string;
    durationMin: number;
    levelNumber: number;
    sections: Section[];
  };
  sectionProgress: {
    sectionId: string;
    startedAt: string | null;
    submittedAt: string | null;
  }[];
};

const SKILL_VI: Record<string, string> = {
  LISTENING: "Nghe",
  READING: "Đọc",
  WRITING: "Viết",
  SPEAKING: "Nói",
};

export function ExamRunner({ attemptId }: { attemptId: string }) {
  const router = useRouter();
  const [data, setData] = useState<AttemptPayload | null>(null);
  const [sectionIndex, setSectionIndex] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  useEffect(() => {
    void (async () => {
      // Resume: re-fetch start for same test via attempts detail mid-run
      // Client stores nothing — reload from start response cached? Use GET incomplete.
      // We pass attempt via start page navigation state; here refetch from a lightweight path:
      const res = await fetch(`/api/tests/attempts/${attemptId}/run-state`);
      if (res.ok) {
        const json = (await res.json()) as AttemptPayload;
        setData(json);
        const firstOpen = json.sectionProgress.findIndex((p) => !p.submittedAt);
        setSectionIndex(firstOpen >= 0 ? firstOpen : 0);
        return;
      }
      setError("Không tải được phiên thi.");
    })();
  }, [attemptId]);

  const section = data?.test.sections[sectionIndex];
  const progress = data?.sectionProgress.find(
    (p) => p.sectionId === section?.id
  );

  const sectionLabel = useMemo(() => {
    if (!data) return "";
    return data.test.sections
      .map((s, i) => {
        const name = SKILL_VI[s.skill] ?? s.skill;
        return `${name} ${i + 1}/4`;
      })
      .join(" · ");
  }, [data]);

  const submit = useCallback(
    async (
      answers: { questionId: string; response: unknown }[],
      speakingSessionId?: string
    ) => {
      if (!data || !section) return;
      setBusy(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/tests/attempts/${attemptId}/section/${section.id}/submit`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ answers, speakingSessionId }),
          }
        );
        const json = (await res.json()) as {
          error?: string;
          nextSectionId?: string | null;
          status?: string;
        };
        if (!res.ok) {
          setError(json.error ?? "Nộp phần thất bại.");
          return;
        }
        if (!json.nextSectionId || json.status === "SCORING") {
          router.push(`/tests/attempts/${attemptId}/scoring`);
          return;
        }
        setTransitioning(true);
      } finally {
        setBusy(false);
      }
    },
    [attemptId, data, section, router]
  );

  if (error && !data) {
    return <p className="text-destructive">{error}</p>;
  }
  if (!data || !section) {
    return <p className="text-muted-foreground">Đang tải bài thi…</p>;
  }

  if (transitioning) {
    const next = data.test.sections[sectionIndex + 1];
    return (
      <SectionTransition
        nextSectionTitle={
          next
            ? `${SKILL_VI[next.skill] ?? next.skill}`
            : "Kết thúc"
        }
        onDone={() => {
          setSectionIndex((i) => i + 1);
          setTransitioning(false);
          setData((d) => {
            if (!d || !next) return d;
            return {
              ...d,
              sectionProgress: d.sectionProgress.map((p) =>
                p.sectionId === next.id
                  ? { ...p, startedAt: new Date().toISOString() }
                  : p
              ),
            };
          });
        }}
      />
    );
  }

  const skill = section.skill;
  const qs = section.questions.map((q) => ({
    ...q,
    contentJson: q.contentJson as Record<string, unknown>,
  }));

  return (
    <div className="space-y-4">
      <header className="sticky top-0 z-10 -mx-3 flex flex-wrap items-center justify-between gap-3 border-b bg-background/95 px-3 py-3 backdrop-blur sm:-mx-0 sm:px-0">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{data.test.title}</p>
          <p className="text-xs text-muted-foreground">
            Level {data.test.levelNumber} · {sectionLabel}
          </p>
          <p className="text-xs text-destructive">Không thoát trang trong khi thi</p>
        </div>
        <ExamTimer
          label="Tổng"
          totalSec={data.test.durationMin * 60}
          startedAt={data.startedAt}
        />
      </header>

      {section.instructionsVi ? (
        <p className="text-sm text-muted-foreground">{section.instructionsVi}</p>
      ) : null}

      {skill === "LISTENING" ? (
        <ListeningExamSection
          questions={qs}
          metadataJson={section.metadataJson}
          startedAt={progress?.startedAt ?? data.startedAt}
          durationMin={section.durationMin}
          onSubmit={submit}
          busy={busy}
        />
      ) : null}
      {skill === "READING" ? (
        <ReadingExamSection
          questions={qs}
          metadataJson={section.metadataJson}
          startedAt={progress?.startedAt ?? null}
          durationMin={section.durationMin}
          onSubmit={submit}
          busy={busy}
        />
      ) : null}
      {skill === "WRITING" ? (
        <WritingExamSection
          questions={qs}
          startedAt={progress?.startedAt ?? null}
          durationMin={section.durationMin}
          onSubmit={submit}
          busy={busy}
        />
      ) : null}
      {skill === "SPEAKING" ? (
        <SpeakingExamSection
          questions={qs}
          startedAt={progress?.startedAt ?? null}
          durationMin={section.durationMin}
          onSubmit={submit}
          busy={busy}
        />
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
