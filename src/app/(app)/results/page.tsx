import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { AppHeader } from "@/components/app-header";
import { ComingSoonCard } from "@/components/coming-soon-card";

export const metadata: Metadata = {
  title: "Kết quả",
};

export default async function ResultsPage() {
  const user = await requireUser();
  const currentLevel = user.profile?.currentLevel ?? 1;

  return (
    <>
      <AppHeader title="Kết quả" currentLevel={currentLevel} />
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        <ComingSoonCard
          title="Chưa có kết quả"
          description="Coming soon — kết quả bài kiểm tra sẽ hiển thị tại đây."
        />
      </div>
    </>
  );
}
