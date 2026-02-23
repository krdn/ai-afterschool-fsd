-- CreateIndex
CREATE INDEX IF NOT EXISTS "Student_teacherId_name_idx" ON "Student"("teacherId", "name");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Student_teacherId_school_idx" ON "Student"("teacherId", "school");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Student_expiresAt_idx" ON "Student"("expiresAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Student_calculationRecalculationNeeded_idx" ON "Student"("calculationRecalculationNeeded");
