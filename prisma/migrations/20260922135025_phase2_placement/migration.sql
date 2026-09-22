-- AlterTable
ALTER TABLE "TestSection" ADD COLUMN     "metadataJson" JSONB;

-- CreateTable
CREATE TABLE "PlacementResult" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "listeningBand" DOUBLE PRECISION NOT NULL,
    "readingBand" DOUBLE PRECISION NOT NULL,
    "writingBand" DOUBLE PRECISION NOT NULL,
    "speakingBand" DOUBLE PRECISION NOT NULL,
    "overallBand" DOUBLE PRECISION NOT NULL,
    "recommendedLevel" INTEGER NOT NULL,
    "strengthsJson" JSONB NOT NULL,
    "weaknessesJson" JSONB NOT NULL,
    "summaryVi" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlacementResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlacementResult_userId_key" ON "PlacementResult"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PlacementResult_attemptId_key" ON "PlacementResult"("attemptId");

-- AddForeignKey
ALTER TABLE "PlacementResult" ADD CONSTRAINT "PlacementResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlacementResult" ADD CONSTRAINT "PlacementResult_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "TestAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
