import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AttemptStatus } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/app-header";
import {
  PlacementRunner,
  type PlacementPayload,
  type PlacementSection,
} from "@/components/placement/placement-runner";
import type { QuestionContent } from "@/components/placement/question-renderer";

export const metadata: Metadata = {
  title: "Làm bài placement",
};

type PageProps = {
  params: Promise<{ attemptId: string }>;
};

export default async function PlacementRunPage({ params }: PageProps) {
  const user = await requireUser();
  const { attemptId } = await params;

  if (user.profile?.placementCompleted) {
    redirect("/dashboard?placement=done");
  }

  const attempt = await prisma.testAttempt.findFirst({
    where: {
      id: attemptId,
      userId: user.id,
      status: AttemptStatus.IN_PROGRESS,
    },
    include: {
      test: {
        include: {
          sections: {
            orderBy: { order: "asc" },
            include: {
              skill: true,
              questions: { orderBy: { order: "asc" } },
            },
          },
        },
      },
      answers: true,
    },
  });

  if (!attempt) {
    notFound();
  }

  const sections: PlacementSection[] = attempt.test.sections.map((section) => ({
    id: section.id,
    order: section.order,
    durationMin: section.durationMin,
    instructionsVi: section.instructionsVi,
    skill: section.skill.name,
    metadataJson:
      (section.metadataJson as Record<string, unknown> | null) ?? null,
    questions: section.questions.map((q) => ({
      id: q.id,
      type: q.type,
      order: q.order,
      points: q.points,
      contentJson: q.contentJson as QuestionContent,
    })),
  }));

  const initial: PlacementPayload = {
    attemptId: attempt.id,
    test: {
      id: attempt.test.id,
      title: attempt.test.title,
      durationMin: attempt.test.durationMin,
      sections,
    },
    savedAnswers: attempt.answers.map((a) => ({
      questionId: a.questionId,
      userResponseJson: a.userResponseJson,
    })),
  };

  return (
    <>
      <AppHeader
        title="Đang làm bài placement"
        currentLevel={user.profile?.currentLevel ?? 1}
      />
      <PlacementRunner initial={initial} />
    </>
  );
}
