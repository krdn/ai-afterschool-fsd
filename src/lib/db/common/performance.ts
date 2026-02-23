import { Prisma } from '@/lib/db'
import { db } from "@/lib/db/client"
import { getRBACPrisma } from "./rbac"
import type { GradeType, CounselingType } from '@/lib/db'

/**
 * GradeHistory 생성 페이로드
 */
type GradeHistoryPayload = {
  studentId: string
  teacherId?: string | null
  subject: string
  gradeType: GradeType
  score: number
  maxScore?: number
  normalizedScore: number
  testDate: Date
  academicYear: number
  semester: number
  notes?: string | null
}

/**
 * 성적 이력 생성
 *
 * @param payload - 성적 이력 데이터
 * @returns 생성된 GradeHistory
 */
export async function createGradeHistory(payload: GradeHistoryPayload) {
  const data = {
    studentId: payload.studentId,
    teacherId: payload.teacherId ?? null,
    subject: payload.subject,
    gradeType: payload.gradeType,
    score: payload.score,
    maxScore: payload.maxScore ?? 100,
    normalizedScore: payload.normalizedScore,
    testDate: payload.testDate,
    academicYear: payload.academicYear,
    semester: payload.semester,
    notes: payload.notes ?? null,
  }

  return db.gradeHistory.create({
    data,
  })
}

/**
 * 학생의 성적 이력 조회 (시간 순)
 *
 * @param studentId - 학생 ID
 * @returns testDate 오름차순 정렬된 GradeHistory 배열
 */
export async function getGradeHistory(studentId: string) {
  return db.gradeHistory.findMany({
    where: { studentId },
    orderBy: { testDate: "asc" },
    include: {
      teacher: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })
}

/**
 * 선생님별 성적 이력 조회
 *
 * @param teacherId - 선생님 ID
 * @param options - 조회 옵션 (학년도, 학기)
 * @returns testDate 오름차순 정렬된 GradeHistory 배열
 */
export async function getGradeHistoryByTeacher(
  teacherId: string,
  options?: {
    academicYear?: number
    semester?: number
  }
) {
  return db.gradeHistory.findMany({
    where: {
      teacherId,
      ...(options?.academicYear && { academicYear: options.academicYear }),
      ...(options?.semester && { semester: options.semester }),
    },
    orderBy: { testDate: "asc" },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          school: true,
          grade: true,
        },
      },
    },
  })
}

/**
 * 성적 이력 업데이트
 *
 * @param id - 성적 이력 ID
 * @param payload - 업데이트할 데이터
 * @returns 업데이트된 GradeHistory
 */
export async function updateGradeHistory(
  id: string,
  payload: Partial<GradeHistoryPayload>
) {
  const data: Prisma.GradeHistoryUpdateInput = {}

  if (payload.score !== undefined) data.score = payload.score
  if (payload.maxScore !== undefined) data.maxScore = payload.maxScore
  if (payload.normalizedScore !== undefined) data.normalizedScore = payload.normalizedScore
  if (payload.notes !== undefined) data.notes = payload.notes
  if (payload.teacherId !== undefined) data.teacher = payload.teacherId ? { connect: { id: payload.teacherId } } : { disconnect: true }

  return db.gradeHistory.update({
    where: { id },
    data,
  })
}

/**
 * 성적 이력 삭제
 *
 * @param id - 성적 이력 ID
 * @returns 삭제된 GradeHistory
 */
export async function deleteGradeHistory(id: string) {
  return db.gradeHistory.delete({
    where: { id },
  })
}

/**
 * 과목별 평균 성적 계산
 *
 * @param studentId - 학생 ID
 * @param subject - 과목명 (optional, 없으면 모든 과목)
 * @param options - 조회 옵션 (학년도, 학기)
 * @returns 과목별 평균 성적
 */
export async function getSubjectAverageGrades(
  studentId: string,
  subject?: string,
  options?: {
    academicYear?: number
    semester?: number
  }
) {
  const where: Prisma.GradeHistoryWhereInput = {
    studentId,
    ...(subject && { subject }),
    ...(options?.academicYear && { academicYear: options.academicYear }),
    ...(options?.semester && { semester: options.semester }),
  }

  const results = await db.gradeHistory.groupBy({
    by: ["subject"],
    where,
    _avg: {
      normalizedScore: true,
    },
    _count: {
      id: true,
    },
  })

  return results.map((r) => ({
    subject: r.subject,
    averageScore: r._avg.normalizedScore ?? 0,
    count: r._count.id,
  }))
}

/**
 * CounselingSession 생성 페이로드
 */
type CounselingSessionPayload = {
  studentId: string
  teacherId: string
  sessionDate: Date
  duration: number
  type: CounselingType
  summary: string
  followUpRequired?: boolean
  followUpDate?: Date | null
  satisfactionScore?: number | null
  aiSummary?: string | null
}

/**
 * 상담 세션 생성
 *
 * @param payload - 상담 세션 데이터
 * @returns 생성된 CounselingSession
 */
