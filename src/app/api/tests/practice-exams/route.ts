import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

export async function GET() {
  const { user, error } = await requireApiUser();
  if (error || !user) return error!;

  const tests = await prisma.test.findMany({
    where: { type: "PRACTICE_EXAM", publishedAt: { not: null } },
    orderBy: { title: "asc" },
    include: {
      attempts: {
        where: { userId: user.id },
        orderBy: { startedAt: "desc" },
        take: 3,
        select: {
          id: true,
          status: true,
          overallBand: true,
          startedAt: true,
          cooldownUntil: true,
        },
      },
    },
  });

  return NextResponse.json({
    disclaimer:
      "Đề thi thử Academic gốc của VietIELTS AI — mô phỏng format IELTS, không phải đề thi chính thức của British Council / IDP / Cambridge.",
    officialPracticeLinks: [
      {
        label: "IELTS.org — sample test questions",
        url: "https://ielts.org/take-a-test/preparation-resources/sample-test-questions",
      },
      {
        label: "British Council — free practice tests",
        url: "https://takeielts.britishcouncil.org/take-ielts/prepare/free-ielts-english-practice-tests",
      },
      {
        label: "IDP — practice tests",
        url: "https://ielts.idp.com/prepare/article-free-practice-tests",
      },
    ],
    exams: tests.map((t) => {
      const meta = asRecord(t.passingRulesJson);
      const last = t.attempts[0] ?? null;
      const inProgress = t.attempts.find((a) => a.status === "IN_PROGRESS");
      return {
        testId: t.id,
        code: typeof meta.code === "string" ? meta.code : null,
        title: t.title,
        titleVi:
          typeof meta.titleVi === "string" ? meta.titleVi : t.title,
        durationMin: t.durationMin,
        bestBand: t.attempts
          .map((a) => a.overallBand)
          .filter((b): b is number => typeof b === "number")
          .sort((a, b) => b - a)[0] ?? null,
        lastOverallBand: last?.overallBand ?? null,
        cooldownUntil: last?.cooldownUntil?.toISOString() ?? null,
        inProgressAttemptId: inProgress?.id ?? null,
        lastAttemptId: last?.id ?? null,
      };
    }),
  });
}
