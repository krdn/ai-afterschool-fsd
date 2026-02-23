-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "calculationRecalculationAt" TIMESTAMP(3),
ADD COLUMN     "calculationRecalculationNeeded" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "calculationRecalculationReason" TEXT;

-- CreateTable
CREATE TABLE "SajuAnalysis" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "inputSnapshot" JSONB NOT NULL,
    "result" JSONB NOT NULL,
    "interpretation" TEXT,
    "status" TEXT NOT NULL DEFAULT 'complete',
    "version" INTEGER NOT NULL DEFAULT 1,
    "calculatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SajuAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NameAnalysis" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "inputSnapshot" JSONB NOT NULL,
    "result" JSONB NOT NULL,
    "interpretation" TEXT,
    "status" TEXT NOT NULL DEFAULT 'complete',
    "version" INTEGER NOT NULL DEFAULT 1,
    "calculatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NameAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SajuAnalysis_studentId_key" ON "SajuAnalysis"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "NameAnalysis_studentId_key" ON "NameAnalysis"("studentId");

-- AddForeignKey
ALTER TABLE "SajuAnalysis" ADD CONSTRAINT "SajuAnalysis_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NameAnalysis" ADD CONSTRAINT "NameAnalysis_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
