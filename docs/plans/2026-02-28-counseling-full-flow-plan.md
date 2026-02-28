# 상담 전체 흐름 (AI 보고서) 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 상담 완료 후 AI가 종합 보고서를 생성하고, 교사가 수정/확정하는 Phase "report" 단계를 기존 SessionLivePage에 추가한다.

**Architecture:** 기존 `SessionLivePage`의 `showCompleteForm` boolean 상태를 3-Phase 상태(`recording` → `completing` → `report`)로 확장. `SessionCompleteForm`에서 [AI 보고서 생성] 버튼 추가. 새로운 `SessionReportEditor` 컴포넌트로 보고서 편집/확정.

**Tech Stack:** Next.js 15 Server Actions, Vercel AI SDK (generateWithProvider), Zod validation, shadcn/ui MarkdownEditor, Prisma

---

## 현재 구현 상태 (중요)

아래 파일들은 **이미 완성되어 동작**합니다:
- `src/app/[locale]/(dashboard)/counseling/session/[reservationId]/page.tsx` — SSR 페이지
- `src/components/counseling/session-live/session-live-page.tsx` — 메인 레이아웃
- `src/components/counseling/session-live/session-reference-panel.tsx` — AI 참고자료
- `src/components/counseling/session-live/session-checklist.tsx` — 체크리스트
- `src/components/counseling/session-live/session-checklist-item.tsx` — 체크 항목
- `src/components/counseling/session-live/session-timer.tsx` — 타이머
- `src/components/counseling/session-live/session-complete-form.tsx` — 완료 폼
- `src/components/counseling/reservation-detail-dialog.tsx` — [상담 시작] 버튼 포함
- `src/lib/actions/counseling/session-live.ts` — startSession/completeSession
- `src/lib/actions/counseling/session-notes.ts` — 노트 CRUD
- `src/lib/actions/counseling/session-checklist-ai.ts` — AI 체크리스트 생성
- `src/lib/validations/session-notes.ts` — Zod 스키마

**이 계획은 "report" Phase만 추가합니다.** 기존 코드를 불필요하게 수정하지 않습니다.

---

### Task 1: AI 보고서 프롬프트 빌더 추가

**Files:**
- Modify: `src/features/ai-engine/prompts/counseling-scenario.ts` (끝부분에 추가)

**Step 1: 보고서 프롬프트 빌더 함수 추가**

`counseling-scenario.ts` 파일 맨 아래에 `buildCounselingReportPrompt` 함수를 추가합니다.

