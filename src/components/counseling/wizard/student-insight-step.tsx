// src/components/counseling/wizard/student-insight-step.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, Sparkles, SkipForward, User, MessageSquare, TrendingUp, Loader2, Brain, BookOpen, Heart } from 'lucide-react'
import { getStudentInsightAction, type StudentInsightData } from '@/lib/actions/counseling/student-insight'
import { generateAnalysisReportAction } from '@/lib/actions/counseling/scenario-generation'
import { InlineHelp } from '@/components/help/inline-help'
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

  // AI 보완 (분석 보고서 생성)
  const handleGenerate = async () => {
    setIsGenerating(true)
    try {
      const result = await generateAnalysisReportAction({ studentId, topic, modelOverride })
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
                <p className="text-sm text-muted-foreground mb-3 p-3 bg-blue-50 rounded-md border border-blue-100">
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

      {/* AI 보완 버튼 + 모델 선택 */}
      {!analysisReport && !isGenerating && (
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

function PersonalityInsightSummary({ data }: { data: NonNullable<StudentInsightData['personalityData']> }) {
  const mbti = data.mbti?.result
  const mbtiHint = mbti?.mbtiType ? MBTI_COUNSELING_HINTS[mbti.mbtiType] : null
  const sajuHint = data.saju?.interpretation ? extractCounselingHint(data.saju.interpretation) : null
  const nameHint = data.name?.interpretation ? extractCounselingHint(data.name.interpretation) : null
  const hasSaju = !!data.saju?.interpretation
  const hasName = !!data.name?.interpretation
  const hasAny = mbtiHint || sajuHint || nameHint || hasSaju || hasName || Boolean(data.face?.result) || Boolean(data.palm?.result)

  if (!hasAny) {
    return <p className="text-sm text-muted-foreground">분석 데이터를 해석할 수 없습니다.</p>
  }

  return (
    <div className="space-y-3">
      {/* MBTI 섹션 */}
      {mbtiHint && mbti && (
        <div className="p-3 rounded-md bg-blue-50/50 border border-blue-100">
          <div className="flex items-center gap-2 mb-1.5">
            <Brain className="h-3.5 w-3.5 text-blue-600" />
            <span className="text-xs font-semibold text-blue-800">
              MBTI: {mbti.mbtiType}
            </span>
            <span className="text-xs text-blue-600">({mbtiHint.style})</span>
          </div>
          <p className="text-xs text-blue-700 leading-relaxed">
            <span className="font-medium">상담 팁:</span> {mbtiHint.tip}
          </p>
        </div>
      )}

      {/* 사주 분석 요약 */}
      {sajuHint && (
        <div className="p-3 rounded-md bg-purple-50/50 border border-purple-100">
          <div className="flex items-center gap-2 mb-1.5">
            <BookOpen className="h-3.5 w-3.5 text-purple-600" />
            <span className="text-xs font-semibold text-purple-800">사주 성향</span>
          </div>
          <p className="text-xs text-purple-700 leading-relaxed line-clamp-2">{sajuHint}</p>
        </div>
      )}

      {/* 성명학 분석 요약 */}
      {nameHint && (
        <div className="p-3 rounded-md bg-green-50/50 border border-green-100">
          <div className="flex items-center gap-2 mb-1.5">
            <Heart className="h-3.5 w-3.5 text-green-600" />
            <span className="text-xs font-semibold text-green-800">성명학 성향</span>
          </div>
          <p className="text-xs text-green-700 leading-relaxed line-clamp-2">{nameHint}</p>
        </div>
      )}

      {/* 힌트 추출 불가한 분석 + 관상/손금 배지 */}
      {((!sajuHint && hasSaju) || (!nameHint && hasName) || Boolean(data.face?.result) || Boolean(data.palm?.result)) && (
        <div className="flex flex-wrap gap-1.5">
          {!sajuHint && hasSaju && (
            <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-xs rounded-full">사주 분석 완료</span>
          )}
          {!nameHint && hasName && (
            <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">성명학 분석 완료</span>
          )}
          {Boolean(data.face?.result) && (
            <span className="px-2 py-0.5 bg-orange-100 text-orange-800 text-xs rounded-full">관상 분석 완료</span>
          )}
          {Boolean(data.palm?.result) && (
            <span className="px-2 py-0.5 bg-teal-100 text-teal-800 text-xs rounded-full">손금 분석 완료</span>
          )}
        </div>
      )}
    </div>
  )
}
