/**
 * @/features/report 타입 정의
 *
 * PDF 보고서 생성에 필요한 데이터 타입들입니다.
 * @react-pdf/renderer 의존성 없는 순수 타입 정의입니다.
 */

// =============================================================================
// 학생 정보
// =============================================================================

export interface StudentReportData {
  name: string
  birthDate: Date
  school: string
  grade: number
  targetUniversity?: string | null
  targetMajor?: string | null
  bloodType?: string | null
}

// =============================================================================
// 분석 결과
// =============================================================================

export interface SajuAnalysis {
  result: unknown
  interpretation: string | null
  calculatedAt: Date | null
}

export interface NameAnalysis {
  result: unknown
  interpretation: string | null
  calculatedAt: Date | null
}

export interface MbtiAnalysis {
  mbtiType: string
  percentages: Record<string, number>
  calculatedAt: Date
}

export interface FaceAnalysis {
  result: unknown
  status: string
  errorMessage: string | null
}

export interface PalmAnalysis {
  result: unknown
  status: string
  errorMessage: string | null
}

export interface AnalysesData {
  saju: SajuAnalysis | null
  name: NameAnalysis | null
  mbti: MbtiAnalysis | null
  face: FaceAnalysis | null
  palm: PalmAnalysis | null
}

// =============================================================================
// AI 성향 요약
// =============================================================================

export interface LearningStrategy {
  summary?: string
  learningStyle?: string
  subjectApproaches?: Array<{
    subject: string
    approach: string
  }>
}

export interface CareerGuidance {
  summary?: string
  recommendedMajors?: Array<{
    major: string
    reason: string
  }>
  recommendedCareers?: Array<{
    career: string
    reason: string
  }>
}

export interface PersonalitySummaryData {
  coreTraits: string | null
  learningStrategy: LearningStrategy | null
  careerGuidance: CareerGuidance | null
  status: string
}

// =============================================================================
// 보고서 전체
// =============================================================================

export interface ConsultationReportData {
  student: StudentReportData
  analyses: AnalysesData
  personalitySummary: PersonalitySummaryData | null
  generatedAt: Date
}

// =============================================================================
// PDF 색상 팔레트
// =============================================================================

export interface ColorPalette {
  primary: string
  gray: Record<string, string>
}
