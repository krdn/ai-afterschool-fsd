-- AddForeignKey
ALTER TABLE "TeacherSajuAnalysisHistory" ADD CONSTRAINT "TeacherSajuAnalysisHistory_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
