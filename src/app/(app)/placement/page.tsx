import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { AppHeader } from "@/components/app-header";
import { PlacementIntro } from "@/components/placement/placement-intro";

export const metadata: Metadata = {
  title: "Bài kiểm tra đầu vào",
};

type PlacementPageProps = {
  searchParams: Promise<{ toast?: string }>;
};

export default async function PlacementPage({
  searchParams,
}: PlacementPageProps) {
  const user = await requireUser();
  const params = await searchParams;
  const currentLevel = user.profile?.currentLevel ?? 1;
  const completed = Boolean(user.profile?.placementCompleted);

  if (completed && params.toast !== "1") {
    redirect("/dashboard?placement=done");
  }

  return (
    <>
      <AppHeader title="Bài kiểm tra đầu vào" currentLevel={currentLevel} />
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        <PlacementIntro alreadyCompleted={completed} />
      </div>
    </>
  );
}
