"use client"

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export interface PersonalityDiversityData {
  axis: string
  score: number
  ideal?: number
}

interface PersonalityDiversityChartProps {
  data: PersonalityDiversityData[]
  title?: string
  showIdeal?: boolean
}

const RADAR_COLORS = {
  actual: "#3b82f6", // blue-500
  ideal: "#10b981", // green-500
  grid: "#e5e7eb", // gray-200
  text: "#6b7280", // gray-500
}

const AXIS_LABELS: Record<string, string> = {
  mbti: "MBTI",
  vark: "학습 스타일",
  saju: "사주 오행",
  subject: "전문성",
  experience: "경력",
}

export function PersonalityDiversityChart({
  data,
  title = "성향 다양성",
  showIdeal = true,
}: PersonalityDiversityChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center text-gray-500">
            데이터가 충분하지 않습니다
          </div>
        </CardContent>
      </Card>
    )
  }

  // 각 축의 레이블 변환
  const chartData = data.map((item) => ({
    axis: AXIS_LABELS[item.axis] || item.axis,
    actual: item.score,
    ideal: showIdeal ? item.ideal || 70 : undefined,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <RadarChart data={chartData}>
            <PolarGrid stroke={RADAR_COLORS.grid} />
            <PolarAngleAxis
              dataKey="axis"
              tick={{ fontSize: 12, fill: RADAR_COLORS.text }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fontSize: 10, fill: RADAR_COLORS.text }}
            />
            <Tooltip
              formatter={(value: unknown, name: unknown) => {
                const numValue = typeof value === "number" ? value : 0
                const strName = typeof name === "string" ? name : ""

                if (strName === "actual") {
                  return [`현재: ${numValue}점`, ""]
                }
                if (strName === "ideal") {
                  return [`이상: ${numValue}점`, ""]
                }
                return [numValue, strName]
              }}
            />
            {showIdeal && (
              <Radar
                name="이상적인 팀"
                dataKey="ideal"
                stroke={RADAR_COLORS.ideal}
                fill={RADAR_COLORS.ideal}
                fillOpacity={0.2}
                strokeWidth={2}
              />
            )}
            <Radar
              name="현재 팀"
              dataKey="actual"
              stroke={RADAR_COLORS.actual}
              fill={RADAR_COLORS.actual}
              fillOpacity={0.4}
              strokeWidth={2}
            />
            <Legend
              wrapperStyle={{ fontSize: 12 }}
              iconType="circle"
            />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
