import { getCurrentTeacher } from '@/lib/dal';
import { db } from '@/lib/db/client';
import { notFound } from 'next/navigation';
import GradeDetailTabs from '@/components/grades/grade-detail-tabs';
import { BreadcrumbNav } from '@/components/ui/breadcrumb-nav';

export default async function GradeStudentDetailPage(props: {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const teacher = await getCurrentTeacher();

  const student = await db.student.findUnique({
    where: { id: params.studentId },
    select: {
      id: true,
      name: true,
      school: true,
      grade: true,
      teacherId: true,
      _count: {
        select: {
          gradeHistory: true,
          mockExamResults: true,
        },
      },
    },
  });

  if (!student) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <BreadcrumbNav items={[
        { label: "성적 관리", href: "/grades" },
        { label: student.name },
      ]} />
      <div>
        <h1 className="text-3xl font-bold">{student.name}</h1>
        <p className="text-muted-foreground">
          {student.school} {student.grade}학년 - 성적 상세
        </p>
      </div>
      <GradeDetailTabs
        studentId={student.id}
        studentName={student.name}
        teacherId={teacher.id}
        initialTab={searchParams.tab}
      />
    </div>
  );
}
