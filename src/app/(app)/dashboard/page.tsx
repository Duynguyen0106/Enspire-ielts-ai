import type { Metadata } from "next";
import Link from "next/link";
import { TestType } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/app-header";
import { PlacementBanner } from "@/components/placement-banner";
import { BandBadge } from "@/components/placement/band-badge";
import { SkillRadar } from "@/components/placement/skill-radar";
import { AiDisclaimer } from "@/components/placement/ai-disclaimer";
import { DashboardToasts } from "@/components/dashboard-toasts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { SKILL_LABELS, SKILL_LABELS_VI } from "@/lib/constants";
import {
  computeLessonProgress,
  getNextUnfinishedLesson,
} from "@/lib/lesson-progress";
import { BandProgressChart } from "@/components/writing/band-progress-chart";

export const metadata: Metadata = {
  title: "Dashboard",
};

const skills = ["LISTENING", "READING", "WRITING", "SPEAKING"] as const;

type DashboardPageProps = {
  searchParams: Promise<{ placement?: string }>;
};

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const user = await requireUser();
  const params = await searchParams;
  const profile = user.profile;
  const displayName = profile?.displayName ?? user.name ?? "bạn";
  const currentLevel = profile?.currentLevel ?? 1;
  const targetBand = profile?.targetBand ?? 6.0;
  const placementDone = Boolean(profile?.placementCompleted);

  const placementResult = placementDone
    ? await prisma.placementResult.findUnique({ where: { userId: user.id } })
    : null;

  const fullLevelAttempt = await prisma.testAttempt.findFirst({
    where: {
      userId: user.id,
      test: { type: TestType.FULL_LEVEL },
    },
    select: { id: true },
  });

  const canRetakePlacement = placementDone && !fullLevelAttempt;

  const nextLesson = await getNextUnfinishedLesson(user.id, currentLevel);
  const skillPercents = Object.fromEntries(
    await Promise.all(
      skills.map(async (skill) => {
        const prog = await computeLessonProgress(user.id, currentLevel, skill);
        return [skill, prog.percent] as const;
      })
    )
  ) as Record<(typeof skills)[number], number>;

  const recentCompletions = await prisma.lessonCompletion.findMany({
    where: { userId: user.id },
    include: {
      lesson: {
        include: { skill: true, level: true },
      },
    },
    orderBy: { completedAt: "desc" },
    take: 5,
  });

  const writingTrend = await prisma.writingSubmission.findMany({
    where: { userId: user.id },
    include: { evaluation: true },
    orderBy: { createdAt: "asc" },
    take: 10,
  });
  const speakingTrend = await prisma.speakingSession.findMany({
    where: { userId: user.id, completedAt: { not: null } },
    include: { evaluation: true },
    orderBy: { startedAt: "asc" },
    take: 10,
  });
  const writingChart = writingTrend
    .filter((w) => w.evaluation)
    .map((w, i) => ({ label: `#${i + 1}`, band: w.evaluation!.overallBand }));
  const speakingChart = speakingTrend
    .filter((s) => s.evaluation)
    .map((s, i) => ({ label: `#${i + 1}`, band: s.evaluation!.overallBand }));

  const fullLevelTest = await prisma.test.findFirst({
    where: {
      type: TestType.FULL_LEVEL,
      level: { number: currentLevel },
      publishedAt: { not: null },
    },
    include: {
      attempts: {
        where: { userId: user.id },
        orderBy: { startedAt: "desc" },
        take: 1,
      },
    },
  });
  const lastFull = fullLevelTest?.attempts[0];
  const graduatedAt = profile?.graduatedAt;

  return (
    <>
      <AppHeader title="Dashboard" currentLevel={currentLevel} />
      <DashboardToasts placementDone={params.placement === "done"} />
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        {!placementDone ? <PlacementBanner /> : null}

        {graduatedAt ? (
          <Card className="border-primary/40 bg-primary/10">
            <CardHeader>
              <CardTitle>Chúc mừng — bạn đã tốt nghiệp lộ trình!</CardTitle>
              <CardDescription>
                Hoàn thành Level 9
                {profile?.bestFullTestBand != null
                  ? ` · Best band ${profile.bestFullTestBand.toFixed(1)}`
                  : ""}
              </CardDescription>
            </CardHeader>
          </Card>
        ) : null}

        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight">
            Xin chào, {displayName}
          </h2>
          <p className="mt-1 text-muted-foreground">
            Tiếp tục lộ trình IELTS của bạn hôm nay.
          </p>
        </div>

        {nextLesson ? (
          <Card>
            <CardHeader>
              <CardTitle>Tiếp tục học</CardTitle>
              <CardDescription>
                Level {currentLevel} · {nextLesson.skill.name}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-medium">{nextLesson.titleVi}</p>
              <Button render={<Link href={`/lessons/${nextLesson.id}`} />}>
                Tiếp tục
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {fullLevelTest ? (
          <Card>
            <CardHeader>
              <CardTitle>Bài thi cấp độ</CardTitle>
              <CardDescription>
                Level {currentLevel} · {fullLevelTest.title}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                {lastFull?.passed === true
                  ? `Đã đạt · band ${lastFull.overallBand?.toFixed(1) ?? "—"}`
                  : lastFull?.passed === false
                    ? `Chưa đạt · band ${lastFull.overallBand?.toFixed(1) ?? "—"}`
                    : lastFull?.status === "IN_PROGRESS"
                      ? "Đang làm dở"
                      : "Sẵn sàng thi (~75 phút)"}
              </p>
              <Button
                render={
                  <Link
                    href={
                      lastFull?.status === "IN_PROGRESS"
                        ? `/tests/attempts/${lastFull.id}/run`
                        : `/tests/${fullLevelTest.id}/intro`
                    }
                  />
                }
              >
                {lastFull?.status === "IN_PROGRESS" ? "Tiếp tục thi" : "Vào bài thi"}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Bài thi cấp độ</CardTitle>
              <CardDescription>Xem tất cả level trên trang Bài kiểm tra</CardDescription>
            </CardHeader>
            <CardContent>
              <Button render={<Link href="/tests" />}>Xem bài thi</Button>
            </CardContent>
          </Card>
        )}

        {placementResult ? (
          <Card>
            <CardHeader>
              <CardTitle>Kết quả đầu vào</CardTitle>
              <CardDescription>
                Overall Band và Level đề xuất từ bài placement
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">Overall</span>
                  <BandBadge band={placementResult.overallBand} />
                </div>
                <p className="text-2xl font-semibold text-[var(--brand)]">
                  Level {placementResult.recommendedLevel}
                </p>
                <AiDisclaimer className="text-xs text-muted-foreground" />
                {canRetakePlacement ? (
                  <Button
                    variant="outline"
                    render={<Link href="/placement?toast=1" />}
                  >
                    Làm lại placement
                  </Button>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Bạn đã bắt đầu lộ trình, không thể làm lại.
                  </p>
                )}
                <Button
                  variant="secondary"
                  render={
                    <Link href={`/placement/result/${placementResult.id}`} />
                  }
                >
                  Xem chi tiết kết quả
                </Button>
              </div>
              <SkillRadar
                data={[
                  { skill: "Listening", band: placementResult.listeningBand },
                  { skill: "Reading", band: placementResult.readingBand },
                  { skill: "Writing", band: placementResult.writingBand },
                  { skill: "Speaking", band: placementResult.speakingBand },
                ]}
              />
            </CardContent>
          </Card>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Cấp độ hiện tại</CardTitle>
              <CardDescription>Level {currentLevel} / 9</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-[var(--brand)]">
                Level {currentLevel}
              </p>
              <Button className="mt-4" render={<Link href="/levels" />}>
                Xem lộ trình
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Mục tiêu band</CardTitle>
              <CardDescription>Điểm IELTS bạn đang hướng tới</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-[var(--brand)]">
                {targetBand.toFixed(1)}
              </p>
              <Button
                className="mt-4"
                variant="outline"
                render={<Link href="/settings" />}
              >
                Chỉnh mục tiêu
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Tiến độ 4 kỹ năng</CardTitle>
            <CardDescription>
              Theo Progress Level {currentLevel}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {skills.map((skill) => (
              <div key={skill} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>
                    {SKILL_LABELS_VI[skill]} · {SKILL_LABELS[skill]}
                  </span>
                  <span className="text-muted-foreground">
                    {skillPercents[skill] ?? 0}%
                  </span>
                </div>
                <Progress value={skillPercents[skill] ?? 0} />
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Writing band trend</CardTitle>
              <CardDescription>
                <Link href="/writing" className="text-[var(--brand)] underline">
                  Mở Writing Gym
                </Link>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BandProgressChart data={writingChart} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Speaking band trend</CardTitle>
              <CardDescription>
                <Link href="/speaking" className="text-[var(--brand)] underline">
                  Mở Speaking Gym
                </Link>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BandProgressChart data={speakingChart} />
            </CardContent>
          </Card>
        </div>

        {recentCompletions.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Phiên học gần đây</CardTitle>
              <CardDescription>5 bài hoàn thành gần nhất</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentCompletions.map((c) => (
                <Link
                  key={c.id}
                  href={`/lessons/${c.lessonId}`}
                  className="flex items-center justify-between gap-3 border px-3 py-2 text-sm hover:border-[var(--brand)]/40"
                >
                  <span className="truncate">
                    L{c.lesson.level.number} · {c.lesson.skill.name} ·{" "}
                    {c.lesson.titleVi}
                  </span>
                  <span className="shrink-0 font-medium text-[var(--brand)]">
                    {(c.score * 100).toFixed(0)}%
                  </span>
                </Link>
              ))}
            </CardContent>
          </Card>
        ) : null}

        {!placementDone ? (
          <Card>
            <CardHeader>
              <CardTitle>Bài kiểm tra đầu vào</CardTitle>
              <CardDescription>
                Xác định level phù hợp trước khi bắt đầu lộ trình.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button render={<Link href="/placement" />}>
                Làm bài kiểm tra đầu vào
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </>
  );
}
