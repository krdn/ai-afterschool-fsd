import type { CounselingType } from "./enums";

export interface TeacherMonthlyStats {
  teacherId: string;
  teacherName: string;
  year: number;
  month: number;
  sessionCount: number;
  typeBreakdown: Record<CounselingType, number>;
}

export interface StudentCumulativeStats {
  studentId: string;
  studentName: string;
  totalSessions: number;
  lastSessionDate: Date | null;
  typeBreakdown: Record<CounselingType, number>;
}

export interface TypeDistribution {
  type: CounselingType;
  count: number;
  percentage: number;
}

export interface MonthlyTrend {
  year: number;
  month: number;
  label: string;
  count: number;
  byType?: Record<CounselingType, number>;
}

export type DatePreset = "1M" | "3M" | "6M" | "1Y";

export interface DateRange {
  start: Date;
  end: Date;
}
