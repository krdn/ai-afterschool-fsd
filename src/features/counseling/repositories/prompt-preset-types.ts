// ---------------------------------------------------------------------------
// 상담 프롬프트 프리셋 — 타입 & 상수
// Client Component에서 안전하게 import 가능 (DB 의존성 없음)
// ---------------------------------------------------------------------------

export type CounselingPromptType =
  | "analysis_report"
  | "scenario"
  | "parent_summary"
  | "counseling_summary"
  | "personality_summary"

export type CounselingPromptPresetData = {
  id: string
  promptType: CounselingPromptType
  name: string
  description: string
  promptTemplate: string
  systemPrompt: string | null
  maxOutputTokens: number
  temperature: number
  isBuiltIn: boolean
  isActive: boolean
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}

export type CreateCounselingPresetInput = {
  promptType: CounselingPromptType
  name: string
  description?: string
  promptTemplate: string
  systemPrompt?: string | null
  maxOutputTokens?: number
  temperature?: number
  isBuiltIn?: boolean
  sortOrder?: number
}

export type UpdateCounselingPresetInput = {
  name?: string
  description?: string
  promptTemplate?: string
  systemPrompt?: string | null
  maxOutputTokens?: number
  temperature?: number
  isActive?: boolean
  sortOrder?: number
}

export const TEMPLATE_VARIABLES: Record<CounselingPromptType, string[]> = {
  analysis_report: [
    "studentName", "school", "grade", "topic",
    "personalitySection", "previousSessionsSection", "gradeHistorySection",
  ],
  scenario: [
    "studentName", "topic", "approvedReport", "personalitySummary",
  ],
  parent_summary: [
    "studentName", "topic", "scheduledAt", "approvedScenario",
  ],
  counseling_summary: [
    "studentName", "sessionDate", "sessionType",
    "personalitySection", "previousSessionsSection", "currentSummary",
  ],
  personality_summary: [
    "studentName", "mbtiSection", "sajuSection",
    "nameSection", "faceSection", "palmSection",
  ],
}

export const PROMPT_TYPE_LABELS: Record<CounselingPromptType, string> = {
  analysis_report: "분석 보고서",
  scenario: "상담 시나리오",
  parent_summary: "학부모 메시지",
  counseling_summary: "상담 요약",
  personality_summary: "성향 요약",
}
