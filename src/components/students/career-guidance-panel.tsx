import { Briefcase, AlertCircle } from "lucide-react"
import { format } from "date-fns"
import { getPersonalitySummary } from '@/features/analysis'
import { CareerGuidanceRetryButton } from "./career-guidance-retry-button"
import type { PersonalitySummary } from '@/lib/db'

type CareerGuidanceResult = {
  coreTraits: string
  suitableMajors: {
    name: string
    reason: string
    matchScore: number
  }[]
  careerPaths: {
    field: string
    roles: string[]
    reasoning: string
  }[]
  developmentSuggestions: string[]
}

type Props = {
  studentId: string
  teacherId: string
  /** 미리 조회된 summary (可选优化) */
  summary?: PersonalitySummary | null
}

export async function CareerGuidancePanel({ studentId, teacherId: _teacherId, summary: prefetchedSummary }: Props) {
  const summary = prefetchedSummary !== undefined
    ? prefetchedSummary
    : await getPersonalitySummary(studentId)

  if (!summary || summary.status === 'none') {
    return <EmptyState />
  }

  if (summary.status === 'pending') {
    return <LoadingState />
  }

  if (summary.status === 'failed') {
    return <ErrorState message={summary.errorMessage || "분석에 실패했어요."} studentId={studentId} />
  }

  if (summary.status === 'complete' && summary.careerGuidance) {
    const result = summary.careerGuidance as CareerGuidanceResult
    return (
      <div className="bg-card rounded-lg shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/40 rounded-lg">
              <Briefcase className="w-5 h-5 text-purple-600" />
            </div>
            <h2 className="text-lg font-semibold">AI 진로 가이드</h2>
          </div>
          {summary.generatedAt && (
            <span className="text-sm text-muted-foreground">
              {format(new Date(summary.generatedAt), "yyyy-MM-dd HH:mm")}
            </span>
          )}
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Core Traits */}
          <div className="bg-blue-50 dark:bg-blue-950/30 border-l-4 border-blue-400 p-4">
            <h3 className="font-semibold text-blue-900 mb-2">핵심 성향</h3>
            <p className="text-sm text-blue-800 dark:text-blue-300 leading-relaxed">{result.coreTraits}</p>
          </div>

          {/* Suitable Majors */}
          <div>
            <h3 className="font-semibold mb-3">적합 학과</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {result.suitableMajors.map((major, i) => (
                <div key={i} className="bg-muted rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-medium text-sm text-foreground">{major.name}</h4>
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 dark:text-purple-400 rounded text-xs font-medium">
                      {major.matchScore}%
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{major.reason}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Career Paths */}
          <div>
            <h3 className="font-semibold mb-3">진로 경로</h3>
            <div className="space-y-3">
              {result.careerPaths.map((path, i) => (
                <div key={i} className="bg-muted rounded-lg p-4">
                  <h4 className="font-medium text-sm text-foreground mb-2">{path.field}</h4>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {path.roles.map((role, j) => (
                      <span key={j} className="px-2 py-1 bg-purple-50 dark:bg-purple-950/30 text-purple-700 rounded text-xs">
                        {role}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">{path.reasoning}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Development Suggestions */}
          <div>
            <h3 className="font-semibold mb-3">개발 제안</h3>
            <ul className="space-y-2">
              {result.developmentSuggestions.map((suggestion, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                  <span className="text-purple-500 mt-0.5">✓</span>
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    )
  }

  return <EmptyState />
}

function LoadingState() {
  return (
    <div className="bg-card rounded-lg shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b flex items-center gap-3">
        <div className="p-2 bg-purple-100 dark:bg-purple-900/40 rounded-lg">
          <Briefcase className="w-5 h-5 text-purple-600" />
        </div>
        <h2 className="text-lg font-semibold">AI 진로 가이드</h2>
      </div>
      <div className="p-6">
        <div className="text-center py-8">
          <div className="animate-spin w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">AI가 진로 가이드를 생성 중이에요...</p>
          <p className="text-sm text-muted-foreground mt-2">10~20초 정도 소요됩니다.</p>
        </div>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="bg-card rounded-lg shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b flex items-center gap-3">
        <div className="p-2 bg-purple-100 dark:bg-purple-900/40 rounded-lg">
          <Briefcase className="w-5 h-5 text-purple-600" />
        </div>
        <h2 className="text-lg font-semibold">AI 진로 가이드</h2>
      </div>
      <div className="p-6">
        <div className="text-center py-8">
          <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">
            최소 3개 이상의 성향 분석이 완료되면 AI가 진로 가이드를 생성해줘요.
          </p>
        </div>
      </div>
    </div>
  )
}

function ErrorState({ message, studentId }: { message: string; studentId: string }) {
  return (
    <div className="bg-card rounded-lg shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b flex items-center gap-3">
        <div className="p-2 bg-purple-100 dark:bg-purple-900/40 rounded-lg">
          <Briefcase className="w-5 h-5 text-purple-600" />
        </div>
        <h2 className="text-lg font-semibold">AI 진로 가이드</h2>
      </div>
      <div className="p-6">
        <div className="text-center py-8">
          <div className="bg-red-50 dark:bg-red-950/30 border-l-4 border-red-400 p-4 mb-4 text-left">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
              <div className="ml-3">
                <p className="text-sm text-red-800 dark:text-red-300">{message}</p>
              </div>
            </div>
          </div>
          <CareerGuidanceRetryButton studentId={studentId} />
        </div>
      </div>
    </div>
  )
}
