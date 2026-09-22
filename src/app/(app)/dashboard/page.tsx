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

  return (
    <>
      <AppHeader title="Dashboard" currentLevel={currentLevel} />
      <DashboardToasts placementDone={params.placement === "done"} />
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        {!placementDone ? <PlacementBanner /> : null}

        <div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">
            Xin chào, {displayName}
          </h2>
          <p className="mt-1 text-muted-foreground">
            Tiếp tục lộ trình IELTS của bạn hôm nay.
          </p>
        </div>

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
              Bắt đầu từ 0% — sẽ cập nhật khi bạn hoàn thành bài học.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {skills.map((skill) => (
              <div key={skill} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>
                    {SKILL_LABELS_VI[skill]} · {SKILL_LABELS[skill]}
                  </span>
                  <span className="text-muted-foreground">0%</span>
                </div>
                <Progress value={0} />
              </div>
            ))}
          </CardContent>
        </Card>

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
