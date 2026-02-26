import { db } from '@/lib/db/client';
import { type StudyTaskType } from '@/lib/db';
import { calculateConsistencyScore } from '../analysis/stat-analyzer';
import { logger } from '@/lib/logger';

// =============================================================================
// 타입 정의
// =============================================================================

export interface AddStudyLogInput {
  studyDate: Date;
  subject?: string;
  durationMin: number;
  taskType: StudyTaskType;
  notes?: string;
}

export interface GetStudyLogsOptions {
  /** 조회 시작일 */
  from?: Date;
  /** 조회 종료일 */
  to?: Date;
  /** 과목 필터 */
  subject?: string;
  /** 최대 조회 건수 */
  limit?: number;
}

export interface StudyStats {
  /** 총 학습 시간 (분) */
  totalMinutes: number;
  /** 일 평균 학습 시간 (분) */
  dailyAverageMinutes: number;
  /** 과목별 학습 시간 분포 */
  subjectDistribution: Array<{
    subject: string;
    totalMinutes: number;
    percentage: number;
  }>;
  /** 학습 규칙성 점수 (0~100) */
  consistencyScore: number;
  /** 학습 유형별 분포 */
  taskTypeDistribution: Array<{
    taskType: string;
    count: number;
    totalMinutes: number;
  }>;
  /** 일별 학습 시간 */
  dailyStudyTime: Array<{
    date: string;
    totalMinutes: number;
  }>;
}

// =============================================================================
// 서비스 함수
// =============================================================================

/**
 * 학습 기록을 생성한다.
 */
export async function addStudyLog(
  studentId: string,
  data: AddStudyLogInput,
  teacherId?: string
) {
  try {
    const log = await db.studyLog.create({
      data: {
        studentId,
        teacherId,
        studyDate: data.studyDate,
        subject: data.subject,
        durationMin: data.durationMin,
        taskType: data.taskType,
        notes: data.notes,
      },
    });
    return log;
  } catch (error) {
    logger.error({ err: error, studentId }, '학습 기록 생성 실패');
    throw error;
  }
}

/**
 * 학생의 학습 기록을 기간별로 조회한다.
 */
export async function getStudyLogs(
  studentId: string,
  options?: GetStudyLogsOptions
) {
  const where: Record<string, unknown> = { studentId };

  if (options?.from || options?.to) {
    where.studyDate = {
      ...(options.from ? { gte: options.from } : {}),
      ...(options.to ? { lte: options.to } : {}),
    };
  }
  if (options?.subject) {
    where.subject = options.subject;
  }

  const logs = await db.studyLog.findMany({
    where,
    orderBy: { studyDate: 'desc' },
    take: options?.limit,
  });

  return logs;
}

/**
 * 학생의 학습 통계를 계산한다.
 */
export async function getStudyStats(
  studentId: string,
  periodDays: number = 30
): Promise<StudyStats> {
  const from = new Date();
  from.setDate(from.getDate() - periodDays);

  const logs = await db.studyLog.findMany({
    where: {
      studentId,
      studyDate: { gte: from },
    },
    orderBy: { studyDate: 'asc' },
  });

  // 총 학습 시간
  const totalMinutes = logs.reduce((sum, l) => sum + l.durationMin, 0);

  // 일 평균 학습 시간
  const uniqueDays = new Set(
    logs.map((l) => new Date(l.studyDate).toISOString().split('T')[0])
  );
  const activeDays = uniqueDays.size;
  const dailyAverageMinutes = activeDays > 0
    ? Math.round(totalMinutes / activeDays)
    : 0;

  // 과목별 분포
  const subjectMap = new Map<string, number>();
  logs.forEach((l) => {
    const subject = l.subject || '미분류';
    subjectMap.set(subject, (subjectMap.get(subject) || 0) + l.durationMin);
  });
  const subjectDistribution = Array.from(subjectMap.entries())
    .map(([subject, minutes]) => ({
      subject,
      totalMinutes: minutes,
      percentage: totalMinutes > 0
        ? Math.round((minutes / totalMinutes) * 1000) / 10
        : 0,
    }))
    .sort((a, b) => b.totalMinutes - a.totalMinutes);

  // 규칙성 점수
  const consistencyScore = calculateConsistencyScore(
    logs.map((l) => ({ studyDate: l.studyDate, durationMin: l.durationMin })),
    periodDays
  );

  // 학습 유형별 분포
  const taskTypeMap = new Map<string, { count: number; totalMinutes: number }>();
  logs.forEach((l) => {
    const existing = taskTypeMap.get(l.taskType) || { count: 0, totalMinutes: 0 };
    existing.count += 1;
    existing.totalMinutes += l.durationMin;
    taskTypeMap.set(l.taskType, existing);
  });
  const taskTypeDistribution = Array.from(taskTypeMap.entries()).map(
    ([taskType, data]) => ({
      taskType,
      count: data.count,
      totalMinutes: data.totalMinutes,
    })
  );

  // 일별 학습 시간
  const dailyMap = new Map<string, number>();
  logs.forEach((l) => {
    const dateStr = new Date(l.studyDate).toISOString().split('T')[0];
    dailyMap.set(dateStr, (dailyMap.get(dateStr) || 0) + l.durationMin);
  });
  const dailyStudyTime = Array.from(dailyMap.entries())
    .map(([date, minutes]) => ({ date, totalMinutes: minutes }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    totalMinutes,
    dailyAverageMinutes,
    subjectDistribution,
    consistencyScore,
    taskTypeDistribution,
    dailyStudyTime,
  };
}
