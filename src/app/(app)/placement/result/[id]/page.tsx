import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/app-header";
import { BandBadge } from "@/components/placement/band-badge";
import { SkillRadar } from "@/components/placement/skill-radar";
import { AiDisclaimer } from "@/components/placement/ai-disclaimer";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Kết quả placement",
};

type PageProps = {
  params: Promise<{ id: string }>;
};

type WritingLike = {
  corrections?: { original: string; corrected: string; explanationVi: string }[];
  nextSteps?: string[];
  criteria?: Record<string, { band: number; feedbackVi: string }>;
};

function asWritingLike(value: unknown): WritingLike {
  return typeof value === "object" && value !== null
    ? (value as WritingLike)
    : {};
}

export default async function PlacementResultPage({ params }: PageProps) {
  const user = await requireUser();
  const { id } = await params;

  const result = await prisma.placementResult.findFirst({
    where: { id, userId: user.id },
    include: {
      attempt: true,
    },
  });

  if (!result) notFound();

  const raw = (result.attempt.rawScoreJson ?? {}) as {
    writing?: unknown;
    speaking?: unknown;
    skillNotes?: Record<string, string>;
  };

  const writing = asWritingLike(raw.writing);
  const speaking = asWritingLike(raw.speaking);
  const corrections = [
    ...(writing.corrections ?? []),
    ...(speaking.corrections ?? []),
  ];
  const nextSteps = [
    ...new Set([...(writing.nextSteps ?? []), ...(speaking.nextSteps ?? [])]),
  ].slice(0, 6);

  const strengths = Array.isArray(result.strengthsJson)
    ? (result.strengthsJson as string[])
    : [];
  const weaknesses = Array.isArray(result.weaknessesJson)
    ? (result.weaknessesJson as string[])
    : [];

  const radar = [
    { skill: "Listening", band: result.listeningBand },
    { skill: "Reading", band: result.readingBand },
    { skill: "Writing", band: result.writingBand },
    { skill: "Speaking", band: result.speakingBand },
  ];

  const skillCards = [
    {
      title: "Listening",
      band: result.listeningBand,
      note: raw.skillNotes?.listening ?? writing.criteria?.taskAchievement?.feedbackVi,
    },
    {
      title: "Reading",
      band: result.readingBand,
      note: raw.skillNotes?.reading,
    },
    {
      title: "Writing",
      band: result.writingBand,
      note:
        raw.skillNotes?.writing ??
        writing.criteria?.taskAchievement?.feedbackVi,
    },
    {
      title: "Speaking",
      band: result.speakingBand,
      note:
        raw.skillNotes?.speaking ??
        speaking.criteria?.fluencyCoherence?.feedbackVi,
    },
  ];

  return (
    <>
      <AppHeader
        title="Kết quả đầu vào"
        currentLevel={result.recommendedLevel}
      />
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        <AiDisclaimer />

        <Card>
          <CardHeader className="items-center text-center">
            <CardDescription>Overall Band</CardDescription>
            <BandBadge band={result.overallBand} size="lg" />
            <CardTitle className="mt-2 text-xl">
              Level đề xuất: {result.recommendedLevel}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SkillRadar data={radar} />
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          {skillCards.map((skill) => (
            <Card key={skill.title}>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">{skill.title}</CardTitle>
                <BandBadge band={skill.band} />
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {skill.note ?? "Đã hoàn thành phần này."}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Điểm mạnh</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {strengths.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Cần cải thiện</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {weaknesses.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Nhận xét tổng quan</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{result.summaryVi}</p>
          </CardContent>
        </Card>

        {corrections.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Gợi ý sửa lỗi (Writing & Speaking)</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 pr-2">Gốc</th>
                    <th className="py-2 pr-2">Sửa</th>
                    <th className="py-2">Giải thích</th>
                  </tr>
                </thead>
                <tbody>
                  {corrections.map((c, i) => (
                    <tr key={`${c.original}-${i}`} className="border-b align-top">
                      <td className="py-2 pr-2">{c.original}</td>
                      <td className="py-2 pr-2">{c.corrected}</td>
                      <td className="py-2 text-muted-foreground">
                        {c.explanationVi}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        ) : null}

        {nextSteps.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Bước tiếp theo</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {nextSteps.map((step) => (
                  <li key={step} className="flex gap-2">
                    <input type="checkbox" className="mt-1" readOnly />
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : null}

        <p className="text-xs text-muted-foreground">
          Lưu ý Speaking: phát âm được ước lượng từ transcript, không phải phân
          tích audio chuyên sâu.
        </p>

        <div className="flex flex-wrap gap-3">
          <Button
            render={
              <Link href="/dashboard" />
            }
          >
            Vào lộ trình Level {result.recommendedLevel}
          </Button>
          <details className="w-full rounded-lg border p-3 text-sm md:w-auto">
            <summary className="cursor-pointer font-medium">
              Xem lại bài làm
            </summary>
            <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap text-xs text-muted-foreground">
              {JSON.stringify(result.attempt.rawScoreJson, null, 2)}
            </pre>
          </details>
        </div>
      </div>
    </>
  );
}
