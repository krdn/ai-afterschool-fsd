-- CreateTeacherPalmAnalysis table
CREATE TABLE "TeacherPalmAnalysis" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "hand" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "result" jsonb NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'complete',
    "errorMessage" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "analyzedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherPalmAnalysis_pkey" PRIMARY KEY ("id")
);

-- Create unique index
CREATE UNIQUE INDEX "TeacherPalmAnalysis_teacherId_key" ON "TeacherPalmAnalysis"("teacherId");

-- Create regular index
CREATE INDEX "TeacherPalmAnalysis_teacherId_idx" ON "TeacherPalmAnalysis"("teacherId");

-- Add foreign key constraint
ALTER TABLE "TeacherPalmAnalysis" ADD CONSTRAINT "TeacherPalmAnalysis_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
