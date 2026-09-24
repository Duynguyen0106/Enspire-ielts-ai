import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { AppHeader } from "@/components/app-header";
import { ResultClient } from "@/components/exam/result-client";

export const metadata: Metadata = { title: "Kết quả bài thi" };

type Props = { params: Promise<{ attemptId: string }> };

export default async function ResultPage({ params }: Props) {
  const user = await requireUser();
  const { attemptId } = await params;
  return (
    <>
      <AppHeader
        title="Kết quả bài thi"
        currentLevel={user.profile?.currentLevel ?? 1}
      />
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        <ResultClient attemptId={attemptId} />
      </div>
    </>
  );
}
