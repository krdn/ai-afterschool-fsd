-- CreateTeacherFaceAnalysis table
CREATE TABLE "TeacherFaceAnalysis" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "result" jsonb NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'complete',
    "errorMessage" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "analyzedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherFaceAnalysis_pkey" PRIMARY KEY ("id")
);

-- Create unique index
CREATE UNIQUE INDEX "TeacherFaceAnalysis_teacherId_key" ON "TeacherFaceAnalysis"("teacherId");

-- Create regular index
CREATE INDEX "TeacherFaceAnalysis_teacherId_idx" ON "TeacherFaceAnalysis"("teacherId");

-- Add foreign key constraint
ALTER TABLE "TeacherFaceAnalysis" ADD CONSTRAINT "TeacherFaceAnalysis_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
