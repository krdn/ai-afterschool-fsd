'use client'

import { useTranslations } from 'next-intl'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp } from 'lucide-react'
import type { TrendResult } from '@/features/admission/services/trend-analyzer'

const directionLabels: Record<string, string> = {
  HARDER: '난이도 상승',
  EASIER: '난이도 하락',
  STABLE: '변동 없음',
  UNKNOWN: '데이터 부족',
}

const directionColors: Record<string, string> = {
  HARDER: 'text-red-500',
  EASIER: 'text-green-500',
  STABLE: 'text-blue-500',
  UNKNOWN: 'text-muted-foreground',
}

export function CutoffTrendChart({ trend }: { trend: TrendResult }) {
  const t = useTranslations('Admission')

  if (trend.trends.length === 0) {
    return null
  }

  const hasGrade = trend.trends.some(d => d.cutoffGrade != null)
  const hasScore = trend.trends.some(d => d.cutoffScore != null)
  const hasRate = trend.trends.some(d => d.competitionRate != null)

  const data = trend.trends.map(d => ({
    year: `${d.academicYear}`,
    grade: d.cutoffGrade ?? undefined,
    score: d.cutoffScore ?? undefined,
    rate: d.competitionRate ?? undefined,
  }))

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            {t('cutoffTrend')} — {trend.admissionType}
          </CardTitle>
          <span className={`text-xs font-medium ${directionColors[trend.direction]}`}>
            {directionLabels[trend.direction]}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="year" className="text-xs" />
            {hasGrade && (
              <>
                <YAxis yAxisId="grade" orientation="left" domain={[0, 9]} reversed className="text-xs" />
                <Line
                  yAxisId="grade"
                  type="monotone"
                  dataKey="grade"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  name={t('cutoffGrade')}
                  dot={{ r: 4 }}
                  connectNulls
                />
              </>
            )}
            {hasScore && !hasGrade && (
              <>
                <YAxis yAxisId="score" orientation="left" className="text-xs" />
                <Line
                  yAxisId="score"
                  type="monotone"
                  dataKey="score"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  name={t('cutoffScore')}
                  dot={{ r: 4 }}
                  connectNulls
                />
              </>
            )}
            {hasRate && (
              <>
                <YAxis yAxisId="rate" orientation="right" className="text-xs" />
                <Line
                  yAxisId="rate"
                  type="monotone"
                  dataKey="rate"
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name={t('competitionRate')}
                  dot={{ r: 4 }}
                  connectNulls
                />
              </>
            )}
            <Tooltip />
            <Legend />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
