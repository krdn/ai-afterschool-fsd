'use client'

import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BookOpen, FileText } from 'lucide-react'
import { CutoffTable } from './cutoff-table'
import { CutoffTrendChart } from './cutoff-trend-chart'
import { analyzeTrend } from '@/features/admission/services/trend-analyzer'
import type { UniversityMajorWithCutoffs } from '@/features/admission/types'

export function MajorDetail({ major }: { major: UniversityMajorWithCutoffs }) {
  const t = useTranslations('Admission')

  const admissionTypes = [...new Set(major.cutoffs.map(c => c.admissionType))]
  const trends = admissionTypes.map(type => analyzeTrend(major.cutoffs, type))

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{major.majorName}</CardTitle>
            {major.department && (
              <Badge variant="secondary">{major.department}</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {major.requiredSubjects.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-1.5 flex items-center gap-1.5">
                <BookOpen className="h-4 w-4" />
                {t('requiredSubjects')}
              </p>
              <div className="flex flex-wrap gap-1">
                {major.requiredSubjects.map((subj) => (
                  <Badge key={subj} variant="outline">{subj}</Badge>
                ))}
              </div>
            </div>
          )}

          {major.preparationGuide && (
            <div>
              <p className="text-sm font-medium mb-1.5 flex items-center gap-1.5">
                <FileText className="h-4 w-4" />
                {t('preparationGuide')}
              </p>
              <div className="rounded-md bg-muted/50 p-3 text-sm whitespace-pre-wrap">
                {major.preparationGuide}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {trends.map((trend) => (
        <CutoffTrendChart key={trend.admissionType} trend={trend} />
      ))}

      <CutoffTable cutoffs={major.cutoffs} />
    </div>
  )
}
