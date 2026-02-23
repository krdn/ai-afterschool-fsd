-- CreateEnum
CREATE TYPE "StudentImageType" AS ENUM ('profile', 'face', 'palm');

-- CreateTable
CREATE TABLE "StudentImage" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "type" "StudentImageType" NOT NULL,
    "originalUrl" TEXT NOT NULL,
    "resizedUrl" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "format" TEXT,
    "bytes" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudentImage_studentId_idx" ON "StudentImage"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentImage_studentId_type_key" ON "StudentImage"("studentId", "type");

-- AddForeignKey
ALTER TABLE "StudentImage" ADD CONSTRAINT "StudentImage_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
