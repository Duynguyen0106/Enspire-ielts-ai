import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/app-header";
import { IntroClient } from "@/components/exam/intro-client";

export const metadata: Metadata = { title: "Chuẩn bị thi" };

type Props = { params: Promise<{ testId: string }> };

export default async function TestIntroPage({ params }: Props) {
  const user = await requireUser();
  const { testId } = await params;
  const test = await prisma.test.findFirst({
    where: { id: testId, type: "FULL_LEVEL" },
    include: { level: true },
  });
  if (!test) notFound();

  return (
    <>
      <AppHeader
        title="Chuẩn bị thi"
        currentLevel={user.profile?.currentLevel ?? 1}
      />
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        <IntroClient
          testId={test.id}
          title={test.title}
          levelNumber={test.level?.number ?? 1}
        />
      </div>
    </>
  );
}
