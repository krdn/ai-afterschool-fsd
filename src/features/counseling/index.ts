// 타입
export type {
  CounselingType,
  ReservationStatus,
  FollowUpScope,
  FollowUpStatus,
  CounselingSession,
  CounselingReservation,
  TeacherMonthlyStats,
  StudentCumulativeStats,
  TypeDistribution,
  MonthlyTrend,
  FollowUpItem,
  FollowUpFilter,
  AISupportData,
} from "./types"

// 통계 유틸리티
export {
  calculateTypeDistribution,
  calculateMonthlyTrend,
  determineFollowUpStatus,
  processFollowUps,
  countOverdueFollowUps,
  getCounselingTypeLabel,
  getReservationStatusLabel,
} from "./stats"

export * from "./repositories/index"
