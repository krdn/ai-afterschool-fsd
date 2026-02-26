'use client'

import { useCallback, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Pencil, Eye, Sparkles, Save, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { parseAiSummary } from '../utils'
import { saveAISummaryAction } from '@/lib/actions/counseling/ai'
import {
  generateAnalysisReportAction,
  generateScenarioAction,
  generateParentSummaryAction,
} from '@/lib/actions/counseling/scenario-generation'

interface SessionReferencePanelProps {
  aiSummary: string | null
  topic: string
  sessionId: string
  studentId: string
  studentName: string
  scheduledAt: string
}

type TabKey = 'analysis' | 'scenario' | 'parent'

const TAB_LABELS: Record<TabKey, string> = {
  analysis: '분석 보고서',
  scenario: '시나리오',
  parent: '학부모용',
}

function composeSummary(sections: Record<TabKey, string>): string {
  const parts: string[] = []
  if (sections.analysis) parts.push(`## 학생 분석 보고서\n\n${sections.analysis}`)
  if (sections.scenario) parts.push(`## 상담 시나리오\n\n${sections.scenario}`)
  if (sections.parent) parts.push(`## 학부모 공유용\n\n${sections.parent}`)
  return parts.join('\n\n---\n\n')
}

export function SessionReferencePanel({
  aiSummary,
  topic,
  sessionId,
  studentId,
  studentName,
  scheduledAt,
}: SessionReferencePanelProps) {
  const parsed = aiSummary ? parseAiSummary(aiSummary) : { analysis: '', scenario: '', parent: '' }

  const [activeTab, setActiveTab] = useState<TabKey>('analysis')
  const [sections, setSections] = useState<Record<TabKey, string>>({
    analysis: parsed.analysis === '내용 없음' ? '' : parsed.analysis,
    scenario: parsed.scenario === '내용 없음' ? '' : parsed.scenario,
    parent: parsed.parent === '내용 없음' ? '' : parsed.parent,
  })
  const [editingTab, setEditingTab] = useState<TabKey | null>(null)
  const [editBuffer, setEditBuffer] = useState('')
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState<TabKey | null>(null)

  const hasContent = (key: TabKey) => sections[key].trim().length > 0
  const hasAnyContent = hasContent('analysis') || hasContent('scenario') || hasContent('parent')

  // 편집 시작
  const startEdit = useCallback((tab: TabKey) => {
    setEditBuffer(sections[tab])
    setEditingTab(tab)
  }, [sections])

  // 편집 취소
  const cancelEdit = useCallback(() => {
    setEditingTab(null)
    setEditBuffer('')
  }, [])

  // 저장 (편집 내용 → DB)
  const saveEdit = useCallback(async () => {
    if (!editingTab) return
    setSaving(true)
    try {
      const updated = { ...sections, [editingTab]: editBuffer }
      setSections(updated)
      setEditingTab(null)

      const fullSummary = composeSummary(updated)
      const result = await saveAISummaryAction(sessionId, fullSummary)
      if (!result.success) {
        toast.error(result.error ?? '저장에 실패했습니다.')
        setSections(sections) // 롤백
      } else {
        toast.success('저장되었습니다.')
      }
    } finally {
      setSaving(false)
    }
  }, [editingTab, editBuffer, sections, sessionId])

  // AI 생성
  const generateSection = useCallback(async (tab: TabKey) => {
    setGenerating(tab)
    try {
      let result: { success: boolean; data?: string; error?: string }

      if (tab === 'analysis') {
        result = await generateAnalysisReportAction({ studentId, topic })
      } else if (tab === 'scenario') {
        const report = sections.analysis || '분석 보고서 없음'
        result = await generateScenarioAction({
          studentId,
          topic,
          approvedReport: report,
        })
      } else {
        const scenario = sections.scenario || '시나리오 없음'
        result = await generateParentSummaryAction({
          studentName,
          topic,
          scheduledAt,
          approvedScenario: scenario,
        })
      }

      if (result.success && result.data) {
        const updated = { ...sections, [tab]: result.data }
        setSections(updated)

        // DB에도 저장
        const fullSummary = composeSummary(updated)
        await saveAISummaryAction(sessionId, fullSummary)
        toast.success(`${TAB_LABELS[tab]} 생성 완료`)
      } else {
        toast.error(result.error ?? 'AI 생성에 실패했습니다.')
      }
    } catch {
      toast.error('AI 생성 중 오류가 발생했습니다.')
    } finally {
      setGenerating(null)
    }
  }, [sections, sessionId, studentId, studentName, topic, scheduledAt])

  // 탭별 콘텐츠 렌더
  const renderTabContent = (tab: TabKey) => {
    const isEditing = editingTab === tab
    const isGenerating = generating === tab
    const content = sections[tab]

    return (
      <div className="flex flex-col h-full gap-2">
        {/* 액션 버튼들 */}
        <div className="flex items-center gap-1.5 shrink-0">
          {isEditing ? (
            <>
              <Button
                size="sm"
                variant="default"
                onClick={saveEdit}
                disabled={saving}
                className="h-7 text-xs"
              >
                {saving ? <Loader2 className="size-3 animate-spin mr-1" /> : <Save className="size-3 mr-1" />}
                저장
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={cancelEdit}
                className="h-7 text-xs"
              >
                취소
              </Button>
            </>
          ) : (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => startEdit(tab)}
                disabled={isGenerating}
                className="h-7 text-xs"
              >
                <Pencil className="size-3 mr-1" />
                {hasContent(tab) ? '수정' : '직접 작성'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => generateSection(tab)}
                disabled={isGenerating}
                className="h-7 text-xs"
              >
                {isGenerating
                  ? <Loader2 className="size-3 animate-spin mr-1" />
                  : <Sparkles className="size-3 mr-1" />
                }
                {hasContent(tab) ? 'AI 재생성' : 'AI 생성'}
              </Button>
            </>
          )}
        </div>

        {/* 콘텐츠 영역 */}
        <div className="flex-1 min-h-0">
          {isEditing ? (
            <Textarea
              value={editBuffer}
              onChange={(e) => setEditBuffer(e.target.value)}
              className="h-full resize-none text-sm font-mono"
              placeholder={`${TAB_LABELS[tab]} 내용을 입력하세요 (Markdown 지원)`}
            />
          ) : content ? (
            <div className="prose prose-sm max-w-none h-full overflow-y-auto">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <p className="text-sm">{TAB_LABELS[tab]} 내용이 없습니다</p>
                <p className="text-xs mt-1">위의 버튼으로 직접 작성하거나 AI로 생성하세요</p>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <Tabs
      value={activeTab}
      onValueChange={(v) => {
        if (editingTab) cancelEdit()
        setActiveTab(v as TabKey)
      }}
      className="h-full flex flex-col"
    >
      <div className="flex items-center gap-2 shrink-0">
        <TabsList className="justify-start">
          {(Object.keys(TAB_LABELS) as TabKey[]).map((key) => (
            <TabsTrigger key={key} value={key} className="text-xs">
              {TAB_LABELS[key]}
              {hasContent(key) && (
                <span className="ml-1 size-1.5 rounded-full bg-primary inline-block" />
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      {(Object.keys(TAB_LABELS) as TabKey[]).map((key) => (
        <TabsContent key={key} value={key} className="mt-2 flex-1 overflow-hidden">
          {renderTabContent(key)}
        </TabsContent>
      ))}
    </Tabs>
  )
}
