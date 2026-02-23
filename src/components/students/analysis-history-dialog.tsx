"use client"

import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { Clock } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"

export type AnalysisHistoryItem = {
  id: string
  calculatedAt: Date | string
  summary: string
  result?: unknown
  interpretation?: string | null
  errorMessage?: string | null
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  history: AnalysisHistoryItem[]
  note?: string
  loading?: boolean
  onViewDetail?: (item: AnalysisHistoryItem) => void
}

export function AnalysisHistoryDialog({
  open,
  onOpenChange,
  title,
  history,
  note,
  loading = false,
  onViewDetail,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            {title}
          </DialogTitle>
          <DialogDescription>
            최근 분석 이력을 확인합니다
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[400px]">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              분석 이력이 없습니다.
            </div>
          ) : (
            <div className="space-y-2 p-1">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => onViewDetail?.(item)}
                  data-testid="history-item"
                >
                  <p className="text-sm font-medium">
                    {format(
                      item.calculatedAt instanceof Date
                        ? item.calculatedAt
                        : new Date(item.calculatedAt),
                      "yyyy.MM.dd HH:mm",
                      { locale: ko }
                    )}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{item.summary}</p>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {note && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-700">{note}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
