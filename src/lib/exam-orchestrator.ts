import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isLevelUnlocked } from "@/lib/unlock";
import { publishScoreJob } from "@/lib/qstash";

const COOLDOWN_MS = 24 * 60 * 60 * 1000;
const SECTION_GRACE_SEC = 30;

export type StartCheck =
  | { ok: true }
  | {
      ok: false;
      status: number;
      reason: string;
      cooldownUntil?: Date;
    };

function formatRemaining(ms: number): string {
  const totalMin = Math.max(0, Math.ceil(ms / 60_000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export async function canStartAttempt(
  userId: string,
  testId: string
): Promise<StartCheck> {
  const test = await prisma.test.findUnique({
    where: { id: testId },
    include: { level: true },
  });
  if (!test || test.type !== "FULL_LEVEL" || !test.level) {
    return { ok: false, status: 404, reason: "Không tìm thấy bài thi cấp độ." };
  }

  const unlocked = await isLevelUnlocked(userId, test.level.number);
  if (!unlocked) {
    return {
      ok: false,
      status: 403,
      reason: `Hoàn thành Level ${test.level.number - 1} để mở khóa.`,
    };
  }

  const activeOther = await prisma.testAttempt.findFirst({
    where: {
      userId,
      status: "IN_PROGRESS",
      test: { type: "FULL_LEVEL" },
      NOT: { testId },
    },
  });
  if (activeOther) {
    return {
      ok: false,
      status: 409,
      reason: "Bạn đang có một bài thi cấp độ khác đang diễn ra.",
    };
  }

  const last = await prisma.testAttempt.findFirst({
    where: {
      userId,
      testId,
      status: { in: ["SUBMITTED", "SCORED", "ABANDONED"] },
    },
    orderBy: { startedAt: "desc" },
  });

  if (last) {
    const until =
      last.cooldownUntil ??
      new Date(last.startedAt.getTime() + COOLDOWN_MS);
    if (until.getTime() > Date.now() && last.status !== "ABANDONED") {
      // Only enforce cooldown after a finished (submitted/scored) attempt
      if (last.status === "SUBMITTED" || last.status === "SCORED") {
        return {
          ok: false,
          status: 429,
          reason: `Bạn cần chờ 24 giờ trước khi thi lại. Còn lại: ${formatRemaining(until.getTime() - Date.now())}.`,
          cooldownUntil: until,
        };
      }
    }
  }

  const existingInProgress = await prisma.testAttempt.findFirst({
    where: { userId, testId, status: "IN_PROGRESS" },
  });
  if (existingInProgress) {
    return { ok: true }; // resume
  }

  return { ok: true };
}

export async function startOrResumeAttempt(userId: string, testId: string) {
  const existing = await prisma.testAttempt.findFirst({
    where: { userId, testId, status: "IN_PROGRESS" },
    include: {
      test: { include: { level: true, sections: { orderBy: { order: "asc" } } } },
      sectionProgress: true,
    },
  });
  if (existing) return existing;

  const test = await prisma.test.findUnique({
    where: { id: testId },
    include: {
      level: true,
      sections: { orderBy: { order: "asc" }, include: { skill: true } },
    },
  });
  if (!test) throw new Error("Test not found");

  const cooldownUntil = new Date(Date.now() + COOLDOWN_MS);

  const attempt = await prisma.testAttempt.create({
    data: {
      userId,
      testId,
      status: "IN_PROGRESS",
      scoringStatus: "NOT_STARTED",
      cooldownUntil,
      sectionProgress: {
        create: test.sections.map((s) => ({
          sectionId: s.id,
          startedAt: s.order === 1 ? new Date() : null,
        })),
      },
    },
    include: {
      test: { include: { level: true, sections: { orderBy: { order: "asc" } } } },
      sectionProgress: true,
    },
  });

  return attempt;
}

export function sectionRemainingSec(input: {
  startedAt: Date | null;
  durationMin: number;
  now?: Date;
}): number {
  if (!input.startedAt) return input.durationMin * 60;
  const now = input.now ?? new Date();
  const elapsed = (now.getTime() - input.startedAt.getTime()) / 1000;
  return Math.max(0, input.durationMin * 60 - elapsed);
}

export function isSectionTimedOut(input: {
  startedAt: Date | null;
  durationMin: number;
  now?: Date;
}): boolean {
  if (!input.startedAt) return false;
  const remaining = sectionRemainingSec(input);
  return remaining + SECTION_GRACE_SEC < 0
    ? true
    : remaining < -SECTION_GRACE_SEC;
}

/** Reject late submits beyond duration + grace. */
export function assertSectionWithinTime(input: {
  startedAt: Date | null;
  durationMin: number;
  now?: Date;
}): { ok: true } | { ok: false; reason: string } {
  if (!input.startedAt) return { ok: true };
  const now = input.now ?? new Date();
  const elapsed = (now.getTime() - input.startedAt.getTime()) / 1000;
  const limit = input.durationMin * 60 + SECTION_GRACE_SEC;
  if (elapsed > limit) {
    return {
      ok: false,
      reason: "Hết thời gian phần thi (máy chủ từ chối nộp muộn).",
    };
  }
  return { ok: true };
}

export async function submitSection(input: {
  attemptId: string;
  sectionId: string;
  userId: string;
  answers: { questionId: string; response: Prisma.InputJsonValue }[];
  timeSpentSec?: number;
}): Promise<{ nextSectionId: string | null }> {
  const attempt = await prisma.testAttempt.findFirst({
    where: { id: input.attemptId, userId: input.userId },
    include: {
      test: {
        include: {
          sections: { orderBy: { order: "asc" }, include: { skill: true } },
        },
      },
      sectionProgress: true,
    },
  });
  if (!attempt || attempt.status !== "IN_PROGRESS") {
    throw Object.assign(new Error("Phiên thi không hợp lệ."), { status: 400 });
  }

  const sections = attempt.test.sections;
  const section = sections.find((s) => s.id === input.sectionId);
  if (!section) {
    throw Object.assign(new Error("Không tìm thấy phần thi."), { status: 404 });
  }

  const progress = attempt.sectionProgress.find(
    (p) => p.sectionId === input.sectionId
  );
  if (progress?.submittedAt) {
    throw Object.assign(new Error("Phần thi đã được nộp."), { status: 400 });
  }

  // Enforce section order: all previous sections must be submitted
  for (const s of sections) {
    if (s.order >= section.order) break;
    const prev = attempt.sectionProgress.find((p) => p.sectionId === s.id);
    if (!prev?.submittedAt) {
      throw Object.assign(
        new Error("Bạn phải hoàn thành phần trước trước khi nộp phần này."),
        { status: 400 }
      );
    }
  }

  const startedAt = progress?.startedAt ?? attempt.startedAt;
  const timeCheck = assertSectionWithinTime({
    startedAt,
    durationMin: section.durationMin,
  });
  if (!timeCheck.ok) {
    throw Object.assign(new Error(timeCheck.reason), { status: 400 });
  }

  for (const ans of input.answers) {
    await prisma.answer.upsert({
      where: {
        attemptId_questionId: {
          attemptId: input.attemptId,
          questionId: ans.questionId,
        },
      },
      update: { userResponseJson: ans.response },
      create: {
        attemptId: input.attemptId,
        questionId: ans.questionId,
        userResponseJson: ans.response,
      },
    });
  }

  await prisma.testSectionProgress.upsert({
    where: {
      attemptId_sectionId: {
        attemptId: input.attemptId,
        sectionId: input.sectionId,
      },
    },
    update: {
      submittedAt: new Date(),
      timeSpentSec: input.timeSpentSec ?? null,
      startedAt: startedAt,
    },
    create: {
      attemptId: input.attemptId,
      sectionId: input.sectionId,
      startedAt,
      submittedAt: new Date(),
      timeSpentSec: input.timeSpentSec ?? null,
    },
  });

  const next = sections.find((s) => s.order === section.order + 1);
  if (next) {
    await prisma.testSectionProgress.upsert({
      where: {
        attemptId_sectionId: {
          attemptId: input.attemptId,
          sectionId: next.id,
        },
      },
      update: { startedAt: new Date() },
      create: {
        attemptId: input.attemptId,
        sectionId: next.id,
        startedAt: new Date(),
      },
    });
  }

  return { nextSectionId: next?.id ?? null };
}

export async function finishAttempt(input: {
  attemptId: string;
  userId: string;
}) {
  const attempt = await prisma.testAttempt.findFirst({
    where: { id: input.attemptId, userId: input.userId },
    include: {
      test: { include: { sections: true } },
      sectionProgress: true,
    },
  });
  if (!attempt || attempt.status !== "IN_PROGRESS") {
    throw Object.assign(new Error("Phiên thi không hợp lệ."), { status: 400 });
  }

  const allSubmitted = attempt.test.sections.every((s) =>
    attempt.sectionProgress.some(
      (p) => p.sectionId === s.id && p.submittedAt != null
    )
  );
  if (!allSubmitted) {
    throw Object.assign(new Error("Chưa nộp đủ các phần thi."), { status: 400 });
  }

  const updated = await prisma.testAttempt.update({
    where: { id: attempt.id },
    data: {
      status: "SUBMITTED",
      scoringStatus: "SCORING",
      submittedAt: new Date(),
      cooldownUntil: new Date(Date.now() + COOLDOWN_MS),
    },
  });

  await publishScoreJob(attempt.id);
  return updated;
}
