-- CreateEnum
CREATE TYPE "SubjectType" AS ENUM ('STUDENT', 'TEACHER');

-- 헬퍼: 특정 테이블의 특정 컬럼에 걸린 unique constraint를 동적으로 삭제
CREATE OR REPLACE FUNCTION _drop_unique_on_column(p_table TEXT, p_column TEXT)
RETURNS VOID AS $$
DECLARE
  v_constraint TEXT;
BEGIN
  SELECT tc.constraint_name INTO v_constraint
  FROM information_schema.table_constraints tc
  JOIN information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name
    AND tc.table_schema = ccu.table_schema
  WHERE tc.table_name = p_table
    AND tc.constraint_type = 'UNIQUE'
    AND ccu.column_name = p_column
    AND tc.table_schema = 'public'
  LIMIT 1;

  IF v_constraint IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', p_table, v_constraint);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 1. SajuAnalysis: studentId → subjectType + subjectId, usedProvider/usedModel 추가
-- ============================================================
ALTER TABLE "SajuAnalysis" ADD COLUMN "subjectType" "SubjectType";
ALTER TABLE "SajuAnalysis" ADD COLUMN IF NOT EXISTS "usedProvider" TEXT;
ALTER TABLE "SajuAnalysis" ADD COLUMN IF NOT EXISTS "usedModel" TEXT;
ALTER TABLE "SajuAnalysis" RENAME COLUMN "studentId" TO "subjectId";

-- 기존 데이터를 STUDENT로 마킹
UPDATE "SajuAnalysis" SET "subjectType" = 'STUDENT' WHERE "subjectType" IS NULL;
ALTER TABLE "SajuAnalysis" ALTER COLUMN "subjectType" SET NOT NULL;

-- Teacher 데이터 이관
INSERT INTO "SajuAnalysis" ("id", "subjectType", "subjectId", "inputSnapshot", "result", "interpretation", "status", "version", "calculatedAt", "createdAt", "updatedAt", "usedProvider", "usedModel")
SELECT "id", 'TEACHER', "teacherId", "inputSnapshot", "result", "interpretation", "status", "version", "calculatedAt", "createdAt", "updatedAt", "usedProvider", "usedModel"
FROM "TeacherSajuAnalysis";

-- 기존 unique 제약 조건 삭제 후 새 제약 조건 추가
SELECT _drop_unique_on_column('SajuAnalysis', 'subjectId');
DROP INDEX IF EXISTS "SajuAnalysis_subjectId_key";
ALTER TABLE "SajuAnalysis" ADD CONSTRAINT "SajuAnalysis_subjectType_subjectId_key" UNIQUE ("subjectType", "subjectId");
CREATE INDEX IF NOT EXISTS "SajuAnalysis_subjectId_idx" ON "SajuAnalysis"("subjectId");

-- FK 삭제
ALTER TABLE "SajuAnalysis" DROP CONSTRAINT IF EXISTS "SajuAnalysis_studentId_fkey";

-- ============================================================
-- 2. NameAnalysis: studentId → subjectType + subjectId
-- ============================================================
ALTER TABLE "NameAnalysis" ADD COLUMN "subjectType" "SubjectType";
ALTER TABLE "NameAnalysis" RENAME COLUMN "studentId" TO "subjectId";

UPDATE "NameAnalysis" SET "subjectType" = 'STUDENT' WHERE "subjectType" IS NULL;
ALTER TABLE "NameAnalysis" ALTER COLUMN "subjectType" SET NOT NULL;

INSERT INTO "NameAnalysis" ("id", "subjectType", "subjectId", "inputSnapshot", "result", "interpretation", "status", "version", "calculatedAt", "createdAt", "updatedAt")
SELECT "id", 'TEACHER', "teacherId", "inputSnapshot", "result", "interpretation", "status", "version", "calculatedAt", "createdAt", "updatedAt"
FROM "TeacherNameAnalysis";

SELECT _drop_unique_on_column('NameAnalysis', 'subjectId');
DROP INDEX IF EXISTS "NameAnalysis_subjectId_key";
ALTER TABLE "NameAnalysis" ADD CONSTRAINT "NameAnalysis_subjectType_subjectId_key" UNIQUE ("subjectType", "subjectId");
CREATE INDEX IF NOT EXISTS "NameAnalysis_subjectId_idx" ON "NameAnalysis"("subjectId");

ALTER TABLE "NameAnalysis" DROP CONSTRAINT IF EXISTS "NameAnalysis_studentId_fkey";

-- ============================================================
-- 3. MbtiAnalysis: studentId → subjectType + subjectId
-- ============================================================
ALTER TABLE "MbtiAnalysis" ADD COLUMN "subjectType" "SubjectType";
ALTER TABLE "MbtiAnalysis" RENAME COLUMN "studentId" TO "subjectId";

UPDATE "MbtiAnalysis" SET "subjectType" = 'STUDENT' WHERE "subjectType" IS NULL;
ALTER TABLE "MbtiAnalysis" ALTER COLUMN "subjectType" SET NOT NULL;

