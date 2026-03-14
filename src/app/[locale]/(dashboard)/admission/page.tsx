import { getTranslations } from 'next-intl/server'
import { getCurrentTeacher } from '@/lib/dal'
import { listUniversities, searchUniversities } from '@/features/admission/repositories/university'
import { UniversitySearch } from '@/components/admission/university-search'
import { UniversityCard } from '@/components/admission/university-card'
import { AIResearchPanel } from '@/components/admission/ai-research-panel'
import { GraduationCap } from 'lucide-react'

export default async function AdmissionPage(props: {
  searchParams?: Promise<{ query?: string; page?: string }>
}) {
  const searchParams = await props.searchParams
  const query = searchParams?.query || ''
  const page = Math.max(1, Number(searchParams?.page) || 1)
  const t = await getTranslations('Admission')

  await getCurrentTeacher()

  const result = query
    ? { universities: await searchUniversities(query), total: 0, page: 1, pageSize: 20 }
    : await listUniversities(page)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <UniversitySearch defaultQuery={query} />
        <AIResearchPanel />
      </div>

      {result.universities.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {result.universities.map((university) => (
            <UniversityCard key={university.id} university={university} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <GraduationCap className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">{t('noData')}</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            AI 수집 버튼을 클릭하여 대학 입시 정보를 검색하세요.
          </p>
        </div>
      )}
    </div>
  )
}