```typescript
// ---------------------------------------------------------------------------
// 4. 상담 종합 보고서 프롬프트 빌더
// ---------------------------------------------------------------------------

export interface CounselingReportPromptParams {
  studentName: string
  topic: string
  counselingType: string
  duration: number
  teacherSummary: string
  checklist: Array<{ content: string; checked: boolean; memo: string | null }>
  aiReference: string | null
}

export async function buildCounselingReportPrompt(
  params: CounselingReportPromptParams,
): Promise<PromptBuildResult> {
  const { studentName, topic, counselingType, duration, teacherSummary, checklist, aiReference } = params

  const preset = await getActiveCounselingPreset('counseling_summary')
  if (preset) {
    return {
      prompt: replaceTemplateVars(preset.promptTemplate, {
        studentName, topic, counselingType: typeMap[counselingType] || counselingType,
        duration: String(duration), teacherSummary,
        checklistSection: buildChecklistSection(checklist),
        aiReferenceSection: aiReference || '사전 분석 자료 없음',
      }),
      systemPrompt: preset.systemPrompt,
      maxOutputTokens: preset.maxOutputTokens,
      temperature: preset.temperature,
    }
  }

  return { prompt: buildDefaultCounselingReportPrompt(params) }
}

function buildChecklistSection(
  checklist: Array<{ content: string; checked: boolean; memo: string | null }>,
): string {
  if (checklist.length === 0) return '체크리스트 항목이 없습니다.'
  return checklist.map((item) => {
    const prefix = item.checked ? '✓' : '✗'
    const memo = item.memo?.trim() ? ` (메모: ${item.memo.trim()})` : ''
    return `${prefix} ${item.content}${memo}`
  }).join('\n')
}

function buildDefaultCounselingReportPrompt(params: CounselingReportPromptParams): string {
  const { studentName, topic, counselingType, duration, teacherSummary, checklist, aiReference } = params

  const checklistSection = buildChecklistSection(checklist)
  const referenceSection = aiReference
    ? `## 사전 AI 분석 자료\n${aiReference}`
    : ''

  return `너는 학교 상담 보고서 작성 전문가야. 아래 상담 기록을 바탕으로 교사용 종합 보고서를 작성해줘.

## 상담 기본 정보
- 학생: ${studentName}
- 상담 주제: ${topic}
- 상담 유형: ${typeMap[counselingType] || counselingType}
- 소요 시간: ${duration}분

## 교사 상담 요약
${teacherSummary}

## 상담 체크리스트 결과
${checklistSection}

${referenceSection}

다음 형식으로 교사용 상담 종합 보고서를 마크다운으로 작성해줘. 반드시 아래 마크다운 문법 규칙을 지켜:
- 각 섹션은 ### 제목으로 구분
- 핵심 키워드는 **굵은 글씨**로 강조
- 나열 항목은 - 또는 1. 목록 사용
- 중요한 발견은 > 인용구로 표시

### 상담 개요

| 항목 | 내용 |
|------|------|
| **학생** | ${studentName} |
| **유형** | ${typeMap[counselingType] || counselingType} |
| **주제** | ${topic} |
| **소요시간** | ${duration}분 |

### 상담 내용 요약

[체크리스트 결과와 교사 메모를 종합하여 상담 진행 과정을 서술형으로 정리]

### 주요 발견사항

- **핵심 이슈**: [상담에서 확인된 가장 중요한 사항]
- **학생 반응**: [상담 중 관찰된 학생의 태도와 반응]
- **긍정적 변화**: [확인된 긍정적 요소]
- **주의 사항**: [향후 주의가 필요한 부분]

> **핵심 요약**: [1-2문장으로 이번 상담의 핵심 내용]

### 후속 조치 권고

1. **단기 조치** (1-2주 내): [즉시 실행할 사항]
2. **중기 계획** (1개월): [중기적으로 관찰/지도할 내용]
3. **다음 상담 제안**: [다음 상담 시기와 주제 제안]`.trim()
}
```

**Step 2: Commit**

```bash
git add src/features/ai-engine/prompts/counseling-scenario.ts
git commit -m "feat: 상담 종합 보고서 프롬프트 빌더 추가"
```

---

### Task 2: AI 보고서 생성 Server Action

**Files:**
- Create: `src/lib/actions/counseling/report-generation.ts`

**Step 1: Server Action 생성**

```typescript
'use server'

import { z } from 'zod'
import { verifySession } from '@/lib/dal'
import { db } from '@/lib/db/client'
import { ok, fail, type ActionResult } from '@/lib/errors/action-result'
import { generateWithProvider } from '@/features/ai-engine/universal-router'
import { buildCounselingReportPrompt } from '@/features/ai-engine/prompts/counseling-scenario'
import { logger } from '@/lib/logger'

const reportInputSchema = z.object({
  sessionId: z.string().min(1),
  type: z.enum(['ACADEMIC', 'CAREER', 'PSYCHOLOGICAL', 'BEHAVIORAL']),
  duration: z.number().min(5),
  summary: z.string().min(10),
})

/**
 * 상담 종합 보고서를 AI로 생성한다.
 *
 * 입력: 세션 ID + 완료 폼 데이터
 * 내부: 세션의 체크리스트(CounselingNote) + aiSummary(Wizard 자료) 조회
 * 출력: 마크다운 보고서 string
 */
