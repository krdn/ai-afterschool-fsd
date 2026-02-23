'use server'

import { verifySession } from '@/lib/dal'
import { getRBACPrisma } from '@/lib/db/common/rbac'
import { db } from '@/lib/db/client'
import type { TeacherRole } from '@/lib/db/common/rbac'
import { ok, fail, type ActionResult } from "@/lib/errors/action-result"
import { logger } from "@/lib/logger"

export interface TeacherStudentMetrics {
  totalStudents: number
  averageGradeChange: number
  totalCounselingSessions: number
  averageCompatibilityScore: number
  subjectDistribution: Record<string, number>
}

export interface StudentWithMetrics {
  id: string
  name: string
  school: string
  grade: number
  initialGradeLevel: string | null
  latestGrades: {
    subject: string
    score: number
    normalizedScore: number
  }[]
  counselingCount: number
  compatibilityScore: number | null
  createdAt: Date
}

export interface GradeTrendData {
  month: string
  averageScore: number
}

export interface GetTeacherStudentsOptions {
  search?: string
  subject?: string
  gradeRange?: { min: number; max: number }
  sortBy?: 'name' | 'grade' | 'compatibility' | 'counselingCount' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
}

async function checkTeacherAccess(
  session: { userId: string; role?: TeacherRole; teamId?: string | null },
  teacherId: string
): Promise<boolean> {
  if (session.role === 'DIRECTOR') {
    return true
  }

  if (session.role === 'TEACHER' || session.role === 'MANAGER') {
    return session.userId === teacherId
  }

  if (session.role === 'TEAM_LEADER') {
    if (session.userId === teacherId) {
      return true
    }

    const teacher = await db.teacher.findUnique({
      where: { id: teacherId },
      select: { teamId: true },
    })

    return teacher?.teamId === session.teamId
  }

  return false
}

export async function getTeacherStudents(
  teacherId: string,
  options?: GetTeacherStudentsOptions
): Promise<ActionResult<StudentWithMetrics[]>> {
  try {
    const session = await verifySession()
    if (!session) {
      return fail('Unauthorized')
    }

    const canAccess = await checkTeacherAccess(session, teacherId)
    if (!canAccess) {
      return fail('Access Denied')
    }

    const rbacDb = getRBACPrisma(session)

    const searchFilter = options?.search
      ? {
          OR: [
            { name: { contains: options.search, mode: 'insensitive' as const } },
            { school: { contains: options.search, mode: 'insensitive' as const } },
          ],
        }
      : {}

    const gradeFilter = options?.gradeRange
      ? {
          grade: {
            gte: options.gradeRange.min,
            lte: options.gradeRange.max,
          },
        }
      : {}

    const students = await rbacDb.student.findMany({
      where: {
        teacherId,
        ...searchFilter,
        ...gradeFilter,
      },
      include: {
        gradeHistory: {
          orderBy: { testDate: 'desc' },
          distinct: ['subject'],
          select: {
            subject: true,
            score: true,
            normalizedScore: true,
            testDate: true,
          },
        },
        _count: {
          select: { counselingSessions: true },
        },
        compatibilityResults: {
          where: { teacherId },
          select: { overallScore: true },
          take: 1,
        },
      },
    })

    const studentsWithMetrics: StudentWithMetrics[] = students.map((student) => ({
      id: student.id,
      name: student.name,
      school: student.school,
      grade: student.grade,
      initialGradeLevel: student.initialGradeLevel,
      latestGrades: student.gradeHistory.map((grade) => ({
        subject: grade.subject,
        score: grade.score,
        normalizedScore: grade.normalizedScore,
      })),
      counselingCount: student._count.counselingSessions,
      compatibilityScore: student.compatibilityResults[0]?.overallScore ?? null,
      createdAt: student.createdAt,
    }))

    let filteredStudents = studentsWithMetrics
    if (options?.subject) {
      filteredStudents = studentsWithMetrics.filter((student) =>
        student.latestGrades.some((grade) => grade.subject === options.subject)
      )
    }

    if (options?.sortBy) {
      filteredStudents.sort((a, b) => {
        let comparison = 0
        switch (options.sortBy) {
          case 'name':
            comparison = a.name.localeCompare(b.name)
            break
          case 'grade': {
            const aAvg =
              a.latestGrades.length > 0
                ? a.latestGrades.reduce((sum, g) => sum + g.normalizedScore, 0) /
                  a.latestGrades.length
                : 0
            const bAvg =
              b.latestGrades.length > 0
                ? b.latestGrades.reduce((sum, g) => sum + g.normalizedScore, 0) /
                  b.latestGrades.length
                : 0
            comparison = aAvg - bAvg
            break
          }
          case 'compatibility':
            comparison = (a.compatibilityScore ?? 0) - (b.compatibilityScore ?? 0)
            break
          case 'counselingCount':
            comparison = a.counselingCount - b.counselingCount
            break
          case 'createdAt':
            comparison = a.createdAt.getTime() - b.createdAt.getTime()
            break
        }
        return options.sortOrder === 'desc' ? -comparison : comparison
      })
    }

    return ok(filteredStudents)
  } catch (error) {
    logger.error({ err: error }, 'getTeacherStudents error')
    return fail('Failed to fetch teacher students')
  }
}

