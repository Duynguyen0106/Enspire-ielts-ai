import { NextResponse } from "next/server";
import { SkillName } from "@prisma/client";
import { z } from "zod";
import { enforceRateLimit, jsonError, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { isAdminUser, studentVisibleReview } from "@/lib/content-filter";

const querySchema = z.object({
  level: z.coerce.number().int().min(1).max(9),
  skill: z.nativeEnum(SkillName),
});

export async function GET(req: Request) {
  const { user, error } = await requireApiUser();
  if (error || !user) return error!;

  const limited = await enforceRateLimit(user.id, "lessons-list", 100);
  if (limited) return limited;

  const url = new URL(req.url);
  const parsed = querySchema.safeParse({
    level: url.searchParams.get("level"),
    skill: url.searchParams.get("skill"),
  });
  if (!parsed.success) {
    return jsonError("Thiếu hoặc sai tham số level/skill.");
  }

  const { requireEntitlement } = await import("@/lib/entitlements");
  const gate = await requireEntitlement(user.id, "LESSON_ACCESS", {
    level: parsed.data.level,
    consume: false,
  });
  if (!gate.allowed) {
    return jsonError(gate.reason ?? "Paywall", 402, {
      feature: "LESSON_ACCESS",
      remaining: gate.remaining,
    });
  }

  const level = await prisma.level.findUnique({
    where: { number: parsed.data.level },
  });
  const skill = await prisma.skill.findUnique({
    where: { name: parsed.data.skill },
  });
  if (!level || !skill) {
    return jsonError("Không tìm thấy level hoặc kỹ năng.", 404);
  }

  const admin = isAdminUser(user);
  const lessons = await prisma.lesson.findMany({
    where: {
      levelId: level.id,
      skillId: skill.id,
      publishedAt: { not: null },
      reviewStatus: studentVisibleReview(admin),
    },
    orderBy: { order: "asc" },
    select: {
      id: true,
      title: true,
      titleVi: true,
      estimatedMin: true,
      isCheckpoint: true,
      order: true,
    },
  });

  const completions = await prisma.lessonCompletion.findMany({
    where: {
      userId: user.id,
      lessonId: { in: lessons.map((l) => l.id) },
    },
  });
  const byLesson = new Map(completions.map((c) => [c.lessonId, c]));

  return NextResponse.json({
    lessons: lessons.map((lesson) => {
      const completion = byLesson.get(lesson.id);
      return {
        ...lesson,
        completed: Boolean(completion),
        score: completion?.score ?? null,
        checkpointPassed: completion?.checkpointPassed ?? false,
      };
    }),
  });
}
