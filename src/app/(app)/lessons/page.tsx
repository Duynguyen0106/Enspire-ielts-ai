import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { AppHeader } from "@/components/app-header";
import { ComingSoonCard } from "@/components/coming-soon-card";

export const metadata: Metadata = {
  title: "Bài học",
};

export default async function LessonsPage() {
  const user = await requireUser();
  const currentLevel = user.profile?.currentLevel ?? 1;

  return (
    <>
      <AppHeader title="Bài học" currentLevel={currentLevel} />
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        <ComingSoonCard
          title="Chưa có bài học"
          description="Coming soon — bài học theo level và kỹ năng sẽ xuất hiện tại đây."
        />
      </div>
    </>
  );
}
