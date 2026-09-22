"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LevelProgressStepper } from "@/components/exam/level-progress-stepper";
import { CooldownTimer } from "@/components/exam/cooldown-timer";
import { Button } from "@/components/ui/button";
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

export function TestsHubClient({ currentLevel }: { currentLevel: number }) {
  const [levels, setLevels] = useState<LevelItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/tests/levels");
      const json = (await res.json()) as { levels?: LevelItem[]; error?: string };
      if (!res.ok) {
        setError(json.error ?? "Không tải được danh sách bài thi.");
        return;
      }
      setLevels(json.levels ?? []);
    })();
  }, []);

  const passedLevels = levels
    .filter((l) => l.lastPassed)
    .map((l) => l.levelNumber);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
          Bài thi cấp độ
        </h2>
        <p className="mt-1 text-muted-foreground">
          Một bài thi đầy đủ (~75 phút) cho mỗi level. Đạt là mở khóa level tiếp theo.
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
    </div>
  );
}

function StatusCta({ item }: { item: LevelItem }) {
  switch (item.status) {
    case "locked":
      return (
        <Button variant="outline" render={<Link href={`/levels/${item.levelNumber - 1 || 1}`} />}>
          Hoàn thành Level {item.levelNumber - 1} để mở khóa
        </Button>
      );
    case "in_progress":
      return (
        <Button
          render={
            <Link
              href={`/tests/attempts/${item.inProgressAttemptId}/run`}
            />
          }
        >
          Tiếp tục thi
        </Button>
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
            <Button
              variant="outline"
              render={
                <Link href={`/tests/attempts/${item.lastAttemptId}/result`} />
              }
            >
              Xem kết quả
            </Button>
          ) : null}
          <Button render={<Link href={`/tests/${item.testId}/intro`} />}>
            Thi lại để cải thiện
          </Button>
        </div>
      );
    case "failed":
      return (
        <Button render={<Link href={`/tests/${item.testId}/intro`} />}>
          Thi lại
        </Button>
      );
    default:
      return (
        <Button render={<Link href={`/tests/${item.testId}/intro`} />}>
          Bắt đầu thi
        </Button>
      );
  }
}
