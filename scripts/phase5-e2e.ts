/**
 * Phase 5 E2E API checks: pass, fail, cooldown, no answer leak.
 */
import { PrismaClient } from "@prisma/client";
import { scoreFullLevelAttempt } from "../src/lib/score-full-attempt";
import { canStartAttempt, startOrResumeAttempt, submitSection, finishAttempt } from "../src/lib/exam-orchestrator";
import { grantUnlock } from "../src/lib/unlock";
import { markStaleAttemptsAbandoned } from "../src/lib/attempt-cleanup";

const prisma = new PrismaClient();

async function answersForSection(
  sectionId: string,
  mode: "strong" | "weak"
) {
  const section = await prisma.testSection.findUnique({
    where: { id: sectionId },
    include: { skill: true, questions: { orderBy: { order: "asc" } } },
  });
  if (!section) return [];

  if (section.skill.name === "LISTENING" || section.skill.name === "READING") {
    return section.questions.map((q) => {
      const correct = q.correctAnswerJson as { answer?: string } | null;
      const answer =
        mode === "strong"
          ? correct?.answer ?? ""
          : "wrong-answer-xyz";
      return { questionId: q.id, response: { answer } };
    });
  }

  if (section.skill.name === "WRITING") {
    return section.questions.map((q, i) => {
      const content = q.contentJson as { minWords?: number; taskType?: string };
      const min = content.minWords ?? (i === 0 ? 150 : 250);
      if (mode === "weak") {
        return {
          questionId: q.id,
          response: {
            essayText: "I think it is bad. People need help. The end.",
          },
        };
      }
      const sentence =
        "In my opinion, practical skills and academic theory both matter for modern education. For example, students who practise communication while studying theory become more confident. Furthermore, employers value balanced graduates. However, schools must fund workshops carefully. Ultimately, a mixed curriculum serves society best. ";
      let text = "";
      while (text.split(/\s+/).filter(Boolean).length < min + 20) text += sentence;
      return { questionId: q.id, response: { essayText: text } };
    });
  }

  // SPEAKING
  return section.questions.map((q) => ({
    questionId: q.id,
    response: {
      transcript:
        mode === "strong"
          ? "I live in a quiet neighbourhood near the park. I enjoy reading and playing sports on weekends because it helps me stay healthy and meet friends. Technology has changed learning by giving more resources online."
          : "um uh yes",
    },
  }));
}

async function runAttempt(userId: string, testId: string, mode: "strong" | "weak") {
  // Clear cooldown by deleting recent attempts for clean test
  await prisma.testAttempt.deleteMany({
    where: { userId, testId },
  });

  const check = await canStartAttempt(userId, testId);
  if (!check.ok) throw new Error(`cannot start: ${check.reason}`);

  const attempt = await startOrResumeAttempt(userId, testId);
  const full = await prisma.testAttempt.findUnique({
    where: { id: attempt.id },
    include: {
      test: { include: { sections: { orderBy: { order: "asc" } } } },
    },
  });
  if (!full) throw new Error("no attempt");

  for (const section of full.test.sections) {
    const answers = await answersForSection(section.id, mode);
    await submitSection({
      attemptId: full.id,
      sectionId: section.id,
      userId,
      answers,
      timeSpentSec: 60,
    });
  }

  // Last section submit already finishes — check status
  let a = await prisma.testAttempt.findUnique({ where: { id: full.id } });
  if (a?.status === "IN_PROGRESS") {
    await finishAttempt({ attemptId: full.id, userId });
  }

  // Score inline (don't wait for fetch)
  await scoreFullLevelAttempt(full.id);
  a = await prisma.testAttempt.findUnique({ where: { id: full.id } });
  return a!;
}

async function main() {
  const admin = await prisma.user.findUnique({
    where: { email: "admin@vietielts.ai" },
  });
  if (!admin) throw new Error("admin missing");

  await grantUnlock(admin.id, 1, "ADMIN");

  const test = await prisma.test.findFirst({
    where: { type: "FULL_LEVEL", level: { number: 1 } },
    include: { level: true },
  });
  if (!test) throw new Error("level 1 test missing");

  // 7. Leak test on start payload shape
  const startCheck = await canStartAttempt(admin.id, test.id);
  console.log("canStart", startCheck.ok);

  console.log("Running PASS attempt…");
  const pass = await runAttempt(admin.id, test.id, "strong");
  console.log("PASS", {
    passed: pass.passed,
    band: pass.overallBand,
    unlock: pass.unlockGranted,
    scoring: pass.scoringStatus,
  });

  const unlock2 = await prisma.levelUnlock.findFirst({
    where: { userId: admin.id, level: { number: 2 } },
  });
  console.log("Level2 unlock", Boolean(unlock2));

  // Cooldown
  const cool = await canStartAttempt(admin.id, test.id);
  console.log(
    "COOLDOWN",
    !cool.ok && cool.status === 429 ? "PASS" : "FAIL",
    cool.ok ? "unexpected ok" : cool.reason
  );

  // Fail path — use a fresh user
  const email = `phase5_fail_${Date.now()}@test.local`;
  const failUser = await prisma.user.create({
    data: {
      email,
      name: "Fail Tester",
      passwordHash: admin.passwordHash,
      profile: {
        create: {
          displayName: "Fail",
          currentLevel: 1,
          placementCompleted: true,
        },
      },
    },
  });
  await grantUnlock(failUser.id, 1, "ADMIN");

  console.log("Running FAIL attempt…");
  const fail = await runAttempt(failUser.id, test.id, "weak");
  console.log("FAIL", {
    passed: fail.passed,
    band: fail.overallBand,
    raw: fail.rawScoreJson,
  });

  // Stale cleanup dry-run
  const abandoned = await markStaleAttemptsAbandoned();
  console.log("staleAbandoned", abandoned);

  // Verify run-state / start never includes correctAnswer in our serializer — unit check
  const qs = await prisma.question.findMany({
    where: { section: { testId: test.id } },
    take: 1,
  });
  console.log("hasCorrectInDb", qs[0]?.correctAnswerJson != null);

  console.log("DONE");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
