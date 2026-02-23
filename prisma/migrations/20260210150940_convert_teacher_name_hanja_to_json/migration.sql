/*
  Warnings:

  - The `nameHanja` column on the `Teacher` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `relation` on the `Parent` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Made the column `phone` on table `Parent` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "ParentRelation" AS ENUM ('FATHER', 'MOTHER', 'GRANDFATHER', 'GRANDMOTHER', 'OTHER');

-- AlterTable
ALTER TABLE "Parent" DROP COLUMN "relation",
ADD COLUMN     "relation" "ParentRelation" NOT NULL,
ALTER COLUMN "phone" SET NOT NULL;

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "nationality" TEXT DEFAULT '한국';

-- AlterTable
ALTER TABLE "Teacher" DROP COLUMN "nameHanja",
ADD COLUMN     "nameHanja" JSONB;

-- AlterTable
ALTER TABLE "analysis_prompt_presets" RENAME CONSTRAINT "SajuPromptPreset_pkey" TO "analysis_prompt_presets_pkey";

-- CreateTable
CREATE TABLE "VarkAnalysis" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "responses" JSONB NOT NULL,
    "scores" JSONB NOT NULL,
    "varkType" TEXT NOT NULL,
    "percentages" JSONB NOT NULL,
    "interpretation" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "calculatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VarkAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VarkSurveyDraft" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "responses" JSONB NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VarkSurveyDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ZodiacAnalysis" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "zodiacSign" TEXT NOT NULL,
    "zodiacName" TEXT NOT NULL,
    "element" TEXT NOT NULL,
    "traits" JSONB NOT NULL,
    "interpretation" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "calculatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ZodiacAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VarkAnalysis_studentId_key" ON "VarkAnalysis"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "VarkSurveyDraft_studentId_key" ON "VarkSurveyDraft"("studentId");

-- CreateIndex
CREATE INDEX "VarkSurveyDraft_studentId_idx" ON "VarkSurveyDraft"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "ZodiacAnalysis_studentId_key" ON "ZodiacAnalysis"("studentId");

-- AddForeignKey
ALTER TABLE "VarkAnalysis" ADD CONSTRAINT "VarkAnalysis_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VarkSurveyDraft" ADD CONSTRAINT "VarkSurveyDraft_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZodiacAnalysis" ADD CONSTRAINT "ZodiacAnalysis_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
