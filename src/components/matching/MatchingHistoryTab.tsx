'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MatchingAuditTable } from '@/components/matching/MatchingAuditTable'
import { AuditLogDetailDialog } from '@/components/matching/AuditLogDetailDialog'
import { getMatchingHistory, type MatchingHistoryParams } from '@/lib/actions/matching/history'
import { getTeachers } from '@/lib/actions/teacher/crud'
import type { AuditLogEntry } from '@/lib/actions/admin/audit'
import { Loader2, ChevronLeft, ChevronRight, Filter } from 'lucide-react'
import { toast } from 'sonner'

interface Teacher {
  id: string
  name: string
  email: string
  role: string
}

interface MatchingHistoryTabProps {
  initialFilters?: {
    startDate?: string
    endDate?: string
    teacherId?: string
    action?: string
  }
}

export function MatchingHistoryTab({ initialFilters = {} }: MatchingHistoryTabProps) {
  // 상태 관리
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 필터 상태
  const [filters, setFilters] = useState({
    startDate: initialFilters.startDate || '',
    endDate: initialFilters.endDate || '',
    teacherId: initialFilters.teacherId || '',
    action: initialFilters.action || 'ALL',
  })

  // 페이지네이션 상태
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [total, setTotal] = useState(0)

  // 선생님 목록
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [hasPermission, setHasPermission] = useState(true)

  // 선생님 목록 조회
  useEffect(() => {
    async function fetchTeachers() {
      try {
        const result = await getTeachers()
        setTeachers(result)
      } catch (error) {
        console.error('Failed to fetch teachers:', error)
      }
    }
    fetchTeachers()
  }, [])

  // 로그 조회 함수
  const fetchLogs = async () => {
    setLoading(true)
    setError(null)

    try {
      const params: MatchingHistoryParams = {
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
        teacherId: filters.teacherId || undefined,
        action: filters.action || undefined,
        page,
        pageSize,
      }

      const result = await getMatchingHistory(params)

      if (result.success) {
        setLogs(result.data.logs)
        setTotal(result.data.total)
      } else {
        const errorMsg = result.error ?? '조회 중 오류가 발생했습니다.'
        if (errorMsg.includes('권한')) {
          setHasPermission(false)
        }
        setError(errorMsg)
        setLogs([])
        setTotal(0)
      }
    } catch (error) {
      console.error('Failed to fetch matching history:', error)
      setError('조회 중 오류가 발생했습니다.')
      setLogs([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  // 필터 또는 페이지 변경 시 로그 조회
  useEffect(() => {
    fetchLogs()
  }, [filters, page])

  // 필터 적용 핸들러
  const handleApplyFilters = () => {
    setPage(1) // 필터 변경 시 페이지 1로 리셋
    fetchLogs()
  }

  // 필터 리셋 핸들러
  const handleResetFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      teacherId: '',
      action: 'ALL',
    })
    setPage(1)
  }

  // 행 클릭 핸들러
  const handleRowClick = (log: AuditLogEntry) => {
    setSelectedLog(log)
    setIsDialogOpen(true)
  }

  // 권한 없음 메시지
  if (!hasPermission) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>매칭 이력 조회</CardTitle>
          <CardDescription>학생 배정 변경 이력을 확인합니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground">권한이 없습니다.</p>
            <p className="text-sm text-muted-foreground mt-1">이 페이지는 원장(DIRECTOR)만 접근할 수 있습니다.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <Card>
      <CardHeader>
        <CardTitle>매칭 이력 조회</CardTitle>
        <CardDescription>학생 배정 변경 이력을 확인합니다.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 필터 폼 */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <h3 className="text-sm font-medium">필터</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* 시작일 */}
            <div className="space-y-2">
              <Label htmlFor="startDate">시작일</Label>
              <Input
                id="startDate"
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                data-testid="filter-start-date"
              />
            </div>

            {/* 종료일 */}
            <div className="space-y-2">
              <Label htmlFor="endDate">종료일</Label>
              <Input
                id="endDate"
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                data-testid="filter-end-date"
              />
            </div>

            {/* 변경자 */}
            <div className="space-y-2">
              <Label htmlFor="teacherId">변경자</Label>
              <Select
                value={filters.teacherId}
                onValueChange={(value) => setFilters({ ...filters, teacherId: value })}
                data-testid="filter-teacher"
              >
                <SelectTrigger id="teacherId">
                  <SelectValue placeholder="전체" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">전체</SelectItem>
                  {teachers.map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      {teacher.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 변경 유형 */}
            <div className="space-y-2">
              <Label htmlFor="action">변경 유형</Label>
              <Select
                value={filters.action}
                onValueChange={(value) => setFilters({ ...filters, action: value })}
                data-testid="filter-action"
              >
                <SelectTrigger id="action">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">전체</SelectItem>
                  <SelectItem value="CREATE">생성</SelectItem>
                  <SelectItem value="UPDATE">수정</SelectItem>
                  <SelectItem value="DELETE">삭제</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 버튼 그룹 */}
          <div className="flex gap-2">
            <Button onClick={handleApplyFilters} disabled={loading} data-testid="apply-filters-button">
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Filter className="h-4 w-4 mr-2" />}
              적용
            </Button>
            <Button variant="outline" onClick={handleResetFilters} disabled={loading} data-testid="reset-filters-button">
              초기화
            </Button>
          </div>
        </div>

        {/* 에러 메시지 */}
        {error && !hasPermission && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
            {error}
          </div>
        )}

        {/* 로딩 상태 */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">데이터를 불러오는 중...</span>
          </div>
        )}

        {/* 감사 로그 테이블 */}
        {!loading && (
          <>
            <MatchingAuditTable
              logs={logs}
              onRowClick={handleRowClick}
            />

            {/* 페이지네이션 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  총 {total}개 중 {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)}개 표시
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1 || loading}
                    data-testid="pagination-prev"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    이전
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages || loading}
                    data-testid="pagination-next"
                  >
                    다음
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* 상세 모달 */}
        <AuditLogDetailDialog
          log={selectedLog}
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
        />
      </CardContent>
    </Card>
  )
}
