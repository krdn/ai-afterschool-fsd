import { getCurrentTeacher } from '@/lib/dal';
import { db } from '@/lib/db/client';
import GradeDashboard from '@/components/grades/grade-dashboard';

export default async function GradesPage() {
  const teacher = await getCurrentTeacher();

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
          gradeHistory: true,
          mockExamResults: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  return <GradeDashboard students={students} teacherRole={teacher.role} />;
}
