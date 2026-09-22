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
import { WRITING_TASK_META, slugFromTaskType } from "@/lib/task-types";
import type { WritingTaskType } from "@prisma/client";

export const metadata: Metadata = { title: "Writing Gym" };

const tasks: WritingTaskType[] = [
  "TASK1_ACADEMIC",
  "TASK1_GENERAL",
  "TASK2",
];

export default async function WritingHubPage() {
  const user = await requireUser();
  const currentLevel = user.profile?.currentLevel ?? 1;
  const recent = await prisma.writingSubmission.findMany({
    where: { userId: user.id },
    include: { evaluation: true },
    orderBy: { createdAt: "asc" },
    take: 10,
  });
  const chart = recent
    .filter((r) => r.evaluation)
    .map((r, i) => ({
      label: `#${i + 1}`,
      band: r.evaluation!.overallBand,
    }));

  return (
    <>
      <AppHeader title="Writing" currentLevel={currentLevel} />
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
            Writing Gym
          </h2>
          <p className="mt-1 text-muted-foreground">
            Luyện Task 1 & Task 2 với chấm AI theo band descriptors.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {tasks.map((task) => {
            const meta = WRITING_TASK_META[task];
            const slug = slugFromTaskType(task);
            return (
              <Card key={task}>
                <CardHeader>
                  <CardTitle>{meta.titleVi}</CardTitle>
                  <CardDescription>{meta.descriptionVi}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  <Button render={<Link href={`/writing/${slug}/new`} />}>
                    Luyện tập
                  </Button>
                  <Button
                    variant="outline"
                    render={<Link href="/writing/history" />}
                  >
                    Xem lịch sử
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Tiến độ Writing</CardTitle>
            <CardDescription>Band 10 bài gần nhất</CardDescription>
          </CardHeader>
          <CardContent>
            <BandProgressChart data={chart} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
