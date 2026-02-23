-- CreateTable
CREATE TABLE "TeacherSajuAnalysisHistory" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "promptId" TEXT NOT NULL DEFAULT 'default',
    "additionalRequest" TEXT,
    "result" JSONB NOT NULL,
    "interpretation" TEXT,
    "usedProvider" TEXT NOT NULL DEFAULT '내장 알고리즘',
    "usedModel" TEXT,
    "calculatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeacherSajuAnalysisHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeacherSajuAnalysisHistory_teacherId_idx" ON "TeacherSajuAnalysisHistory"("teacherId");

-- CreateIndex
CREATE INDEX "TeacherSajuAnalysisHistory_teacherId_createdAt_idx" ON "TeacherSajuAnalysisHistory"("teacherId", "createdAt" DESC);
