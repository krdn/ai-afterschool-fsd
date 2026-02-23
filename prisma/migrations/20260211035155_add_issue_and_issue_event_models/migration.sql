-- CreateEnum
CREATE TYPE "IssueCategory" AS ENUM ('BUG', 'FEATURE', 'IMPROVEMENT', 'UI_UX', 'DOCUMENTATION', 'PERFORMANCE', 'SECURITY');

-- CreateEnum
CREATE TYPE "IssueStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'IN_REVIEW', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "IssuePriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateTable
CREATE TABLE "issues" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "IssueCategory" NOT NULL,
    "priority" "IssuePriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "IssueStatus" NOT NULL DEFAULT 'OPEN',
    "githubIssueNumber" INTEGER,
    "githubIssueUrl" TEXT,
    "githubBranchName" TEXT,
    "screenshotUrl" TEXT,
    "userContext" JSONB,
    "createdBy" TEXT NOT NULL,
    "assignedTo" TEXT,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "issue_events" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "performedBy" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "issue_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "issues_githubIssueNumber_key" ON "issues"("githubIssueNumber");

-- CreateIndex
CREATE INDEX "issues_status_idx" ON "issues"("status");

-- CreateIndex
CREATE INDEX "issues_category_idx" ON "issues"("category");

-- CreateIndex
CREATE INDEX "issues_createdBy_idx" ON "issues"("createdBy");

-- CreateIndex
CREATE INDEX "issues_githubIssueNumber_idx" ON "issues"("githubIssueNumber");

-- CreateIndex
CREATE INDEX "issues_createdAt_idx" ON "issues"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "issue_events_issueId_idx" ON "issue_events"("issueId");

-- CreateIndex
CREATE INDEX "issue_events_eventType_idx" ON "issue_events"("eventType");

-- CreateIndex
CREATE INDEX "issue_events_createdAt_idx" ON "issue_events"("createdAt" DESC);

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issue_events" ADD CONSTRAINT "issue_events_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "issues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issue_events" ADD CONSTRAINT "issue_events_performedBy_fkey" FOREIGN KEY ("performedBy") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
