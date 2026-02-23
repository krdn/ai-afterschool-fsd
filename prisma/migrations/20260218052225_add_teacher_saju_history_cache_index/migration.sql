-- CreateIndex
CREATE INDEX "TeacherSajuAnalysisHistory_teacherId_promptId_usedProvider_idx" ON "TeacherSajuAnalysisHistory"("teacherId", "promptId", "usedProvider");
