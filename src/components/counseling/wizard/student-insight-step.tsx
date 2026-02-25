// src/components/counseling/wizard/student-insight-step.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, Sparkles, SkipForward, User, MessageSquare, TrendingUp } from 'lucide-react'
import { getStudentInsightAction, type StudentInsightData } from '@/lib/actions/counseling/student-insight'
import { generateAnalysisReportAction } from '@/lib/actions/counseling/scenario-generation'
import { MarkdownEditor } from './markdown-editor'

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
      const result = await generateAnalysisReportAction({ studentId, topic })
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
        <div className="text-sm text-muted-foreground">학생 정보를 불러오는 중...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 학생 인사이트 카드 영역 */}
      {insight && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 성향 요약 */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-medium">학생 성향</h4>
              </div>
              {insight.personalitySummary ? (
                <p className="text-sm text-muted-foreground">{insight.personalitySummary}</p>
              ) : (
                <p className="text-sm text-muted-foreground">성향 분석 데이터가 없습니다.</p>
              )}
              {insight.personalityData?.mbti?.result?.mbtiType && (
                <span className="inline-block mt-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
                  MBTI: {insight.personalityData.mbti.result.mbtiType}
                </span>
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

      {/* AI 보완 버튼 */}
      {!analysisReport && !isGenerating && (
        <div className="flex justify-center">
          <Button onClick={handleGenerate} variant="outline" className="gap-2">
            <Sparkles className="h-4 w-4" />
            AI 보완 -- 분석 보고서 생성
          </Button>
        </div>
      )}

      {/* 분석 보고서 편집/승인 */}
      {(analysisReport || isGenerating) && (
        <MarkdownEditor
          title="학생 분석 보고서"
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
