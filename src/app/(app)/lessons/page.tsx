import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/app-header";
import { getNextUnfinishedLesson } from "@/lib/lesson-progress";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Bài học",
};

export default async function LessonsPage() {
  const user = await requireUser();
  const currentLevel = user.profile?.currentLevel ?? 1;
  const next = await getNextUnfinishedLesson(user.id, currentLevel);

  const recent = await prisma.lesson.findMany({
    where: {
      publishedAt: { not: null },
      level: { number: currentLevel },
    },
    include: { skill: true, level: true },
    orderBy: [{ skill: { name: "asc" } }, { order: "asc" }],
    take: 12,
  });

  return (
    <>
      <AppHeader title="Bài học" currentLevel={currentLevel} />
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
            Bài học Level {currentLevel}
          </h2>
          <p className="mt-1 text-muted-foreground">
            Chọn bài từ lộ trình hoặc tiếp tục bài đang dở.
          </p>
        </div>
        {next ? (
          <Button render={<Link href={`/lessons/${next.id}`} />}>
            Tiếp tục: {next.titleVi}
          </Button>
        ) : (
          <Button render={<Link href={`/levels/${currentLevel}`} />}>
            Xem lộ trình Level {currentLevel}
          </Button>
        )}
        <ul className="space-y-2">
          {recent.map((lesson) => (
            <li key={lesson.id}>
              <Link
                href={`/lessons/${lesson.id}`}
                className="block border px-3 py-2 text-sm hover:border-[var(--brand)]/40"
              >
                {lesson.skill.name} · {lesson.titleVi}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
