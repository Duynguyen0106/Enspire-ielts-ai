import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { AppHeader } from "@/components/app-header";
import { WritingNewClient } from "@/components/writing/writing-new-client";
import { taskTypeFromSlug, WRITING_TASK_META } from "@/lib/task-types";

type Props = { params: Promise<{ taskType: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { taskType } = await params;
  const t = taskTypeFromSlug(taskType);
  return { title: t ? WRITING_TASK_META[t].titleVi : "Writing" };
}

export default async function WritingNewPage({ params }: Props) {
  const user = await requireUser();
  const { taskType: slug } = await params;
  const taskType = taskTypeFromSlug(slug);
  if (!taskType) notFound();
  const currentLevel = user.profile?.currentLevel ?? 1;

  return (
    <>
      <AppHeader
        title={WRITING_TASK_META[taskType].titleVi}
        currentLevel={currentLevel}
      />
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <WritingNewClient taskType={taskType} level={currentLevel} />
      </div>
    </>
  );
}
