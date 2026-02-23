/**
 * 후속 조치 타입 정의
 * Phase 21-02: Statistics & Dashboard
 */

/**
 * 후속 조치 상태
 * - pending: 후속 조치 예정 (followUpDate가 미래)
 * - overdue: 후속 조치 지연 (followUpDate가 과거이고 미완료)
 * - completed: 후속 조치 완료
 */
export type FollowUpStatus = 'pending' | 'overdue' | 'completed';

/**
 * 후속 조치 항목
 */
export interface FollowUpItem {
  /** CounselingSession ID */
  id: string;

  /** 학생 ID */
  studentId: string;

  /** 학생 이름 */
  studentName: string;

  /** 선생님 ID */
  teacherId: string;

  /** 선생님 이름 */
  teacherName: string;

  /** 원본 상담 날짜 */
  sessionDate: Date;

  /** 후속 조치 예정일 */
  followUpDate: Date;

  /** 상담 요약 */
  summary: string;

  /** 후속 조치 상태 */
  status: FollowUpStatus;

  /** 완료 시각 (완료된 경우) */
  completedAt?: Date;

  /** 완료 메모 (완료된 경우) */
  completionNote?: string;
}

/**
 * 후속 조치 필터 옵션
 */
export interface FollowUpFilter {
  /** 기간 범위 */
  scope: 'today' | 'week' | 'all';

  /** 완료된 항목 포함 여부 */
  includeCompleted?: boolean;

  /** 선생님 ID 필터 (특정 선생님만 조회) */
  teacherId?: string;
}

/**
 * 후속 조치 완료 입력
 */
export interface CompleteFollowUpInput {
  /** CounselingSession ID */
  sessionId: string;

  /** 완료 메모 (선택) */
  completionNote?: string;
}