export async function generateCounselingReportAction(
  input: z.infer<typeof reportInputSchema>
): Promise<ActionResult<string>> {
  const session = await verifySession()
  if (!session?.userId) return fail('인증이 필요합니다.')

  const parsed = reportInputSchema.safeParse(input)
  if (!parsed.success) return fail('입력값이 올바르지 않습니다.')

  const { sessionId, type, duration, summary } = parsed.data

  try {
    // 세션 + 학생 + 노트 조회
    const counselingSession = await db.counselingSession.findUnique({
      where: { id: sessionId, teacherId: session.userId },
      include: {
        student: { select: { name: true } },
        notes: { orderBy: { order: 'asc' } },
        reservation: { select: { topic: true } },
      },
    })

    if (!counselingSession) return fail('상담 세션을 찾을 수 없습니다.')

    const topic = counselingSession.reservation?.topic || '주제 없음'
    const studentName = counselingSession.student.name

    // 프롬프트 빌드
    const buildResult = await buildCounselingReportPrompt({
      studentName,
      topic,
      counselingType: type,
      duration,
      teacherSummary: summary,
      checklist: counselingSession.notes.map((n) => ({
        content: n.content,
        checked: n.checked,
        memo: n.memo,
      })),
      aiReference: counselingSession.aiSummary,
    })

    // AI 호출
    const result = await generateWithProvider({
      prompt: buildResult.prompt,
      featureType: 'counseling_scenario', // 기존 매핑 재활용 (별도 매핑 없으면)
      teacherId: session.userId,
      maxOutputTokens: buildResult.maxOutputTokens ?? 1500,
      temperature: buildResult.temperature ?? 0.3,
      ...(buildResult.systemPrompt && { systemPrompt: buildResult.systemPrompt }),
    })

    if (!result.text) return fail('AI 응답이 비어있습니다. 다시 시도해주세요.')

    return ok(result.text)
  } catch (error) {
    logger.error({ err: error }, 'Failed to generate counseling report')
    return fail('상담 보고서 생성에 실패했습니다. 다시 시도해주세요.')
  }
}
```

**Step 2: Prisma 관계 확인**

CounselingSession → ParentCounselingReservation 역방향 관계가 필요합니다.
`reservation` 필드로 topic을 가져옵니다.

현재 스키마 확인:
- `ParentCounselingReservation`에 `counselingSessionId`와 `counselingSession` 관계 있음
- `CounselingSession`에 역방향 관계가 있는지 확인 → `reservation ParentCounselingReservation?` 유무 확인

만약 역방향 관계가 없으면, 대안으로 topic을 클라이언트에서 직접 전달받도록 input schema를 확장합니다:

```typescript
const reportInputSchema = z.object({
  sessionId: z.string().min(1),
  type: z.enum(['ACADEMIC', 'CAREER', 'PSYCHOLOGICAL', 'BEHAVIORAL']),
  duration: z.number().min(5),
  summary: z.string().min(10),
  topic: z.string().min(1), // 클라이언트에서 전달
  studentName: z.string().min(1), // 클라이언트에서 전달
})
```

이 경우 DB 조회를 간소화할 수 있습니다. **구현 시 스키마를 확인하고 적절한 방식을 선택합니다.**

**Step 3: Commit**

```bash
git add src/lib/actions/counseling/report-generation.ts
git commit -m "feat: 상담 종합 보고서 AI 생성 Server Action 추가"
```

---

### Task 3: SessionLivePage Phase 상태 확장

**Files:**
- Modify: `src/components/counseling/session-live/session-live-page.tsx`

**Step 1: Phase 상태로 리팩토링**

기존 `showCompleteForm` boolean을 `phase` 상태로 변경합니다.

변경 전:
```typescript
const [showCompleteForm, setShowCompleteForm] = useState(false)
```

변경 후:
```typescript
type SessionPhase = 'recording' | 'completing' | 'report'
const [phase, setPhase] = useState<SessionPhase>('recording')
const [reportContent, setReportContent] = useState('')
const [completionData, setCompletionData] = useState<{
  type: string
  duration: number
  summary: string
  followUpRequired: boolean
  followUpDate?: string
  satisfactionScore?: number
} | null>(null)
```

**Step 2: 레이아웃 조건부 렌더링 수정**

```typescript
return (
  <div className="flex flex-col h-[calc(100vh-8rem)]">
    {/* 헤더 — phase에 따라 버튼 변경 */}
    <div className="flex items-center justify-between px-4 py-3 border-b">
      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={() => {
          if (phase === 'completing') setPhase('recording')
          else if (phase === 'report') setPhase('completing')
          else router.push('/counseling')
        }}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          {phase === 'recording' ? '돌아가기' : '이전 단계'}
        </Button>
        <div>
          <h2 className="font-semibold">{studentName}</h2>
          <p className="text-sm text-muted-foreground">{topic}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {phase === 'recording' && (
          <>
            <SessionTimer startTime={startTimeRef.current} />
            <Button onClick={() => setPhase('completing')}>
              상담 완료
            </Button>
          </>
        )}
      </div>
    </div>

    {/* Phase별 콘텐츠 */}
    {phase === 'recording' && (
      <ResizablePanelGroup direction="vertical" className="flex-1 p-4">
        {/* 기존 참고자료 + 체크리스트 그대로 */}
      </ResizablePanelGroup>
    )}

    {phase === 'completing' && counselingSession && (
      <div className="flex-1 overflow-y-auto p-4">
        <SessionCompleteForm
          sessionId={counselingSession.id}
          reservationId={reservation.id}
          aiSummary={counselingSession.aiSummary}
          notes={counselingSession.notes}
          elapsedMinutes={getElapsedMinutes()}
          onCancel={() => setPhase('recording')}
          onGenerateReport={(data, report) => {
            setCompletionData(data)
            setReportContent(report)
            setPhase('report')
          }}
        />
      </div>
    )}

    {phase === 'report' && counselingSession && completionData && (
      <div className="flex-1 overflow-y-auto p-4">
        <SessionReportEditor
          content={reportContent}
          onChange={setReportContent}
          sessionId={counselingSession.id}
          reservationId={reservation.id}
          completionData={completionData}
          onBack={() => setPhase('completing')}
        />
      </div>
    )}
  </div>
)
```

**Step 3: Commit**

```bash
git add src/components/counseling/session-live/session-live-page.tsx
git commit -m "feat: SessionLivePage 3-Phase 상태 전환 구현"
```

---

### Task 4: SessionCompleteForm에 [AI 보고서 생성] 버튼 추가

**Files:**
- Modify: `src/components/counseling/session-live/session-complete-form.tsx`

**Step 1: Props 인터페이스 확장**

기존 `onCancel`에 더해 `onGenerateReport` 콜백 추가:

```typescript
interface SessionCompleteFormProps {
  sessionId: string
  reservationId: string
  aiSummary: string | null
  notes: NoteData[]
  elapsedMinutes: number
  onCancel: () => void
  onGenerateReport?: (
    data: {
      type: string
      duration: number
      summary: string
      followUpRequired: boolean
      followUpDate?: string
      satisfactionScore?: number
    },
    report: string
  ) => void
}
```

**Step 2: handleGenerateReport 함수 추가**

기존 `handleSubmit`을 유지하면서, [AI 보고서 생성하기] 버튼 핸들러를 추가합니다:

```typescript
const [isGeneratingReport, setIsGeneratingReport] = useState(false)

