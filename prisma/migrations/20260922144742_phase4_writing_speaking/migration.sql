-- CreateEnum
CREATE TYPE "WritingTaskType" AS ENUM ('TASK1_ACADEMIC', 'TASK1_GENERAL', 'TASK2');

-- CreateEnum
CREATE TYPE "SpeakingSessionType" AS ENUM ('PART_PRACTICE', 'FULL_SIM', 'PLACEMENT', 'FULL_TEST');

-- CreateTable
CREATE TABLE "WritingPrompt" (
    "id" TEXT NOT NULL,
    "taskType" "WritingTaskType" NOT NULL,
    "levelBucket" TEXT NOT NULL,
    "levelMin" INTEGER NOT NULL,
    "levelMax" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "titleVi" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "promptImageUrl" TEXT,
    "publishedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WritingPrompt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WritingModelAnswer" (
    "id" TEXT NOT NULL,
    "promptId" TEXT NOT NULL,
    "band6Json" JSONB NOT NULL,
    "band75Json" JSONB NOT NULL,
    "band9Json" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WritingModelAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WritingSubmission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "taskType" "WritingTaskType" NOT NULL,
    "level" INTEGER NOT NULL,
    "promptId" TEXT,
    "prompt" TEXT NOT NULL,
    "promptImageUrl" TEXT,
    "essayText" TEXT NOT NULL,
    "wordCount" INTEGER NOT NULL,
    "timeSpentSec" INTEGER NOT NULL DEFAULT 0,
    "attemptId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WritingSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WritingEvaluation" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "overallBand" DOUBLE PRECISION NOT NULL,
    "criteriaJson" JSONB NOT NULL,
    "correctionsJson" JSONB NOT NULL,
    "nextStepsJson" JSONB NOT NULL,
    "strengthsJson" JSONB,
    "modelBand6" TEXT,
    "modelBand75" TEXT,
    "modelBand9" TEXT,
    "modelNotesJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WritingEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WritingTemplate" (
    "id" TEXT NOT NULL,
    "taskType" "WritingTaskType" NOT NULL,
    "band" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "titleVi" TEXT NOT NULL,
    "structureJson" JSONB NOT NULL,
    "samplePhrasesJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WritingTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpeakingSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionType" "SpeakingSessionType" NOT NULL,
    "level" INTEGER NOT NULL,
    "part" INTEGER,
    "scriptJson" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "attemptId" TEXT,

    CONSTRAINT "SpeakingSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpeakingTurn" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "part" INTEGER NOT NULL,
    "questionText" TEXT NOT NULL,
    "audioUrl" TEXT,
    "transcript" TEXT NOT NULL,
    "wordTimestampsJson" JSONB,
    "durationSec" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "wpm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pauseCount" INTEGER NOT NULL DEFAULT 0,
    "fillerCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpeakingTurn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpeakingEvaluation" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "overallBand" DOUBLE PRECISION NOT NULL,
    "criteriaJson" JSONB NOT NULL,
    "correctionsJson" JSONB NOT NULL,
    "nextStepsJson" JSONB NOT NULL,
    "strengthsJson" JSONB,
    "drillsJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpeakingEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WritingModelAnswer_promptId_key" ON "WritingModelAnswer"("promptId");

-- CreateIndex
CREATE UNIQUE INDEX "WritingEvaluation_submissionId_key" ON "WritingEvaluation"("submissionId");

-- CreateIndex
CREATE UNIQUE INDEX "SpeakingEvaluation_sessionId_key" ON "SpeakingEvaluation"("sessionId");

-- AddForeignKey
ALTER TABLE "WritingModelAnswer" ADD CONSTRAINT "WritingModelAnswer_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "WritingPrompt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WritingSubmission" ADD CONSTRAINT "WritingSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WritingEvaluation" ADD CONSTRAINT "WritingEvaluation_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "WritingSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpeakingSession" ADD CONSTRAINT "SpeakingSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpeakingTurn" ADD CONSTRAINT "SpeakingTurn_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SpeakingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpeakingEvaluation" ADD CONSTRAINT "SpeakingEvaluation_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SpeakingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
