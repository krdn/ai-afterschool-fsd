-- Add teacher analysis fields
ALTER TABLE "Teacher" ADD COLUMN "nameHanja" TEXT;
ALTER TABLE "Teacher" ADD COLUMN "birthDate" TIMESTAMP(3);
ALTER TABLE "Teacher" ADD COLUMN "birthTimeHour" INTEGER;
ALTER TABLE "Teacher" ADD COLUMN "birthTimeMinute" INTEGER;
