-- CreateTable
CREATE TABLE "SajuAnalysisHistory" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "promptId" TEXT NOT NULL DEFAULT 'default',
    "additionalRequest" TEXT,
    "result" JSONB NOT NULL,
    "interpretation" TEXT,
    "usedProvider" TEXT NOT NULL DEFAULT '내장 알고리즘',
    "usedModel" TEXT,
    "calculatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SajuAnalysisHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SajuAnalysisHistory_studentId_idx" ON "SajuAnalysisHistory"("studentId");

-- CreateIndex
CREATE INDEX "SajuAnalysisHistory_studentId_createdAt_idx" ON "SajuAnalysisHistory"("studentId", "createdAt" DESC);
