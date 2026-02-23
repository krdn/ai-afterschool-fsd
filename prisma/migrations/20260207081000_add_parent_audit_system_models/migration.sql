-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateTable
CREATE TABLE "Parent" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "relation" TEXT NOT NULL DEFAULT 'OTHER',
    "phone" TEXT,
    "email" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Parent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParentCounselingReservation" (
    "id" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "studentId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "status" "ReservationStatus" NOT NULL DEFAULT 'SCHEDULED',
    "counselingSessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParentCounselingReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "changes" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_logs" (
    "id" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "context" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_logs_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Student" ADD COLUMN "primaryParentId" TEXT;

-- CreateIndex
CREATE INDEX "Parent_studentId_idx" ON "Parent"("studentId");
CREATE INDEX "Parent_studentId_isPrimary_idx" ON "Parent"("studentId", "isPrimary");

-- CreateIndex
CREATE UNIQUE INDEX "ParentCounselingReservation_counselingSessionId_key" ON "ParentCounselingReservation"("counselingSessionId");
CREATE INDEX "ParentCounselingReservation_studentId_idx" ON "ParentCounselingReservation"("studentId");
CREATE INDEX "ParentCounselingReservation_teacherId_idx" ON "ParentCounselingReservation"("teacherId");
CREATE INDEX "ParentCounselingReservation_parentId_idx" ON "ParentCounselingReservation"("parentId");
CREATE INDEX "ParentCounselingReservation_scheduledAt_idx" ON "ParentCounselingReservation"("scheduledAt");
CREATE INDEX "ParentCounselingReservation_studentId_scheduledAt_idx" ON "ParentCounselingReservation"("studentId", "scheduledAt");
CREATE INDEX "ParentCounselingReservation_teacherId_scheduledAt_idx" ON "ParentCounselingReservation"("teacherId", "scheduledAt");

-- CreateIndex
CREATE INDEX "Student_primaryParentId_idx" ON "Student"("primaryParentId");

-- CreateIndex
CREATE INDEX "audit_logs_teacherId_idx" ON "audit_logs"("teacherId");
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "system_logs_level_idx" ON "system_logs"("level");
CREATE INDEX "system_logs_timestamp_idx" ON "system_logs"("timestamp" DESC);

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_primaryParentId_fkey" FOREIGN KEY ("primaryParentId") REFERENCES "Parent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parent" ADD CONSTRAINT "Parent_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentCounselingReservation" ADD CONSTRAINT "ParentCounselingReservation_counselingSessionId_fkey" FOREIGN KEY ("counselingSessionId") REFERENCES "CounselingSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ParentCounselingReservation" ADD CONSTRAINT "ParentCounselingReservation_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Parent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ParentCounselingReservation" ADD CONSTRAINT "ParentCounselingReservation_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ParentCounselingReservation" ADD CONSTRAINT "ParentCounselingReservation_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: Add missing columns
ALTER TABLE "CounselingSession" ADD COLUMN "aiSummary" TEXT;
ALTER TABLE "PersonalitySummary" ADD COLUMN "scores" JSONB;
ALTER TABLE "Parent" ADD COLUMN "relationOther" TEXT;
ALTER TABLE "Parent" ADD COLUMN "note" TEXT;
