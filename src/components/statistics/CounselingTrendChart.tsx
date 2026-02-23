"use client"

import { useState } from "react"
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MonthlyTrend } from "@/types/statistics"

interface CounselingTrendChartProps {
  data: MonthlyTrend[]
  loading?: boolean
  title?: string
}

export function CounselingTrendChart({
  data,
  loading = false,
  title = "월별 상담 추이",
}: CounselingTrendChartProps) {
  const [chartType, setChartType] = useState<'line' | 'area'>('line')

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

  const ChartComponent = chartType === 'line' ? LineChart : AreaChart
  const DataComponent = chartType === 'line' ? Line : Area

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{title}</CardTitle>
          <div className="flex gap-2">
            <Button
              variant={chartType === 'line' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('line')}
            >
              라인
            </Button>
            <Button
              variant={chartType === 'area' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('area')}
            >
              영역
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <ChartComponent
            data={data}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12 }}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(value: number | string | undefined) => [
                typeof value === 'number' ? `${value}회` : value ?? "-",
                ""
              ]}
              labelFormatter={(label) => `${label}`}
            />
            <DataComponent
              type="monotone"
              dataKey="count"
              stroke="#3b82f6"
              strokeWidth={2}
              fill={chartType === 'area' ? '#3b82f6' : undefined}
              fillOpacity={chartType === 'area' ? 0.6 : undefined}
              dot={chartType === 'line' ? { r: 4 } : false}
              activeDot={chartType === 'line' ? { r: 6 } : undefined}
            />
          </ChartComponent>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
