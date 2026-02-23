-- 1. 테이블 이름을 analysis_prompt_presets로 변경
ALTER TABLE "SajuPromptPreset" RENAME TO "analysis_prompt_presets";

-- 2. analysisType 컬럼 추가 (기본값 "saju"로 설정하여 기존 데이터 보존)
ALTER TABLE "analysis_prompt_presets" ADD COLUMN "analysisType" TEXT NOT NULL DEFAULT 'saju';

-- 3. 기존 promptKey UNIQUE 제약/인덱스 제거 (constraint 또는 index 형태일 수 있음)
ALTER TABLE "analysis_prompt_presets" DROP CONSTRAINT IF EXISTS "SajuPromptPreset_promptKey_key";
DROP INDEX IF EXISTS "SajuPromptPreset_promptKey_key";

-- 4. (promptKey, analysisType) 복합 UNIQUE 제약 조건 추가
ALTER TABLE "analysis_prompt_presets" ADD CONSTRAINT "analysis_prompt_presets_promptKey_analysisType_key" UNIQUE ("promptKey", "analysisType");

-- 5. 기존 인덱스 제거
DROP INDEX IF EXISTS "SajuPromptPreset_isActive_idx";
DROP INDEX IF EXISTS "SajuPromptPreset_sortOrder_idx";

-- 6. 새 인덱스 생성
CREATE INDEX "analysis_prompt_presets_analysisType_isActive_idx" ON "analysis_prompt_presets"("analysisType", "isActive");
CREATE INDEX "analysis_prompt_presets_sortOrder_idx" ON "analysis_prompt_presets"("sortOrder");
