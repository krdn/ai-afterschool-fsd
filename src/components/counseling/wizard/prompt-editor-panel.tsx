'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Code2,
  ChevronDown,
  RotateCcw,
  Lightbulb,
  Variable,
  Loader2,
} from 'lucide-react'
import type { CounselingPromptType } from '@/features/counseling/repositories/prompt-preset-types'
import {
  TEMPLATE_VARIABLES,
  PROMPT_TYPE_LABELS,
} from '@/features/counseling/repositories/prompt-preset-types'

// 각 스텝별 프롬프트 작성 가이드
const PROMPT_GUIDES: Record<string, { tips: string[]; description: string }> = {
  analysis_report: {
    description:
      '학생의 성향, 성적, 상담 이력을 종합하여 상담 준비 보고서를 생성합니다.',
    tips: [
      '마크다운 출력 형식을 지정하면 보고서가 더 구조화됩니다',
      '특정 관점(학업/진로/심리)에 집중하려면 프롬프트에 명시하세요',
      '{{personalitySection}} 등 변수는 실제 학생 데이터로 자동 치환됩니다',
      '보고서 분량은 maxOutputTokens(기본 1000)로 조절합니다',
    ],
  },
  scenario: {
    description:
      '승인된 분석 보고서를 기반으로 30분 상담 시나리오(도입→본론→마무리)를 생성합니다.',
    tips: [
      '상담 시간 배분(도입 5분, 본론 20분, 마무리 5분)을 조정할 수 있습니다',
      '질문 예시와 예상 반응 형식을 지정하면 실용적인 시나리오가 생성됩니다',
      '{{approvedReport}}에 교사가 승인한 분석 보고서가 포함됩니다',
      'temperature(기본 0.5)를 높이면 더 창의적인 시나리오가 생성됩니다',
    ],
  },
  parent_summary: {
    description:
      '학부모에게 보낼 상담 안내 메시지를 생성합니다. 민감 정보(심리분석 등)는 자동 제외됩니다.',
    tips: [
      '학부모 존칭과 따뜻한 어조가 기본 적용됩니다',
      '사전 준비 요청사항을 추가하면 상담 효과가 높아집니다',
      '{{scheduledAt}}에 상담 일시가 자동 삽입됩니다',
      '민감 정보(사주, MBTI 등) 포함 금지 규칙은 반드시 유지하세요',
    ],
  },
}

// 템플릿 변수 설명
const VARIABLE_DESCRIPTIONS: Record<string, string> = {
  studentName: '학생 이름',
  school: '학교명',
  grade: '학년',
  topic: '상담 주제',
  personalitySection: 'MBTI, 사주, 성명학 등 성향 분석 요약',
  previousSessionsSection: '최근 5건 상담 이력',
  gradeHistorySection: '최근 10건 성적 데이터',
  approvedReport: '교사가 승인한 분석 보고서 전문',
  personalitySummary: '학생 핵심 성향 요약 (1줄)',
  scheduledAt: '상담 예정 일시',
  approvedScenario: '교사가 승인한 상담 시나리오 전문',
}

interface PromptEditorPanelProps {
  promptType: CounselingPromptType
  defaultPrompt: string | null
  isLoadingPrompt: boolean
  onPromptChange: (prompt: string | undefined) => void
  onLoadPrompt: () => void
}

