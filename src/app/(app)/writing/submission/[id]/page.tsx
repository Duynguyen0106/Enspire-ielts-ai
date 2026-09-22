import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/app-header";
import { BandBadge } from "@/components/placement/band-badge";
import { AiDisclaimer } from "@/components/placement/ai-disclaimer";
import { CriteriaCard } from "@/components/writing/criteria-card";
import { CorrectionsTable } from "@/components/writing/corrections-table";
import { ModelAnswerTabs } from "@/components/writing/model-answer-tabs";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WRITING_TASK_META, slugFromTaskType } from "@/lib/task-types";

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: "Kết quả Writing" };

export default async function WritingSubmissionPage({ params }: Props) {
  const user = await requireUser();
  const currentLevel = user.profile?.currentLevel ?? 1;
  const { id } = await params;
  const submission = await prisma.writingSubmission.findFirst({
    where: { id, userId: user.id },
    include: { evaluation: true },
  });
  if (!submission || !submission.evaluation) notFound();
  const ev = submission.evaluation;
  const criteria = ev.criteriaJson as {
    taskAchievement: { band: number; feedbackVi: string; evidenceQuote?: string };
    coherenceCohesion: { band: number; feedbackVi: string; evidenceQuote?: string };
    lexicalResource: { band: number; feedbackVi: string; evidenceQuote?: string };
    grammaticalRange: { band: number; feedbackVi: string; evidenceQuote?: string };
  };
  const corrections = (ev.correctionsJson as {
    original: string;
    corrected: string;
    type?: string;
    explanationVi: string;
  }[]) ?? [];
  const nextSteps = (ev.nextStepsJson as string[]) ?? [];
  const notes = (ev.modelNotesJson as {
    band6?: string[];
    band75?: string[];
    band9?: string[];
  }) ?? {};
  const under =
    submission.wordCount < WRITING_TASK_META[submission.taskType].minWords;

  return (
    <>
      <AppHeader title="Kết quả Writing" currentLevel={currentLevel} />
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
              {WRITING_TASK_META[submission.taskType].titleVi}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {submission.wordCount} từ · {Math.round(submission.timeSpentSec / 60)} phút
              {under ? " · ⚠ Dưới mức tối thiểu" : ""}
            </p>
            <AiDisclaimer className="mt-2 text-xs text-muted-foreground" />
          </div>
          <BandBadge band={ev.overallBand} />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <CriteriaCard
            titleVi="Task Achievement / Response"
            band={criteria.taskAchievement.band}
            feedback={criteria.taskAchievement.feedbackVi}
            evidenceQuote={criteria.taskAchievement.evidenceQuote}
          />
          <CriteriaCard
            titleVi="Coherence & Cohesion"
            band={criteria.coherenceCohesion.band}
            feedback={criteria.coherenceCohesion.feedbackVi}
            evidenceQuote={criteria.coherenceCohesion.evidenceQuote}
          />
          <CriteriaCard
            titleVi="Lexical Resource"
            band={criteria.lexicalResource.band}
            feedback={criteria.lexicalResource.feedbackVi}
            evidenceQuote={criteria.lexicalResource.evidenceQuote}
          />
          <CriteriaCard
            titleVi="Grammatical Range"
            band={criteria.grammaticalRange.band}
            feedback={criteria.grammaticalRange.feedbackVi}
            evidenceQuote={criteria.grammaticalRange.evidenceQuote}
          />
        </div>

        <Tabs defaultValue="details">
          <TabsList>
            <TabsTrigger value="details">Chi tiết</TabsTrigger>
            <TabsTrigger value="models">Bài mẫu</TabsTrigger>
            <TabsTrigger value="next">Next steps</TabsTrigger>
          </TabsList>
          <TabsContent value="details" className="pt-3">
            <CorrectionsTable corrections={corrections} />
          </TabsContent>
          <TabsContent value="models" className="pt-3">
            <ModelAnswerTabs
              userText={submission.essayText}
              band6={{
                text: ev.modelBand6 ?? "",
                notesVi: notes.band6 ?? [],
              }}
              band75={{
                text: ev.modelBand75 ?? "",
                notesVi: notes.band75 ?? [],
              }}
              band9={{
                text: ev.modelBand9 ?? "",
                notesVi: notes.band9 ?? [],
              }}
            />
          </TabsContent>
          <TabsContent value="next" className="space-y-2 pt-3">
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {nextSteps.map((s) => (
                <li key={s}>
                  {s}{" "}
                  <Link className="text-[var(--brand)] underline" href="/lessons">
                    → bài học
                  </Link>
                </li>
              ))}
            </ul>
          </TabsContent>
        </Tabs>

        <Button
          render={
            <Link
              href={`/writing/${slugFromTaskType(submission.taskType)}/new`}
            />
          }
        >
          Viết lại
        </Button>
      </div>
    </>
  );
}
