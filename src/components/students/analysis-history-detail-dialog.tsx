"use client"

import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { Clock, X } from "lucide-react"
import { MarkdownRenderer } from "@/components/ui/markdown-renderer"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import type { AnalysisHistoryItem } from "./analysis-history-dialog"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  item: AnalysisHistoryItem | null
  type: 'saju' | 'face' | 'palm' | 'mbti'
}

export function AnalysisHistoryDetailDialog({
  open,
  onOpenChange,
  title,
  item,
  type,
}: Props) {
  if (!item) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              {title}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
          <DialogDescription>
            {format(
              item.calculatedAt instanceof Date
                ? item.calculatedAt
                : new Date(item.calculatedAt),
              "yyyy년 MM월 dd일 HH:mm",
              { locale: ko }
            )}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[500px]">
          <div className="p-4">
            {item.errorMessage ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-700">{item.errorMessage}</p>
              </div>
            ) : (
              <HistoryDetailContent item={item} type={type} />
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

function HistoryDetailContent({ item, type }: { item: AnalysisHistoryItem; type: string }) {
  switch (type) {
    case 'saju':
      return <SajuDetailContent item={item} />
    case 'face':
      return <FaceDetailContent item={item} />
    case 'palm':
      return <PalmDetailContent item={item} />
    case 'mbti':
      return <MbtiDetailContent item={item} />
    default:
      return (
        <div className="text-sm text-gray-500">
          <pre className="whitespace-pre-wrap font-sans">
            {JSON.stringify(item.result, null, 2)}
          </pre>
        </div>
      )
  }
}

function SajuDetailContent({ item }: { item: AnalysisHistoryItem }) {
  const result = item.result as {
    pillars?: {
      year: { stem: string; branch: string }
      month: { stem: string; branch: string }
      day: { stem: string; branch: string }
      hour?: { stem: string; branch: string }
    }
    elements?: {
      목: number
      화: number
      토: number
      금: number
      수: number
    }
    meta?: {
      solarTerm: string
    }
  } | undefined

  return (
    <div className="space-y-4">
      {result?.pillars && (
        <div>
          <h4 className="text-sm font-semibold mb-2">사주 구조</h4>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="p-2 bg-gray-50 rounded">
              <p className="text-xs text-gray-500">연주</p>
              <p className="font-medium">{result.pillars.year.stem}{result.pillars.year.branch}</p>
            </div>
            <div className="p-2 bg-gray-50 rounded">
              <p className="text-xs text-gray-500">월주</p>
              <p className="font-medium">{result.pillars.month.stem}{result.pillars.month.branch}</p>
            </div>
            <div className="p-2 bg-gray-50 rounded">
              <p className="text-xs text-gray-500">일주</p>
              <p className="font-medium">{result.pillars.day.stem}{result.pillars.day.branch}</p>
            </div>
            <div className="p-2 bg-gray-50 rounded">
              <p className="text-xs text-gray-500">시주</p>
              <p className="font-medium">
                {result.pillars.hour
                  ? `${result.pillars.hour.stem}${result.pillars.hour.branch}`
                  : '미상'}
              </p>
            </div>
          </div>
        </div>
      )}

      {result?.elements && (
        <div>
          <h4 className="text-sm font-semibold mb-2">오행 균형</h4>
          <p className="text-sm">
            목 {result.elements.목} / 화 {result.elements.화} / 토 {result.elements.토} / 금 {result.elements.금} / 수 {result.elements.수}
          </p>
        </div>
      )}

      {result?.meta?.solarTerm && (
        <div>
          <h4 className="text-sm font-semibold mb-2">절기</h4>
          <p className="text-sm">{result.meta.solarTerm}</p>
        </div>
      )}

      {item.interpretation && (
        <div>
          <h4 className="text-sm font-semibold mb-2">해석</h4>
          <MarkdownRenderer content={item.interpretation} />
        </div>
      )}
    </div>
  )
}

function FaceDetailContent({ item }: { item: AnalysisHistoryItem }) {
  const result = item.result as {
    faceShape?: string
    features?: {
      eyes?: string
      nose?: string
      mouth?: string
      ears?: string
      forehead?: string
      chin?: string
    }
    personalityTraits?: string[]
    fortune?: {
      academic?: string
      career?: string
      relationships?: string
    }
    overallInterpretation?: string
  } | undefined

  return (
    <div className="space-y-4">
      {result?.faceShape && (
        <div>
          <h4 className="text-sm font-semibold mb-2">얼굴형</h4>
          <p className="text-sm">{result.faceShape}</p>
        </div>
      )}

      {result?.features && (
        <div>
          <h4 className="text-sm font-semibold mb-2">이목구비</h4>
          <dl className="grid grid-cols-2 gap-2">
            {result.features.eyes && <FeatureItem label="눈" value={result.features.eyes} />}
            {result.features.nose && <FeatureItem label="코" value={result.features.nose} />}
            {result.features.mouth && <FeatureItem label="입" value={result.features.mouth} />}
            {result.features.ears && <FeatureItem label="귀" value={result.features.ears} />}
            {result.features.forehead && <FeatureItem label="이마" value={result.features.forehead} />}
            {result.features.chin && <FeatureItem label="턱" value={result.features.chin} />}
          </dl>
        </div>
      )}

      {result?.personalityTraits && result.personalityTraits.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-2">성격 특성</h4>
          <ul className="list-disc list-inside space-y-1">
            {result.personalityTraits.map((trait, i) => (
              <li key={i} className="text-sm">{trait}</li>
            ))}
          </ul>
        </div>
      )}

      {result?.fortune && (
        <div>
          <h4 className="text-sm font-semibold mb-2">운세 해석</h4>
          <div className="space-y-1 text-sm">
            {result.fortune.academic && <p><span className="font-medium">학업:</span> {result.fortune.academic}</p>}
            {result.fortune.career && <p><span className="font-medium">진로:</span> {result.fortune.career}</p>}
            {result.fortune.relationships && <p><span className="font-medium">인간관계:</span> {result.fortune.relationships}</p>}
          </div>
        </div>
      )}

      {result?.overallInterpretation && (
        <div>
          <h4 className="text-sm font-semibold mb-2">종합 해석</h4>
          <p className="text-sm text-gray-700">{result.overallInterpretation}</p>
        </div>
      )}
    </div>
  )
}

function PalmDetailContent({ item }: { item: AnalysisHistoryItem }) {
  return (
    <div className="text-sm text-gray-700">
      <p>손금 분석 결과 상세</p>
      <pre className="mt-2 whitespace-pre-wrap text-xs">
        {JSON.stringify(item.result, null, 2)}
      </pre>
    </div>
  )
}

function MbtiDetailContent({ item }: { item: AnalysisHistoryItem }) {
  const result = item.result as {
    mbtiType?: string
    percentages?: Record<string, number>
    scores?: unknown
  } | undefined

  return (
    <div className="space-y-4">
      {result?.mbtiType && (
        <div>
          <h4 className="text-sm font-semibold mb-2">MBTI 유형</h4>
          <p className="text-2xl font-bold text-blue-600">{result.mbtiType}</p>
        </div>
      )}

      {result?.percentages && (
        <div>
          <h4 className="text-sm font-semibold mb-2">성향 비율</h4>
          <div className="space-y-2">
            {Object.entries(result.percentages).map(([key, value]) => (
              <div key={key} className="flex items-center gap-2">
                <span className="w-12 text-sm">{key}:</span>
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600"
                    style={{ width: `${value}%` }}
                  />
                </div>
                <span className="text-sm text-gray-500">{value.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function FeatureItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  )
}
