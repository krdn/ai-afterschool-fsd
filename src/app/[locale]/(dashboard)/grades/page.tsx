import { getCurrentTeacher } from '@/lib/dal';
import { db } from '@/lib/db/client';
import GradeDashboard from '@/components/grades/grade-dashboard';
import { normalizePaginationParams, getPrismaSkipTake } from '@/shared/utils/pagination';
import type { Prisma } from '@/lib/db';

type PageProps = {
  searchParams: Promise<{
    query?: string;
    page?: string;
  }>;
};

export default async function GradesPage({ searchParams }: PageProps) {
  const teacher = await getCurrentTeacher();
  const params = await searchParams;

  // RBAC 기반 where 조건
  const baseWhere: Prisma.StudentWhereInput =
    teacher.role === 'DIRECTOR'
      ? {}
      : teacher.role === 'TEAM_LEADER' || teacher.role === 'MANAGER'
        ? { teamId: teacher.teamId }
        : { teacherId: teacher.id };

  // 검색 조건 추가
  const where: Prisma.StudentWhereInput = { ...baseWhere };
  if (params.query && params.query.trim()) {
    const query = params.query.trim();
    where.OR = [
      { name: { contains: query, mode: 'insensitive' } },
      { school: { contains: query, mode: 'insensitive' } },
    ];
  }

  // 페이지네이션
  const paginationParams = normalizePaginationParams({
    page: params.page ? parseInt(params.page, 10) : 1,
    pageSize: 20,
  });
  const { skip, take } = getPrismaSkipTake(paginationParams);

  // 병렬 조회: 학생 목록 + 전체 카운트 + 통계
  const [students, totalCount, totalGradeHistory, totalMockExams] =
    await Promise.all([
      db.student.findMany({
        where,
        select: {
          id: true,
          name: true,
          school: true,
          grade: true,
          _count: {
            select: {
              gradeHistory: true,
              mockExamResults: true,
            },
          },
        },
        orderBy: { name: 'asc' },
        skip,
        take,
      }),
      db.student.count({ where }),
      // 통계는 전체 기준 (필터 무관)
      db.gradeHistory.count({
        where: { student: baseWhere },
      }),
      db.mockExamResult.count({
        where: { student: baseWhere },
      }),
    ]);

  // 전체 학생 수 (통계용 - 필터 무관)
  const totalStudents =
    params.query && params.query.trim()
      ? await db.student.count({ where: baseWhere })
      : totalCount;

  const totalPages = Math.ceil(totalCount / paginationParams.pageSize);

  return (
    <GradeDashboard
      students={students}
      teacherRole={teacher.role}
      searchQuery={params.query || ''}
      stats={{
        totalStudents,
        totalGradeHistory,
        totalMockExams,
      }}
      pagination={{
        page: paginationParams.page,
        totalPages,
        total: totalCount,
        pageSize: paginationParams.pageSize,
      }}
    />
  );
}
