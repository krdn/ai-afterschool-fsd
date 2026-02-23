-- DropIndex
DROP INDEX "FaceAnalysis_studentId_key";

-- DropIndex
DROP INDEX "MbtiAnalysis_studentId_key";

-- DropIndex
DROP INDEX "NameAnalysis_studentId_key";

-- DropIndex
DROP INDEX "PalmAnalysis_studentId_key";

-- DropIndex
DROP INDEX "SajuAnalysis_studentId_key";

-- AlterTable
ALTER TABLE "FaceAnalysis" ADD COLUMN     "usedModel" TEXT,
ADD COLUMN     "usedProvider" TEXT;
