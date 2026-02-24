"use client"

import { runTeacherSajuAnalysis, simplifyTeacherInterpretation } from "@/lib/actions/teacher/analysis"
import { resetAnalysis } from "@/lib/actions/reset-analysis"
import { SajuPanel, type AnalysisRunResult } from "@/components/common/saju-panel"
import type { ProviderName } from "@/features/ai-engine"

type Props = {
  teacherId: string
  teacherName: string
  analysis: {
    result: unknown
    interpretation: string | null
    calculatedAt: Date | string
  } | null
  teacherBirthDate?: Date | string | null
  teacherBirthTimeHour?: number | null
  teacherBirthTimeMinute?: number | null
  enabledProviders?: ProviderName[]
  onAnalysisComplete?: () => void
  lastUsedProvider?: string | null
  lastUsedModel?: string | null
}

async function handleRunAnalysis(
  subjectId: string,
  provider: string,
  promptId: string,
  extra?: string,
  forceRefresh?: boolean
): Promise<AnalysisRunResult> {
  const res = await runTeacherSajuAnalysis(subjectId, provider, promptId, extra, forceRefresh)
  if (!res.success) {
    throw new Error(res.error ?? '사주 분석에 실패했습니다.')
  }
  return {
    llmFailed: res.data.llmFailed,
    llmError: res.data.llmError,
    usedProvider: res.data.usedProvider,
    usedModel: res.data.usedModel,
    cached: res.data.cached,
  }
}

async function handleSimplify(interpretation: string, provider: string) {
  return simplifyTeacherInterpretation(interpretation, provider)
}

async function handleReset(subjectId: string) {
  return resetAnalysis("saju", "TEACHER", subjectId)
}

export function TeacherSajuPanel({
  teacherId,
  teacherName,
  analysis,
  teacherBirthDate,
  teacherBirthTimeHour,
  teacherBirthTimeMinute,
  enabledProviders,
  onAnalysisComplete,
  lastUsedProvider,
  lastUsedModel,
}: Props) {
  return (
    <SajuPanel
      subjectId={teacherId}
      subjectLabel={`선생님: ${teacherName}`}
      birthDate={teacherBirthDate}
      birthTimeHour={teacherBirthTimeHour}
      birthTimeMinute={teacherBirthTimeMinute}
      analysis={analysis}
      onRunAnalysis={handleRunAnalysis}
      onSimplify={handleSimplify}
      onReset={handleReset}
      enabledProviders={enabledProviders}
      onAnalysisComplete={onAnalysisComplete}
      lastUsedProvider={lastUsedProvider}
      lastUsedModel={lastUsedModel}
      placeholder="예: 최근 스트레스가 많습니다. 건강 운세를 중점적으로 부탁드립니다."
    />
  )
}
