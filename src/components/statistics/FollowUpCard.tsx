"use client"

import { useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { ko } from "date-fns/locale"
import type { FollowUpItem } from "@/types/follow-up"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  User,
} from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface FollowUpCardProps {
  item: FollowUpItem
  onComplete?: (id: string, note?: string) => Promise<void>
  loading?: boolean
}

export function FollowUpCard({ item, onComplete, loading = false }: FollowUpCardProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  // 상태별 스타일링
  const cardStyles = {
    overdue: "bg-red-50 border-red-200",
    pending: "bg-white border-gray-200",
    completed: "bg-gray-50 border-gray-200 opacity-75",
  }

  // 상태별 Badge
  const renderBadge = () => {
    switch (item.status) {
      case "overdue":
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            지연
          </Badge>
        )
      case "pending":
        return <Badge variant="default">예정</Badge>
      case "completed":
        return <Badge variant="outline">완료</Badge>
    }
  }

  // 완료 처리 핸들러
  const handleComplete = async () => {
    if (!onComplete) return

    setIsProcessing(true)
    try {
      await onComplete(item.id)
      setDialogOpen(false)
    } catch (error) {
      console.error("Failed to complete follow-up:", error)
    } finally {
      setIsProcessing(false)
    }
  }

  // 완료 체크박스 클릭
  const handleCheckboxClick = () => {
    if (item.status !== "completed" && !loading) {
      setDialogOpen(true)
    }
  }

  // 상대 시간 계산
  const relativeTime = formatDistanceToNow(item.followUpDate, {
    addSuffix: true,
    locale: ko,
  })

  const originalDate = formatDistanceToNow(item.sessionDate, {
    addSuffix: true,
    locale: ko,
  })

  return (
    <>
      <Card className={`border ${cardStyles[item.status]} transition-shadow hover:shadow-md`}>
        <CardContent className="p-4">
          {/* Header: Badge + 완료 체크 */}
          <div className="flex items-center justify-between mb-3">
            {renderBadge()}

            {/* 완료 체크박스 */}
            {item.status !== "completed" && onComplete && (
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={false}
                  onCheckedChange={handleCheckboxClick}
                  disabled={loading || isProcessing}
                  id={`complete-${item.id}`}
                />
                <label
                  htmlFor={`complete-${item.id}`}
                  className="text-sm text-gray-600 cursor-pointer"
                >
                  완료
                </label>
              </div>
            )}

            {/* 완료 아이콘 */}
            {item.status === "completed" && (
              <div className="flex items-center gap-1 text-green-600">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm">완료됨</span>
              </div>
            )}
          </div>

          {/* Body: 학생/선생님 정보 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-gray-400" />
              <span className="font-medium">{item.studentName}</span>
              <span className="text-gray-400">·</span>
              <span className="text-gray-600">{item.teacherName} 선생님</span>
            </div>

            {/* 상담 요약 */}
            <div className="text-sm text-gray-700 line-clamp-2">
              {item.summary}
            </div>

            {/* 날짜 정보 */}
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>후속 조치: {relativeTime}</span>
              </div>
              <span className="text-gray-400">·</span>
              <span>원본 상담: {originalDate}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 완료 확인 다이얼로그 */}
      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>후속 조치 완료 확인</AlertDialogTitle>
            <AlertDialogDescription>
              {item.studentName} 학생의 후속 조치를 완료 처리하시겠습니까?
              <br />
              <br />
              <span className="text-sm text-gray-600">
                주제: {item.summary}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleComplete}
              disabled={isProcessing}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isProcessing ? "처리 중..." : "완료"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
