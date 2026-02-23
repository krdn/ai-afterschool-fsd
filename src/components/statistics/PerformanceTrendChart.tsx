'use client'

import { useState, useEffect } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DateRangeFilter } from '@/components/statistics/DateRangeFilter'
import { getDateRangeFromPreset, ExtendedDatePreset, DEFAULT_PRESETS } from '@/shared'
import { DateRange } from '@/types/statistics'
import { Loader2 } from 'lucide-react'

/**
 * 추이 데이터 포인트
 */
export interface TrendDataPoint {
  date: string
  improvement: number
  [key: string]: string | number
}

/**
 * 성과 향상률 차트 Props
 */
export interface PerformanceTrendChartProps {
  initialPreset?: ExtendedDatePreset
  onDataRequest: (range: DateRange) => Promise<TrendDataPoint[]>
  title?: string
}

/**
 * 성과 향상률 차트 컴포넌트
 *
 * 기간 선택 프리셋과 함께 향상률 추이를 시각화합니다.
 */
export function PerformanceTrendChart({
  initialPreset = '7D',
  onDataRequest,
  title = '성과 향상률 추이'
}: PerformanceTrendChartProps) {
  const [preset, setPreset] = useState<ExtendedDatePreset>(initialPreset)
  const [chartData, setChartData] = useState<TrendDataPoint[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 기간 변경 시 데이터 페칭
  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setError(null)

      try {
        const range = getDateRangeFromPreset(preset)
        const data = await onDataRequest(range)
        setChartData(data)
      } catch (err) {
        console.error('Failed to fetch trend data:', err)
        setError('데이터를 불러오는데 실패했습니다.')
        setChartData([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [preset, onDataRequest])

  const handlePresetChange = (newPreset: string) => {
    setPreset(newPreset as ExtendedDatePreset)
  }

  return (
    <Card data-testid="performance-trend-chart">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle>{title}</CardTitle>
          <DateRangeFilter
            value={preset}
            onChange={handlePresetChange}
            variant="buttons"
            presets={DEFAULT_PRESETS}
            data-testid="date-range-filter"
          />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
              <span className="text-gray-500">데이터를 불러오는 중입니다...</span>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-red-500">{error}</p>
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-gray-500">표시할 데이터가 없습니다.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
              <XAxis
                dataKey="date"
                className="text-sm"
                tick={{ fill: '#6b7280' }}
              />
              <YAxis
                className="text-sm"
                tick={{ fill: '#6b7280' }}
                label={{ value: '향상률 (%)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
                formatter={((value: number) => [`${value.toFixed(1)}%`, '향상률']) as import('recharts').TooltipProps<number, string>['formatter']}
                labelFormatter={(label) => `날짜: ${label}`}
              />
              <Line
                type="monotone"
                dataKey="improvement"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: '#3b82f6', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
