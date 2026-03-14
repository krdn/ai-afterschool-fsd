import { getTranslations } from 'next-intl/server'
import { getCurrentTeacher } from '@/lib/dal'
import { getUniversityById } from '@/features/admission/repositories/university'
import { getMajorsByUniversity } from '@/features/admission/repositories/university-major'
import { MajorDetail } from '@/components/admission/major-detail'
import { AdmissionHelpDialog } from '@/components/admission/admission-help-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Link } from '@/i18n/routing'
import { ArrowLeft, GraduationCap, MapPin, ExternalLink } from 'lucide-react'
import { notFound } from 'next/navigation'

const typeLabels: Record<string, string> = {
  FOUR_YEAR: '4년제',
  COLLEGE: '전문대',
  CYBER: '사이버대',
  EDUCATION: '교육대',
}

export default async function UniversityDetailPage(props: {
  params: Promise<{ universityId: string }>
}) {
  const { universityId } = await props.params
  const t = await getTranslations('Admission')
  await getCurrentTeacher()

  const university = await getUniversityById(universityId)
  if (!university) notFound()

  const majors = await getMajorsByUniversity(universityId)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admission">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold">{university.name}</h2>
              <Badge variant="secondary">{typeLabels[university.type] ?? university.type}</Badge>
            </div>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {university.region}
              </span>
              {university.website && (
                <a href={university.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:underline">
                  <ExternalLink className="h-3.5 w-3.5" />
                  입학처
                </a>
              )}
            </div>
          </div>
        </div>
        <AdmissionHelpDialog />
      </div>

      {majors.length > 0 ? (
        <div className="space-y-8">
          {majors.map((major) => (
            <MajorDetail key={major.id} major={major as never} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <GraduationCap className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">{t('noData')}</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            이 대학의 학과 정보가 아직 없습니다. AI 수집으로 추가하세요.
          </p>
        </div>
      )}
    </div>
  )
}
