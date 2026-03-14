import type { Recommendation } from "@/features/matching"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface TeamRecommendationCardProps {
  recommendation: Recommendation
}

const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-red-50 dark:bg-red-950/30 border-red-200 text-red-800",
  medium: "bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 text-yellow-800",
  low: "bg-green-50 dark:bg-green-950/30 border-green-200 text-green-800",
}

const PRIORITY_LABELS: Record<string, string> = {
  high: "높음",
  medium: "중간",
  low: "낮음",
}

import { Lightbulb, AlertTriangle, CheckCircle, type LucideIcon } from "lucide-react"
import { useMemo } from "react"

const ICON_MAP: Record<string, LucideIcon> = {
  diversity: Lightbulb,
  coverage: AlertTriangle,
  balance: CheckCircle,
}

export function TeamRecommendationCard({ recommendation }: TeamRecommendationCardProps) {
  const Icon = useMemo(() => ICON_MAP[recommendation.type] || Lightbulb, [recommendation.type])
  const priorityColor = PRIORITY_COLORS[recommendation.priority]
  const priorityLabel = PRIORITY_LABELS[recommendation.priority]

  return (
    <Card className={`${priorityColor} border-2`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            <CardTitle className="text-base">{recommendation.title}</CardTitle>
          </div>
          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
            recommendation.priority === "high"
              ? "bg-red-200 text-red-900"
              : recommendation.priority === "medium"
              ? "bg-yellow-200 text-yellow-900"
              : "bg-green-200 text-green-900"
          }`}>
            우선순위: {priorityLabel}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="font-medium">설명</p>
          <p className="text-sm mt-1">{recommendation.description}</p>
        </div>

        <div>
          <p className="font-medium">근거 데이터</p>
          <p className="text-sm mt-1 whitespace-pre-wrap">{recommendation.evidence}</p>
        </div>

        {recommendation.actionItems.length > 0 && (
          <div>
            <p className="font-medium">실행 방안</p>
            <ul className="list-disc list-inside text-sm mt-2 space-y-1">
              {recommendation.actionItems.map((item, index) => (
                <li key={index} className="ml-2">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