const handleGenerateReport = async () => {
  if (!summary.trim() || summary.trim().length < 10) {
    toast.error('상담 내용을 10자 이상 입력해주세요.')
    return
  }
  if (followUpRequired && !followUpDate) {
    toast.error('후속 조치 날짜를 선택해주세요.')
    return
  }

  setIsGeneratingReport(true)
  try {
    const result = await generateCounselingReportAction({
      sessionId,
      type: type as 'ACADEMIC' | 'CAREER' | 'PSYCHOLOGICAL' | 'BEHAVIORAL',
      duration,
      summary: summary.trim(),
      topic: /* props에서 받거나 */ '',
      studentName: /* props에서 받거나 */ '',
    })

    if (result.success) {
      const data = {
        type,
        duration,
        summary: summary.trim(),
        followUpRequired,
        ...(followUpDate && { followUpDate }),
        ...(satisfactionScore && { satisfactionScore: Number(satisfactionScore) }),
      }
      onGenerateReport?.(data, result.data)
    } else {
      toast.error(result.error || 'AI 보고서 생성에 실패했습니다.')
    }
  } catch {
    toast.error('AI 보고서 생성 중 오류가 발생했습니다.')
  } finally {
    setIsGeneratingReport(false)
  }
}
```

**Step 3: 버튼 UI에 [AI 보고서 생성하기] 추가**

기존 버튼 영역을 수정합니다:

```tsx
<div className="flex gap-2 pt-2">
  <Button variant="outline" onClick={onCancel} disabled={isSaving || isGeneratingReport} className="flex-1">
    취소
  </Button>
  {onGenerateReport ? (
    <Button
      onClick={handleGenerateReport}
      disabled={isGeneratingReport}
      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
    >
      {isGeneratingReport ? (
        <>
          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          AI 보고서 생성 중...
        </>
      ) : (
        <>
          <Sparkles className="h-4 w-4 mr-1" />
          AI 보고서 생성하기
        </>
      )}
    </Button>
  ) : (
    <Button
      onClick={handleSubmit}
      disabled={isSaving}
      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
    >
      {isSaving ? '처리 중...' : '상담 완료 및 저장'}
    </Button>
  )}
