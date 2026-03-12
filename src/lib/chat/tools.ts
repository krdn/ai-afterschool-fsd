import 'server-only'
import { tool } from 'ai'
import { z } from 'zod'
import { db } from '@/lib/db/client'
import type { ChatSession } from './mention-types'

function studentWhere(session: ChatSession) {
  if (session.role === 'DIRECTOR') return {}
  return { teamId: session.teamId }
}

function teacherWhere(session: ChatSession) {
  if (session.role === 'DIRECTOR') return {}
  return { teamId: session.teamId }
}

export function createChatTools(session: ChatSession) {
  return {
    searchStudents: tool({
      description: '이름, 학교, 학년으로 학생을 검색합니다. 최대 10건 반환.',
      inputSchema: z.object({
        query: z.string().min(1).describe('검색어 (학생 이름, 학교명 등)'),
        school: z.string().optional().describe('학교명 필터'),
        grade: z.number().optional().describe('학년 필터'),
      }),
      execute: async ({ query, school, grade }) => {
        const where: Record<string, unknown> = {
          ...studentWhere(session),
          name: { contains: query },
        }
        if (school) where.school = { contains: school }
        if (grade) where.grade = grade
        const students = await db.student.findMany({
          where,
          select: { id: true, name: true, grade: true, school: true, phone: true },
          take: 10,
          orderBy: { name: 'asc' },
        })
        return { count: students.length, students }
      },
    }),

    getStudentDetail: tool({
      description: '학생 ID로 상세 정보(기본정보, 보호자, 출석률, 목표대학)를 조회합니다.',
      inputSchema: z.object({
        studentId: z.string().describe('학생 ID'),
      }),
      execute: async ({ studentId }) => {
        const student = await db.student.findFirst({
          where: { id: studentId, ...studentWhere(session) },
          select: {
            id: true, name: true, grade: true, school: true,
            phone: true, birthDate: true, bloodType: true,
            targetUniversity: true, targetMajor: true,
            attendanceRate: true, initialGradeLevel: true, nationality: true,
            parents: {
              select: { name: true, phone: true, email: true, relation: true, isPrimary: true },
              orderBy: { isPrimary: 'desc' },
            },
            teacher: { select: { name: true } },
            team: { select: { name: true } },
          },
        })
        if (!student) return { error: '학생을 찾을 수 없거나 접근 권한이 없습니다.' }
        return student
      },
    }),

    searchTeachers: tool({
      description: '이름, 역할로 선생님을 검색합니다.',
      inputSchema: z.object({
        query: z.string().min(1).describe('검색어 (선생님 이름)'),
        role: z.string().optional().describe('역할 필터 (DIRECTOR, TEAM_LEADER, TEACHER 등)'),
      }),
      execute: async ({ query, role }) => {
        const where: Record<string, unknown> = {
          ...teacherWhere(session),
          name: { contains: query },
        }
        if (role) where.role = role
        const teachers = await db.teacher.findMany({
          where,
          select: { id: true, name: true, role: true, team: { select: { name: true } } },
          take: 10,
        })
        return { count: teachers.length, teachers }
      },
    }),

    getTeacherDetail: tool({
      description: '선생님 ID로 상세 정보(담당학생 포함)를 조회합니다.',
      inputSchema: z.object({
        teacherId: z.string().describe('선생님 ID'),
      }),
      execute: async ({ teacherId }) => {
        const teacher = await db.teacher.findFirst({
          where: { id: teacherId, ...teacherWhere(session) },
          select: {
            id: true, name: true, role: true, email: true, phone: true,
            team: { select: { name: true } },
            students: { select: { id: true, name: true, grade: true, school: true } },
          },
        })
        if (!teacher) return { error: '선생님을 찾을 수 없거나 접근 권한이 없습니다.' }
        return teacher
      },
    }),

    getTeamInfo: tool({
      description: '팀(학급) ID로 구성원(교사, 학생) 전체를 조회합니다.',
      inputSchema: z.object({
        teamId: z.string().describe('팀 ID'),
      }),
      execute: async ({ teamId }) => {
        if (session.role !== 'DIRECTOR' && teamId !== session.teamId) {
          return { error: '해당 팀에 접근 권한이 없습니다.' }
        }
        const team = await db.team.findUnique({
          where: { id: teamId },
          select: {
            id: true, name: true,
            teachers: { select: { id: true, name: true, role: true } },
            students: { select: { id: true, name: true, grade: true, school: true, phone: true } },
          },
        })
        if (!team) return { error: '팀을 찾을 수 없습니다.' }
        return team
      },
    }),

    getStudentGrades: tool({
      description: '학생의 성적을 조회합니다. 과목별 필터 가능.',
      inputSchema: z.object({
        studentId: z.string().describe('학생 ID'),
        subject: z.string().optional().describe('과목명 필터 (예: 수학, 영어)'),
      }),
      execute: async ({ studentId, subject }) => {
        const student = await db.student.findFirst({
          where: { id: studentId, ...studentWhere(session) },
          select: { id: true, name: true },
        })
        if (!student) return { error: '학생을 찾을 수 없거나 접근 권한이 없습니다.' }
        const where: Record<string, unknown> = { studentId }
        if (subject) where.subject = { contains: subject }
        const grades = await db.gradeHistory.findMany({
          where,
          select: {
            subject: true, score: true, maxScore: true, normalizedScore: true,
            testDate: true, gradeType: true, academicYear: true, semester: true,
            classRank: true, gradeRank: true, totalStudents: true, classAverage: true,
          },
          orderBy: { testDate: 'desc' },
          take: 20,
        })
        return { studentName: student.name, count: grades.length, grades }
      },
    }),

    getStudentAnalysis: tool({
      description: '학생의 분석 결과(사주, MBTI, VARK, 별자리, 성격종합 등)를 조회합니다.',
      inputSchema: z.object({
        studentId: z.string().describe('학생 ID'),
        analysisType: z.enum(['saju', 'mbti', 'vark', 'zodiac', 'name', 'face', 'palm', 'personality', 'all'])
          .optional()
          .describe('분석 유형 (생략 시 전체)'),
      }),
      execute: async ({ studentId, analysisType }) => {
        const student = await db.student.findFirst({
          where: { id: studentId, ...studentWhere(session) },
          select: { id: true, name: true },
        })
        if (!student) return { error: '학생을 찾을 수 없거나 접근 권한이 없습니다.' }
        const type = analysisType ?? 'all'
        const queries: Array<[string, Promise<unknown>]> = []
        if (type === 'all' || type === 'saju') {
          queries.push(['saju', db.sajuAnalysis.findFirst({
            where: { subjectType: 'STUDENT', subjectId: studentId },
            select: { interpretation: true, calculatedAt: true },
          })])
        }
        if (type === 'all' || type === 'mbti') {
          queries.push(['mbti', db.mbtiAnalysis.findFirst({
            where: { subjectType: 'STUDENT', subjectId: studentId },
            select: { mbtiType: true, interpretation: true },
          })])
        }
        if (type === 'all' || type === 'vark') {
          queries.push(['vark', db.varkAnalysis.findFirst({
            where: { studentId },
            select: { varkType: true, interpretation: true },
          })])
        }
        if (type === 'all' || type === 'zodiac') {
          queries.push(['zodiac', db.zodiacAnalysis.findFirst({
            where: { studentId },
            select: { zodiacSign: true, zodiacName: true, interpretation: true },
          })])
        }
        if (type === 'all' || type === 'name') {
          queries.push(['nameAnalysis', db.nameAnalysis.findFirst({
            where: { subjectType: 'STUDENT', subjectId: studentId },
            select: { interpretation: true },
          })])
        }
        if (type === 'all' || type === 'face') {
          queries.push(['face', db.faceAnalysis.findFirst({
            where: { subjectType: 'STUDENT', subjectId: studentId },
            select: { result: true },
          })])
        }
        if (type === 'all' || type === 'palm') {
          queries.push(['palm', db.palmAnalysis.findFirst({
            where: { subjectType: 'STUDENT', subjectId: studentId },
            select: { result: true },
          })])
        }
        if (type === 'all' || type === 'personality') {
          queries.push(['personality', db.personalitySummary.findFirst({
            where: { studentId },
            select: { coreTraits: true },
          })])
        }
        const results = await Promise.all(queries.map(([, p]) => p))
        const result: Record<string, unknown> = { studentName: student.name }
        queries.forEach(([key], i) => { result[key] = results[i] })
        return result
      },
    }),

    getCounselingHistory: tool({
      description: '학생의 상담 이력을 조회합니다.',
      inputSchema: z.object({
        studentId: z.string().describe('학생 ID'),
        limit: z.number().optional().describe('조회 건수 (기본 5건)'),
      }),
      execute: async ({ studentId, limit }) => {
        const student = await db.student.findFirst({
          where: { id: studentId, ...studentWhere(session) },
          select: { id: true, name: true },
        })
        if (!student) return { error: '학생을 찾을 수 없거나 접근 권한이 없습니다.' }
        const sessions = await db.counselingSession.findMany({
          where: { studentId },
          select: {
            sessionDate: true, summary: true, type: true,
            teacher: { select: { name: true } },
          },
          orderBy: { sessionDate: 'desc' },
          take: limit ?? 5,
        })
        return { studentName: student.name, count: sessions.length, sessions }
      },
    }),
  }
}
