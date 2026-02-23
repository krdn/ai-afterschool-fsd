"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import type { ParentCounselingReservation, ReservationStatus } from '@/lib/db'
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
import {
  completeReservationAction,
  cancelReservationAction,
  markNoShowAction,
} from "@/lib/actions/counseling/reservations-status"
import { toast } from "sonner"

export type ReservationWithRelations = ParentCounselingReservation & {
  student: {
    id: string
    name: string
    school: string | null
    grade: number | null
  }
  parent: {
    id: string
    name: string
    phone: string
    email: string | null
    relation: string
  }
  teacher: {
    id: string
    name: string
  }
}

interface ReservationCardProps {
  reservation: ReservationWithRelations
}

export function ReservationCard({ reservation }: ReservationCardProps) {
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogType, setDialogType] = useState<"complete" | "cancel" | "noShow" | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const statusLabel = getStatusLabel(reservation.status)
  const statusVariant = getStatusVariant(reservation.status)

  // 상태 변경 핸들러
  const handleStatusChange = async (type: "complete" | "cancel" | "noShow") => {
    setIsProcessing(true)
    try {
      let result

      switch (type) {
        case "complete":
          result = await completeReservationAction({ reservationId: reservation.id })
          break
        case "cancel":
          result = await cancelReservationAction(reservation.id)
          break
        case "noShow":
          result = await markNoShowAction(reservation.id)
          break
      }

      if (result.success) {
        const message = getSuccessMessage(type)
        toast.success(message)
        router.refresh()
      } else {
        toast.error(result.error || "상태 변경에 실패했습니다.")
      }
    } catch (error) {
      console.error("Status change error:", error)
      toast.error("상태 변경 중 오류가 발생했습니다.")
    } finally {
      setIsProcessing(false)
      setDialogOpen(false)
      setDialogType(null)
    }
  }

  // 다이얼로그 열기
  const openDialog = (type: "complete" | "cancel" | "noShow") => {
    setDialogType(type)
    setDialogOpen(true)
  }

  // 다이얼로그 확인
  const handleConfirm = () => {
    if (dialogType) {
      handleStatusChange(dialogType)
    }
  }

  // 다이얼로그 내용
  const dialogContent = getDialogContent(dialogType, reservation.student.name)

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          {/* Header: Date/Time + Status Badge */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-600">
              {format(new Date(reservation.scheduledAt), "M월 d일 E요일 HH:mm", { locale: ko })}
            </span>
            <Badge variant={statusVariant}>{statusLabel}</Badge>
          </div>

          {/* Body: Student Info + Topic */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">{reservation.student.name}</span>
              <span className="text-gray-400">·</span>
              <span className="text-gray-600">{getParentRelationLabel(reservation.parent.relation)}</span>
            </div>
            <div className="text-sm text-gray-700">{reservation.topic}</div>
          </div>

          {/* Footer: Status Change Buttons (SCHEDULED only) */}
          {reservation.status === "SCHEDULED" && (
            <div className="flex gap-2 mt-3 pt-3 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => openDialog("complete")}
                disabled={isProcessing}
                className="flex-1 bg-green-50 text-green-700 hover:bg-green-100 border-green-200"
              >
                완료
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => openDialog("cancel")}
                disabled={isProcessing}
                className="flex-1 bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-200"
              >
                취소
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => openDialog("noShow")}
                disabled={isProcessing}
                className="flex-1 bg-orange-50 text-orange-700 hover:bg-orange-100 border-orange-200"
              >
                노쇼
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AlertDialog */}
      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dialogContent.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {dialogContent.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={isProcessing}
              className={dialogContent.buttonClass}
            >
              {isProcessing ? "처리 중..." : dialogContent.confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// Helper functions

function getStatusLabel(status: ReservationStatus): string {
  const labels: Record<ReservationStatus, string> = {
    SCHEDULED: "예약",
    COMPLETED: "완료",
    CANCELLED: "취소",
    NO_SHOW: "노쇼",
  }
  return labels[status]
}

function getStatusVariant(status: ReservationStatus): "scheduled" | "completed" | "cancelled" | "noShow" {
  const variants: Record<ReservationStatus, "scheduled" | "completed" | "cancelled" | "noShow"> = {
    SCHEDULED: "scheduled",
    COMPLETED: "completed",
    CANCELLED: "cancelled",
    NO_SHOW: "noShow",
  }
  return variants[status]
}

function getParentRelationLabel(relation: string): string {
  const labels: Record<string, string> = {
    FATHER: "아버지",
    MOTHER: "어머니",
    GRANDFATHER: "조부",
    GRANDMOTHER: "조모",
    OTHER: "기타",
  }
  return labels[relation] || relation
}

function getDialogContent(
  type: "complete" | "cancel" | "noShow" | null,
  studentName: string
) {
  switch (type) {
    case "complete":
      return {
        title: "상담 완료 확인",
        description: `${studentName} 학부모 상담을 완료 처리하시겠습니까? 상담 세션이 자동으로 생성됩니다.`,
        confirmLabel: "완료",
        buttonClass: "bg-green-600 hover:bg-green-700 text-white",
      }
    case "cancel":
      return {
        title: "예약 취소 확인",
        description: `${studentName} 학부모 상담 예약을 취소하시겠습니까? 이 작업은 되돌릴 수 없습니다.`,
        confirmLabel: "취소",
        buttonClass: "bg-gray-600 hover:bg-gray-700 text-white",
      }
    case "noShow":
      return {
        title: "노쇼 처리 확인",
        description: `${studentName} 학부모가 예약된 상담에 나타나지 않았음을 처리하시겠습니까?`,
        confirmLabel: "노쇼",
        buttonClass: "bg-orange-600 hover:bg-orange-700 text-white",
      }
    default:
      return {
        title: "",
        description: "",
        confirmLabel: "",
        buttonClass: "",
      }
  }
}

function getSuccessMessage(type: "complete" | "cancel" | "noShow"): string {
  const messages: Record<string, string> = {
    complete: "상담이 완료되었습니다.",
    cancel: "예약이 취소되었습니다.",
    noShow: "노쇼로 처리되었습니다.",
  }
  return messages[type]
}

export default ReservationCard
