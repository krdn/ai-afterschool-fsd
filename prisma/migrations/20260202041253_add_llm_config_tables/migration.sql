-- CreateEnum
CREATE TYPE "GradeType" AS ENUM ('MIDTERM', 'FINAL', 'QUIZ', 'ASSIGNMENT');

-- CreateEnum
CREATE TYPE "CounselingType" AS ENUM ('ACADEMIC', 'CAREER', 'PSYCHOLOGICAL', 'BEHAVIORAL');

-- DropIndex
DROP INDEX "Student_teamId_idx";

-- DropIndex
DROP INDEX "Teacher_teamId_idx";

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "attendanceRate" DOUBLE PRECISION,
ADD COLUMN     "initialGradeLevel" TEXT,
ADD COLUMN     "priorAcademicPerformance" JSONB;

-- CreateTable
CREATE TABLE "MbtiSurveyDraft" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "responses" JSONB NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MbtiSurveyDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MbtiAnalysis" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "responses" JSONB NOT NULL,
    "scores" JSONB NOT NULL,
    "mbtiType" TEXT NOT NULL,
    "percentages" JSONB NOT NULL,
    "interpretation" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "calculatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MbtiAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FaceAnalysis" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'complete',
    "errorMessage" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "analyzedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FaceAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PalmAnalysis" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "hand" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'complete',
    "errorMessage" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "analyzedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PalmAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompatibilityResult" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "overallScore" DOUBLE PRECISION NOT NULL,
    "breakdown" JSONB NOT NULL,
    "reasons" JSONB,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompatibilityResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonalitySummary" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "coreTraits" TEXT,
    "learningStrategy" JSONB,
    "careerGuidance" JSONB,
    "status" TEXT NOT NULL DEFAULT 'none',
    "errorMessage" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "generatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonalitySummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonalitySummaryHistory" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "coreTraits" TEXT,
    "learningStrategy" JSONB,
    "careerGuidance" JSONB,
    "version" INTEGER NOT NULL,
    "generatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PersonalitySummaryHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportPDF" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'none',
    "fileUrl" TEXT,
    "dataVersion" INTEGER,
    "errorMessage" TEXT,
    "generatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportPDF_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssignmentProposal" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "teamId" TEXT,
    "proposedBy" TEXT NOT NULL,
    "assignments" JSONB NOT NULL,
    "summary" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssignmentProposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GradeHistory" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "teacherId" TEXT,
    "subject" TEXT NOT NULL,
    "gradeType" "GradeType" NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "maxScore" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "normalizedScore" DOUBLE PRECISION NOT NULL,
    "testDate" TIMESTAMP(3) NOT NULL,
    "academicYear" INTEGER NOT NULL,
    "semester" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GradeHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CounselingSession" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "sessionDate" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER NOT NULL,
    "type" "CounselingType" NOT NULL,
    "summary" TEXT NOT NULL,
    "followUpRequired" BOOLEAN NOT NULL DEFAULT false,
    "followUpDate" TIMESTAMP(3),
    "satisfactionScore" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CounselingSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentSatisfaction" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "surveyDate" TIMESTAMP(3) NOT NULL,
    "overallSatisfaction" INTEGER NOT NULL,
    "teachingQuality" INTEGER NOT NULL,
    "communication" INTEGER NOT NULL,
    "supportLevel" INTEGER NOT NULL,
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentSatisfaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LLMConfig" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "apiKeyEncrypted" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "isValidated" BOOLEAN NOT NULL DEFAULT false,
    "validatedAt" TIMESTAMP(3),
    "baseUrl" TEXT,
    "defaultModel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LLMConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LLMFeatureConfig" (
    "id" TEXT NOT NULL,
    "featureType" TEXT NOT NULL,
    "primaryProvider" TEXT NOT NULL,
    "fallbackOrder" JSONB NOT NULL,
    "modelOverride" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LLMFeatureConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LLMUsage" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "featureType" TEXT NOT NULL,
    "teacherId" TEXT,
    "inputTokens" INTEGER NOT NULL,
    "outputTokens" INTEGER NOT NULL,
    "totalTokens" INTEGER NOT NULL,
    "costUsd" DOUBLE PRECISION NOT NULL,
    "responseTimeMs" INTEGER NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorMessage" TEXT,
    "failoverFrom" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LLMUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LLMUsageMonthly" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "provider" TEXT NOT NULL,
    "featureType" TEXT NOT NULL,
    "totalRequests" INTEGER NOT NULL,
    "totalInputTokens" BIGINT NOT NULL,
    "totalOutputTokens" BIGINT NOT NULL,
    "totalCostUsd" DOUBLE PRECISION NOT NULL,
    "avgResponseTimeMs" DOUBLE PRECISION NOT NULL,
    "successRate" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LLMUsageMonthly_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LLMBudget" (
    "id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "budgetUsd" DOUBLE PRECISION NOT NULL,
    "alertAt80" BOOLEAN NOT NULL DEFAULT true,
    "alertAt100" BOOLEAN NOT NULL DEFAULT true,
    "lastAlertAt" TIMESTAMP(3),
    "lastAlertThreshold" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LLMBudget_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MbtiSurveyDraft_studentId_key" ON "MbtiSurveyDraft"("studentId");

-- CreateIndex
CREATE INDEX "MbtiSurveyDraft_studentId_idx" ON "MbtiSurveyDraft"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "MbtiAnalysis_studentId_key" ON "MbtiAnalysis"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "FaceAnalysis_studentId_key" ON "FaceAnalysis"("studentId");

-- CreateIndex
CREATE INDEX "FaceAnalysis_studentId_idx" ON "FaceAnalysis"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "PalmAnalysis_studentId_key" ON "PalmAnalysis"("studentId");

-- CreateIndex
CREATE INDEX "PalmAnalysis_studentId_idx" ON "PalmAnalysis"("studentId");

-- CreateIndex
CREATE INDEX "CompatibilityResult_teacherId_idx" ON "CompatibilityResult"("teacherId");

-- CreateIndex
CREATE INDEX "CompatibilityResult_studentId_idx" ON "CompatibilityResult"("studentId");

-- CreateIndex
CREATE INDEX "CompatibilityResult_overallScore_idx" ON "CompatibilityResult"("overallScore");

-- CreateIndex
CREATE UNIQUE INDEX "CompatibilityResult_teacherId_studentId_key" ON "CompatibilityResult"("teacherId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "PersonalitySummary_studentId_key" ON "PersonalitySummary"("studentId");

-- CreateIndex
CREATE INDEX "PersonalitySummary_studentId_idx" ON "PersonalitySummary"("studentId");

-- CreateIndex
CREATE INDEX "PersonalitySummaryHistory_studentId_idx" ON "PersonalitySummaryHistory"("studentId");

-- CreateIndex
CREATE INDEX "PersonalitySummaryHistory_createdAt_idx" ON "PersonalitySummaryHistory"("createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "ReportPDF_studentId_key" ON "ReportPDF"("studentId");

-- CreateIndex
CREATE INDEX "ReportPDF_studentId_idx" ON "ReportPDF"("studentId");

-- CreateIndex
CREATE INDEX "ReportPDF_status_idx" ON "ReportPDF"("status");

-- CreateIndex
CREATE INDEX "AssignmentProposal_teamId_idx" ON "AssignmentProposal"("teamId");

-- CreateIndex
CREATE INDEX "AssignmentProposal_proposedBy_idx" ON "AssignmentProposal"("proposedBy");

-- CreateIndex
CREATE INDEX "AssignmentProposal_status_idx" ON "AssignmentProposal"("status");

-- CreateIndex
CREATE INDEX "GradeHistory_studentId_subject_testDate_idx" ON "GradeHistory"("studentId", "subject", "testDate");

-- CreateIndex
CREATE INDEX "GradeHistory_studentId_academicYear_semester_idx" ON "GradeHistory"("studentId", "academicYear", "semester");

-- CreateIndex
CREATE INDEX "GradeHistory_teacherId_idx" ON "GradeHistory"("teacherId");

-- CreateIndex
CREATE INDEX "CounselingSession_studentId_sessionDate_idx" ON "CounselingSession"("studentId", "sessionDate");

-- CreateIndex
CREATE INDEX "CounselingSession_teacherId_sessionDate_idx" ON "CounselingSession"("teacherId", "sessionDate");

-- CreateIndex
CREATE INDEX "CounselingSession_studentId_type_idx" ON "CounselingSession"("studentId", "type");

-- CreateIndex
CREATE INDEX "StudentSatisfaction_studentId_surveyDate_idx" ON "StudentSatisfaction"("studentId", "surveyDate");

-- CreateIndex
CREATE INDEX "StudentSatisfaction_teacherId_surveyDate_idx" ON "StudentSatisfaction"("teacherId", "surveyDate");

-- CreateIndex
CREATE UNIQUE INDEX "StudentSatisfaction_studentId_teacherId_surveyDate_key" ON "StudentSatisfaction"("studentId", "teacherId", "surveyDate");

-- CreateIndex
CREATE UNIQUE INDEX "LLMConfig_provider_key" ON "LLMConfig"("provider");

-- CreateIndex
CREATE UNIQUE INDEX "LLMFeatureConfig_featureType_key" ON "LLMFeatureConfig"("featureType");

-- CreateIndex
CREATE INDEX "LLMUsage_provider_createdAt_idx" ON "LLMUsage"("provider", "createdAt");

-- CreateIndex
CREATE INDEX "LLMUsage_featureType_createdAt_idx" ON "LLMUsage"("featureType", "createdAt");

-- CreateIndex
CREATE INDEX "LLMUsage_teacherId_createdAt_idx" ON "LLMUsage"("teacherId", "createdAt");

-- CreateIndex
CREATE INDEX "LLMUsage_createdAt_idx" ON "LLMUsage"("createdAt");

-- CreateIndex
CREATE INDEX "LLMUsageMonthly_year_month_idx" ON "LLMUsageMonthly"("year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "LLMUsageMonthly_year_month_provider_featureType_key" ON "LLMUsageMonthly"("year", "month", "provider", "featureType");

-- CreateIndex
CREATE UNIQUE INDEX "LLMBudget_period_key" ON "LLMBudget"("period");

-- AddForeignKey
ALTER TABLE "MbtiSurveyDraft" ADD CONSTRAINT "MbtiSurveyDraft_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MbtiAnalysis" ADD CONSTRAINT "MbtiAnalysis_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaceAnalysis" ADD CONSTRAINT "FaceAnalysis_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PalmAnalysis" ADD CONSTRAINT "PalmAnalysis_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompatibilityResult" ADD CONSTRAINT "CompatibilityResult_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompatibilityResult" ADD CONSTRAINT "CompatibilityResult_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalitySummary" ADD CONSTRAINT "PersonalitySummary_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentProposal" ADD CONSTRAINT "AssignmentProposal_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentProposal" ADD CONSTRAINT "AssignmentProposal_proposedBy_fkey" FOREIGN KEY ("proposedBy") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradeHistory" ADD CONSTRAINT "GradeHistory_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradeHistory" ADD CONSTRAINT "GradeHistory_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CounselingSession" ADD CONSTRAINT "CounselingSession_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CounselingSession" ADD CONSTRAINT "CounselingSession_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentSatisfaction" ADD CONSTRAINT "StudentSatisfaction_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentSatisfaction" ADD CONSTRAINT "StudentSatisfaction_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