export function PromptEditorPanel({
  promptType,
  defaultPrompt,
  isLoadingPrompt,
  onPromptChange,
  onLoadPrompt,
}: PromptEditorPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [editedPrompt, setEditedPrompt] = useState<string | null>(null)
  const [showGuide, setShowGuide] = useState(false)

  const guide = PROMPT_GUIDES[promptType]
  const variables = TEMPLATE_VARIABLES[promptType] ?? []
  const label = PROMPT_TYPE_LABELS[promptType] ?? promptType
  const isEdited = editedPrompt !== null && editedPrompt !== defaultPrompt

  // 패널 열기 시 프롬프트 로드
  const handleOpenChange = useCallback(
    (open: boolean) => {
      setIsOpen(open)
      if (open && !defaultPrompt && !isLoadingPrompt) {
        onLoadPrompt()
      }
    },
    [defaultPrompt, isLoadingPrompt, onLoadPrompt],
  )

  // 편집 초기화
  const handleReset = useCallback(() => {
    setEditedPrompt(null)
    onPromptChange(undefined)
  }, [onPromptChange])

  // 편집 내용 적용
  const handleTextChange = useCallback(
    (value: string) => {
      setEditedPrompt(value)
      onPromptChange(value)
    },
    [onPromptChange],
  )

  return (
    <Collapsible open={isOpen} onOpenChange={handleOpenChange}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-between px-3 py-2 h-auto text-left hover:bg-muted/50"
        >
          <div className="flex items-center gap-2">
            <Code2 className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              AI 프롬프트 확인/수정
            </span>
            {isEdited && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                수정됨
              </Badge>
            )}
          </div>
          <ChevronDown
            className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="mt-2 rounded-lg border bg-muted/30 p-4 space-y-3">
          {/* 헤더: 가이드 토글 + 초기화 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-medium text-foreground">
                {label} 프롬프트
              </h4>
              {guide && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[10px]"
                  onClick={() => setShowGuide(!showGuide)}
                >
                  <Lightbulb className="h-3 w-3 mr-1" />
                  {showGuide ? '가이드 닫기' : '작성 가이드'}
                </Button>
              )}
            </div>
            {isEdited && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[10px] text-muted-foreground"
                onClick={handleReset}
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                원래대로
              </Button>
            )}
          </div>

          {/* 가이드 영역 */}
          {showGuide && guide && (
            <div className="rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/30/50 p-3 space-y-2">
              <p className="text-xs text-amber-900">{guide.description}</p>
              <div className="space-y-1">
                <p className="text-[10px] font-medium text-amber-800 dark:text-amber-300">
                  작성 팁:
                </p>
                {guide.tips.map((tip, i) => (
                  <p key={i} className="text-[10px] text-amber-700 dark:text-amber-400 pl-2">
                    • {tip}
                  </p>
                ))}
              </div>

              {/* 템플릿 변수 */}
              {variables.length > 0 && (
                <div className="pt-1 border-t border-amber-200 dark:border-amber-800">
                  <p className="text-[10px] font-medium text-amber-800 dark:text-amber-300 flex items-center gap-1 mb-1.5">
                    <Variable className="h-3 w-3" />
                    사용 가능한 변수 {'('}
                    {'{{'}변수명{'}}'}으로 사용{')'}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {variables.map((v) => (
                      <span
                        key={v}
                        className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:text-amber-300 font-mono"
                        title={VARIABLE_DESCRIPTIONS[v] ?? v}
                      >
                        {`{{${v}}}`}
                        {VARIABLE_DESCRIPTIONS[v] && (
                          <span className="font-sans text-amber-600">
                            ({VARIABLE_DESCRIPTIONS[v]})
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 프롬프트 편집 영역 */}
          {isLoadingPrompt ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <span className="ml-2 text-xs text-muted-foreground">
                프롬프트 불러오는 중...
              </span>
            </div>
          ) : (
            <textarea
              value={editedPrompt ?? defaultPrompt ?? ''}
              onChange={(e) => handleTextChange(e.target.value)}
              className="w-full min-h-[200px] max-h-[400px] rounded-md border bg-background px-3 py-2 text-xs font-mono leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="AI에게 전달할 프롬프트를 입력하세요..."
              spellCheck={false}
            />
          )}

          {isEdited && (
            <p className="text-[10px] text-blue-600">
              수정된 프롬프트가 AI 생성에 사용됩니다. 원래 프롬프트로 돌아가려면
              &ldquo;원래대로&rdquo;를 클릭하세요.
            </p>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