</div>
```

**주의:** `topic`과 `studentName`을 props로 전달받아야 합니다. `SessionCompleteFormProps`에 추가하거나, 부모에서 `generateCounselingReportAction`을 호출하는 방식으로 조정할 수 있습니다. 구현 시 더 깔끔한 방식을 선택합니다.

**Step 4: Commit**

```bash
git add src/components/counseling/session-live/session-complete-form.tsx
git commit -m "feat: 완료 폼에 AI 보고서 생성 버튼 추가"
```

---

### Task 5: SessionReportEditor 컴포넌트 생성

**Files:**
- Create: `src/components/counseling/session-live/session-report-editor.tsx`

**Step 1: SessionReportEditor 생성**

기존 Wizard의 `MarkdownEditor` 패턴을 참고하되, 이 컴포넌트에 맞게 구현합니다:

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { MarkdownRenderer } from '@/components/ui/markdown-renderer'
import { Loader2, RotateCcw, Check, Pencil, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { completeSessionAction } from '@/lib/actions/counseling/session-live'
import { generateCounselingReportAction } from '@/lib/actions/counseling/report-generation'

interface SessionReportEditorProps {
  content: string
  onChange: (content: string) => void
  sessionId: string
  reservationId: string
  completionData: {
    type: string
    duration: number
    summary: string
    followUpRequired: boolean
    followUpDate?: string
    satisfactionScore?: number
  }
  onBack: () => void
}

export function SessionReportEditor({
  content,
  onChange,
  sessionId,
  reservationId,
  completionData,
  onBack,
}: SessionReportEditorProps) {
  const router = useRouter()
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('preview')
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [isFinalizing, setIsFinalizing] = useState(false)

  // 재생성
  const handleRegenerate = async () => {
    setIsRegenerating(true)
    try {
      const result = await generateCounselingReportAction({
        sessionId,
        type: completionData.type as 'ACADEMIC' | 'CAREER' | 'PSYCHOLOGICAL' | 'BEHAVIORAL',
        duration: completionData.duration,
        summary: completionData.summary,
      })

      if (result.success) {
        onChange(result.data)
        toast.success('보고서가 재생성되었습니다.')
      } else {
        toast.error(result.error || '재생성에 실패했습니다.')
      }
    } catch {
      toast.error('재생성 중 오류가 발생했습니다.')
    } finally {
      setIsRegenerating(false)
    }
  }

  // 최종 확정
  const handleFinalize = async () => {
    if (!content.trim()) {
      toast.error('보고서 내용이 비어있습니다.')
      return
    }

    setIsFinalizing(true)
    try {
      // 기존 aiSummary에 보고서 섹션 추가하는 대신, 보고서를 aiSummary에 포함
      const result = await completeSessionAction({
        sessionId,
        reservationId,
        type: completionData.type as 'ACADEMIC' | 'CAREER' | 'PSYCHOLOGICAL' | 'BEHAVIORAL',
        duration: completionData.duration,
        summary: completionData.summary,
        aiSummary: content, // AI 보고서를 aiSummary에 저장
        followUpRequired: completionData.followUpRequired,
        ...(completionData.followUpDate && { followUpDate: completionData.followUpDate }),
        ...(completionData.satisfactionScore && { satisfactionScore: completionData.satisfactionScore }),
      })

      if (result.success) {
        toast.success('상담 보고서가 확정되었습니다.')
        router.push('/counseling')
      } else {
        toast.error(result.error || '상담 완료 처리에 실패했습니다.')
      }
    } catch {
      toast.error('처리 중 오류가 발생했습니다.')
    } finally {
      setIsFinalizing(false)
    }
  }

  return (
    <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">AI 상담 보고서</h3>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode('edit')}
            className={cn(viewMode === 'edit' && 'bg-muted')}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode('preview')}
            className={cn(viewMode === 'preview' && 'bg-muted')}
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* 보고서 본문 */}
      <div className="border rounded-lg overflow-hidden">
        {viewMode === 'edit' ? (
          <textarea
            className="w-full min-h-[400px] p-4 text-sm font-mono resize-none border-0 focus:outline-none bg-background"
            value={content}
            onChange={(e) => onChange(e.target.value)}
          />
        ) : (
          <div className="p-4 min-h-[400px] max-h-[60vh] overflow-y-auto">
            <MarkdownRenderer content={content} />
          </div>
        )}
      </div>

      {/* 액션 버튼 */}
      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack} disabled={isFinalizing}>
          이전 단계
        </Button>
        <Button
          variant="outline"
          onClick={handleRegenerate}
          disabled={isRegenerating || isFinalizing}
        >
          {isRegenerating ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <RotateCcw className="h-4 w-4 mr-1" />
          )}
          재생성
        </Button>
        <Button
          onClick={handleFinalize}
          disabled={isFinalizing || !content.trim()}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
        >
          {isFinalizing ? (
            <>
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              확정 중...
            </>
          ) : (
            <>
              <Check className="h-4 w-4 mr-1" />
              보고서 확정
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/counseling/session-live/session-report-editor.tsx
git commit -m "feat: 상담 보고서 편집/확정 컴포넌트 추가"
```

