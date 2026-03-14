"use client"

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts"
import type { MBTIDistribution } from "@/features/matching"

interface MBTIChartDataPoint {
  type: string
  count: number
  percentage: number
  color: string
}

interface MBTIDistributionChartProps {
  distribution: MBTIDistribution
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ payload: MBTIChartDataPoint }>
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-card border border rounded-lg p-3 shadow-lg">
        <p className="font-medium">{data.type}</p>
        <p className="text-sm text-muted-foreground">{data.count}명 ({data.percentage}%)</p>
      </div>
    )
  }
  return null
}

const MBTI_COLORS: Record<string, string> = {
  "INTJ": "#3b82f6",
  "INTP": "#6366f1",
  "ENTJ": "#8b5cf6",
  "ENTP": "#a855f7",
  "INFJ": "#ec4899",
  "INFP": "#f43f5e",
  "ENFJ": "#ef4444",
  "ENFP": "#f97316",
  "ISTJ": "#f59e0b",
  "ISFJ": "#eab308",
  "ESTJ": "#84cc16",
  "ESFJ": "#22c55e",
  "ISTP": "#10b981",
  "ISFP": "#14b8a6",
  "ESTP": "#06b6d4",
  "ESFP": "#0ea5e9",
}

export function MBTIDistributionChart({ distribution }: MBTIDistributionChartProps) {
  const types = Object.keys(distribution.typeCounts)
  const totalCount = Object.values(distribution.typeCounts).reduce((a, b) => a + b, 0)

  if (totalCount === 0) {
    return (
      <div className="h-[400px] flex items-center justify-center text-muted-foreground">
        MBTI 데이터가 없습니다
      </div>
    )
  }

  const data = types.map(type => ({
    type,
    count: distribution.typeCounts[type],
    percentage: Math.round((distribution.typeCounts[type] / totalCount) * 100),
    color: MBTI_COLORS[type] || "#94a3b8",
  }))

  return (
    <div className="w-full h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="type"
            cx="50%"
            cy="50%"
            outerRadius={120}
            label={(entry) => `${entry.percent}%`}
            labelLine={false}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="bottom"
            height={100}
            iconType="circle"
            formatter={(value) => {
              const dataPoint = data.find(d => d.count === value)
              return dataPoint ? `${dataPoint.type}: ${value}명` : `${value}명`
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
