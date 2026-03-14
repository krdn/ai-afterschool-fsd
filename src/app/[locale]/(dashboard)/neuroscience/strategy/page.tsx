import { verifySession } from '@/lib/dal';
import { getRBACPrisma } from '@/lib/db/common/rbac';
import StrategyForm from '@/components/neuroscience/strategy-form';
import { getLocale } from 'next-intl/server';

export default async function NeuroscienceStrategyPage() {
  const session = await verifySession();
  const rbacDb = getRBACPrisma(session);
  const locale = await getLocale();

  const students = await rbacDb.student.findMany({
    select: {
      id: true,
      name: true,
      school: true,
      grade: true,
      varkAnalysis: { select: { id: true } },
      _count: { select: { sajuAnalysisHistories: true } },
    },
    orderBy: { name: 'asc' },
  });

  const studentsWithFlags = students.map(s => ({
    id: s.id,
    name: s.name,
    school: s.school,
    grade: s.grade,
    hasVark: !!s.varkAnalysis,
    hasMbti: false,
  }));

  if (studentsWithFlags.length > 0) {
    const mbtiResults = await rbacDb.mbtiAnalysis.findMany({
      where: {
        subjectId: { in: studentsWithFlags.map(s => s.id) },
        subjectType: 'STUDENT',
      },
      select: { subjectId: true },
    });
    const mbtiSet = new Set(mbtiResults.map(m => m.subjectId));
    for (const s of studentsWithFlags) {
      s.hasMbti = mbtiSet.has(s.id);
    }
  }

  return (
    <div className="container mx-auto max-w-3xl py-6">
      <StrategyForm students={studentsWithFlags} locale={locale} />
    </div>
  );
}
