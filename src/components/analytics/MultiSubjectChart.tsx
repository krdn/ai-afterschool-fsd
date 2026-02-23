"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export interface SubjectAverage {
  subject: string
  averageScore: number
  comparisonScore?: number
}

interface MultiSubjectChartProps {
  data: SubjectAverage[]
  title?: string
  comparison?: boolean
  loading?: false
}

const SUBJECT_COLORS: Record<string, string> = {
  수학: "#3b82f6",
  영어: "#ef4444",
  국어: "#10b981",
  과학: "#f59e0b",
  사회: "#8b5cf6",
  기본: "#6b7280",
}

export function MultiSubjectChart({
  data,
  title = "과목별 평균 성적",
  comparison = false,
  loading = false,
}: MultiSubjectChartProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full h-[300px] bg-gray-100 animate-pulse rounded" />
        </CardContent>
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-gray-500">
            데이터가 충분하지 않습니다
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={data}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="subject"
              tick={{ fontSize: 12 }}
            />
            <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(value: number | string | undefined) => [
                typeof value === 'number' ? `${value.toFixed(1)}점` : value ?? "-",
                ""
              ]}
            />
            <Bar
              dataKey="averageScore"
              name="평균 성적"
              fill={SUBJECT_COLORS.기본}
              radius={[4, 4, 0, 0]}
            />
            {comparison && (
              <Bar
                dataKey="comparisonScore"
                name="비교 성적"
                fill="#9ca3af"
                radius={[4, 4, 0, 0]}
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
