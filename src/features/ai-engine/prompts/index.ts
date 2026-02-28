export {
  FACE_READING_PROMPT,
  PALM_READING_PROMPT,
  SAJU_INTERPRETATION_PROMPT,
  MBTI_INTERPRETATION_PROMPT,
  DISCLAIMER_TEXT,
} from "./base"

export {
  getPromptOptions as getSajuPromptOptions,
  getPromptDefinition as getSajuPromptDefinition,
  buildPromptFromTemplate as buildSajuPromptFromTemplate,
  getBuiltInSeedData as getSajuSeedData,
  getPromptPreviewText as getSajuPromptPreviewText,
  getTemplatePreviewText as getSajuTemplatePreviewText,
  type AnalysisPromptId,
  type AnalysisPromptMeta,
  type AnalysisPromptDefinition,
  type StudentInfo as SajuStudentInfo,
} from "./saju"

export {
  getPromptOptions as getMbtiPromptOptions,
  getMbtiPrompt,
  getBuiltInSeedData as getMbtiSeedData,
  type MbtiPromptId,
  type MbtiPromptMeta,
  type MbtiPromptDefinition,
  type StudentInfo as MbtiStudentInfo,
} from "./mbti"

export {
  getPromptOptions as getFacePromptOptions,
  getFacePrompt,
  getBuiltInSeedData as getFaceSeedData,
  type FacePromptId,
  type FacePromptMeta,
  type FacePromptDefinition,
  type StudentInfo as FaceStudentInfo,
} from "./face"

export {
  getPromptOptions as getPalmPromptOptions,
  getPalmPrompt,
  getBuiltInSeedData as getPalmSeedData,
  type PalmPromptId,
  type PalmPromptMeta,
  type PalmPromptDefinition,
  type StudentInfo as PalmStudentInfo,
} from "./palm"

export {
  getPromptOptions as getVarkPromptOptions,
  getVarkPrompt,
  getBuiltInSeedData as getVarkSeedData,
  type VarkPromptId,
  type VarkPromptDefinition,
} from "./vark"

export {
  getPromptOptions as getZodiacPromptOptions,
  getZodiacPrompt,
  getBuiltInSeedData as getZodiacSeedData,
  type ZodiacPromptId,
  type ZodiacPromptDefinition,
} from "./zodiac"

export {
  getPromptOptions as getNamePromptOptions,
  getNamePrompt,
  getBuiltInSeedData as getNameSeedData,
  type NamePromptId,
  type NamePromptDefinition,
} from "./name"

export {
  COMPATIBILITY_SYSTEM_PROMPT,
  buildCompatibilityPrompt,
  type StudentData as CompatibilityStudentData,
  type TeacherData as CompatibilityTeacherData,
} from "./compatibility"

// counseling.ts는 DB 의존성(prompt-preset)이 있어 barrel export에서 제외
// Server Action에서 직접 import: '@/features/ai-engine/prompts/counseling'

export {
  buildLearningStrategyPrompt,
  buildCareerGuidancePrompt,
} from "./integration"
