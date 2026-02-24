"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { TeacherMonthlyStats } from "@/types/statistics"
import { ChevronDown, ChevronUp } from "lucide-react"

interface TeacherStatsTableProps {
  data: TeacherMonthlyStats[]
  loading?: boolean
  maxVisible?: number
}

/**
 * 선생님별 상담 통계 테이블
 *
 * 순위, 이름, 상담 횟수, 미니 바 차트를 표시하며
 * 상담 횟수 내림차순으로 정렬합니다.
 */
export function TeacherStatsTable({
  data,
  loading = false,
  maxVisible = 10
}: TeacherStatsTableProps) {
  const [expanded, setExpanded] = useState(false)

  // 선생님별 총 상담 횟수 집계
  const teacherTotals = data.reduce((acc, stat) => {
    const existing = acc.find(t => t.teacherId === stat.teacherId)
    if (existing) {
      existing.totalSessions += stat.sessionCount
    } else {
      acc.push({
        teacherId: stat.teacherId,
        teacherName: stat.teacherName,
        totalSessions: stat.sessionCount,
        typeBreakdown: { ...stat.typeBreakdown }
      })
    }
    return acc
  }, [] as Array<{
    teacherId: string
    teacherName: string
    totalSessions: number
    typeBreakdown: Record<string, number>
  }>)

  // 상담 횟수 내림차순 정렬
  const sortedTeachers = teacherTotals.sort((a, b) => b.totalSessions - a.totalSessions)

  // 최대값 계산 (미니 바 차트 너비 기준)
  const maxCount = sortedTeachers.length > 0 ? sortedTeachers[0].totalSessions : 1

  // 표시할 데이터
  const visibleData = expanded ? sortedTeachers : sortedTeachers.slice(0, maxVisible)
  const hasMore = sortedTeachers.length > maxVisible

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>선생님별 상담 통계</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 bg-gray-100 animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (sortedTeachers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>선생님별 상담 통계</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            데이터가 없습니다
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>선생님별 상담 통계</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">순위</TableHead>
              <TableHead>선생님</TableHead>
              <TableHead className="w-[100px] text-right">상담 횟수</TableHead>
              <TableHead className="w-[200px]">비율</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleData.map((teacher) => {
              const barWidth = (teacher.totalSessions / maxCount) * 100
              const rank = sortedTeachers.findIndex(t => t.teacherId === teacher.teacherId) + 1

              return (
                <TableRow key={teacher.teacherId}>
                  <TableCell className="font-medium text-gray-500">
                    #{rank}
                  </TableCell>
                  <TableCell className="font-medium">
                    {teacher.teacherName}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {teacher.totalSessions}회
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-blue-500 h-full rounded-full transition-all"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {Math.round((teacher.totalSessions / maxCount) * 100)}%
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>

        {hasMore && (
          <div className="mt-4 flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="gap-2"
            >
              {expanded ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  접기
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  {sortedTeachers.length - maxVisible}명 더보기
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
