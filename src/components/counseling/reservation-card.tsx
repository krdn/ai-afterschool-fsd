"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import type { ReservationStatus } from '@/lib/db'
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
  cancelReservationAction,
  markNoShowAction,
  deleteReservationAction,
} from "@/lib/actions/counseling/reservations-status"
import { toast } from "sonner"
import { getParentRelationLabel } from "./utils"

export type { ReservationWithRelations } from "@/types/counseling"
import type { ReservationWithRelations } from "@/types/counseling"

interface ReservationCardProps {
  reservation: ReservationWithRelations
  onDetailClick?: (id: string) => void
  onEditClick?: (id: string) => void
  onRecordClick?: (id: string) => void
  onDelete?: (id: string) => void
}

export function ReservationCard({
  reservation,
  onDetailClick,
  onEditClick,
  onRecordClick,
  onDelete,
}: ReservationCardProps) {
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogType, setDialogType] = useState<"cancel" | "noShow" | "delete" | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const statusLabel = getStatusLabel(reservation.status)
  const statusVariant = getStatusVariant(reservation.status)

  // 상태 변경 핸들러 (취소/노쇼/삭제)
  const handleAction = async (type: "cancel" | "noShow" | "delete") => {
    setIsProcessing(true)
    try {
      if (type === "delete") {
        const result = await deleteReservationAction({ reservationId: reservation.id })
        if (result.success) {
          toast.success("예약이 제거되었습니다.")
          onDelete?.(reservation.id)
          router.refresh()
        } else {
          toast.error(result.error || "예약 제거에 실패했습니다.")
        }
      } else {
        const result = type === "cancel"
          ? await cancelReservationAction(reservation.id)
          : await markNoShowAction(reservation.id)

        if (result.success) {
          toast.success(type === "cancel" ? "예약이 취소되었습니다." : "노쇼로 처리되었습니다.")
          router.refresh()
        } else {
          toast.error(result.error || "상태 변경에 실패했습니다.")
        }
      }
    } catch (error) {
      console.error("Action error:", error)
      toast.error("처리 중 오류가 발생했습니다.")
    } finally {
      setIsProcessing(false)
      setDialogOpen(false)
      setDialogType(null)
    }
  }

  const openDialog = (type: "cancel" | "noShow" | "delete") => {
    setDialogType(type)
    setDialogOpen(true)
  }

  const handleConfirm = () => {
    if (dialogType) handleAction(dialogType)
  }

  // 다이얼로그 내용
  const dialogContent = getDialogContent(dialogType, reservation.student.name, reservation.status)

  return (
    <>
      <Card
        className="hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => onDetailClick?.(reservation.id)}
      >
        <CardContent className="p-4">
          {/* Header: Date/Time + Status Badge */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">
              {format(new Date(reservation.scheduledAt), "M월 d일 E요일 HH:mm", { locale: ko })}
            </span>
            <Badge variant={statusVariant}>{statusLabel}</Badge>
          </div>

          {/* Body: Student Info + Topic */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">{reservation.student.name}</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">{getParentRelationLabel(reservation.parent.relation)}</span>
            </div>
            <div className="text-sm text-foreground">{reservation.topic}</div>
          </div>

          {/* Footer: Action Buttons (SCHEDULED only) */}
          {reservation.status === "SCHEDULED" && (
            <div className="flex gap-2 mt-3 pt-3 border-t" onClick={(e) => e.stopPropagation()}>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onEditClick?.(reservation.id)}
                disabled={isProcessing}
                className="flex-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200"
              >
                수정
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onRecordClick?.(reservation.id)}
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
                className="flex-1 bg-muted text-foreground hover:bg-muted border"
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

          {/* Footer: IN_PROGRESS — 상담 이어가기 + 제거 */}
          {reservation.status === "IN_PROGRESS" && (
            <div className="flex gap-2 mt-3 pt-3 border-t" onClick={(e) => e.stopPropagation()}>
              <Button
                type="button"
                size="sm"
                onClick={() => router.push(`/counseling/session/${reservation.id}`)}
                className="flex-1 bg-indigo-600 text-white hover:bg-indigo-700"
              >
                상담 이어가기
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => openDialog("delete")}
                disabled={isProcessing}
                className="bg-red-50 text-red-700 hover:bg-red-100 border-red-200"
              >
                제거
              </Button>
            </div>
          )}

          {/* Footer: CANCELLED — 제거 */}
          {reservation.status === "CANCELLED" && (
            <div className="flex gap-2 mt-3 pt-3 border-t" onClick={(e) => e.stopPropagation()}>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => openDialog("delete")}
                disabled={isProcessing}
                className="bg-red-50 text-red-700 hover:bg-red-100 border-red-200"
              >
                제거
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
    IN_PROGRESS: "진행 중",
    COMPLETED: "완료",
    CANCELLED: "취소",
    NO_SHOW: "노쇼",
  }
  return labels[status]
}

function getStatusVariant(status: ReservationStatus): "scheduled" | "inProgress" | "completed" | "cancelled" | "noShow" {
  const variants: Record<ReservationStatus, "scheduled" | "inProgress" | "completed" | "cancelled" | "noShow"> = {
    SCHEDULED: "scheduled",
    IN_PROGRESS: "inProgress",
    COMPLETED: "completed",
    CANCELLED: "cancelled",
    NO_SHOW: "noShow",
  }
  return variants[status]
}

function getDialogContent(
  type: "cancel" | "noShow" | "delete" | null,
  studentName: string,
  status?: ReservationStatus
) {
  switch (type) {
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
    case "delete":
      return status === "IN_PROGRESS"
        ? {
            title: "예약 제거 확인",
            description: `${studentName} 학부모 상담 예약을 제거하시겠습니까? 진행 중인 상담 기록도 함께 삭제되며, 이 작업은 되돌릴 수 없습니다.`,
            confirmLabel: "제거",
            buttonClass: "bg-red-600 hover:bg-red-700 text-white",
          }
        : {
            title: "예약 제거 확인",
            description: `${studentName} 학부모 상담 예약을 목록에서 제거하시겠습니까?`,
            confirmLabel: "제거",
            buttonClass: "bg-red-600 hover:bg-red-700 text-white",
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

export default ReservationCard
