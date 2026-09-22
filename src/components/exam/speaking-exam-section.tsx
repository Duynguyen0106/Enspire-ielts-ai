"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SpeakingRecorder } from "@/components/speaking/speaking-recorder";
import { CueCard } from "@/components/speaking/cue-card";
import { ExamTimer } from "@/components/exam/exam-timer";

type Question = {
  id: string;
  type: string;
  order: number;
  contentJson: Record<string, unknown>;
};

type SpeakingExamSectionProps = {
  questions: Question[];
  startedAt: string | Date | null;
  durationMin: number;
  onSubmit: (
    answers: { questionId: string; response: unknown }[],
    speakingSessionId?: string
  ) => void;
  busy?: boolean;
};

type Turn = { questionId: string; transcript: string };

export function SpeakingExamSection({
  questions,
  startedAt,
  durationMin,
  onSubmit,
  busy,
}: SpeakingExamSectionProps) {
  const script = useMemo(() => {
    return questions.map((q) => q.contentJson);
  }, [questions]);

  const [partIndex, setPartIndex] = useState(0);
  const [qIndex, setQIndex] = useState(0);
  const [prepDone, setPrepDone] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [typed, setTyped] = useState("");

  const part = script[partIndex] as Record<string, unknown> | undefined;
  const partNum = typeof part?.part === "number" ? part.part : partIndex + 1;
  const partQuestions = Array.isArray(part?.questions)
    ? (part!.questions as string[])
    : [];
  const cueCard = typeof part?.cueCard === "string" ? part.cueCard : null;
  const currentQ =
    cueCard && qIndex === 0 && partNum === 2
      ? cueCard
      : partQuestions[qIndex] ?? cueCard ?? "Hãy trả lời câu hỏi.";
  const questionRow = questions[partIndex];

  function advance(transcript: string) {
    if (questionRow) {
      setTurns((t) => [
        ...t,
        { questionId: questionRow.id, transcript },
      ]);
    }
    setTyped("");

    if (partNum === 2 && cueCard) {
      // Part 2 is one long turn
      if (partIndex + 1 < script.length) {
        setPartIndex((i) => i + 1);
        setQIndex(0);
        setPrepDone(false);
      } else {
        finish([...turns, { questionId: questionRow!.id, transcript }]);
      }
      return;
    }

    if (qIndex + 1 < partQuestions.length) {
      setQIndex((i) => i + 1);
      return;
    }
    if (partIndex + 1 < script.length) {
      setPartIndex((i) => i + 1);
      setQIndex(0);
      setPrepDone(false);
      return;
    }
    finish([...turns, { questionId: questionRow!.id, transcript }]);
  }

  function finish(all: Turn[]) {
    // Aggregate transcripts per question id
    const byQ = new Map<string, string[]>();
    for (const t of all) {
      const arr = byQ.get(t.questionId) ?? [];
      arr.push(t.transcript);
      byQ.set(t.questionId, arr);
    }
    const answers = questions.map((q) => ({
      questionId: q.id,
      response: {
        transcript: (byQ.get(q.id) ?? []).join("\n"),
      },
    }));
    onSubmit(answers);
  }

  const isPart2Prep = partNum === 2 && Boolean(cueCard) && !prepDone;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Nói · Part {partNum} · Câu {qIndex + 1}
        </p>
        <ExamTimer
          totalSec={durationMin * 60}
          startedAt={startedAt}
          onExpire={() => finish(turns)}
        />
      </div>

      {isPart2Prep ? (
        <CueCard
          text={cueCard!}
          prepSec={typeof part?.prepSec === "number" ? part.prepSec : 60}
          speakSec={typeof part?.speakSec === "number" ? part.speakSec : 120}
          phase="prep"
          onPrepEnd={() => setPrepDone(true)}
        />
      ) : partNum === 2 && cueCard ? (
        <CueCard
          text={cueCard}
          prepSec={60}
          speakSec={120}
          phase="speak"
          onPrepEnd={() => undefined}
        />
      ) : (
        <div className="rounded-xl border bg-card p-4 text-base leading-relaxed">
          {currentQ}
        </div>
      )}

      {!isPart2Prep ? (
        <>
          <SpeakingRecorder
            maxSec={partNum === 2 ? 120 : 45}
            autoStopAt={partNum === 2 ? 120 : 45}
            allowRerecord={false}
            onComplete={async () => {
              // Audio uploaded optionally later; use typed or placeholder transcript
              advance(typed.trim() || "(recorded answer)");
            }}
          />
          <div className="space-y-2 rounded-lg border p-3">
            <p className="text-sm font-medium">
              Gõ transcript (nếu không dùng micro)
            </p>
            <Input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder="Gõ câu trả lời…"
            />
            <Button
              type="button"
              variant="outline"
              disabled={!typed.trim() || busy}
              onClick={() => advance(typed.trim())}
            >
              Gửi & tiếp tục
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}
