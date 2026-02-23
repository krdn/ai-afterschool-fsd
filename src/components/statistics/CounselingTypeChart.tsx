"use client"

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TypeDistribution } from "@/types/statistics"

const COUNSELING_TYPE_COLORS: Record<string, string> = {
  ACADEMIC: '#3b82f6',    // 학습 - 파랑
  CAREER: '#10b981',      // 진로 - 초록
  PSYCHOLOGICAL: '#f59e0b', // 생활 - 주황
  BEHAVIORAL: '#8b5cf6'   // 기타 - 보라
}

const COUNSELING_TYPE_LABELS: Record<string, string> = {
  ACADEMIC: '학습',
  CAREER: '진로',
  PSYCHOLOGICAL: '생활',
  BEHAVIORAL: '기타'
}

interface CounselingTypeChartProps {
  data: TypeDistribution[]
  loading?: boolean
  title?: string
}

export function CounselingTypeChart({
  data,
  loading = false,
  title = "상담 유형별 분포",
}: CounselingTypeChartProps) {
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

  const chartData = data.map(item => ({
    name: COUNSELING_TYPE_LABELS[item.type] || item.type,
    value: item.count,
    type: item.type,
    percentage: item.percentage
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={100}
              innerRadius={60}
              label={({ name, value }) => {
                const total = chartData.reduce((sum, item) => sum + item.value, 0)
                const percentage = total > 0 ? (value / total) * 100 : 0
                return `${name}: ${percentage.toFixed(1)}%`
              }}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COUNSELING_TYPE_COLORS[entry.type] || '#6b7280'}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number | string | undefined) => [
                typeof value === 'number' ? `${value}회` : value ?? "-",
                ""
              ]}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
