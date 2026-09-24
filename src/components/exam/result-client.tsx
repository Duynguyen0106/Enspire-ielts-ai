"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ResultHero } from "@/components/exam/result-hero";
import { SkillPassCard } from "@/components/exam/skill-pass-card";
import { GraduationScreen } from "@/components/exam/graduation-screen";
import { CooldownTimer } from "@/components/exam/cooldown-timer";
import { Button } from "@/components/ui/button";

type ResultPayload = {
  attemptId: string;
  passed: boolean;
  unlockGranted: boolean;
  overallBand: number;
  cooldownUntil: string | null;
  levelNumber: number;
  passingRules: { minOverallBand: number; minSkillBand: number };
  rawScoreJson: {
    listening: { band: number; raw: number; total: number };
    reading: { band: number; raw: number; total: number };
    writing: { band: number };
    speaking: { band: number };
    failedSkills?: string[];
  };
  sections: {
    skill: string;
    questions: {
      id: string;
      order: number;
      contentJson: Record<string, unknown>;
      correctAnswerJson: unknown;
      userResponseJson: unknown;
      isCorrect: boolean | null;
    }[];
  }[];
};

export function ResultClient({ attemptId }: { attemptId: string }) {
  const [data, setData] = useState<ResultPayload | null>(null);
  const [tab, setTab] = useState("LISTENING");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch(`/api/tests/attempts/${attemptId}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Không tải kết quả.");
        return;
      }
      if (json.scoringStatus !== "SCORED") {
        setError("Bài chưa được chấm xong.");
        return;
      }
      setData(json as ResultPayload);
    })();
  }, [attemptId]);

  if (error) return <p className="text-destructive">{error}</p>;
  if (!data) return <p className="text-muted-foreground">Đang tải kết quả…</p>;

  const thr = data.passingRules.minSkillBand;
  const skills = [
    {
      key: "LISTENING",
      label: "Nghe",
      band: data.rawScoreJson.listening.band,
    },
    { key: "READING", label: "Đọc", band: data.rawScoreJson.reading.band },
    { key: "WRITING", label: "Viết", band: data.rawScoreJson.writing.band },
    { key: "SPEAKING", label: "Nói", band: data.rawScoreJson.speaking.band },
  ];

  const section = data.sections.find((s) => s.skill === tab);

  return (
    <div className="space-y-6">
      <ResultHero
        band={data.overallBand}
        passed={data.passed}
        level={data.levelNumber}
        minOverall={data.passingRules.minOverallBand}
        minSkill={data.passingRules.minSkillBand}
      />

      {data.passed && data.levelNumber === 9 ? (
        <GraduationScreen band={data.overallBand} />
      ) : null}

      {data.passed && data.levelNumber < 9 && data.unlockGranted ? (
        <div className="rounded-xl border border-primary/40 bg-primary/10 p-4">
          <p className="font-medium">
            Level {data.levelNumber + 1} đã mở khóa!
          </p>
          <Button className="mt-3" render={<Link href={`/levels/${data.levelNumber + 1}`} />}>
            Vào Level {data.levelNumber + 1}
          </Button>
        </div>
      ) : null}

      {!data.passed ? (
        <div className="space-y-2 rounded-xl border border-accent/40 bg-accent/10 p-4">
          <p className="font-medium">Kỹ năng cần cải thiện</p>
          <ul className="list-disc pl-5 text-sm">
            {(data.rawScoreJson.failedSkills ?? []).map((s) => (
              <li key={s}>
                <Link
                  className="text-[var(--brand)] underline"
                  href={`/levels/${data.levelNumber}`}
                >
                  {s}
                </Link>
              </li>
            ))}
          </ul>
          {data.cooldownUntil ? (
            <p className="text-sm text-muted-foreground">
              <CooldownTimer until={data.cooldownUntil} />
            </p>
          ) : null}
          <Button variant="outline" render={<Link href="/levels" />}>
            Về lộ trình học
          </Button>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {skills.map((s) => (
          <SkillPassCard
            key={s.key}
            skill={s.key}
            labelVi={s.label}
            band={s.band}
            threshold={thr}
            passed={s.band >= thr}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {skills.map((s) => (
          <button
            key={s.key}
            type="button"
            className={
              tab === s.key
                ? "rounded-md bg-[var(--brand)] px-3 py-1.5 text-sm text-white"
                : "rounded-md border px-3 py-1.5 text-sm"
            }
            onClick={() => setTab(s.key)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {section ? (
        <div className="space-y-3">
          {tab === "LISTENING" || tab === "READING" ? (
            <p className="text-sm text-muted-foreground">
              Điểm:{" "}
              {tab === "LISTENING"
                ? `${data.rawScoreJson.listening.raw}/${data.rawScoreJson.listening.total}`
                : `${data.rawScoreJson.reading.raw}/${data.rawScoreJson.reading.total}`}
            </p>
          ) : null}
          {section.questions.map((q) => (
            <div key={q.id} className="rounded-lg border p-3 text-sm">
              <p className="font-medium">
                {q.order}. {String(q.contentJson.prompt ?? q.contentJson.taskType ?? "Câu hỏi")}
              </p>
              {q.isCorrect != null ? (
                <p className={q.isCorrect ? "text-primary" : "text-destructive"}>
                  {q.isCorrect ? "Đúng" : "Sai"} · Đáp án:{" "}
                  {JSON.stringify(q.correctAnswerJson)} · Bạn chọn:{" "}
                  {JSON.stringify(q.userResponseJson)}
                </p>
              ) : (
                <pre className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">
                  {JSON.stringify(q.userResponseJson, null, 2)}
                </pre>
              )}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
