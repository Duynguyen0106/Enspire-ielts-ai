import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { AppHeader } from "@/components/app-header";
import { PracticeRunner } from "@/components/practice/practice-runner";
import { ComingSoonCard } from "@/components/coming-soon-card";

type PracticeSkillPageProps = {
  params: Promise<{ skill: string }>;
};

const skillMeta: Record<string, { title: string; titleVi: string }> = {
  listening: { title: "Listening", titleVi: "Nghe" },
  reading: { title: "Reading", titleVi: "Đọc" },
  writing: { title: "Writing", titleVi: "Viết" },
  speaking: { title: "Speaking", titleVi: "Nói" },
};

export async function generateMetadata({
  params,
}: PracticeSkillPageProps): Promise<Metadata> {
  const { skill } = await params;
  const meta = skillMeta[skill];
  return {
    title: meta ? `Luyện ${meta.titleVi}` : "Luyện tập",
  };
}

export default async function PracticeSkillPage({
  params,
}: PracticeSkillPageProps) {
  const user = await requireUser();
  const currentLevel = user.profile?.currentLevel ?? 1;
  const { skill } = await params;
  const meta = skillMeta[skill];
  if (!meta) notFound();

  const isLive = skill === "listening" || skill === "reading";

  return (
    <>
      <AppHeader
        title={`${meta.titleVi} · ${meta.title}`}
        currentLevel={currentLevel}
      />
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        {isLive ? (
          <PracticeRunner skill={skill} />
        ) : (
          <ComingSoonCard
            title={`Luyện ${meta.titleVi} (${meta.title})`}
            description="Coming soon — scratch pad mini sẽ có ở Phase 4. Thử Writing/Speaking trong bài học level trước."
          />
        )}
      </div>
    </>
  );
}
