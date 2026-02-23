import { CounselingType } from '@/lib/db';

/**
 * 선생님별 월간 상담 통계
 */
export interface TeacherMonthlyStats {
  teacherId: string;
  teacherName: string;
  year: number;
  month: number;
  sessionCount: number;
  typeBreakdown: Record<CounselingType, number>;
}

/**
 * 학생별 누적 상담 통계
 */
export interface StudentCumulativeStats {
  studentId: string;
  studentName: string;
  totalSessions: number;
  lastSessionDate: Date | null;
  typeBreakdown: Record<CounselingType, number>;
}

/**
 * 상담 유형별 분포
 */
export interface TypeDistribution {
  type: CounselingType;
  count: number;
  percentage: number;
}

/**
 * 월별 상담 추이
 */
export interface MonthlyTrend {
  year: number;
  month: number;
  label: string; // 예: "2026-01"
  count: number;
  byType?: Record<CounselingType, number>; // 선택적 유형별 세부 분포
}

/**
 * 날짜 범위 프리셋
 */
export type DatePreset = '1M' | '3M' | '6M' | '1Y';

/**
 * 날짜 범위
 */
export interface DateRange {
  start: Date;
  end: Date;
}
