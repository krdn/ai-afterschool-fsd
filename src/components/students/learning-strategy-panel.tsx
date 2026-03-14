import { BookOpen, AlertCircle } from "lucide-react"
import { format } from "date-fns"
import { getPersonalitySummary } from '@/features/analysis'
import { LearningStrategyRetryButton } from "./learning-strategy-retry-button"
import type { PersonalitySummary } from '@/lib/db'

type LearningStrategyResult = {
  coreTraits: string
  learningStyle: {
    type: string
    description: string
    focusMethod: string
  }
  subjectStrategies: {
    korean: string
    math: string
    english: string
    science: string
    social: string
  }
  efficiencyTips: string[]
  motivationApproach: string
}

type Props = {
  studentId: string
  teacherId: string
  /** 미리 조회된 summary (可选优化) */
  summary?: PersonalitySummary | null
}

export async function LearningStrategyPanel({ studentId, teacherId: _teacherId, summary: prefetchedSummary }: Props) {
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

  if (summary.status === 'complete' && summary.learningStrategy) {
    const result = summary.learningStrategy as LearningStrategyResult
    return (
      <div className="bg-card rounded-lg shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <BookOpen className="w-5 h-5 text-green-600" />
            </div>
            <h2 className="text-lg font-semibold">맞춤형 학습 전략</h2>
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
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
            <h3 className="font-semibold text-blue-900 mb-2">핵심 성향</h3>
            <p className="text-sm text-blue-800 leading-relaxed">{result.coreTraits}</p>
          </div>

          {/* Learning Style */}
          <div>
            <h3 className="font-semibold mb-3">학습 스타일</h3>
            <div className="bg-muted rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                  {result.learningStyle.type}
                </span>
              </div>
              <p className="text-sm text-foreground mb-2">{result.learningStyle.description}</p>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">집중 방법:</span> {result.learningStyle.focusMethod}
              </p>
            </div>
          </div>

          {/* Subject Strategies */}
          <div>
            <h3 className="font-semibold mb-3">과목별 접근법</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <SubjectCard title="국어" content={result.subjectStrategies.korean} />
              <SubjectCard title="수학" content={result.subjectStrategies.math} />
              <SubjectCard title="영어" content={result.subjectStrategies.english} />
              <SubjectCard title="과학" content={result.subjectStrategies.science} />
              <SubjectCard title="사회" content={result.subjectStrategies.social} />
            </div>
          </div>

          {/* Efficiency Tips */}
          <div>
            <h3 className="font-semibold mb-3">학습 효율화 팁</h3>
            <ul className="space-y-2">
              {result.efficiencyTips.map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Motivation Approach */}
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <h3 className="font-semibold text-yellow-900 mb-2">동기 부여 방법</h3>
            <p className="text-sm text-yellow-800 leading-relaxed">{result.motivationApproach}</p>
          </div>
        </div>
      </div>
    )
  }

  return <EmptyState />
}

function SubjectCard({ title, content }: { title: string; content: string }) {
  return (
    <div className="bg-muted rounded-lg p-3">
      <h4 className="font-medium text-sm text-foreground mb-1">{title}</h4>
      <p className="text-xs text-muted-foreground leading-relaxed">{content}</p>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="bg-card rounded-lg shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b flex items-center gap-3">
        <div className="p-2 bg-green-100 rounded-lg">
          <BookOpen className="w-5 h-5 text-green-600" />
        </div>
        <h2 className="text-lg font-semibold">맞춤형 학습 전략</h2>
      </div>
      <div className="p-6">
        <div className="text-center py-8">
          <div className="animate-spin w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">AI가 학습 전략을 생성 중이에요...</p>
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
        <div className="p-2 bg-green-100 rounded-lg">
          <BookOpen className="w-5 h-5 text-green-600" />
        </div>
        <h2 className="text-lg font-semibold">맞춤형 학습 전략</h2>
      </div>
      <div className="p-6">
        <div className="text-center py-8">
          <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">
            최소 3개 이상의 성향 분석이 완료되면 AI가 맞춤형 학습 전략을 생성해줘요.
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
        <div className="p-2 bg-green-100 rounded-lg">
          <BookOpen className="w-5 h-5 text-green-600" />
        </div>
        <h2 className="text-lg font-semibold">맞춤형 학습 전략</h2>
      </div>
      <div className="p-6">
        <div className="text-center py-8">
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4 text-left">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
              <div className="ml-3">
                <p className="text-sm text-red-800">{message}</p>
              </div>
            </div>
          </div>
          <LearningStrategyRetryButton studentId={studentId} />
        </div>
      </div>
    </div>
  )
}
