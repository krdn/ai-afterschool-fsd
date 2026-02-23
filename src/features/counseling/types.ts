/**
 * @/features/counseling 타입 정의
 *
 * 상담 관리 시스템의 핵심 타입들입니다.
 * Prisma 의존성 없이 독립적으로 사용할 수 있습니다.
 */

// =============================================================================
// 상담 세션 타입
// =============================================================================

export type CounselingType = "ACADEMIC" | "CAREER" | "PSYCHOLOGICAL" | "BEHAVIORAL"

export type ReservationStatus = "SCHEDULED" | "COMPLETED" | "CANCELLED" | "NO_SHOW"

export type FollowUpScope = "today" | "week" | "all"

export type FollowUpStatus = "pending" | "overdue" | "completed"

export interface CounselingSession {
  id: string
  studentId: string
  teacherId: string
  sessionDate: Date
  type: CounselingType
  summary: string | null
  aiSummary: string | null
  duration: number
  followUpRequired: boolean
  followUpDate: Date | null
  satisfactionScore: number | null
  createdAt: Date
  updatedAt: Date
}

export interface CounselingReservation {
  id: string
  scheduledAt: Date
  studentId: string
  parentId: string
  teacherId: string
  topic: string
  status: ReservationStatus
  counselingSessionId: string | null
}

// =============================================================================
// 통계 타입
// =============================================================================

export interface TeacherMonthlyStats {
  teacherId: string
  teacherName: string
  year: number
  month: number
  sessionCount: number
  typeBreakdown: Record<CounselingType, number>
}

export interface StudentCumulativeStats {
  studentId: string
  studentName: string
  totalSessions: number
  lastSessionDate: Date | null
  typeBreakdown: Record<CounselingType, number>
}

export interface TypeDistribution {
  type: CounselingType
  count: number
  percentage: number
}

export interface MonthlyTrend {
  year: number
  month: number
  label: string
  count: number
  byType: Record<CounselingType, number>
}

// =============================================================================
// 후속 조치 타입
// =============================================================================

export interface FollowUpItem {
  sessionId: string
  studentId: string
  studentName: string
  teacherId: string
  teacherName: string
  sessionDate: Date
  followUpDate: Date | null
  type: CounselingType
  summary: string | null
  status: FollowUpStatus
}

export interface FollowUpFilter {
  scope: FollowUpScope
  includeCompleted?: boolean
  teacherId?: string
}

// =============================================================================
// AI 상담 지원 타입
// =============================================================================

export interface AISupportData {
  studentName: string
  personalitySummary: string | null
  compatibility: {
    overallScore: number
    breakdown: Record<string, number>
    reasons: string[]
  } | null
  canCalculateCompatibility: boolean
  hasAnalysisData: boolean
}
