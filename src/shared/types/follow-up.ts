/**
 * 후속 조치 타입 정의
 */

export type FollowUpStatus = "pending" | "overdue" | "completed";

export interface FollowUpItem {
  id: string;
  studentId: string;
  studentName: string;
  teacherId: string;
  teacherName: string;
  sessionDate: Date;
  followUpDate: Date;
  summary: string;
  status: FollowUpStatus;
  completedAt?: Date;
  completionNote?: string;
}

export interface FollowUpFilter {
  scope: "today" | "week" | "all";
  includeCompleted?: boolean;
  teacherId?: string;
}

export interface CompleteFollowUpInput {
  sessionId: string;
  completionNote?: string;
}