export async function createCounselingSession(payload: CounselingSessionPayload) {
  const data = {
    studentId: payload.studentId,
    teacherId: payload.teacherId,
    sessionDate: payload.sessionDate,
    duration: payload.duration,
    type: payload.type,
    summary: payload.summary,
    followUpRequired: payload.followUpRequired ?? false,
    followUpDate: payload.followUpDate ?? null,
    satisfactionScore: payload.satisfactionScore ?? null,
    aiSummary: payload.aiSummary ?? null,
  }

  return db.counselingSession.create({
    data,
  })
}

/**
 * 학생의 상담 기록 조회
 *
 * @param studentId - 학생 ID
 * @param options - 조회 옵션 (상담 유형)
 * @returns sessionDate 내림차순 정렬된 CounselingSession 배열
 */
export async function getCounselingSessions(
  studentId: string,
  options?: {
    type?: CounselingType
  }
) {
  return db.counselingSession.findMany({
    where: {
      studentId,
      ...(options?.type && { type: options.type }),
    },
    orderBy: { sessionDate: "desc" },
    include: {
      teacher: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })
}

/**
 * 선생님의 상담 기록 조회
 *
 * @param teacherId - 선생님 ID
 * @param options - 조회 옵션 (학생 ID, 기간)
 * @returns sessionDate 내림차순 정렬된 CounselingSession 배열
 */
export async function getCounselingSessionsByTeacher(
  teacherId: string,
  options?: {
    studentId?: string
    startDate?: Date
    endDate?: Date
  }
) {
  return db.counselingSession.findMany({
    where: {
      teacherId,
      ...(options?.studentId && { studentId: options.studentId }),
      ...(options?.startDate && { sessionDate: { gte: options.startDate } }),
      ...(options?.endDate && { sessionDate: { lte: options.endDate } }),
    },
    orderBy: { sessionDate: "desc" },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          school: true,
          grade: true,
        },
      },
    },
  })
}

/**
 * 상담 횟수 조회
 *
 * @param studentId - 학생 ID
 * @param options - 조회 옵션 (상담 유형, 기간)
 * @returns 상담 횟수
 */
export async function getCounselingCount(
  studentId: string,
  options?: {
    type?: CounselingType
    startDate?: Date
    endDate?: Date
  }
) {
  return db.counselingSession.count({
    where: {
      studentId,
      ...(options?.type && { type: options.type }),
      ...(options?.startDate && { sessionDate: { gte: options.startDate } }),
      ...(options?.endDate && { sessionDate: { lte: options.endDate } }),
    },
  })
}

/**
 * 상담 세션 업데이트
 *
 * @param id - 상담 세션 ID
 * @param payload - 업데이트할 데이터
 * @returns 업데이트된 CounselingSession
 */
export async function updateCounselingSession(
  id: string,
  payload: Partial<CounselingSessionPayload>
) {
  const data: Prisma.CounselingSessionUpdateInput = {}

  if (payload.summary !== undefined) data.summary = payload.summary
  if (payload.duration !== undefined) data.duration = payload.duration
  if (payload.followUpRequired !== undefined) data.followUpRequired = payload.followUpRequired
  if (payload.followUpDate !== undefined) data.followUpDate = payload.followUpDate
  if (payload.satisfactionScore !== undefined) data.satisfactionScore = payload.satisfactionScore

  return db.counselingSession.update({
    where: { id },
    data,
  })
}

/**
 * 상담 세션 삭제
 *
 * @param id - 상담 세션 ID
 * @returns 삭제된 CounselingSession
 */
export async function deleteCounselingSession(id: string) {
  return db.counselingSession.delete({
    where: { id },
  })
}

/**
 * StudentSatisfaction 생성 페이로드
 */
type StudentSatisfactionPayload = {
  studentId: string
  teacherId: string
  surveyDate: Date
  overallSatisfaction: number
  teachingQuality: number
  communication: number
  supportLevel: number
  feedback?: string | null
}

/**
 * 학생 만족도 조사 결과 생성
 *
 * @param payload - 만족도 데이터
 * @returns 생성된 StudentSatisfaction
 */
export async function createStudentSatisfaction(payload: StudentSatisfactionPayload) {
  const data = {
    studentId: payload.studentId,
    teacherId: payload.teacherId,
    surveyDate: payload.surveyDate,
    overallSatisfaction: payload.overallSatisfaction,
    teachingQuality: payload.teachingQuality,
    communication: payload.communication,
    supportLevel: payload.supportLevel,
    feedback: payload.feedback ?? null,
  }

  return db.studentSatisfaction.create({
    data,
  })
}

/**
 * 학생의 만족도 조사 결과 조회
 *
 * @param studentId - 학생 ID
 * @param teacherId - 선생님 ID (optional)
 * @returns surveyDate 내림차순 정렬된 StudentSatisfaction 배열
 */
