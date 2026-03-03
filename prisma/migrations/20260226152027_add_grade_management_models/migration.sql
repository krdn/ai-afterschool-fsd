-- CreateEnum
CREATE TYPE "OcrDocumentType" AS ENUM ('TRANSCRIPT', 'MOCK_EXAM', 'CUSTOM');

-- CreateEnum
CREATE TYPE "OcrScanStatus" AS ENUM ('PENDING', 'PROCESSING', 'REVIEWED', 'CONFIRMED', 'FAILED');

-- CreateEnum
CREATE TYPE "AnalysisType" AS ENUM ('STRENGTH_WEAKNESS', 'STUDY_PLAN', 'GOAL_GAP', 'COACHING');

-- CreateEnum
CREATE TYPE "StudyTaskType" AS ENUM ('HOMEWORK', 'SELF_STUDY', 'TUTORING', 'REVIEW');

-- AlterEnum
ALTER TYPE "ReservationStatus" ADD VALUE 'IN_PROGRESS';

-- DropForeignKey
ALTER TABLE "PasswordResetToken" DROP CONSTRAINT "PasswordResetToken_teacherId_fkey";

-- DropIndex
DROP INDEX "idx_chat_messages_mentioned_entities";

-- AlterTable
ALTER TABLE "GradeHistory" ADD COLUMN     "category" TEXT,
ADD COLUMN     "classAverage" DOUBLE PRECISION,
ADD COLUMN     "classRank" INTEGER,
ADD COLUMN     "classStdDev" DOUBLE PRECISION,
ADD COLUMN     "gradeRank" INTEGER,
ADD COLUMN     "totalStudents" INTEGER;

-- CreateTable
CREATE TABLE "CounselingNote" (
    "id" TEXT NOT NULL,
    "counselingSessionId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "memo" TEXT,
    "checked" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CounselingNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mock_exam_results" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "teacherId" TEXT,
    "examName" TEXT NOT NULL,
    "examDate" TIMESTAMP(3) NOT NULL,
    "subject" TEXT NOT NULL,
    "rawScore" DOUBLE PRECISION NOT NULL,
    "standardScore" DOUBLE PRECISION,
    "percentile" DOUBLE PRECISION,
    "gradeRank" INTEGER,
    "academicYear" INTEGER NOT NULL,
    "notes" TEXT,
    "ocrSourceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mock_exam_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grade_ocr_scans" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "studentId" TEXT,
    "imageUrl" TEXT NOT NULL,
    "documentType" "OcrDocumentType" NOT NULL,
    "extractedData" JSONB NOT NULL,
    "processedData" JSONB,
    "status" "OcrScanStatus" NOT NULL DEFAULT 'PENDING',
    "confidence" DOUBLE PRECISION,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grade_ocr_scans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_analyses" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "teacherId" TEXT,
    "analysisType" "AnalysisType" NOT NULL,
    "targetExamType" TEXT,
    "analysisData" JSONB NOT NULL,
    "recommendations" JSONB,
    "validUntil" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learning_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "study_logs" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "teacherId" TEXT,
    "subject" TEXT,
    "studyDate" TIMESTAMP(3) NOT NULL,
    "durationMin" INTEGER NOT NULL,
    "taskType" "StudyTaskType" NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "study_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parent_grade_reports" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "parentId" TEXT,
    "reportPeriod" TEXT NOT NULL,
    "reportData" JSONB NOT NULL,
    "pdfUrl" TEXT,
    "sentAt" TIMESTAMP(3),
    "sentMethod" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parent_grade_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CounselingNote_counselingSessionId_order_idx" ON "CounselingNote"("counselingSessionId", "order");

-- CreateIndex
CREATE INDEX "mock_exam_results_studentId_subject_examDate_idx" ON "mock_exam_results"("studentId", "subject", "examDate");

-- CreateIndex
CREATE INDEX "mock_exam_results_studentId_academicYear_idx" ON "mock_exam_results"("studentId", "academicYear");

-- CreateIndex
CREATE INDEX "mock_exam_results_teacherId_idx" ON "mock_exam_results"("teacherId");

-- CreateIndex
CREATE INDEX "grade_ocr_scans_teacherId_idx" ON "grade_ocr_scans"("teacherId");

-- CreateIndex
CREATE INDEX "grade_ocr_scans_studentId_idx" ON "grade_ocr_scans"("studentId");

-- CreateIndex
CREATE INDEX "grade_ocr_scans_status_idx" ON "grade_ocr_scans"("status");

-- CreateIndex
CREATE INDEX "learning_analyses_studentId_analysisType_idx" ON "learning_analyses"("studentId", "analysisType");

-- CreateIndex
CREATE INDEX "learning_analyses_studentId_createdAt_idx" ON "learning_analyses"("studentId", "createdAt");

-- CreateIndex
CREATE INDEX "study_logs_studentId_studyDate_idx" ON "study_logs"("studentId", "studyDate");

-- CreateIndex
CREATE INDEX "study_logs_studentId_subject_idx" ON "study_logs"("studentId", "subject");

-- CreateIndex
CREATE INDEX "study_logs_teacherId_idx" ON "study_logs"("teacherId");

-- CreateIndex
CREATE INDEX "parent_grade_reports_studentId_reportPeriod_idx" ON "parent_grade_reports"("studentId", "reportPeriod");

-- CreateIndex
CREATE INDEX "parent_grade_reports_parentId_idx" ON "parent_grade_reports"("parentId");

-- AddForeignKey
ALTER TABLE "SajuAnalysisHistory" ADD CONSTRAINT "SajuAnalysisHistory_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CounselingNote" ADD CONSTRAINT "CounselingNote_counselingSessionId_fkey" FOREIGN KEY ("counselingSessionId") REFERENCES "CounselingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mock_exam_results" ADD CONSTRAINT "mock_exam_results_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mock_exam_results" ADD CONSTRAINT "mock_exam_results_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mock_exam_results" ADD CONSTRAINT "mock_exam_results_ocrSourceId_fkey" FOREIGN KEY ("ocrSourceId") REFERENCES "grade_ocr_scans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grade_ocr_scans" ADD CONSTRAINT "grade_ocr_scans_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grade_ocr_scans" ADD CONSTRAINT "grade_ocr_scans_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_analyses" ADD CONSTRAINT "learning_analyses_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_analyses" ADD CONSTRAINT "learning_analyses_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_logs" ADD CONSTRAINT "study_logs_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_logs" ADD CONSTRAINT "study_logs_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parent_grade_reports" ADD CONSTRAINT "parent_grade_reports_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parent_grade_reports" ADD CONSTRAINT "parent_grade_reports_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Parent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
