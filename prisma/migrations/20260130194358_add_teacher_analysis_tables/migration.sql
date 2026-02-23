-- CreateTable
CREATE TABLE "TeacherSajuAnalysis" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "inputSnapshot" JSONB NOT NULL,
    "result" JSONB NOT NULL,
    "interpretation" TEXT,
    "status" TEXT NOT NULL DEFAULT 'complete',
    "version" INTEGER NOT NULL DEFAULT 1,
    "calculatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherSajuAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherMbtiAnalysis" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "responses" JSONB NOT NULL,
    "scores" JSONB NOT NULL,
    "mbtiType" TEXT NOT NULL,
    "percentages" JSONB NOT NULL,
    "interpretation" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "calculatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherMbtiAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherNameAnalysis" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "inputSnapshot" JSONB NOT NULL,
    "result" JSONB NOT NULL,
    "interpretation" TEXT,
    "status" TEXT NOT NULL DEFAULT 'complete',
    "version" INTEGER NOT NULL DEFAULT 1,
    "calculatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherNameAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TeacherSajuAnalysis_teacherId_key" ON "TeacherSajuAnalysis"("teacherId");

-- CreateIndex
CREATE INDEX "TeacherSajuAnalysis_teacherId_idx" ON "TeacherSajuAnalysis"("teacherId");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherMbtiAnalysis_teacherId_key" ON "TeacherMbtiAnalysis"("teacherId");

-- CreateIndex
CREATE INDEX "TeacherMbtiAnalysis_teacherId_idx" ON "TeacherMbtiAnalysis"("teacherId");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherNameAnalysis_teacherId_key" ON "TeacherNameAnalysis"("teacherId");

-- CreateIndex
CREATE INDEX "TeacherNameAnalysis_teacherId_idx" ON "TeacherNameAnalysis"("teacherId");

-- AddForeignKey
ALTER TABLE "TeacherSajuAnalysis" ADD CONSTRAINT "TeacherSajuAnalysis_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherMbtiAnalysis" ADD CONSTRAINT "TeacherMbtiAnalysis_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherNameAnalysis" ADD CONSTRAINT "TeacherNameAnalysis_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
