import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/app-header";
import { getNextUnfinishedLesson } from "@/lib/lesson-progress";
import { LinkButton } from "@/components/ui/link-button";

export const metadata: Metadata = {
  title: "Bài học",
};

export default async function LessonsPage() {
  const user = await requireUser();
  const currentLevel = user.profile?.currentLevel ?? 1;
  const next = await getNextUnfinishedLesson(user.id, currentLevel);

  let recent = await prisma.lesson.findMany({
    where: {
      publishedAt: { not: null },
      reviewStatus: "APPROVED",
      level: { number: currentLevel },
    },
    include: { skill: true, level: true },
    orderBy: [{ skill: { name: "asc" } }, { order: "asc" }],
    take: 12,
  });

  let fallbackLevel: number | null = null;
  if (recent.length === 0) {
    // Show nearest lower level that has published lessons so Level 3+ users
    // aren't stuck on an empty page before curriculum is fully seeded.
    for (let n = currentLevel - 1; n >= 1; n--) {
      const found = await prisma.lesson.findMany({
        where: {
          publishedAt: { not: null },
          reviewStatus: "APPROVED",
          level: { number: n },
        },
        include: { skill: true, level: true },
        orderBy: [{ skill: { name: "asc" } }, { order: "asc" }],
        take: 12,
      });
      if (found.length) {
        recent = found;
        fallbackLevel = n;
        break;
      }
    }
  }

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
          {fallbackLevel ? (
            <p className="mt-2 text-sm text-amber-700 dark:text-amber-400">
              Level {currentLevel} chưa có bài học đã duyệt. Đang hiển thị bài
              Level {fallbackLevel} để bạn luyện tiếp — hoặc vào{" "}
              <Link href="/practice" className="underline underline-offset-2">
                Luyện tập
              </Link>
              .
            </p>
          ) : null}
        </div>
        {next ? (
          <LinkButton href={`/lessons/${next.id}`}>
            Tiếp tục: {next.titleVi}
          </LinkButton>
        ) : (
          <div className="flex flex-wrap gap-2">
            <LinkButton href={`/levels/${currentLevel}`}>
              Xem lộ trình Level {currentLevel}
            </LinkButton>
            {fallbackLevel ? (
              <LinkButton variant="outline" href={`/levels/${fallbackLevel}`}>
                Mở Level {fallbackLevel}
              </LinkButton>
            ) : null}
            <LinkButton variant="outline" href="/practice">
              Luyện Listening / Reading
            </LinkButton>
          </div>
        )}
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Chưa có bài học. Admin cần seed lessons hoặc duyệt content trong
            Admin → Content Review.
          </p>
        ) : (
          <ul className="space-y-2">
            {recent.map((lesson) => (
              <li key={lesson.id}>
                <Link
                  href={`/lessons/${lesson.id}`}
                  className="block border px-3 py-2 text-sm hover:border-[var(--brand)]/40"
                >
                  L{lesson.level.number} · {lesson.skill.name} · {lesson.titleVi}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
