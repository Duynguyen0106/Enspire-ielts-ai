-- CreateEnum
CREATE TYPE "ScoringStatus" AS ENUM ('NOT_STARTED', 'SCORING', 'SCORED', 'FAILED');

-- CreateEnum
CREATE TYPE "UnlockSource" AS ENUM ('PLACEMENT', 'TEST_PASS', 'ADMIN');

-- AlterEnum
ALTER TYPE "AttemptStatus" ADD VALUE 'ABANDONED';

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "bestFullTestBand" DOUBLE PRECISION,
ADD COLUMN     "graduatedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Test" ADD COLUMN     "passingRulesJson" JSONB;

-- AlterTable
ALTER TABLE "TestAttempt" ADD COLUMN     "cooldownUntil" TIMESTAMP(3),
ADD COLUMN     "passed" BOOLEAN,
ADD COLUMN     "scoringError" TEXT,
ADD COLUMN     "scoringRetries" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "scoringStatus" "ScoringStatus" NOT NULL DEFAULT 'NOT_STARTED',
ADD COLUMN     "unlockGranted" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "LevelUnlock" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "levelId" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unlockedBy" "UnlockSource" NOT NULL,

    CONSTRAINT "LevelUnlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestSectionProgress" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "timeSpentSec" INTEGER,

    CONSTRAINT "TestSectionProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LevelUnlock_userId_levelId_key" ON "LevelUnlock"("userId", "levelId");

-- CreateIndex
CREATE UNIQUE INDEX "TestSectionProgress_attemptId_sectionId_key" ON "TestSectionProgress"("attemptId", "sectionId");

-- CreateIndex
CREATE UNIQUE INDEX "Test_levelId_type_key" ON "Test"("levelId", "type");

-- AddForeignKey
ALTER TABLE "LevelUnlock" ADD CONSTRAINT "LevelUnlock_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LevelUnlock" ADD CONSTRAINT "LevelUnlock_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "Level"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestSectionProgress" ADD CONSTRAINT "TestSectionProgress_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "TestAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestSectionProgress" ADD CONSTRAINT "TestSectionProgress_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "TestSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