export async function getTeacherStudentMetrics(
  teacherId: string
): Promise<ActionResult<TeacherStudentMetrics>> {
  try {
    const session = await verifySession()
    if (!session) {
      return fail('Unauthorized')
    }

    const canAccess = await checkTeacherAccess(session, teacherId)
    if (!canAccess) {
      return fail('Access Denied')
    }

    const rbacDb = getRBACPrisma(session)

    const totalStudents = await rbacDb.student.count({
      where: { teacherId },
    })

    if (totalStudents === 0) {
      return ok({
        totalStudents: 0,
        averageGradeChange: 0,
        totalCounselingSessions: 0,
        averageCompatibilityScore: 0,
        subjectDistribution: {},
      })
    }

    const students = await rbacDb.student.findMany({
      where: { teacherId },
      include: {
        gradeHistory: {
          orderBy: { testDate: 'desc' },
          select: {
            subject: true,
            normalizedScore: true,
            testDate: true,
          },
        },
        _count: {
          select: { counselingSessions: true },
        },
        compatibilityResults: {
          where: { teacherId },
          select: { overallScore: true },
        },
      },
    })

    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    let totalRecentScore = 0
    let recentCount = 0
    let totalPreviousScore = 0
    let previousCount = 0

    for (const student of students) {
      for (const grade of student.gradeHistory) {
        if (grade.testDate >= threeMonthsAgo) {
          totalRecentScore += grade.normalizedScore
          recentCount++
        } else if (grade.testDate >= sixMonthsAgo && grade.testDate < threeMonthsAgo) {
          totalPreviousScore += grade.normalizedScore
          previousCount++
        }
      }
    }

    const averageGradeChange =
      recentCount > 0 && previousCount > 0
        ? ((totalRecentScore / recentCount) - (totalPreviousScore / previousCount)) /
          (totalPreviousScore / previousCount) *
          100
        : 0

    const totalCounselingSessions = students.reduce(
      (sum, s) => sum + s._count.counselingSessions,
      0
    )

    const compatibilityScores = students
      .map((s) => s.compatibilityResults[0]?.overallScore)
      .filter((score): score is number => score !== undefined)

    const averageCompatibilityScore =
      compatibilityScores.length > 0
        ? compatibilityScores.reduce((sum, score) => sum + score, 0) /
          compatibilityScores.length
        : 0

    const subjectDistribution: Record<string, number> = {}
    for (const student of students) {
      for (const grade of student.gradeHistory.slice(0, 5)) {
        subjectDistribution[grade.subject] = (subjectDistribution[grade.subject] || 0) + 1
      }
    }

    return ok({
      totalStudents,
      averageGradeChange,
      totalCounselingSessions,
      averageCompatibilityScore,
      subjectDistribution,
    })
  } catch (error) {
    logger.error({ err: error }, 'getTeacherStudentMetrics error')
    return fail('Failed to fetch teacher metrics')
  }
}

export async function getStudentGradeTrend(
  studentId: string,
  months: number = 6
): Promise<ActionResult<GradeTrendData[]>> {
  try {
    const session = await verifySession()
    if (!session) {
      return fail('Unauthorized')
    }

    const rbacDb = getRBACPrisma(session)

    const student = await rbacDb.student.findUnique({
      where: { id: studentId },
      select: { id: true, teacherId: true },
    })

    if (!student) {
      return fail('Student not found')
    }

    const canAccess =
      session.role === 'DIRECTOR' ||
      session.role === 'TEAM_LEADER' ||
      ((session.role === 'TEACHER' || session.role === 'MANAGER') &&
        student.teacherId === session.userId)

    if (!canAccess) {
      return fail('Access Denied')
    }

    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - months)

    const gradeHistory = await db.gradeHistory.findMany({
      where: {
        studentId,
        testDate: { gte: startDate },
      },
      orderBy: { testDate: 'asc' },
      select: {
        normalizedScore: true,
        testDate: true,
      },
    })

    const monthlyScores: Record<string, { sum: number; count: number }> = {}

    for (const grade of gradeHistory) {
      const monthKey = grade.testDate.toISOString().slice(0, 7)
      if (!monthlyScores[monthKey]) {
        monthlyScores[monthKey] = { sum: 0, count: 0 }
      }
      monthlyScores[monthKey].sum += grade.normalizedScore
      monthlyScores[monthKey].count++
    }

    const trendData: GradeTrendData[] = Object.entries(monthlyScores).map(
      ([month, { sum, count }]) => ({
        month,
        averageScore: Math.round((sum / count) * 10) / 10,
      })
    )

    return ok(trendData)
  } catch (error) {
    logger.error({ err: error }, 'getStudentGradeTrend error')
    return fail('Failed to fetch grade trend')
  }
}
