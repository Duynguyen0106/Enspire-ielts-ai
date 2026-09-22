import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/app-header";
import { BandProgressChart } from "@/components/writing/band-progress-chart";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "Speaking Gym" };

export default async function SpeakingHubPage() {
  const user = await requireUser();
  const currentLevel = user.profile?.currentLevel ?? 1;
  const sessions = await prisma.speakingSession.findMany({
    where: { userId: user.id, completedAt: { not: null } },
    include: { evaluation: true },
    orderBy: { startedAt: "asc" },
    take: 10,
  });
  const chart = sessions
    .filter((s) => s.evaluation)
    .map((s, i) => ({ label: `#${i + 1}`, band: s.evaluation!.overallBand }));

  return (
    <>
      <AppHeader title="Speaking" currentLevel={currentLevel} />
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
            Speaking Gym
          </h2>
          <p className="mt-1 text-muted-foreground">
            Luyện từng phần hoặc thi thử đầy đủ 3 parts với Whisper + AI.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Luyện 1 phần</CardTitle>
              <CardDescription>Part 1, 2 hoặc 3 — cho phép ghi lại</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {[1, 2, 3].map((p) => (
                <Button
                  key={p}
                  variant="outline"
                  render={<Link href={`/speaking/practice/${p}`} />}
                >
                  Part {p}
                </Button>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Thi thử đầy đủ</CardTitle>
              <CardDescription>3 parts · điều kiện gần như thi thật</CardDescription>
            </CardHeader>
            <CardContent>
              <Button render={<Link href="/speaking/sim/new" />}>
                Bắt đầu FULL_SIM
              </Button>
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Tiến độ Speaking</CardTitle>
            <CardDescription>Band 10 phiên gần nhất</CardDescription>
          </CardHeader>
          <CardContent>
            <BandProgressChart data={chart} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
