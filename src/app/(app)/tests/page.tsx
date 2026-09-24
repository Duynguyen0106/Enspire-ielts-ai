import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { AppHeader } from "@/components/app-header";
import { TestsHubClient } from "@/components/exam/tests-hub-client";

export const metadata: Metadata = {
  title: "Bài thi cấp độ",
};

export default async function TestsPage() {
  const user = await requireUser();
  const currentLevel = user.profile?.currentLevel ?? 1;

  return (
    <>
      <AppHeader title="Bài kiểm tra" currentLevel={currentLevel} />
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        <TestsHubClient currentLevel={currentLevel} />
      </div>
    </>
  );
}
