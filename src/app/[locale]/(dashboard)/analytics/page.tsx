"use client"

import { useState, useEffect } from "react"
import { PerformanceDashboard } from "@/components/analytics/PerformanceDashboard"
import { TrendDataPoint as GradeTrendDataPoint } from "@/components/analytics/GradeTrendChart"
import { PerformanceTrendChart, TrendDataPoint } from "@/components/statistics/PerformanceTrendChart"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, AlertCircle } from "lucide-react"
import { getTeachers } from "@/lib/actions/teacher/crud"
import { compareTeachersByGradeImprovement, getCounselingStats, CounselingStats } from "@/lib/actions/common/analytics"
import { TeacherWithMetrics } from "@/components/analytics/TeacherPerformanceCard"
import { getTeacherStudentMetrics } from "@/lib/actions/teacher/performance"
import { DateRange } from "@/types/statistics"

interface TeacherGradeComparison {
  teacherId: string
  teacherName: string
  studentImprovements: number[]
}

export default function AnalyticsPage() {
  const [teachers, setTeachers] = useState<TeacherWithMetrics[]>([])
  const [gradeTrendData, setGradeTrendData] = useState<TrendDataPoint[]>([])
  const [comparisonData, setComparisonData] = useState<TeacherGradeComparison[]>([])
  const [counselingStats, setCounselingStats] = useState<CounselingStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchAnalyticsData() {
      setLoading(true)
      setError(null)
      try {
        const teachersList = await getTeachers()

        const teachersWithMetrics: TeacherWithMetrics[] = []
        for (const teacher of teachersList) {
          const metricsResult = await getTeacherStudentMetrics(teacher.id)
          if (metricsResult.success) {
            teachersWithMetrics.push({
              id: teacher.id,
              name: teacher.name,
              totalStudents: metricsResult.data.totalStudents,
              averageGradeChange: metricsResult.data.averageGradeChange,
              totalCounselingSessions: metricsResult.data.totalCounselingSessions,
              averageCompatibilityScore: metricsResult.data.averageCompatibilityScore,
              averageSatisfactionScore: 0,
              subjectDistribution: metricsResult.data.subjectDistribution,
            })
          }
        }

        setTeachers(teachersWithMetrics)

        const comparisonResult = await compareTeachersByGradeImprovement()
        if (comparisonResult.success) {
          setComparisonData(comparisonResult.data)
        } else {
          console.error("Comparison error:", comparisonResult.error)
        }

        const counselingResult = await getCounselingStats()
        if (counselingResult.success) {
          setCounselingStats(counselingResult.data)
        } else {
          console.error("Counseling error:", counselingResult.error)
        }

        const trendData: TrendDataPoint[] = []
        setGradeTrendData(trendData)
      } catch (err) {
        console.error("Failed to fetch analytics data:", err)
        setError("데이터를 불러오는데 실패했습니다")
      } finally {
        setLoading(false)
      }
    }

    fetchAnalyticsData()
  }, [])

  // 성과 향상률 데이터 페칭 핸들러
  const fetchTrendData = async (range: DateRange): Promise<TrendDataPoint[]> => {
    try {
      // GradeHistory에서 기간별 데이터 집계
      // 여기서는 비어있는 배열을 반환하며, 실제 데이터는 추후 구현
      // TODO: 실제 GradeHistory 데이터 집계 로직 구현
      const trendData: TrendDataPoint[] = []

      // 임시 데이터 (데모용)
      const now = new Date()
      const dayMs = 24 * 60 * 60 * 1000
      const daysDiff = Math.floor((now.getTime() - range.start.getTime()) / dayMs)

      for (let i = 0; i <= Math.min(daysDiff, 30); i++) {
        const date = new Date(range.start.getTime() + i * dayMs)
        trendData.push({
          date: date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }),
          improvement: Math.random() * 20 - 5, // -5% ~ 15% 랜덤
          score: Math.round(Math.random() * 30 + 60) // 60~90 랜덤 점수
        })
      }

      return trendData.slice(0, 10) // 최대 10개 데이터 포인트
    } catch (error) {
      console.error('Failed to fetch trend data:', error)
      return []
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">성과 분석</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">
            기간: 최근 3개월
          </span>
        </div>
      </div>

      {/* 성과 향상률 차트 */}
      <PerformanceTrendChart
        initialPreset="3M"
        onDataRequest={fetchTrendData}
        title="팀 성과 향상률 추이"
      />

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
              <span className="text-gray-500">데이터를 불러오는 중입니다...</span>
            </div>
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-4 text-center">
              <AlertCircle className="w-8 h-8 text-red-500" />
              <span className="text-red-600 font-medium">{error}</span>
            </div>
          </CardContent>
        </Card>
      ) : (
        <PerformanceDashboard
          teachers={teachers}
          gradeTrendData={gradeTrendData as unknown as GradeTrendDataPoint[]}
          comparisonData={comparisonData}
          counselingStats={counselingStats}
        />
      )}
    </div>
  )
}
