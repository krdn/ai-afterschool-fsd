"use client"

import { useState, useMemo } from "react"
import type { FollowUpItem } from "@/types/follow-up"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { FollowUpCard } from "./FollowUpCard"

interface FollowUpListProps {
  items: FollowUpItem[]
  onComplete?: (id: string, note?: string) => Promise<void>
  loading?: boolean
  title?: string
}

type ScopeTab = "today" | "week" | "all"

export function FollowUpList({
  items,
  onComplete,
  loading = false,
  title = "후속 조치 목록",
}: FollowUpListProps) {
  const [activeTab, setActiveTab] = useState<ScopeTab>("today")
  const [showCompleted, setShowCompleted] = useState(false)

  // 정렬 및 필터링된 아이템
  const filteredItems = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const weekEnd = new Date(today)
    weekEnd.setDate(weekEnd.getDate() + 7)

    // 탭별 필터링
    let filtered = items

    if (activeTab === "today") {
      filtered = items.filter((item) => {
        const followUpDate = new Date(item.followUpDate)
        followUpDate.setHours(0, 0, 0, 0)
        return followUpDate.getTime() === today.getTime()
      })
    } else if (activeTab === "week") {
      filtered = items.filter((item) => {
        const followUpDate = new Date(item.followUpDate)
        return followUpDate >= today && followUpDate <= weekEnd
      })
    }

    // 완료 여부 필터링
    if (!showCompleted) {
      filtered = filtered.filter((item) => item.status !== "completed")
    }

    // 정렬: 지연된 항목 먼저, 그 다음 마감일 임박순
    const sorted = [...filtered].sort((a, b) => {
      // 지연된 항목 우선
      if (a.status === "overdue" && b.status !== "overdue") return -1
      if (b.status === "overdue" && a.status !== "overdue") return 1

      // 마감일 임박순
      return a.followUpDate.getTime() - b.followUpDate.getTime()
    })

    return sorted
  }, [items, activeTab, showCompleted])

  // 로딩 스켈레톤
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 bg-gray-100 animate-pulse rounded-lg"
              />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{title}</CardTitle>

          {/* 완료된 항목 표시 토글 */}
          <div className="flex items-center gap-2">
            <Switch
              id="show-completed"
              checked={showCompleted}
              onCheckedChange={setShowCompleted}
            />
            <Label htmlFor="show-completed" className="text-sm text-gray-600">
              완료된 항목 표시
            </Label>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* 탭: 오늘 / 이번 주 / 전체 */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ScopeTab)}>
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="today">오늘</TabsTrigger>
            <TabsTrigger value="week">이번 주</TabsTrigger>
            <TabsTrigger value="all">전체</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-0">
            {/* 후속 조치 카드 목록 */}
            {filteredItems.length > 0 ? (
              <div className="space-y-3">
                {filteredItems.map((item) => (
                  <FollowUpCard
                    key={item.id}
                    item={item}
                    onComplete={onComplete}
                    loading={loading}
                  />
                ))}
              </div>
            ) : (
              // 빈 상태
              <div className="text-center py-12 text-gray-500">
                <div className="mb-2 text-lg font-medium">
                  {showCompleted
                    ? "후속 조치가 없습니다"
                    : "완료되지 않은 후속 조치가 없습니다"}
                </div>
                <div className="text-sm">
                  {activeTab === "today" && "오늘 예정된 후속 조치가 없습니다."}
                  {activeTab === "week" && "이번 주 예정된 후속 조치가 없습니다."}
                  {activeTab === "all" && "등록된 후속 조치가 없습니다."}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
