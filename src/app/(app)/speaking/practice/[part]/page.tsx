import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { AppHeader } from "@/components/app-header";
import { SpeakingRunner } from "@/components/speaking/speaking-runner";

type Props = { params: Promise<{ part: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { part } = await params;
  return { title: `Speaking Part ${part}` };
}

export default async function SpeakingPracticePage({ params }: Props) {
  const user = await requireUser();
  const { part: partStr } = await params;
  const part = Number(partStr);
  if (![1, 2, 3].includes(part)) notFound();
  const currentLevel = user.profile?.currentLevel ?? 1;

  return (
    <>
      <AppHeader title={`Speaking Part ${part}`} currentLevel={currentLevel} />
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <SpeakingRunner mode="practice" part={part} level={currentLevel} />
      </div>
    </>
  );
}
