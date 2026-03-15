import { getTranslations } from 'next-intl/server'
import { getCurrentTeacher } from '@/lib/dal'
import { db } from '@/lib/db/client'
import { StudentTargetManager } from '@/components/admission/student-target-manager'
import { AdmissionHelpDialog } from '@/components/admission/admission-help-dialog'
import { GraduationCap } from 'lucide-react'

export default async function TargetsPage() {
  const t = await getTranslations('Admission')
  const teacher = await getCurrentTeacher()

  // 교사의 학생들과 그 목표 대학 조회
  const students = await db.student.findMany({
    where: { teacherId: teacher.id },
    include: {
      targets: {
        include: {
          universityMajor: {
            include: { university: true, cutoffs: true },
          },
        },
        orderBy: { priority: 'asc' },
      },
    },
    orderBy: { name: 'asc' },
  })

  const studentsWithTargets = students.filter(s => s.targets.length > 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">{t('targetManagement')}</h2>
          <p className="text-sm text-muted-foreground">
            학생별 목표 대학과 합격 가능성을 관리합니다.
          </p>
        </div>
        <AdmissionHelpDialog />
      </div>

      {studentsWithTargets.length > 0 ? (
        <div className="space-y-8">
          {studentsWithTargets.map((student) => (
            <StudentTargetManager
              key={student.id}
              targets={student.targets as never[]}
              studentId={student.id}
              studentName={student.name}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <GraduationCap className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">{t('noTargets')}</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            대학 상세 페이지에서 학생의 목표 대학을 추가하세요.
          </p>
        </div>
      )}
    </div>
  )
}