---

### Task 6: 통합 테스트 및 조정

**Step 1: 타입 에러 확인**

```bash
pnpm typecheck
```

**Step 2: 빌드 확인**

```bash
pnpm build
```

**Step 3: 발견되는 문제 수정**

- Prisma 관계 조회 이슈 (CounselingSession → reservation)
- import 경로 오류
- Props 타입 불일치
- `generateCounselingReportAction` input schema 조정

**Step 4: 최종 커밋**

```bash
git add -A
git commit -m "fix: 상담 보고서 흐름 통합 조정"
```

---

### Task 7: 상담 이력에서 보고서 조회 확인

**Files:**
- Check: `src/components/counseling/counseling-history-content.tsx`
- Check: `src/components/counseling/reservation-detail-dialog.tsx`

**Step 1: COMPLETED 상태 예약의 보고서 표시 확인**

기존 `DetailReadView`에서 `aiSummary`를 `parseAiSummary()`로 파싱합니다.
보고서가 확정되면 `aiSummary`에 보고서가 저장되므로, 기존 3탭(분석/시나리오/학부모) 구조와 충돌 가능성을 확인합니다.

설계 결정: 완료 시 `aiSummary`를 보고서로 **대체**하므로, COMPLETED 상태에서는 보고서만 표시하는 것이 자연스럽습니다. 필요 시 원본 자료를 별도 필드에 보존할지 결정합니다.

**Step 2: 필요 시 상담 이력 UI 조정**

COMPLETED 상태의 예약 상세에서:
- Wizard 생성 자료(분석/시나리오/학부모) → 탭 표시
- 종합 보고서 → 추가 탭 또는 별도 섹션

구현 시 최소한의 변경으로 처리합니다.

**Step 3: Commit (변경 있을 경우)**

```bash
git add -A
git commit -m "feat: 상담 이력에서 종합 보고서 표시"
```

---

## 의존성 관계

```
Task 1 (프롬프트 빌더) ← Task 2 (Server Action)
Task 2 ← Task 4 (완료 폼 수정)
Task 3 (Phase 상태) ← Task 5 (ReportEditor)
Task 4 + Task 5 ← Task 6 (통합)
Task 6 ← Task 7 (이력 확인)
```

## 참고 파일

- `src/features/ai-engine/prompts/counseling-scenario.ts` — 프롬프트 빌더 패턴
- `src/lib/actions/counseling/scenario-generation.ts` — Server Action 패턴
- `src/components/counseling/wizard/markdown-editor.tsx` — 에디터 UI 패턴
- `src/lib/errors/action-result.ts` — ok/fail 패턴
- `src/lib/validations/session-notes.ts` — Zod 스키마
