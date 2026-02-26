"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ReservationList } from "@/components/counseling/reservation-list"
import { ReservationWizard } from "@/components/counseling/wizard"
import { ReservationCalendarView } from "@/components/counseling/reservation-calendar-view"
import { getReservationsAction } from "@/lib/actions/counseling/reservations-query"
import type { ReservationWithRelations } from "@/types/counseling"
interface CounselingPageTabsProps {
  initialTab?: string
  children: React.ReactNode
}

type FormView = "list" | "form"

type TabType = "history" | "reservations" | "calendar"

export function CounselingPageTabs({ initialTab, children }: CounselingPageTabsProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabType>(
    (initialTab === "reservations" || initialTab === "calendar") ? initialTab as TabType : "history"
  )
  const [formView, setFormView] = useState<FormView>("list")
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [reservations, setReservations] = useState<ReservationWithRelations[]>([])

  // 캘린더 뷰 관련 상태
  const [calendarViewDate, _setCalendarViewDate] = useState<Date>(new Date())
  const [calendarDateFilter, setCalendarDateFilter] = useState<Date | undefined>(undefined)

  // 컴포넌트 마운트 시 예약 목록 로드
  useEffect(() => {
    const loadReservations = async () => {
      const result = await getReservationsAction({
        status: undefined,
      })
      if (result.success && result.data) {
        setReservations(result.data)
      }
    }
    loadReservations()
  }, [])

  // 예약 목록 갱신
  const refreshReservations = async () => {
    const result = await getReservationsAction({
      status: undefined,
    })
    if (result.success && result.data) {
      setReservations(result.data)
    }
  }

  // 날짜 필터 해제
  const clearDateFilter = () => {
    setSelectedDate(undefined)
  }

  return (
    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabType)}>
      <TabsList>
        <TabsTrigger value="history" data-tab="history">상담 기록</TabsTrigger>
        <TabsTrigger value="reservations" data-tab="reservations">예약 관리</TabsTrigger>
        <TabsTrigger value="calendar" data-tab="calendar">예약 캘린더</TabsTrigger>
      </TabsList>

      {/* 상담 기록 탭 */}
      <TabsContent value="history" className="mt-4">
        {children}
      </TabsContent>

      {/* 예약 관리 탭 */}
      <TabsContent value="reservations" className="mt-4">
        <div className="space-y-6">
          {formView === "list" ? (
            <>
              {/* 탭 헤더: 캘린더 뷰 + 새 예약 등록 버튼 */}
              <div className="space-y-4">
                <div className="flex justify-end">
                  <Button onClick={() => setFormView("form")} className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    새 예약 등록
                  </Button>
                </div>
                <ReservationCalendarView
                  initialDate={selectedDate}
                  onDateSelect={setSelectedDate}
                />
                {selectedDate && (
                  <div className="flex justify-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearDateFilter}
                    >
                      날짜 필터 해제
                    </Button>
                  </div>
                )}
              </div>

              {/* 예약 목록 */}
              <ReservationList
                reservations={reservations}
                onRefresh={() => setFormView("form")}
                dateFilter={selectedDate}
              />
            </>
          ) : (
            /* 예약 등록 폼 */
            <ReservationWizard
              onCancel={() => {
                setFormView("list")
                router.refresh()
              }}
              onSuccess={() => {
                setFormView("list")
                refreshReservations()
                router.refresh()
              }}
            />
          )}
        </div>
      </TabsContent>

      {/* 캘린더 탭 */}
      <TabsContent value="calendar" className="mt-4">
        <div className="space-y-6">
          {/* 캘린더 뷰 */}
          <ReservationCalendarView
            initialDate={calendarViewDate}
            onDateSelect={(date) => {
              setCalendarDateFilter(date)
            }}
          />

          {/* 선택한 날짜의 예약 목록 인라인 표시 */}
          {calendarDateFilter && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  {calendarDateFilter.toLocaleDateString("ko-KR")} 예약 목록
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCalendarDateFilter(undefined)}
                >
                  날짜 선택 초기화
                </Button>
              </div>
              <ReservationList
                reservations={reservations}
                dateFilter={calendarDateFilter}
              />
            </div>
          )}
        </div>
      </TabsContent>
    </Tabs>
  )
}
