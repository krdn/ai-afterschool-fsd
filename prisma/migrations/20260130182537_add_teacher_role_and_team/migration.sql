-- CreateEnum
CREATE TYPE "Role" AS ENUM ('DIRECTOR', 'TEAM_LEADER', 'MANAGER', 'TEACHER');

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Team_name_key" ON "Team"("name");

-- AlterTable
ALTER TABLE "Teacher" ADD COLUMN "role" "Role" NOT NULL DEFAULT 'TEACHER',
ADD COLUMN "teamId" TEXT;

-- AlterTable
ALTER TABLE "Student" ADD COLUMN "teamId" TEXT;

-- AddForeignKey
ALTER TABLE "Teacher" ADD CONSTRAINT "Teacher_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Teacher_teamId_idx" ON "Teacher"("teamId");

-- CreateIndex
CREATE INDEX "Student_teamId_idx" ON "Student"("teamId");