INSERT INTO "MbtiAnalysis" ("id", "subjectType", "subjectId", "responses", "scores", "mbtiType", "percentages", "interpretation", "version", "calculatedAt", "createdAt", "updatedAt")
SELECT "id", 'TEACHER', "teacherId", "responses", "scores", "mbtiType", "percentages", "interpretation", "version", "calculatedAt", "createdAt", "updatedAt"
FROM "TeacherMbtiAnalysis";

SELECT _drop_unique_on_column('MbtiAnalysis', 'subjectId');
DROP INDEX IF EXISTS "MbtiAnalysis_subjectId_key";
ALTER TABLE "MbtiAnalysis" ADD CONSTRAINT "MbtiAnalysis_subjectType_subjectId_key" UNIQUE ("subjectType", "subjectId");
CREATE INDEX IF NOT EXISTS "MbtiAnalysis_subjectId_idx" ON "MbtiAnalysis"("subjectId");

ALTER TABLE "MbtiAnalysis" DROP CONSTRAINT IF EXISTS "MbtiAnalysis_studentId_fkey";

-- ============================================================
-- 4. FaceAnalysis: studentId → subjectType + subjectId
-- ============================================================
ALTER TABLE "FaceAnalysis" ADD COLUMN "subjectType" "SubjectType";
ALTER TABLE "FaceAnalysis" RENAME COLUMN "studentId" TO "subjectId";

UPDATE "FaceAnalysis" SET "subjectType" = 'STUDENT' WHERE "subjectType" IS NULL;
ALTER TABLE "FaceAnalysis" ALTER COLUMN "subjectType" SET NOT NULL;

INSERT INTO "FaceAnalysis" ("id", "subjectType", "subjectId", "imageUrl", "result", "status", "errorMessage", "version", "analyzedAt", "createdAt", "updatedAt")
SELECT "id", 'TEACHER', "teacherId", "imageUrl", "result", "status", "errorMessage", "version", "analyzedAt", "createdAt", "updatedAt"
FROM "TeacherFaceAnalysis";

SELECT _drop_unique_on_column('FaceAnalysis', 'subjectId');
DROP INDEX IF EXISTS "FaceAnalysis_studentId_idx";
DROP INDEX IF EXISTS "FaceAnalysis_subjectId_key";
ALTER TABLE "FaceAnalysis" ADD CONSTRAINT "FaceAnalysis_subjectType_subjectId_key" UNIQUE ("subjectType", "subjectId");
CREATE INDEX IF NOT EXISTS "FaceAnalysis_subjectId_idx" ON "FaceAnalysis"("subjectId");

ALTER TABLE "FaceAnalysis" DROP CONSTRAINT IF EXISTS "FaceAnalysis_studentId_fkey";

-- ============================================================
-- 5. PalmAnalysis: studentId → subjectType + subjectId
-- ============================================================
ALTER TABLE "PalmAnalysis" ADD COLUMN "subjectType" "SubjectType";
ALTER TABLE "PalmAnalysis" RENAME COLUMN "studentId" TO "subjectId";

UPDATE "PalmAnalysis" SET "subjectType" = 'STUDENT' WHERE "subjectType" IS NULL;
ALTER TABLE "PalmAnalysis" ALTER COLUMN "subjectType" SET NOT NULL;

INSERT INTO "PalmAnalysis" ("id", "subjectType", "subjectId", "hand", "imageUrl", "result", "status", "errorMessage", "version", "analyzedAt", "createdAt", "updatedAt")
SELECT "id", 'TEACHER', "teacherId", "hand", "imageUrl", "result", "status", "errorMessage", "version", "analyzedAt", "createdAt", "updatedAt"
FROM "TeacherPalmAnalysis";

SELECT _drop_unique_on_column('PalmAnalysis', 'subjectId');
DROP INDEX IF EXISTS "PalmAnalysis_studentId_idx";
DROP INDEX IF EXISTS "PalmAnalysis_subjectId_key";
ALTER TABLE "PalmAnalysis" ADD CONSTRAINT "PalmAnalysis_subjectType_subjectId_key" UNIQUE ("subjectType", "subjectId");
CREATE INDEX IF NOT EXISTS "PalmAnalysis_subjectId_idx" ON "PalmAnalysis"("subjectId");

ALTER TABLE "PalmAnalysis" DROP CONSTRAINT IF EXISTS "PalmAnalysis_studentId_fkey";

-- ============================================================
-- 6. Teacher 전용 테이블 삭제
-- ============================================================
DROP TABLE IF EXISTS "TeacherSajuAnalysis";
DROP TABLE IF EXISTS "TeacherMbtiAnalysis";
DROP TABLE IF EXISTS "TeacherNameAnalysis";
DROP TABLE IF EXISTS "TeacherFaceAnalysis";
DROP TABLE IF EXISTS "TeacherPalmAnalysis";

-- 헬퍼 함수 정리
DROP FUNCTION IF EXISTS _drop_unique_on_column(TEXT, TEXT);
