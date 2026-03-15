import type { Prisma } from '@prisma/client'

// === DB 모델 기반 타입 ===

export type UniversityWithMajors = Prisma.UniversityGetPayload<{
  include: { majors: true }
}>

export type UniversityMajorWithCutoffs = Prisma.UniversityMajorGetPayload<{
  include: { cutoffs: true; university: true }
}>

export type StudentTargetWithDetails = Prisma.StudentTargetGetPayload<{
  include: {
    universityMajor: {
      include: { university: true; cutoffs: true }
    }
  }
}>

// === AI 리서치 수집 결과 ===

export type AIResearchResult = {
  university: {
    name: string
    nameShort?: string
    type: 'FOUR_YEAR' | 'COLLEGE' | 'CYBER' | 'EDUCATION'
    region: string
    website?: string
  }
  majors: {
    majorName: string
    department?: string
    requiredSubjects: string[]
    preparationGuide?: string
    cutoffs: {
      academicYear: number
      admissionType: string
      cutoffGrade?: number
      cutoffScore?: number
      cutoffPercentile?: number
      competitionRate?: number
      enrollmentCount?: number
      applicantCount?: number
      additionalInfo?: string
    }[]
  }[]
  sources: string[]
}

// === 합격 가능성 분석 ===

export type AdmissionAnalysisInput = {
  student: {
    grades: { subject: string; score: number; gradeRank?: number }[]
    mockExams: { subject: string; standardScore?: number; percentile?: number; gradeRank?: number }[]
    trend: 'UP' | 'STABLE' | 'DOWN'
    varkType?: string
    mbtiType?: string
  }
  target: {
    universityName: string
    majorName: string
    admissionType: string
    cutoffs: {
      academicYear: number
      cutoffGrade?: number
      cutoffScore?: number
      cutoffPercentile?: number
      competitionRate?: number
    }[]
  }
}

export type AdmissionAnalysisResult = {
  probability: number
  grade: '안정' | '적정' | '도전' | '상향도전'
  currentVsCutoff: {
    subject: string
    current: number
    cutoff: number
    gap: number
    status: 'ABOVE' | 'AT' | 'BELOW'
  }[]
  improvementPriority: {
    subject: string
    targetImprovement: number
    strategy: string
  }[]
  overallAdvice: string
  references: string[]
}

// === 커트라인 추세 ===

export type CutoffTrendData = {
  majorName: string
  admissionType: string
  trends: {
    academicYear: number
    cutoffGrade?: number
    cutoffScore?: number
    competitionRate?: number
    enrollmentCount?: number
  }[]
}

// === 설정 ===

export type AdmissionSettings = {
  defaultAcademicYear: number
  defaultAdmissionType: string
  autoAnalysis: boolean
  analysisRefreshDays: number
  showTrendChart: boolean
  maxTargetsPerStudent: number
}

export const DEFAULT_ADMISSION_SETTINGS: AdmissionSettings = {
  defaultAcademicYear: new Date().getFullYear() + 1,
  defaultAdmissionType: '수시',
  autoAnalysis: true,
  analysisRefreshDays: 7,
  showTrendChart: true,
  maxTargetsPerStudent: 5,
}

// === 합격 가능성 등급 기준 (MVP 고정값) ===

export const PROBABILITY_THRESHOLDS = {
  safe: 80,
  moderate: 50,
  challenge: 30,
} as const

export function getProbabilityGrade(probability: number): AdmissionAnalysisResult['grade'] {
  if (probability >= PROBABILITY_THRESHOLDS.safe) return '안정'
  if (probability >= PROBABILITY_THRESHOLDS.moderate) return '적정'
  if (probability >= PROBABILITY_THRESHOLDS.challenge) return '도전'
  return '상향도전'
}
