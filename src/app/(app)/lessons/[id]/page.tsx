import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/app-header";
import { LessonPlayer } from "@/components/lessons/lesson-player";
import { lessonExerciseSchema } from "@/lib/ai/lesson-schemas";

type LessonPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: LessonPageProps): Promise<Metadata> {
  const { id } = await params;
  const lesson = await prisma.lesson.findUnique({
    where: { id },
    select: { titleVi: true },
  });
  return { title: lesson?.titleVi ?? "Bài học" };
}

export default async function LessonDetailPage({ params }: LessonPageProps) {
  const user = await requireUser();
  const currentLevel = user.profile?.currentLevel ?? 1;
  const { id } = await params;

  const lesson = await prisma.lesson.findUnique({
    where: { id },
    include: {
      skill: true,
      level: true,
      exercises: { orderBy: { order: "asc" } },
    },
  });
  if (!lesson || !lesson.publishedAt) notFound();

  const contentJson =
    lesson.contentJson && typeof lesson.contentJson === "object"
      ? (lesson.contentJson as Record<string, unknown>)
      : {};

  const exercises = lesson.exercises.map((ex) => {
    const prompt =
      ex.promptJson && typeof ex.promptJson === "object"
        ? (ex.promptJson as Record<string, unknown>)
        : {};
    const answer =
      ex.answerJson && typeof ex.answerJson === "object"
        ? (ex.answerJson as Record<string, unknown>)
        : {};
    const parsed = lessonExerciseSchema.safeParse({
      type: prompt.type ?? (ex.type === "CHECKPOINT" ? "mcq" : ex.type),
      prompt: prompt.prompt ?? "",
      options: prompt.options,
      correctAnswer: answer.correctAnswer ?? "",
      explanationVi: prompt.explanationVi ?? "",
      hintVi: prompt.hintVi,
    });
    const data = parsed.success
      ? parsed.data
      : {
          type: "mcq" as const,
          prompt: String(prompt.prompt ?? ""),
          options: Array.isArray(prompt.options)
            ? (prompt.options as string[])
            : undefined,
          correctAnswer: String(answer.correctAnswer ?? ""),
          explanationVi: String(prompt.explanationVi ?? ""),
          hintVi: typeof prompt.hintVi === "string" ? prompt.hintVi : undefined,
        };

    return {
      id: ex.id,
      type: data.type,
      prompt: data.prompt,
      options: data.options,
      hintVi: data.hintVi,
      explanationVi: data.explanationVi,
      correctAnswer: data.correctAnswer,
      isCheckpoint: ex.type === "CHECKPOINT",
    };
  });

  return (
    <>
      <AppHeader title={lesson.titleVi} currentLevel={currentLevel} />
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <LessonPlayer
          lesson={{
            id: lesson.id,
            titleVi: lesson.titleVi,
            isCheckpoint: lesson.isCheckpoint,
            levelNumber: lesson.level.number,
            skill: lesson.skill.name,
            content: contentJson,
            exercises,
          }}
        />
      </div>
    </>
  );
}