export async function getStudentSatisfaction(
  studentId: string,
  teacherId?: string
) {
  return db.studentSatisfaction.findMany({
    where: {
      studentId,
      ...(teacherId && { teacherId }),
    },
    orderBy: { surveyDate: "desc" },
    include: {
      teacher: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })
}

/**
 * 선생님에 대한 평균 만족도 조회
 *
 * @param teacherId - 선생님 ID
 * @param options - 조회 옵션 (기간)
 * @returns 평균 만족도 점수
 */
export async function getAverageSatisfaction(
  teacherId: string,
  options?: {
    startDate?: Date
    endDate?: Date
  }
) {
  const where: Prisma.StudentSatisfactionWhereInput = {
    teacherId,
    ...(options?.startDate && { surveyDate: { gte: options.startDate } }),
    ...(options?.endDate && { surveyDate: { lte: options.endDate } }),
  }

  const result = await db.studentSatisfaction.aggregate({
    where,
    _avg: {
      overallSatisfaction: true,
      teachingQuality: true,
      communication: true,
      supportLevel: true,
    },
    _count: {
      id: true,
    },
  })

  return {
    overallSatisfaction: result._avg.overallSatisfaction ?? 0,
    teachingQuality: result._avg.teachingQuality ?? 0,
    communication: result._avg.communication ?? 0,
    supportLevel: result._avg.supportLevel ?? 0,
    responseCount: result._count.id,
  }
}

/**
 * 팀 전체의 평균 만족도 조회 (RBAC 적용)
 *
 * @param session - 현재 세션 (RBAC 필터링용)
 * @param options - 조회 옵션 (기간)
 * @returns 팀별 평균 만족도
 */
export async function getTeamAverageSatisfaction(
  session: {
    userId: string
    role?: "DIRECTOR" | "TEAM_LEADER" | "MANAGER" | "TEACHER"
    teamId?: string | null
  },
  options?: {
    startDate?: Date
    endDate?: Date
  }
) {
  const rbacDb = getRBACPrisma(session)

  // 팀 내 선생님 목록 조회
  const teachers = await rbacDb.teacher.findMany({
    select: {
      id: true,
      name: true,
    },
  })

  // 각 선생님별 평균 만족도 계산
  const results = await Promise.all(
    teachers.map(async (teacher) => {
      const avg = await getAverageSatisfaction(teacher.id, options)
      return {
        teacherId: teacher.id,
        teacherName: teacher.name,
        ...avg,
      }
    })
  )

  return results.filter((r) => r.responseCount > 0)
}

/**
 * 학생 만족도 업데이트
 *
 * @param id - 만족도 ID
 * @param payload - 업데이트할 데이터
 * @returns 업데이트된 StudentSatisfaction
 */
export async function updateStudentSatisfaction(
  id: string,
  payload: Partial<StudentSatisfactionPayload>
) {
  const data: Prisma.StudentSatisfactionUpdateInput = {}

  if (payload.overallSatisfaction !== undefined) data.overallSatisfaction = payload.overallSatisfaction
  if (payload.teachingQuality !== undefined) data.teachingQuality = payload.teachingQuality
  if (payload.communication !== undefined) data.communication = payload.communication
  if (payload.supportLevel !== undefined) data.supportLevel = payload.supportLevel
  if (payload.feedback !== undefined) data.feedback = payload.feedback

  return db.studentSatisfaction.update({
    where: { id },
    data,
  })
}

/**
 * 학생 만족도 삭제
 *
 * @param id - 만족도 ID
 * @returns 삭제된 StudentSatisfaction
 */
export async function deleteStudentSatisfaction(id: string) {
  return db.studentSatisfaction.delete({
    where: { id },
  })
}

/**
 * 성적 변화율 계산
 *
 * @param studentId - 학생 ID
 * @param subject - 과목명
 * @returns 성적 변화 정보 (시작점, 최근점, 변화율)
 */
export async function calculateGradeProgress(
  studentId: string,
  subject: string
) {
  const history = await db.gradeHistory.findMany({
    where: {
      studentId,
      subject,
    },
    orderBy: { testDate: "asc" },
    select: {
      normalizedScore: true,
      testDate: true,
      academicYear: true,
      semester: true,
    },
  })

  if (history.length < 2) {
    return {
      hasEnoughData: false,
      firstScore: history[0]?.normalizedScore ?? null,
      latestScore: history[history.length - 1]?.normalizedScore ?? null,
      progressRate: null,
      dataPoints: history.length,
    }
  }

  const firstScore = history[0].normalizedScore
  const latestScore = history[history.length - 1].normalizedScore
  const progressRate = ((latestScore - firstScore) / firstScore) * 100

  return {
    hasEnoughData: true,
    firstScore,
    latestScore,
    progressRate,
    dataPoints: history.length,
    history: history.map((h) => ({
      score: h.normalizedScore,
      date: h.testDate,
      academicYear: h.academicYear,
      semester: h.semester,
    })),
  }
}
