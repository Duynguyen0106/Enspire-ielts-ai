"use client";

import { useEffect, useState } from "react";
import { LevelProgressStepper } from "@/components/exam/level-progress-stepper";
import { CooldownTimer } from "@/components/exam/cooldown-timer";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type LevelItem = {
  testId: string;
  levelNumber: number;
  title: string;
  titleVi: string;
  durationMin: number;
  status: string;
  unlocked: boolean;
  bestBand: number | null;
  lastOverallBand: number | null;
  cooldownUntil: string | null;
  inProgressAttemptId: string | null;
  lastAttemptId: string | null;
  lastPassed: boolean | null;
};

type PracticeExam = {
  testId: string;
  code: string | null;
  title: string;
  titleVi: string;
  durationMin: number;
  bestBand: number | null;
  lastOverallBand: number | null;
  cooldownUntil: string | null;
  inProgressAttemptId: string | null;
  lastAttemptId: string | null;
};

type OfficialLink = { label: string; url: string };

export function TestsHubClient({ currentLevel }: { currentLevel: number }) {
  const [levels, setLevels] = useState<LevelItem[]>([]);
  const [practiceExams, setPracticeExams] = useState<PracticeExam[]>([]);
  const [disclaimer, setDisclaimer] = useState<string | null>(null);
  const [officialLinks, setOfficialLinks] = useState<OfficialLink[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const [levelsRes, practiceRes] = await Promise.all([
        fetch("/api/tests/levels"),
        fetch("/api/tests/practice-exams"),
      ]);
      const levelsJson = (await levelsRes.json()) as {
        levels?: LevelItem[];
        error?: string;
      };
      if (!levelsRes.ok) {
        setError(levelsJson.error ?? "Không tải được danh sách bài thi.");
        return;
      }
      setLevels(levelsJson.levels ?? []);

      if (practiceRes.ok) {
        const practiceJson = (await practiceRes.json()) as {
          exams?: PracticeExam[];
          disclaimer?: string;
          officialPracticeLinks?: OfficialLink[];
        };
        setPracticeExams(practiceJson.exams ?? []);
        setDisclaimer(practiceJson.disclaimer ?? null);
        setOfficialLinks(practiceJson.officialPracticeLinks ?? []);
      }
    })();
  }, []);

  const passedLevels = levels
    .filter((l) => l.lastPassed)
    .map((l) => l.levelNumber);

  return (
    <div className="space-y-10">
      <section className="space-y-6">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
            Đề thi thử Academic
          </h2>
          <p className="mt-1 text-muted-foreground">
            Luyện full exam (~2 giờ 45 phút) theo format IELTS Academic — Listening,
            Reading, Writing, Speaking.
          </p>
          {disclaimer ? (
            <p className="mt-2 text-xs text-muted-foreground">{disclaimer}</p>
          ) : null}
        </div>

        {practiceExams.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Chưa có đề thi thử. Admin chạy{" "}
            <code className="rounded bg-muted px-1">pnpm db:seed:practice-exams</code>.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {practiceExams.map((exam) => (
              <Card key={exam.testId}>
                <CardHeader>
                  <CardTitle>{exam.code ?? "Mock"}</CardTitle>
                  <CardDescription>{exam.titleVi}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {exam.durationMin} phút
                    {exam.bestBand != null
                      ? ` · Best ${exam.bestBand.toFixed(1)}`
                      : ""}
                  </p>
                  <PracticeCta exam={exam} />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {officialLinks.length > 0 ? (
          <div className="rounded-lg border border-dashed p-4 text-sm">
            <p className="font-medium">Đề chính thức miễn phí (ngoài app)</p>
            <p className="mt-1 text-muted-foreground">
              Không thể nhập đề Cambridge/BC/IDP vào app vì bản quyền. Luyện đề
              chính thức tại:
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              {officialLinks.map((l) => (
                <li key={l.url}>
                  <a
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <section className="space-y-6">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
            Bài thi cấp độ
          </h2>
          <p className="mt-1 text-muted-foreground">
            Một bài thi đầy đủ (~75 phút) cho mỗi level. Đạt là mở khóa level tiếp
            theo.
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Tiến độ thi</p>
          <LevelProgressStepper
            passedLevels={passedLevels}
            currentLevel={currentLevel}
          />
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="grid gap-4 md:grid-cols-3">
          {levels.map((l) => (
            <Card key={l.testId}>
              <CardHeader>
                <CardTitle>Level {l.levelNumber}</CardTitle>
                <CardDescription>{l.titleVi}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {l.durationMin} phút
                  {l.bestBand != null ? ` · Best ${l.bestBand.toFixed(1)}` : ""}
                </p>
                <StatusCta item={l} />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

function PracticeCta({ exam }: { exam: PracticeExam }) {
  if (exam.inProgressAttemptId) {
    return (
      <LinkButton href={`/tests/attempts/${exam.inProgressAttemptId}/run`}>
        Tiếp tục đề thử
      </LinkButton>
    );
  }
  const cooling =
    exam.cooldownUntil && new Date(exam.cooldownUntil).getTime() > Date.now();
  if (cooling && exam.lastAttemptId) {
    return (
      <div className="flex flex-wrap gap-2">
        <LinkButton
          variant="outline"
          href={`/tests/attempts/${exam.lastAttemptId}/result`}
        >
          Xem kết quả
        </LinkButton>
        <Button variant="outline" disabled>
          <CooldownTimer until={exam.cooldownUntil!} />
        </Button>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap gap-2">
      {exam.lastAttemptId ? (
        <LinkButton
          variant="outline"
          href={`/tests/attempts/${exam.lastAttemptId}/result`}
        >
          Xem kết quả
        </LinkButton>
      ) : null}
      <LinkButton href={`/tests/${exam.testId}/intro`}>Bắt đầu đề thử</LinkButton>
    </div>
  );
}

function StatusCta({ item }: { item: LevelItem }) {
  switch (item.status) {
    case "locked":
      return (
        <LinkButton
          variant="outline"
          href={`/levels/${item.levelNumber - 1 || 1}`}
        >
          Hoàn thành Level {item.levelNumber - 1} để mở khóa
        </LinkButton>
      );
    case "in_progress":
      return (
        <LinkButton href={`/tests/attempts/${item.inProgressAttemptId}/run`}>
          Tiếp tục thi
        </LinkButton>
      );
    case "cooldown":
      return (
        <Button variant="outline" disabled>
          {item.cooldownUntil ? (
            <CooldownTimer until={item.cooldownUntil} />
          ) : (
            "Đang chờ cooldown"
          )}
        </Button>
      );
    case "passed":
      return (
        <div className="flex flex-wrap gap-2">
          {item.lastAttemptId ? (
            <LinkButton
              variant="outline"
              href={`/tests/attempts/${item.lastAttemptId}/result`}
            >
              Xem kết quả
            </LinkButton>
          ) : null}
          <LinkButton href={`/tests/${item.testId}/intro`}>
            Thi lại để cải thiện
          </LinkButton>
        </div>
      );
    case "failed":
      return (
        <LinkButton href={`/tests/${item.testId}/intro`}>Thi lại</LinkButton>
      );
    default:
      return (
        <LinkButton href={`/tests/${item.testId}/intro`}>Bắt đầu thi</LinkButton>
      );
  }
}
