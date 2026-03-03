"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { ReservationCard, type ReservationWithRelations } from "./reservation-card"
import { ReservationDetailDialog } from "./reservation-detail-dialog"
import type { ReservationStatus } from '@/lib/db'

interface ReservationListProps {
  reservations: ReservationWithRelations[]
  onRefresh?: () => void
  dateFilter?: Date  // 외부에서 전달받은 날짜 필터
}

export function ReservationList({ reservations, onRefresh, dateFilter }: ReservationListProps) {
  // 삭제된 예약 ID를 추적하여 즉시 목록에서 제거
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set())

  // 필터 상태
  const [statusFilter, setStatusFilter] = useState<ReservationStatus | "ALL">("ALL")
  const [searchQuery, setSearchQuery] = useState("")
  const [internalDateFilter, setInternalDateFilter] = useState<Date | undefined>(undefined)
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [selectedReservationId, setSelectedReservationId] = useState<string | null>(null)
  const [dialogMode, setDialogMode] = useState<'read' | 'edit' | 'record'>('read')

  // 외부 dateFilter가 변경되면 내부 상태 업데이트
  useEffect(() => {
    setInternalDateFilter(dateFilter)
  }, [dateFilter])

  // 검색 디바운스 (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // 필터링 로직
  const filteredReservations = useMemo(() => {
    return reservations
      .filter((reservation) => {
        // 삭제된 항목 제외
        if (deletedIds.has(reservation.id)) {
          return false
        }

        // 상태 필터
        if (statusFilter !== "ALL" && reservation.status !== statusFilter) {
          return false
        }

        // 학생 이름 검색
        if (debouncedSearch.trim()) {
          const studentName = reservation.student.name.toLowerCase()
          if (!studentName.includes(debouncedSearch.toLowerCase())) {
            return false
          }
        }

        // 날짜 필터
        if (internalDateFilter) {
          const reservationDate = new Date(reservation.scheduledAt)
          const filterDate = new Date(internalDateFilter)
          filterDate.setHours(0, 0, 0, 0)
          const filterDateEnd = new Date(internalDateFilter)
          filterDateEnd.setHours(23, 59, 59, 999)

          if (reservationDate < filterDate || reservationDate > filterDateEnd) {
            return false
          }
        }

        return true
      })
      .sort((a, b) => {
        // scheduledAt 기준 내림차순 (최신 순)
        return new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()
      })
  }, [reservations, statusFilter, debouncedSearch, internalDateFilter, deletedIds])

  // 필터 리셋
  const handleResetFilters = useCallback(() => {
    setStatusFilter("ALL")
    setSearchQuery("")
    setInternalDateFilter(undefined)
  }, [])

  // 다이얼로그 열기 (모드 지정)
  const openDialog = useCallback((id: string, mode: 'read' | 'edit' | 'record') => {
    setSelectedReservationId(id)
    setDialogMode(mode)
  }, [])

  const closeDialog = useCallback(() => {
    setSelectedReservationId(null)
    setDialogMode('read')
  }, [])

  // 삭제 시 즉시 목록에서 제거
  const handleDelete = useCallback((id: string) => {
    setDeletedIds((prev) => new Set(prev).add(id))
  }, [])

  // 필터 중인지 확인
  const isFiltering = statusFilter !== "ALL" || debouncedSearch.trim() || internalDateFilter

  // 빈 상태 렌더링
  if (filteredReservations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        {isFiltering ? (
          <>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-gray-400 mb-4"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <p className="text-gray-600 text-center">검색 결과가 없습니다.</p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetFilters}
              className="mt-4"
            >
              필터 초기화
            </Button>
          </>
        ) : (
          <>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-gray-400 mb-4"
            >
              <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
              <line x1="16" x2="16" y1="2" y2="6" />
              <line x1="8" x2="8" y1="2" y2="6" />
              <line x1="3" x2="21" y1="10" y2="10" />
            </svg>
            <p className="text-gray-600 text-center mb-4">
              예약된 상담이 없습니다.
              <br />
              새 예약을 등록해주세요.
            </p>
            {onRefresh && (
              <Button variant="outline" size="sm" onClick={onRefresh}>
                새 예약 등록
              </Button>
            )}
          </>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 필터 UI */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        {/* 상태 필터 */}
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as ReservationStatus | "ALL")}
        >
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue placeholder="상태 필터" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">전체</SelectItem>
            <SelectItem value="SCHEDULED">예약</SelectItem>
            <SelectItem value="COMPLETED">완료</SelectItem>
            <SelectItem value="CANCELLED">취소</SelectItem>
            <SelectItem value="NO_SHOW">노쇼</SelectItem>
          </SelectContent>
        </Select>

        {/* 검색 입력 */}
        <div className="relative flex-1 w-full">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <Input
            type="text"
            placeholder="학생 이름 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* 필터 리셋 버튼 */}
        {isFiltering && (
          <Button variant="ghost" size="sm" onClick={handleResetFilters}>
            필터 초기화
          </Button>
        )}
      </div>

      {/* 필터링 결과 수 */}
      <p className="text-sm text-gray-600">
        총 {filteredReservations.length}건의 예약
      </p>

      {/* 예약 목록 */}
      <div className="space-y-3">
        {filteredReservations.map((reservation) => (
          <ReservationCard
            key={reservation.id}
            reservation={reservation}
            onDetailClick={(id) => openDialog(id, 'read')}
            onEditClick={(id) => openDialog(id, 'edit')}
            onRecordClick={(id) => openDialog(id, 'record')}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {/* 상세 다이얼로그 (3모드) */}
      <ReservationDetailDialog
        reservationId={selectedReservationId}
        initialMode={dialogMode}
        onClose={closeDialog}
      />
    </div>
  )
}

export default ReservationList
