"use client"

import { runSajuAnalysisAction, simplifyInterpretationAction } from "@/lib/actions/student/saju"
import { resetAnalysis } from "@/lib/actions/reset-analysis"
import { SajuPanel, type AnalysisRunResult } from "@/components/common/saju-panel"
import { SajuHistoryPanel } from "@/components/students/saju-history-panel"
import type { ProviderName } from "@/features/ai-engine"

type SajuAnalysisPanelProps = {
  student: {
    id: string
    name: string
    birthDate: Date | string
    birthTimeHour: number | null
    birthTimeMinute: number | null
  }
  analysis: {
    result: unknown
    interpretation: string | null
    calculatedAt: Date | string
  } | null
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
  const res = await runSajuAnalysisAction(subjectId, provider, promptId, extra, forceRefresh)
  return {
    llmFailed: res.llmFailed,
    llmError: res.llmError,
    usedProvider: res.usedProvider,
    usedModel: res.usedModel,
    cached: res.cached,
  }
}

async function handleSimplify(interpretation: string, provider: string) {
  return simplifyInterpretationAction(interpretation, provider)
}

async function handleReset(subjectId: string) {
  return resetAnalysis("saju", "STUDENT", subjectId)
}

export function SajuAnalysisPanel({
  student,
  analysis,
  enabledProviders,
  onAnalysisComplete,
  lastUsedProvider,
  lastUsedModel,
}: SajuAnalysisPanelProps) {
  return (
    <SajuPanel
      subjectId={student.id}
      subjectLabel={`학생: ${student.name}`}
      birthDate={student.birthDate}
      birthTimeHour={student.birthTimeHour}
      birthTimeMinute={student.birthTimeMinute}
      analysis={analysis}
      onRunAnalysis={handleRunAnalysis}
      onSimplify={handleSimplify}
      onReset={handleReset}
      enabledProviders={enabledProviders}
      onAnalysisComplete={onAnalysisComplete}
      lastUsedProvider={lastUsedProvider}
      lastUsedModel={lastUsedModel}
      historyPanel={<SajuHistoryPanel studentId={student.id} />}
      placeholder="예: 최근 수학 성적이 급락했습니다. 수학 학습에 대한 조언을 중점적으로 부탁드립니다."
      dataTestId="saju-tab"
    />
  )
}
