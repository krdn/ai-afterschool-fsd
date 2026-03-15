'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BarChart3, Loader2, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { analyzeAdmissionAction } from '@/lib/actions/admission/analysis'
import type { AdmissionAnalysisResult } from '@/features/admission/types'
import type { StudentTargetWithDetails } from '@/features/admission/types'

const gradeColors: Record<string, string> = {
  '안정': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  '적정': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  '도전': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  '상향도전': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
}

export function AdmissionProbabilityCard({
  target,
  studentId,
}: {
  target: StudentTargetWithDetails
  studentId: string
}) {
  const t = useTranslations('Admission')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [result, setResult] = useState<AdmissionAnalysisResult | null>(
    target.gapAnalysis ? (target.gapAnalysis as unknown as AdmissionAnalysisResult) : null,
  )

  const handleAnalyze = async () => {
    setIsAnalyzing(true)
    const res = await analyzeAdmissionAction(studentId, target.id)
    setIsAnalyzing(false)

    if (res.success) {
      setResult(res.data)
      toast.success('분석이 완료되었습니다.')
    } else {
      toast.error(res.error)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            {target.universityMajor.university.name} — {target.universityMajor.majorName}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{target.priority}지망</Badge>
            {result && (
              <Badge className={gradeColors[result.grade] ?? ''}>
                {result.grade} {result.probability}%
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {result ? (
          <>
            <div className="grid gap-2 sm:grid-cols-2">
              {result.currentVsCutoff.slice(0, 4).map((item) => (
                <div key={item.subject} className="flex items-center justify-between rounded-md border px-3 py-2">
                  <span className="text-sm font-medium">{item.subject}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">{item.current}</span>
                    {item.status === 'ABOVE' && <TrendingUp className="h-3.5 w-3.5 text-green-500" />}
                    {item.status === 'BELOW' && <TrendingDown className="h-3.5 w-3.5 text-red-500" />}
                    {item.status === 'AT' && <Minus className="h-3.5 w-3.5 text-blue-500" />}
                    <span className="text-xs text-muted-foreground">/ {item.cutoff}</span>
                  </div>
                </div>
              ))}
            </div>

            {result.improvementPriority.length > 0 && (
              <div className="rounded-md bg-muted/50 p-3">
                <p className="text-xs font-medium mb-1">개선 우선순위</p>
                <div className="space-y-1">
                  {result.improvementPriority.slice(0, 3).map((item) => (
                    <p key={item.subject} className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{item.subject}</span>: {item.strategy}
                    </p>
                  ))}
                </div>
              </div>
            )}

            <Button variant="outline" size="sm" onClick={handleAnalyze} disabled={isAnalyzing} className="w-full gap-2">
              {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
              재분석
            </Button>
          </>
        ) : (
          <Button onClick={handleAnalyze} disabled={isAnalyzing} className="w-full gap-2">
            {isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('analyzing')}
              </>
            ) : (
              <>
                <BarChart3 className="h-4 w-4" />
                {t('analyze')}
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
