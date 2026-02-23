"use client"

import { useState, useEffect, useCallback } from "react"
import { StatisticsCards } from "./StatisticsCards"
import { CounselingTrendChart } from "./CounselingTrendChart"
import { CounselingTypeChart } from "./CounselingTypeChart"
import { TeacherStatsTable } from "./TeacherStatsTable"
import { FollowUpList } from "./FollowUpList"
import { DateRangeFilter } from "./DateRangeFilter"
import { CsvExportButton } from "./CsvExportButton"
import type {
  TeacherMonthlyStats,
  TypeDistribution,
  MonthlyTrend,
  DatePreset,
} from "@/types/statistics"
import type { FollowUpItem } from "@/types/follow-up"
import {
  getTeacherMonthlyStatsAction,
  getCounselingTypeDistributionAction,
  getMonthlyTrendAction,
} from "@/lib/actions/counseling/stats"
import { getDateRangeFromPreset } from "@/shared"
import { getFollowUpsAction, completeFollowUpAction } from "@/lib/actions/counseling/follow-up"
import { toast } from "sonner"

interface DashboardStats {
  monthlySessionCount: number
  pendingReservationCount: number
  overdueFollowUpCount: number
  completionRate: number
  teacherStats: TeacherMonthlyStats[]
  typeDistribution: TypeDistribution[]
  monthlyTrend: MonthlyTrend[]
}

interface StatisticsDashboardProps {
  initialStats: DashboardStats
  initialFollowUps: FollowUpItem[]
}

export function StatisticsDashboard({
  initialStats,
  initialFollowUps,
}: StatisticsDashboardProps) {
  // 상태 관리
  const [datePreset, setDatePreset] = useState<DatePreset>('6M')
  const [stats, setStats] = useState<DashboardStats>(initialStats)
  const [followUps, setFollowUps] = useState<FollowUpItem[]>(initialFollowUps)
  const [loading, setLoading] = useState(false)

  // 날짜 필터 변경 시 데이터 재fetch
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const dateRange = getDateRangeFromPreset(datePreset)

        // 통계 데이터 fetch
        const [teacherStatsRes, typeDistRes, trendRes] = await Promise.all([
          getTeacherMonthlyStatsAction({
            dateFrom: dateRange.start.toISOString(),
            dateTo: dateRange.end.toISOString(),
          }),
          getCounselingTypeDistributionAction({
            dateFrom: dateRange.start.toISOString(),
            dateTo: dateRange.end.toISOString(),
          }),
          getMonthlyTrendAction({ months: parseInt(datePreset.slice(0, -1)) }),
        ])

        // 통계 업데이트
        if (teacherStatsRes.success && typeDistRes.success && trendRes.success) {
          setStats(prev => ({
            ...prev,
            teacherStats: teacherStatsRes.data!,
            typeDistribution: typeDistRes.data!,
            monthlyTrend: trendRes.data!,
          }))
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error)
        toast.error('통계 데이터를 불러오는데 실패했습니다.')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [datePreset])

  // 후속 조치 완료 처리
  const handleFollowUpComplete = useCallback(async (id: string, note?: string) => {
    try {
      const result = await completeFollowUpAction({
        sessionId: id,
        completionNote: note,
      })

      if (result.success) {
        toast.success('후속 조치가 완료되었습니다.')

        // 후속 조치 목록 재조회
        const followUpResult = await getFollowUpsAction({ scope: 'week' })
        if (followUpResult.success && followUpResult.data) {
          setFollowUps(followUpResult.data)
        }
      } else {
        toast.error(result.error || '후속 조치 완료에 실패했습니다.')
      }
    } catch (error) {
      console.error('Failed to complete follow-up:', error)
      toast.error('후속 조치 완료 중 오류가 발생했습니다.')
    }
  }, [])

  // CSV 내보내기용 데이터 준비
  const csvData = stats.teacherStats.map(stat => ({
    연월: `${stat.year}-${String(stat.month).padStart(2, '0')}`,
    선생님: stat.teacherName,
    총상담: stat.sessionCount,
    학습: stat.typeBreakdown.ACADEMIC,
    진로: stat.typeBreakdown.CAREER,
    생활: stat.typeBreakdown.PSYCHOLOGICAL,
    기타: stat.typeBreakdown.BEHAVIORAL,
  }))

  return (
    <div className="space-y-6">
      {/* 상단: 제목 + 필터 + 내보내기 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">상담 통계</h1>
          <p className="text-sm text-gray-600 mt-1">
            상담 활동을 분석하고 후속 조치를 관리합니다
          </p>
        </div>
        <div className="flex gap-2">
          <DateRangeFilter
            value={datePreset}
            onChange={(preset: string) => setDatePreset(preset as DatePreset)}
            variant="dropdown"
          />
          <CsvExportButton
            data={csvData}
            filename={`counseling-stats-${datePreset}.csv`}
          />
        </div>
      </div>

      {/* 요약 카드 */}
      <StatisticsCards
        monthlySessionCount={stats.monthlySessionCount}
        pendingReservationCount={stats.pendingReservationCount}
        overdueFollowUpCount={stats.overdueFollowUpCount}
        completionRate={stats.completionRate}
        loading={loading}
      />

      {/* 메인 그리드: 2열 (데스크탑) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 왼쪽: 통계/차트 (2열 span) */}
        <div className="lg:col-span-2 space-y-6">
          {/* 월별 추이 차트 */}
          <CounselingTrendChart
            data={stats.monthlyTrend}
            loading={loading}
          />

          {/* 유형별 분포 차트 */}
          <CounselingTypeChart
            data={stats.typeDistribution}
            loading={loading}
          />

          {/* 선생님별 통계 테이블 */}
          <TeacherStatsTable
            data={stats.teacherStats}
            loading={loading}
          />
        </div>

        {/* 오른쪽: 후속 조치 목록 (1열 span) */}
        <div className="lg:col-span-1">
          <FollowUpList
            items={followUps}
            onComplete={handleFollowUpComplete}
            loading={false}
          />
        </div>
      </div>
    </div>
  )
}
