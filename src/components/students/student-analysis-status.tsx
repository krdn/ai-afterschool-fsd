import { format } from "date-fns"
import { ko } from "date-fns/locale"
import type { CalculationStatus } from '@/features/analysis'

type StudentAnalysisStatusProps = {
  status: CalculationStatus | null
}

export function StudentAnalysisStatus({ status }: StudentAnalysisStatusProps) {
  if (!status?.latestCalculatedAt) return null

  const isStale = status.needsRecalculation
  const badgeClass = isStale
    ? "bg-amber-50 dark:bg-amber-950/30 text-amber-700 ring-1 ring-amber-200"
    : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${badgeClass}`}
      >
        {isStale ? "재계산 필요" : "최신 분석"}
      </span>
      <span className="text-xs text-muted-foreground">
        최근 계산: {format(status.latestCalculatedAt, "yyyy.MM.dd", { locale: ko })}
      </span>
    </div>
  )
}
