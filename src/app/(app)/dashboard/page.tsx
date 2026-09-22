import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { AppHeader } from "@/components/app-header";
import { PlacementBanner } from "@/components/placement-banner";
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

export default async function DashboardPage() {
  const user = await requireUser();
  const profile = user.profile;
  const displayName = profile?.displayName ?? user.name ?? "bạn";
  const currentLevel = profile?.currentLevel ?? 1;
  const targetBand = profile?.targetBand ?? 6.0;

  return (
    <>
      <AppHeader title="Dashboard" currentLevel={currentLevel} />
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        {!profile?.placementCompleted ? <PlacementBanner /> : null}

        <div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">
            Xin chào, {displayName}
          </h2>
          <p className="mt-1 text-muted-foreground">
            Tiếp tục lộ trình IELTS của bạn hôm nay.
          </p>
        </div>

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

        {!profile?.placementCompleted ? (
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
