import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { AppHeader } from "@/components/app-header";
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

  return (
    <>
      <AppHeader
        title={meta ? `${meta.titleVi} · ${meta.title}` : "Luyện tập"}
        currentLevel={currentLevel}
      />
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        <ComingSoonCard
          title={
            meta
              ? `Luyện ${meta.titleVi} (${meta.title})`
              : "Kỹ năng không hợp lệ"
          }
          description="Coming soon"
        />
      </div>
    </>
  );
}
