// src/components/counseling/wizard/student-insight-step.tsx
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, Sparkles, SkipForward, User, MessageSquare, TrendingUp, Loader2, Brain, BookOpen, Heart, Eye, Scan, ExternalLink } from 'lucide-react'
import { getStudentInsightAction, type StudentInsightData } from '@/lib/actions/counseling/student-insight'
import { generateAnalysisReportAction, getAnalysisPromptPreviewAction } from '@/lib/actions/counseling/scenario-generation'
import { InlineHelp } from '@/components/help/inline-help'
import { PromptEditorPanel } from './prompt-editor-panel'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MarkdownRenderer } from '@/components/ui/markdown-renderer'
import { MarkdownEditor } from './markdown-editor'
import { ModelSelect, type ModelOverride } from './model-select'

interface StudentInsightStepProps {
  studentId: string
  topic: string
  analysisReport: string
  isReportApproved: boolean
  onReportChange: (report: string) => void
  onReportApprove: () => void
  onStudentNameLoaded: (name: string) => void
  onSkip: () => void
  onBack: () => void
  onNext: () => void
}

export function StudentInsightStep({
  studentId,
  topic,
  analysisReport,
  isReportApproved,
  onReportChange,
  onReportApprove,
  onStudentNameLoaded,
  onSkip,
  onBack,
  onNext,
}: StudentInsightStepProps) {
  const [insight, setInsight] = useState<StudentInsightData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [modelOverride, setModelOverride] = useState<ModelOverride | undefined>()
  const [defaultPrompt, setDefaultPrompt] = useState<string | null>(null)
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(false)
  const [customPrompt, setCustomPrompt] = useState<string | undefined>()
  const onStudentNameLoadedRef = useRef(onStudentNameLoaded)
  onStudentNameLoadedRef.current = onStudentNameLoaded

  // 학생 인사이트 데이터 로드
  useEffect(() => {
    const loadInsight = async () => {
      setIsLoading(true)
      const result = await getStudentInsightAction(studentId)
      if (result.success) {
        setInsight(result.data)
        onStudentNameLoadedRef.current(result.data.studentName)
      } else {
        toast.error(result.error || '학생 정보를 불러오지 못했습니다.')
      }
      setIsLoading(false)
    }
    loadInsight()
  }, [studentId])

  // 프롬프트 프리뷰 로드
  const loadPromptPreview = useCallback(async () => {
    setIsLoadingPrompt(true)
    try {
      const result = await getAnalysisPromptPreviewAction({ studentId, topic })
      if (result.success) {
        setDefaultPrompt(result.data.prompt)
      }
    } catch { /* ignore */ }
    setIsLoadingPrompt(false)
  }, [studentId, topic])

  // AI 보완 (분석 보고서 생성)
  const handleGenerate = async () => {
    setIsGenerating(true)
    try {
      const result = await generateAnalysisReportAction({ studentId, topic, modelOverride, customPrompt })
      if (result.success) {
        onReportChange(result.data)
        toast.success('분석 보고서가 생성되었습니다.')
      } else {
        toast.error(result.error || '보고서 생성에 실패했습니다.')
      }
    } catch {
      toast.error('오류가 발생했습니다.')
    } finally {
      setIsGenerating(false)
    }
  }

  const typeMap: Record<string, string> = {
    ACADEMIC: '학업', CAREER: '진로', PSYCHOLOGICAL: '심리', BEHAVIORAL: '행동',
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[300px]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">학생 정보를 불러오는 중...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 학생 인사이트 카드 영역 */}
      {insight && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 성향 종합 요약 */}
          <Card className="md:col-span-2">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-medium">학생 성향 분석</h4>
              </div>
              {/* AI 종합 요약이 있으면 우선 표시 */}
              {insight.personalitySummary && (
                <p className="text-sm text-muted-foreground mb-3 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-md border border-blue-100">
                  {insight.personalitySummary}
                </p>
              )}
              {insight.personalityData ? (
                <PersonalityInsightSummary data={insight.personalityData} />
              ) : (
                !insight.personalitySummary && (
                  <p className="text-sm text-muted-foreground">성향 분석 데이터가 없습니다.</p>
                )
              )}
            </CardContent>
          </Card>

          {/* 성적 추이 */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-medium">최근 성적</h4>
              </div>
              {insight.gradeHistory.length > 0 ? (
                <div className="space-y-1">
                  {insight.gradeHistory.slice(0, 5).map((g, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{g.subject}</span>
                      <span className="font-medium">{g.score}점</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">성적 데이터가 없습니다.</p>
              )}
            </CardContent>
          </Card>

          {/* 상담 이력 */}
          <Card className="md:col-span-2">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-medium">최근 상담 이력</h4>
              </div>
              {insight.counselingHistory.length > 0 ? (
                <div className="space-y-2">
                  {insight.counselingHistory.map((s) => (
                    <div key={s.id} className="flex items-center gap-3 text-sm border-l-2 border-muted pl-3 py-1">
                      <span className="text-muted-foreground whitespace-nowrap">
                        {new Date(s.sessionDate).toLocaleDateString('ko-KR')}
                      </span>
                      <span className="px-1.5 py-0.5 bg-muted text-xs rounded">
                        {typeMap[s.type] || s.type}
                      </span>
                      <span className="truncate">{s.summary.slice(0, 50)}{s.summary.length > 50 ? '...' : ''}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">첫 상담입니다.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* AI 보완 버튼 + 모델 선택 + 프롬프트 편집 */}
      {!analysisReport && !isGenerating && (
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-3">
            <ModelSelect
              featureType="counseling_analysis"
              onModelChange={setModelOverride}
            />
            <Button onClick={handleGenerate} variant="outline" className="gap-2">
              <Sparkles className="h-4 w-4" />
              AI 보완 -- 분석 보고서 생성
            </Button>
          </div>
          <PromptEditorPanel
            promptType="analysis_report"
            defaultPrompt={defaultPrompt}
            isLoadingPrompt={isLoadingPrompt}
            onPromptChange={setCustomPrompt}
            onLoadPrompt={loadPromptPreview}
          />
        </div>
      )}

      {/* 분석 보고서 편집/승인 */}
      {(analysisReport || isGenerating) && (
        <MarkdownEditor
          title={<InlineHelp helpId="counseling-ai-pipeline"><span>학생 분석 보고서</span></InlineHelp>}
          content={analysisReport}
          onChange={onReportChange}
          onApprove={onReportApprove}
          onRegenerate={handleGenerate}
          isGenerating={isGenerating}
          isApproved={isReportApproved}
        />
      )}

      {/* 하단 네비게이션 */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          이전
        </Button>

        <div className="flex gap-2">
          <Button variant="ghost" onClick={onSkip} className="text-muted-foreground">
            <SkipForward className="h-4 w-4 mr-1" />
            AI 보완 없이 진행
          </Button>
          {isReportApproved && (
            <Button onClick={onNext}>
              다음
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// MBTI 유형별 상담 힌트
const MBTI_COUNSELING_HINTS: Record<string, { style: string; tip: string }> = {
  ISTJ: { style: '체계적·신중', tip: '구체적 계획과 명확한 목표를 제시하면 효과적' },
  ISFJ: { style: '헌신적·세심', tip: '안정적 환경에서 충분한 격려와 함께 접근' },
  INFJ: { style: '통찰력·이상적', tip: '깊은 대화를 선호하며 의미와 목적에 집중' },
  INTJ: { style: '전략적·독립적', tip: '논리적 근거와 장기 비전으로 동기 부여' },
  ISTP: { style: '분석적·실용', tip: '실습 위주 학습이 효과적, 자율성 존중' },
  ISFP: { style: '감성적·유연', tip: '창의적 접근을 허용하고 감정을 존중하며 대화' },
  INFP: { style: '이상주의·공감', tip: '가치관을 존중하고 개인적 성장에 초점' },
  INTP: { style: '논리적·탐구', tip: '지적 호기심을 자극하고 스스로 답을 찾게 유도' },
  ESTP: { style: '활동적·현실적', tip: '체험 학습과 즉각적 피드백이 효과적' },
  ESFP: { style: '사교적·즐거움', tip: '재미 요소를 가미하고 긍정적 분위기 유지' },
  ENFP: { style: '열정적·창의', tip: '새로운 가능성을 함께 탐색하며 동기 부여' },
  ENTP: { style: '도전적·혁신', tip: '토론과 아이디어 교환으로 참여 유도' },
  ESTJ: { style: '조직적·결단력', tip: '명확한 규칙과 기대치를 설정하면 잘 따름' },
  ESFJ: { style: '배려·협동', tip: '관계 중심 접근, 칭찬과 인정이 큰 동기' },
  ENFJ: { style: '리더십·이타', tip: '역할 부여와 타인 도움 기회로 성장 촉진' },
  ENTJ: { style: '목표지향·효율', tip: '도전적 목표와 성취감으로 동기 부여' },
}

// 사주/성명학 해석 텍스트에서 마크다운을 제거하고 상담용 핵심 문장을 추출
function extractCounselingHint(interpretation: string): string {
  const cleaned = interpretation
    .replace(/```[\s\S]*?```/g, '')       // 코드블록 제거
    .replace(/\|[^\n]*\|/g, '')           // 테이블 행 제거
    .replace(/^[-=]{3,}$/gm, '')          // 수평선 제거
    .replace(/^#{1,6}\s+/gm, '')          // 마크다운 헤딩 제거
    .replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1') // bold/italic 제거
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // 링크 제거
    .replace(/[*\-+]\s/g, '')             // 리스트 마커 제거
    .replace(/\d+️⃣?\.\s/g, '')            // 순서 리스트 마커 제거
    .replace(/[#>`~_]/g, '')              // 남은 마크다운 문자 제거
    .replace(/\(.*?과학적 근거.*?\)/g, '') // 면책 문구 제거
    .replace(/→/g, ', ')                  // 화살표를 쉼표로
    .replace(/\n+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()

  // 문장 단위 분리 (한국어/중국어/영어 문장부호 지원)
  const sentences = cleaned
    .split(/[.。！!？?]\s*/)
    .map(s => s.trim())
    .filter(s => s.length > 10 && s.length < 200)

  // 한국어 문장만 추출 (중국어/일본어 전용 문장 제외)
  const koreanSentences = sentences.filter(s => /[가-힣]/.test(s))
  if (koreanSentences.length === 0) return ''

  // 성격/성향/학습 관련 키워드가 있는 문장 우선
  const personalityKeywords = /성격|성향|특징|특성|기질|성품|장점|강점|에너지|소통|관계|학습|집중|창의|감성|논리|리더|조합|열정|실천/
  const relevant = koreanSentences.filter(s => personalityKeywords.test(s))
  const picked = relevant.length >= 1 ? relevant.slice(0, 2) : koreanSentences.slice(0, 2)

  if (picked.length === 0) return ''
  return picked.join('. ').replace(/\s{2,}/g, ' ').trim() + '.'
}

// 분석 항목 타입
type AnalysisTabId = 'mbti' | 'saju' | 'name' | 'face' | 'palm'

function PersonalityInsightSummary({ data }: { data: NonNullable<StudentInsightData['personalityData']> }) {
  const [detailOpen, setDetailOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<AnalysisTabId>('mbti')

  const mbti = data.mbti?.result
  const mbtiHint = mbti?.mbtiType ? MBTI_COUNSELING_HINTS[mbti.mbtiType] : null
  const sajuHint = data.saju?.interpretation ? extractCounselingHint(data.saju.interpretation) : null
  const nameHint = data.name?.interpretation ? extractCounselingHint(data.name.interpretation) : null
  const hasSaju = !!data.saju?.interpretation
  const hasName = !!data.name?.interpretation
  const hasFace = Boolean(data.face?.result)
  const hasPalm = Boolean(data.palm?.result)
  const hasAny = mbtiHint || sajuHint || nameHint || hasSaju || hasName || hasFace || hasPalm

  // 사용 가능한 탭 목록 (데이터가 있는 항목만)
  const availableTabs: { id: AnalysisTabId; label: string; icon: typeof Brain }[] = [
    ...(mbti ? [{ id: 'mbti' as const, label: 'MBTI', icon: Brain }] : []),
    ...(hasSaju ? [{ id: 'saju' as const, label: '사주', icon: BookOpen }] : []),
    ...(hasName ? [{ id: 'name' as const, label: '성명학', icon: Heart }] : []),
    ...(hasFace ? [{ id: 'face' as const, label: '관상', icon: Eye }] : []),
    ...(hasPalm ? [{ id: 'palm' as const, label: '손금', icon: Scan }] : []),
  ]

  const openDetail = (tab: AnalysisTabId) => {
    setActiveTab(tab)
    setDetailOpen(true)
  }

  if (!hasAny) {
    return <p className="text-sm text-muted-foreground">분석 데이터를 해석할 수 없습니다.</p>
  }

  return (
    <>
      <div className="space-y-2.5">
        {/* MBTI 섹션 */}
        {mbtiHint && mbti && (
          <div className="p-3 rounded-md bg-blue-50 dark:bg-blue-950/30/50 border border-blue-100">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <Brain className="h-3.5 w-3.5 text-blue-600" />
                <span className="text-xs font-semibold text-blue-800 dark:text-blue-300">
                  MBTI: {mbti.mbtiType}
                </span>
                <span className="text-xs text-blue-600">({mbtiHint.style})</span>
              </div>
              <button onClick={() => openDetail('mbti')} className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-300 hover:underline flex items-center gap-0.5">
                자세히 <ExternalLink className="h-3 w-3" />
              </button>
            </div>
            <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">
              <span className="font-medium">상담 팁:</span> {mbtiHint.tip}
            </p>
          </div>
        )}

        {/* 사주 분석 요약 */}
        {hasSaju && (
          <div className="p-3 rounded-md bg-purple-50 dark:bg-purple-950/30/50 border border-purple-100">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <BookOpen className="h-3.5 w-3.5 text-purple-600" />
                <span className="text-xs font-semibold text-purple-800 dark:text-purple-300">사주 성향</span>
              </div>
              <button onClick={() => openDetail('saju')} className="text-xs text-purple-600 hover:text-purple-800 dark:text-purple-300 hover:underline flex items-center gap-0.5">
                자세히 <ExternalLink className="h-3 w-3" />
              </button>
            </div>
            {sajuHint ? (
              <p className="text-xs text-purple-700 dark:text-purple-400 leading-relaxed line-clamp-2">{sajuHint}</p>
            ) : (
              <p className="text-xs text-purple-600 italic">분석 완료 (클릭하여 상세 확인)</p>
            )}
          </div>
        )}

        {/* 성명학 분석 요약 */}
        {hasName && (
          <div className="p-3 rounded-md bg-green-50 dark:bg-green-950/30/50 border border-green-100">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <Heart className="h-3.5 w-3.5 text-green-600" />
                <span className="text-xs font-semibold text-green-800 dark:text-green-300">성명학 성향</span>
              </div>
              <button onClick={() => openDetail('name')} className="text-xs text-green-600 hover:text-green-800 dark:text-green-300 hover:underline flex items-center gap-0.5">
                자세히 <ExternalLink className="h-3 w-3" />
              </button>
            </div>
            {nameHint ? (
              <p className="text-xs text-green-700 dark:text-green-400 leading-relaxed line-clamp-2">{nameHint}</p>
            ) : (
              <p className="text-xs text-green-600 italic">분석 완료 (클릭하여 상세 확인)</p>
            )}
          </div>
        )}

        {/* 관상/손금 — 데이터 있으면 카드로 표시 */}
        {(hasFace || hasPalm) && (
          <div className="flex flex-wrap gap-2">
            {hasFace && (
              <button
                onClick={() => openDetail('face')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 dark:bg-orange-950/30 border border-orange-100 text-orange-800 text-xs rounded-md hover:bg-orange-100 transition-colors"
              >
                <Eye className="h-3 w-3" />
                관상 분석
                <ExternalLink className="h-3 w-3 text-orange-500" />
              </button>
            )}
            {hasPalm && (
              <button
                onClick={() => openDetail('palm')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 border border-teal-100 text-teal-800 text-xs rounded-md hover:bg-teal-100 transition-colors"
              >
                <Scan className="h-3 w-3" />
                손금 분석
                <ExternalLink className="h-3 w-3 text-teal-500" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* 상세 모달 */}
      <PersonalityDetailDialog
        data={data}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        availableTabs={availableTabs}
      />
    </>
  )
}

// ---------------------------------------------------------------------------
// 상세 모달 다이얼로그
// ---------------------------------------------------------------------------

function PersonalityDetailDialog({
  data,
  open,
  onOpenChange,
  activeTab,
  onTabChange,
  availableTabs,
}: {
  data: NonNullable<StudentInsightData['personalityData']>
  open: boolean
  onOpenChange: (open: boolean) => void
  activeTab: AnalysisTabId
  onTabChange: (tab: AnalysisTabId) => void
  availableTabs: { id: AnalysisTabId; label: string; icon: typeof Brain }[]
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-3">
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            학생 성향 분석 상세
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => onTabChange(v as AnalysisTabId)} className="flex flex-col min-h-0">
          <TabsList className="mx-6 mb-0 w-auto justify-start">
            {availableTabs.map(({ id, label, icon: Icon }) => (
              <TabsTrigger key={id} value={id} className="gap-1.5 text-xs">
                <Icon className="h-3.5 w-3.5" />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          <ScrollArea className="flex-1 px-6 pb-6" style={{ maxHeight: 'calc(85vh - 140px)' }}>
            {/* MBTI 상세 */}
            <TabsContent value="mbti" className="mt-4 space-y-4">
              <MbtiDetailView mbti={data.mbti?.result ?? null} />
            </TabsContent>

            {/* 사주 상세 */}
            <TabsContent value="saju" className="mt-4 space-y-4">
              <InterpretationDetailView
                title="사주 분석"
                interpretation={data.saju?.interpretation ?? null}
                result={data.saju?.result}
                color="purple"
              />
            </TabsContent>

            {/* 성명학 상세 */}
            <TabsContent value="name" className="mt-4 space-y-4">
              <InterpretationDetailView
                title="성명학 분석"
                interpretation={data.name?.interpretation ?? null}
                result={data.name?.result}
                color="green"
              />
            </TabsContent>

            {/* 관상 상세 */}
            <TabsContent value="face" className="mt-4 space-y-4">
              <VisionAnalysisDetailView
                title="관상 분석"
                result={data.face?.result ?? null}
                color="orange"
              />
            </TabsContent>

            {/* 손금 상세 */}
            <TabsContent value="palm" className="mt-4 space-y-4">
              <VisionAnalysisDetailView
                title="손금 분석"
                result={data.palm?.result ?? null}
                color="teal"
              />
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// MBTI 상세 뷰
// ---------------------------------------------------------------------------

// MBTI 차원 레이블
const MBTI_DIMENSIONS = [
  { left: 'E (외향)', right: 'I (내향)', leftKey: 'E', rightKey: 'I' },
  { left: 'S (감각)', right: 'N (직관)', leftKey: 'S', rightKey: 'N' },
  { left: 'T (사고)', right: 'F (감정)', leftKey: 'T', rightKey: 'F' },
  { left: 'J (판단)', right: 'P (인식)', leftKey: 'J', rightKey: 'P' },
] as const

function MbtiDetailView({ mbti }: { mbti: { mbtiType: string; percentages: Record<string, number> } | null }) {
  if (!mbti) return <p className="text-sm text-muted-foreground">MBTI 데이터가 없습니다.</p>

  const hint = MBTI_COUNSELING_HINTS[mbti.mbtiType]

  return (
    <div className="space-y-5">
      {/* 유형 헤더 */}
      <div className="text-center p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200">
        <p className="text-3xl font-bold text-blue-900 mb-1">{mbti.mbtiType}</p>
        {hint && <p className="text-sm text-blue-700 dark:text-blue-400">{hint.style}</p>}
      </div>

      {/* 차원별 백분율 바 */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-foreground">차원별 성향 비율</h4>
        {MBTI_DIMENSIONS.map(({ left, right, leftKey, rightKey }) => {
          const leftPct = mbti.percentages[leftKey] ?? 50
          const rightPct = mbti.percentages[rightKey] ?? 50
          const dominantSide = leftPct >= rightPct ? 'left' : 'right'

          return (
            <div key={leftKey} className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span className={dominantSide === 'left' ? 'font-semibold text-blue-700 dark:text-blue-400' : ''}>{left}</span>
                <span className={dominantSide === 'right' ? 'font-semibold text-blue-700 dark:text-blue-400' : ''}>{right}</span>
              </div>
              <div className="flex h-2.5 rounded-full overflow-hidden bg-muted">
                <div
                  className="bg-blue-50 dark:bg-blue-950/30 transition-all"
                  style={{ width: `${leftPct}%` }}
                />
                <div
                  className="bg-blue-200 transition-all"
                  style={{ width: `${rightPct}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>{leftPct}%</span>
                <span>{rightPct}%</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* 상담 가이드 */}
      {hint && (
        <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30/50 border border-blue-100 space-y-2">
          <h4 className="text-sm font-medium text-blue-900">상담 가이드</h4>
          <p className="text-sm text-blue-800 dark:text-blue-300 leading-relaxed">{hint.tip}</p>
          <div className="mt-3 text-xs text-blue-600 space-y-1">
            <p><span className="font-medium">성향 키워드:</span> {hint.style}</p>
            <p><span className="font-medium">효과적 접근:</span> {mbti.mbtiType.includes('I') ? '1:1 개별 상담 선호, 생각할 시간 제공' : '그룹 활동 참여 유도, 즉각적 피드백'}</p>
            <p><span className="font-medium">주의사항:</span> {mbti.mbtiType.includes('F') ? '감정적 공감 먼저, 이후 논리적 설명' : '논리적 근거 제시, 감정 강요 자제'}</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// 사주/성명학 상세 뷰 (interpretation 마크다운 표시)
// ---------------------------------------------------------------------------

function InterpretationDetailView({ title, interpretation, result, color }: {
  title: string
  interpretation: string | null
  result: unknown
  color: 'purple' | 'green'
}) {
  const colorMap = {
    purple: { bg: 'bg-purple-50 dark:bg-purple-950/30', border: 'border-purple-200', text: 'text-purple-900', badge: 'bg-purple-100 text-purple-800' },
    green: { bg: 'bg-green-50 dark:bg-green-950/30', border: 'border-green-200', text: 'text-green-900', badge: 'bg-green-100 text-green-800' },
  }
  const c = colorMap[color]

  // result에서 추가 정보 추출 (사주의 경우 pillars, elements 등)
  const resultObj = result as Record<string, unknown> | null
  const pillars = resultObj?.pillars as Record<string, { stem: string; branch: string }> | undefined
  const elements = resultObj?.elements as Record<string, number> | undefined
  // 성명학의 경우 strokes, grids
  const strokes = resultObj?.strokes as { perSyllable: number[]; total: number } | undefined
  const grids = resultObj?.grids as Record<string, number> | undefined
  const interpretations = resultObj?.interpretations as Record<string, string> | undefined

  return (
    <div className="space-y-4">
      {/* 사주: 사주팔자 요약 */}
      {pillars && (
        <div className={`p-4 rounded-lg ${c.bg} ${c.border} border`}>
          <h4 className={`text-sm font-medium ${c.text} mb-3`}>사주팔자</h4>
          <div className="grid grid-cols-4 gap-2 text-center">
            {(['year', 'month', 'day', 'hour'] as const).map((key) => {
              const p = pillars[key]
              return (
                <div key={key} className="space-y-1">
                  <p className="text-[10px] text-muted-foreground">{key === 'year' ? '연주' : key === 'month' ? '월주' : key === 'day' ? '일주' : '시주'}</p>
                  {p ? (
                    <p className={`text-sm font-semibold ${c.text}`}>{p.stem}{p.branch}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">-</p>
                  )}
                </div>
              )
            })}
          </div>
          {elements && (
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">오행:</span>
              {Object.entries(elements).map(([el, count]) => (
                <span key={el} className={`text-xs px-1.5 py-0.5 rounded ${c.badge}`}>
                  {el} {count}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 성명학: 획수/운세 요약 */}
      {strokes && grids && (
        <div className={`p-4 rounded-lg ${c.bg} ${c.border} border`}>
          <h4 className={`text-sm font-medium ${c.text} mb-3`}>성명학 분석 결과</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">총 획수</p>
              <p className={`text-lg font-bold ${c.text}`}>{strokes.total}획</p>
              {strokes.perSyllable && (
                <p className="text-xs text-muted-foreground">글자별: {strokes.perSyllable.join(' + ')}</p>
              )}
            </div>
            <div className="space-y-1">
              {Object.entries(grids).map(([key, val]) => {
                const gridNames: Record<string, string> = { won: '원운', hyung: '형운', yi: '이운', jeong: '정운' }
                return (
                  <div key={key} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{gridNames[key] || key}</span>
                    <span className={`font-medium ${c.text}`}>{val as number}</span>
                  </div>
                )
              })}
            </div>
          </div>
          {interpretations && (
            <div className="mt-3 space-y-1.5">
              {Object.entries(interpretations).map(([key, text]) => {
                const gridNames: Record<string, string> = { won: '원운', hyung: '형운', yi: '이운', jeong: '정운', overall: '종합' }
                return (
                  <div key={key} className="text-xs">
                    <span className={`font-medium ${c.text}`}>{gridNames[key] || key}:</span>{' '}
                    <span className="text-foreground">{text as string}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* AI 해석 전문 */}
      {interpretation ? (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-foreground">AI 해석</h4>
          <div className="prose prose-sm max-w-none rounded-lg border p-4 bg-card">
            <MarkdownRenderer content={interpretation} />
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">AI 해석 데이터가 없습니다.</p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// 관상/손금 상세 뷰 (Vision LLM result JSON 표시)
// ---------------------------------------------------------------------------

function VisionAnalysisDetailView({ title, result, color }: {
  title: string
  result: unknown
  color: 'orange' | 'teal'
}) {
  const colorMap = {
    orange: { bg: 'bg-orange-50 dark:bg-orange-950/30', border: 'border-orange-200', text: 'text-orange-900', badge: 'bg-orange-100 text-orange-800' },
    teal: { bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-900', badge: 'bg-teal-100 text-teal-800' },
  }
  const c = colorMap[color]

  if (!result) {
    return <p className="text-sm text-muted-foreground">{title} 데이터가 없습니다.</p>
  }

  const obj = result as Record<string, unknown>
  const personalityTraits = obj.personalityTraits as string[] | undefined
  const fortune = obj.fortune as Record<string, string> | undefined
  // LLM 출력이 문자열인 경우 (마크다운)
  const isStringResult = typeof result === 'string'

  return (
    <div className="space-y-4">
      {/* 성격 특성 */}
      {personalityTraits && personalityTraits.length > 0 && (
        <div className={`p-4 rounded-lg ${c.bg} ${c.border} border`}>
          <h4 className={`text-sm font-medium ${c.text} mb-2`}>성격 특성</h4>
          <div className="flex flex-wrap gap-1.5">
            {personalityTraits.map((trait, i) => (
              <span key={i} className={`text-xs px-2 py-0.5 rounded-full ${c.badge}`}>{trait}</span>
            ))}
          </div>
        </div>
      )}

      {/* 운세 정보 */}
      {fortune && Object.keys(fortune).length > 0 && (
        <div className={`p-4 rounded-lg ${c.bg} ${c.border} border`}>
          <h4 className={`text-sm font-medium ${c.text} mb-2`}>운세 분석</h4>
          <div className="space-y-2">
            {Object.entries(fortune).map(([key, value]) => {
              const fortuneLabels: Record<string, string> = {
                career: '직업/진로', relationships: '대인관계', health: '건강',
                talents: '재능', destiny: '운명', wealth: '재물',
                academic: '학업', love: '연애', family: '가정',
              }
              return (
                <div key={key}>
                  <p className={`text-xs font-medium ${c.text}`}>{fortuneLabels[key] || key}</p>
                  <p className="text-xs text-foreground leading-relaxed">{value}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 문자열 형태 결과 또는 기타 JSON 표시 */}
      {isStringResult ? (
        <div className="prose prose-sm max-w-none rounded-lg border p-4 bg-card">
          <MarkdownRenderer content={result as string} />
        </div>
      ) : !personalityTraits && !fortune ? (
        <div className="rounded-lg border p-4 bg-muted">
          <h4 className="text-sm font-medium text-foreground mb-2">{title} 결과</h4>
          <pre className="text-xs text-muted-foreground whitespace-pre-wrap overflow-x-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      ) : null}
    </div>
  )
}
