import { db } from '@/lib/db/client';

export interface StudentProfile {
  studentId: string;
  name: string;
  school: string;
  grade: number;
  targetUniversity?: string | null;
  targetMajor?: string | null;
  mbtiType?: string | null;
  varkType?: string | null;
  personalitySummary?: string | null;
  attendanceRate?: number | null;
  gradeHistory: {
    subject: string;
    score: number;
    gradeType: string;
    testDate: Date;
    category?: string | null;
    gradeRank?: number | null;
  }[];
  mockExamResults: {
    examName: string;
    subject: string;
    rawScore: number;
    standardScore?: number | null;
    percentile?: number | null;
    gradeRank?: number | null;
    examDate: Date;
  }[];
}

/**
 * 학생의 전체 개인화 프로필을 수집한다.
 * AI 분석에 필요한 모든 데이터를 한 번에 조회.
 */
export async function getStudentProfile(studentId: string): Promise<StudentProfile | null> {
  const student = await db.student.findUnique({
    where: { id: studentId },
    include: {
      gradeHistory: {
        orderBy: { testDate: 'asc' },
        select: {
          subject: true,
          score: true,
          normalizedScore: true,
          gradeType: true,
          testDate: true,
          category: true,
          gradeRank: true,
        },
      },
      mockExamResults: {
        orderBy: { examDate: 'asc' },
        select: {
          examName: true,
          subject: true,
          rawScore: true,
          standardScore: true,
          percentile: true,
          gradeRank: true,
          examDate: true,
        },
      },
      varkAnalysis: { select: { varkType: true } },
      personalitySummary: { select: { coreTraits: true } },
    },
  });

  if (!student) return null;

  // MBTI 결과 별도 조회
  const mbti = await db.mbtiAnalysis.findFirst({
    where: { subjectId: studentId, subjectType: 'STUDENT' },
    orderBy: { calculatedAt: 'desc' },
    select: { mbtiType: true },
  });

  return {
    studentId: student.id,
    name: student.name,
    school: student.school,
    grade: student.grade,
    targetUniversity: student.targetUniversity,
    targetMajor: student.targetMajor,
    mbtiType: mbti?.mbtiType ?? null,
    varkType: student.varkAnalysis?.varkType ?? null,
    personalitySummary: student.personalitySummary?.coreTraits ?? null,
    attendanceRate: student.attendanceRate,
    gradeHistory: student.gradeHistory.map((g) => ({
      subject: g.subject,
      score: g.normalizedScore,
      gradeType: g.gradeType,
      testDate: g.testDate,
      category: g.category,
      gradeRank: g.gradeRank,
    })),
    mockExamResults: student.mockExamResults,
  };
}
