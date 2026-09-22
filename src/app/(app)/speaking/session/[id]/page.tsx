import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/app-header";
import { BandBadge } from "@/components/placement/band-badge";
import { AiDisclaimer } from "@/components/placement/ai-disclaimer";
import { CriteriaCard } from "@/components/writing/criteria-card";
import { TranscriptViewer } from "@/components/speaking/transcript-viewer";
import { SessionMetricsCard } from "@/components/speaking/session-metrics-card";
import { Button } from "@/components/ui/button";

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: "Kết quả Speaking" };

export default async function SpeakingSessionPage({ params }: Props) {
  const user = await requireUser();
  const currentLevel = user.profile?.currentLevel ?? 1;
  const { id } = await params;
  const session = await prisma.speakingSession.findFirst({
    where: { id, userId: user.id },
    include: {
      turns: { orderBy: { createdAt: "asc" } },
      evaluation: true,
    },
  });
  if (!session || !session.evaluation) notFound();
  const ev = session.evaluation;
  const criteria = ev.criteriaJson as {
    fluencyCoherence: {
      band: number;
      feedbackVi: string;
      metrics?: { wpm: number; pauseCount: number; fillerCount: number };
    };
    lexicalResource: { band: number; feedbackVi: string };
    grammaticalRange: { band: number; feedbackVi: string };
    pronunciation: { band: number; feedbackVi: string; noteVi?: string };
  };
  const nextSteps = (ev.nextStepsJson as string[]) ?? [];
  const strengths = (ev.strengthsJson as string[]) ?? [];
  const drills =
    (ev.drillsJson as {
      titleVi: string;
      descriptionVi: string;
      practiceUrl?: string;
    }[]) ?? [];
  const metrics = criteria.fluencyCoherence.metrics ?? {
    wpm: 0,
    pauseCount: 0,
    fillerCount: 0,
  };

  return (
    <>
      <AppHeader title="Kết quả Speaking" currentLevel={currentLevel} />
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
              {session.sessionType}
            </h2>
            <AiDisclaimer className="mt-2 text-xs text-muted-foreground" />
            {criteria.pronunciation.noteVi ? (
              <p className="mt-1 text-xs text-muted-foreground">
                {criteria.pronunciation.noteVi}
              </p>
            ) : null}
          </div>
          <BandBadge band={ev.overallBand} />
        </div>

        <SessionMetricsCard {...metrics} />

        <div className="grid gap-3 md:grid-cols-2">
          <CriteriaCard
            titleVi="Fluency & Coherence"
            band={criteria.fluencyCoherence.band}
            feedback={criteria.fluencyCoherence.feedbackVi}
          />
          <CriteriaCard
            titleVi="Lexical Resource"
            band={criteria.lexicalResource.band}
            feedback={criteria.lexicalResource.feedbackVi}
          />
          <CriteriaCard
            titleVi="Grammatical Range"
            band={criteria.grammaticalRange.band}
            feedback={criteria.grammaticalRange.feedbackVi}
          />
          <CriteriaCard
            titleVi="Pronunciation"
            band={criteria.pronunciation.band}
            feedback={criteria.pronunciation.feedbackVi}
          />
        </div>

        <section className="space-y-4">
          <h3 className="font-semibold">Câu trả lời</h3>
          {session.turns.map((t, i) => (
            <div key={t.id} className="space-y-2 border p-3">
              <p className="text-sm font-medium">
                Part {t.part} · Q{i + 1}: {t.questionText}
              </p>
              {t.audioUrl ? (
                <audio controls src={t.audioUrl} className="w-full" />
              ) : null}
              <TranscriptViewer transcript={t.transcript} />
              <SessionMetricsCard
                wpm={t.wpm}
                pauseCount={t.pauseCount}
                fillerCount={t.fillerCount}
              />
            </div>
          ))}
        </section>

        <section className="space-y-2">
          <h3 className="font-semibold">Điểm mạnh</h3>
          <ul className="list-disc pl-5 text-sm">
            {strengths.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          <h3 className="font-semibold">Next steps</h3>
          <ul className="list-disc pl-5 text-sm">
            {nextSteps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          <h3 className="font-semibold">Recommended drills</h3>
          <ul className="space-y-2 text-sm">
            {drills.map((d) => (
              <li key={d.titleVi} className="border p-3">
                <p className="font-medium">{d.titleVi}</p>
                <p className="text-muted-foreground">{d.descriptionVi}</p>
                {d.practiceUrl ? (
                  <Link
                    href={d.practiceUrl}
                    className="text-[var(--brand)] underline"
                  >
                    Luyện ngay
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        </section>

        <div className="flex flex-wrap gap-2">
          <Button
            render={
              <Link
                href={
                  session.part
                    ? `/speaking/practice/${session.part}`
                    : "/speaking/sim/new"
                }
              />
            }
          >
            Luyện lại
          </Button>
          <Button variant="outline" render={<Link href="/speaking/sim/new" />}>
            Đề mới
          </Button>
        </div>
      </div>
    </>
  );
}
