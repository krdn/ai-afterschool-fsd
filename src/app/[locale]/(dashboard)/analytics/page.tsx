"use client"

import { useState, useEffect } from "react"
import { PerformanceDashboard } from "@/components/analytics/performance-dashboard"
import { TrendDataPoint as GradeTrendDataPoint } from "@/components/analytics/grade-trend-chart"
import { PerformanceTrendChart, TrendDataPoint } from "@/components/statistics/performance-trend-chart"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, AlertCircle } from "lucide-react"
import { getTeachers } from "@/lib/actions/teacher/crud"
import { compareTeachersByGradeImprovement, getCounselingStats, CounselingStats } from "@/lib/actions/common/analytics"
import { TeacherWithMetrics } from "@/components/analytics/teacher-performance-card"
import { getTeacherStudentMetrics } from "@/lib/actions/teacher/performance"
import { DateRange } from "@/types/statistics"
import { getGradeTrendAction } from "@/lib/actions/analytics/grade-trend"
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav"

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

        const metricsResults = await Promise.allSettled(
          teachersList.map((teacher) => getTeacherStudentMetrics(teacher.id))
        )
        const teachersWithMetrics = teachersList.reduce<TeacherWithMetrics[]>(
          (acc, teacher, i) => {
            const result = metricsResults[i]
            if (result.status === "fulfilled" && result.value.success) {
              const data = result.value.data
              acc.push({
                id: teacher.id,
                name: teacher.name,
                totalStudents: data.totalStudents,
                averageGradeChange: data.averageGradeChange,
                totalCounselingSessions: data.totalCounselingSessions,
                averageCompatibilityScore: data.averageCompatibilityScore,
                averageSatisfactionScore: 0,
                subjectDistribution: data.subjectDistribution,
              })
            }
            return acc
          },
          []
        )

        setTeachers(teachersWithMetrics)

        const comparisonResult = await compareTeachersByGradeImprovement()
        if (comparisonResult.success) {
          setComparisonData(comparisonResult.data)
        }

        const counselingResult = await getCounselingStats()
        if (counselingResult.success) {
          setCounselingStats(counselingResult.data)
        }

        const trendData: TrendDataPoint[] = []
        setGradeTrendData(trendData)
      } catch {
        setError("데이터를 불러오는데 실패했습니다")
      } finally {
        setLoading(false)
      }
    }

    fetchAnalyticsData()
  }, [])

  // 성과 향상률 데이터 페칭 핸들러 — 실제 GradeHistory 집계
  const fetchTrendData = async (range: DateRange): Promise<TrendDataPoint[]> => {
    try {
      const result = await getGradeTrendAction(
        range.start.toISOString(),
        range.end.toISOString()
      )

      if (!result.success || result.data.length === 0) {
        return []
      }

      return result.data.map((point) => ({
        date: point.date,
        improvement: 0,
        score: point.avgScore,
      }))
    } catch {
      return []
    }
  }

  return (
    <div className="space-y-6">
      <BreadcrumbNav items={[
        { label: "대시보드", href: "/dashboard" },
        { label: "성과 분석" },
      ]} />
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">성과 분석</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
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
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              <span className="text-muted-foreground">데이터를 불러오는 중입니다...</span>
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
