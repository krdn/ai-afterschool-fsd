import { getCurrentTeacher } from '@/lib/dal';
import { db } from '@/lib/db/client';
import GradeReportsManager from '@/components/grades/grade-reports-manager';

export default async function GradeReportsPage() {
  const teacher = await getCurrentTeacher();

  // 담당 학생 목록 조회
  const students = await db.student.findMany({
    where:
      teacher.role === 'DIRECTOR'
        ? {}
        : teacher.role === 'TEAM_LEADER' || teacher.role === 'MANAGER'
          ? { teamId: teacher.teamId }
          : { teacherId: teacher.id },
    select: {
      id: true,
      name: true,
      school: true,
      grade: true,
      _count: {
        select: {
          parentGradeReports: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  // 최근 리포트 목록
  const recentReports = await db.parentGradeReport.findMany({
    take: 20,
    orderBy: { createdAt: 'desc' },
    include: {
      student: {
        select: { name: true, school: true, grade: true },
      },
      parent: {
        select: { name: true, relation: true },
      },
    },
  });

  return (
    <GradeReportsManager
      students={students}
      recentReports={recentReports}
    />
  );
}
