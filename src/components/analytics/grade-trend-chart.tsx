"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export interface TrendDataPoint {
  date: string
  score: number
  subject?: string
}

interface GradeTrendChartProps {
  data: TrendDataPoint[]
  subjects?: string[]
  title?: string
  loading?: boolean
}

const SUBJECT_COLORS: Record<string, string> = {
  수학: "#3b82f6",
  영어: "#ef4444",
  국어: "#10b981",
  과학: "#f59e0b",
  사회: "#8b5cf6",
  기본: "#6b7280",
}

export function GradeTrendChart({
  data,
  subjects = [],
  title = "성적 추이",
  loading = false,
}: GradeTrendChartProps) {
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

  const dates = [...new Set(data.map(d => d.date))].sort()

  const averageData = dates.map(date => {
    const scores = data
      .filter(d => d.date === date)
      .map(d => d.score)
    const avg = scores.length > 0 ? scores.reduce((sum, s) => sum + s, 0) / scores.length : 0
    return { date, average: Math.round(avg * 10) / 10 }
  })

  const chartData = dates.map(date => {
    const point: Record<string, string | number> = { date }
    data.filter(d => d.date === date).forEach(d => {
      if (d.subject) {
        point[d.subject] = d.score
      } else {
        point.score = d.score
      }
    })
    const avgPoint = averageData.find(a => a.date === date)
    if (avgPoint) {
      point.average = avgPoint.average
    }
    return point
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => {
                const parts = value.toString().split("-")
                return `${parts[1]}/${parts[2]?.slice(0, 2) || ""}`
              }}
            />
            <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(value: number | string | undefined) => [
                typeof value === 'number' ? `${value.toFixed(1)}점` : value ?? "-",
                ""
              ]}
              labelFormatter={(label) => {
                const parts = label.toString().split("-")
                return `${parts[0]}년 ${parts[1]}월`
              }}
            />
            {subjects.length > 0 ? (
              subjects.map(subject => (
                <Line
                  key={subject}
                  type="monotone"
                  dataKey={subject}
                  stroke={SUBJECT_COLORS[subject] || SUBJECT_COLORS.기본}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              ))
            ) : (
              <>
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke={SUBJECT_COLORS.기본}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="average"
                  stroke="#9ca3af"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  name="평균"
                />
              </>
            )}
            {subjects.length > 0 && <Legend />}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
