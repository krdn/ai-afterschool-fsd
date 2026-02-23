"use client"

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from "recharts"
import type { CompatibilityBreakdown } from "@/features/analysis"

interface CompatibilityRadarChartProps {
  breakdown: CompatibilityBreakdown
}

export function CompatibilityRadarChart({ breakdown }: CompatibilityRadarChartProps) {
  const data = [
    { subject: "MBTI", value: breakdown.mbti, max: 25, fullMark: 25 },
    { subject: "학습 스타일", value: breakdown.learningStyle, max: 25, fullMark: 25 },
    { subject: "사주", value: breakdown.saju, max: 20, fullMark: 20 },
    { subject: "성명학", value: breakdown.name, max: 15, fullMark: 15 },
    { subject: "부하 분산", value: breakdown.loadBalance, max: 15, fullMark: 15 },
  ]

  return (
    <div className="w-full h-[250px]">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid />
          <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
          <PolarRadiusAxis angle={90} domain={[0, 25]} tick={false} axisLine={false} />
          <Radar
            name="궁합 점수"
            dataKey="value"
            stroke="#8884d8"
            fill="#8884d8"
            fillOpacity={0.6}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
