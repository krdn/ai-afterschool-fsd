# AI 상담 시나리오 생성 기능 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 예약 생성 시 4단계 위자드를 통해 학생 분석 보고서, 상담 시나리오, 학부모 공유용 문서를 AI로 생성하고 승인하여 저장하는 기능 구현

**Architecture:** 기존 `ReservationForm`을 `ReservationWizard`로 교체하는 스텝 위자드 패턴. 각 스텝의 AI 생성은 독립 Server Action으로 처리하며, 기존 `generateWithProvider` 라우터와 `UnifiedPersonalityData` 조회를 재활용한다. 최종 제출 시 트랜잭션으로 예약 + CounselingSession을 일괄 생성한다.

**Tech Stack:** Next.js 15 App Router, react-hook-form, react-day-picker v9, react-markdown v10 (remark-gfm, rehype-highlight), Prisma, Vercel AI SDK

**설계 문서:** `docs/plans/2026-02-26-reservation-ai-scenario-design.md`

---

## Task 1: AI 프롬프트 빌더 3종 작성

**Files:**
- Create: `src/features/ai-engine/prompts/counseling-scenario.ts`

**Step 1: buildAnalysisReportPrompt 작성**

기존 `counseling.ts`의 `buildCounselingSummaryPrompt` 패턴을 따른다. 동일한 `UnifiedPersonalityData` 타입을 re-export한다.

```typescript
// src/features/ai-engine/prompts/counseling-scenario.ts
import type { UnifiedPersonalityData } from './counseling'

export interface AnalysisReportPromptParams {
  studentName: string
  school: string
  grade: number
  topic: string
  personality: UnifiedPersonalityData | null
  previousSessions: Array<{ summary: string; sessionDate: Date; type: string }>
  gradeHistory: Array<{ subject: string; score: number; testDate: Date }>
}

export function buildAnalysisReportPrompt(params: AnalysisReportPromptParams): string {
  const { studentName, school, grade, topic, personality, previousSessions, gradeHistory } = params

  const typeMap: Record<string, string> = {
    ACADEMIC: '학업', CAREER: '진로', PSYCHOLOGICAL: '심리', BEHAVIORAL: '행동'
  }

  // 성향 섹션 조립
  let personalitySection = '성향 분석 데이터가 없습니다.'
  if (personality) {
    const parts: string[] = []
    if (personality.mbti?.result?.mbtiType) parts.push(`- MBTI: ${personality.mbti.result.mbtiType}`)
    if (personality.saju?.interpretation) parts.push(`- 사주 해석: ${personality.saju.interpretation.slice(0, 200)}`)
    if (personality.name?.interpretation) parts.push(`- 성명학: ${personality.name.interpretation.slice(0, 200)}`)
    if (personality.face?.result?.personalityTraits) parts.push(`- 관상 특성: ${JSON.stringify(personality.face.result.personalityTraits).slice(0, 200)}`)
    if (personality.palm?.result?.personalityTraits) parts.push(`- 손금 특성: ${JSON.stringify(personality.palm.result.personalityTraits).slice(0, 200)}`)
    if (parts.length > 0) personalitySection = parts.join('\n')
  }

  // 이전 상담 섹션
  let historySection = '이전 상담 이력이 없습니다. (첫 상담)'
  if (previousSessions.length > 0) {
    historySection = previousSessions.map((s, i) => {
      const dateStr = new Date(s.sessionDate).toLocaleDateString('ko-KR')
      return `${i + 1}. [${dateStr}] ${typeMap[s.type] || s.type} - ${s.summary.slice(0, 100)}`
    }).join('\n')
  }

  // 성적 섹션
  let gradeSection = '성적 데이터가 없습니다.'
  if (gradeHistory.length > 0) {
    gradeSection = gradeHistory.slice(-10).map(g => {
      const dateStr = new Date(g.testDate).toLocaleDateString('ko-KR')
      return `- ${g.subject}: ${g.score}점 (${dateStr})`
    }).join('\n')
  }

  return `너는 학생 상담 전문 교육 컨설턴트야. 아래 학생 정보를 분석하여 상담 준비 보고서를 작성해줘.

## 학생 기본 정보
- 이름: ${studentName}
- 학교: ${school} ${grade}학년
- 이번 상담 주제: ${topic}

## 학생 성향 분석 데이터
${personalitySection}

## 이전 상담 이력
${historySection}

## 최근 성적
${gradeSection}

다음 형식으로 마크다운 보고서를 작성해줘:

### 학생 성향 종합
[5가지 분석 기반 핵심 특성을 3-4줄로 종합]

### 학업 현황
[성적 추이와 강점/약점 분석]

### 상담 이력 패턴
[이전 상담에서 반복되는 주제, 진전 사항 분석]

### 이번 상담 연관성
[상담 주제 "${topic}"와 학생 특성의 접점, 주의 포인트]`.trim()
}
```

**Step 2: buildScenarioPrompt 작성**

같은 파일에 추가:

```typescript
export interface ScenarioPromptParams {
  studentName: string
  topic: string
  approvedReport: string
  personalitySummary: string | null
}

export function buildScenarioPrompt(params: ScenarioPromptParams): string {
  const { studentName, topic, approvedReport, personalitySummary } = params

  const summarySection = personalitySummary
    ? `## 학생 핵심 성향\n${personalitySummary}`
    : ''

  return `너는 학생 상담 시나리오 설계 전문가야. 아래 분석 보고서를 기반으로 상담 시나리오를 작성해줘.

## 학생: ${studentName}
## 상담 주제: ${topic}

${summarySection}

## 분석 보고서 (교사 승인)
${approvedReport}

다음 형식으로 30분 상담 시나리오를 마크다운으로 작성해줘:

### 도입 (5분)
- 라포 형성 방법 (학생 성향 고려)
- 첫 질문 예시 2-3개

### 본론 (20분)
- 핵심 탐색 질문 3-5개
- 각 질문별 예상 학생 반응 (긍정/부정/회피)
- 반응별 대응 전략

### 마무리 (5분)
- 합의사항 정리 가이드
- 후속 조치 제안
- 다음 상담 연결 포인트`.trim()
}
```

**Step 3: buildParentSummaryPrompt 작성**

```typescript
export interface ParentSummaryPromptParams {
  studentName: string
  topic: string
  scheduledAt: string
  approvedScenario: string
}

export function buildParentSummaryPrompt(params: ParentSummaryPromptParams): string {
  const { studentName, topic, scheduledAt, approvedScenario } = params

  return `너는 학부모 커뮤니케이션 전문가야. 아래 상담 시나리오를 참고하여 학부모에게 보낼 상담 안내 메시지를 작성해줘.

## 학생: ${studentName}
## 상담 주제: ${topic}
## 상담 일시: ${scheduledAt}

## 참고 시나리오 (교사 승인)
${approvedScenario}

다음 형식으로 작성해줘. 반드시 학부모 존칭을 사용하고, 학생의 심리 분석/성격 진단/사주/관상 등 민감 정보는 절대 포함하지 마.

안녕하세요, ${studentName} 학부모님.

[상담 목적 안내 — 1-2문장]

■ 상담 일시: ${scheduledAt}
■ 상담 주제: ${topic}
■ 준비 요청사항:
  - [가정에서 관찰된 점이 있다면 메모해 주세요]
  - [학부모님의 의견이나 희망사항을 정리해 주세요]

[마무리 인사]`.trim()
}
```

**Step 4: 커밋**

```bash
git add src/features/ai-engine/prompts/counseling-scenario.ts
git commit -m "feat: AI 상담 시나리오 프롬프트 빌더 3종 추가"
```

---

## Task 2: FeatureMapping 시드 데이터 추가

**Files:**
- Modify: `src/lib/db/lib/db/seed/feature-mappings.ts`

**Step 1: DEFAULT_FEATURE_MAPPINGS 배열에 3개 featureType 추가**

기존 `counseling_suggest` 패턴을 따른다. 파일에서 `DEFAULT_FEATURE_MAPPINGS` 배열을 찾아 끝에 추가:

```typescript
// counseling_analysis — 학생 분석 보고서
{
  featureType: 'counseling_analysis',
  rules: [
    { matchMode: 'auto_tag', requiredTags: ['balanced'], excludedTags: [], priority: 1, fallbackMode: 'any_available' },
  ],
},
// counseling_scenario — 상담 시나리오
{
  featureType: 'counseling_scenario',
  rules: [
    { matchMode: 'auto_tag', requiredTags: ['balanced'], excludedTags: [], priority: 1, fallbackMode: 'any_available' },
  ],
},
// counseling_parent — 학부모 공유용
{
  featureType: 'counseling_parent',
  rules: [
    { matchMode: 'auto_tag', requiredTags: ['fast'], excludedTags: [], priority: 1, fallbackMode: 'any_available' },
    { matchMode: 'auto_tag', requiredTags: ['balanced'], excludedTags: [], priority: 2, fallbackMode: 'any_available' },
  ],
},
```

**Step 2: 시드 실행하여 DB에 반영**

```bash
pnpm prisma db seed
```

**Step 3: 커밋**

```bash
git add src/lib/db/lib/db/seed/feature-mappings.ts
git commit -m "feat: 상담 시나리오 featureType 3종 시드 추가"
```

---

## Task 3: 학생 인사이트 데이터 조회 Server Action 작성

**Files:**
- Create: `src/lib/actions/counseling/student-insight.ts`

**Step 1: getStudentInsightAction 작성**

기존 `getStudentAISupportDataAction` (in `ai.ts`) 패턴을 따른다.

```typescript
// src/lib/actions/counseling/student-insight.ts
'use server'

import { z } from 'zod'
import { verifySession } from '@/lib/dal'
import { ok, fail, type ActionResult } from '@/lib/errors/action-result'
import { db } from '@/lib/db/client'
import { getUnifiedPersonalityData } from '@/features/analysis'
import { getGradeHistory } from '@/lib/db/common/performance'
import type { UnifiedPersonalityData } from '@/features/ai-engine/prompts/counseling'

export interface StudentInsightData {
  studentName: string
  school: string
  grade: number
  personalitySummary: string | null
  personalityData: UnifiedPersonalityData | null
  counselingHistory: Array<{
    id: string
    summary: string
    sessionDate: Date
    type: string
    duration: number
    teacherName: string
  }>
  gradeHistory: Array<{
    subject: string
    score: number
    testDate: Date
    gradeType: string
  }>
}

const inputSchema = z.string().min(1, '학생 ID가 필요합니다')

export async function getStudentInsightAction(
  studentId: string
): Promise<ActionResult<StudentInsightData>> {
  const session = await verifySession()
  if (!session) return fail('인증이 필요합니다.')

  const parsed = inputSchema.safeParse(studentId)
  if (!parsed.success) return fail('잘못된 학생 ID입니다.')

  try {
    const [student, personalityData, grades, sessions] = await Promise.all([
      db.student.findFirst({
        where: { id: studentId },
        select: {
          name: true,
          school: true,
          grade: true,
          personalitySummary: { select: { coreTraits: true } },
        },
      }),
      getUnifiedPersonalityData(studentId, session.userId),
      getGradeHistory(studentId),
      db.counselingSession.findMany({
        where: { studentId },
        orderBy: { sessionDate: 'desc' },
        take: 5,
        select: {
          id: true,
          summary: true,
          sessionDate: true,
          type: true,
          duration: true,
          teacher: { select: { name: true } },
        },
      }),
    ])

    if (!student) return fail('학생을 찾을 수 없습니다.')

    return ok({
      studentName: student.name,
      school: student.school,
      grade: student.grade,
      personalitySummary: student.personalitySummary?.coreTraits ?? null,
      personalityData,
      counselingHistory: sessions.map(s => ({
        id: s.id,
        summary: s.summary,
        sessionDate: s.sessionDate,
        type: s.type,
        duration: s.duration,
        teacherName: s.teacher.name,
      })),
      gradeHistory: grades.map(g => ({
        subject: g.subject,
        score: g.score,
        testDate: g.testDate,
        gradeType: g.gradeType,
      })),
    })
  } catch (error) {
    console.error('학생 인사이트 조회 실패:', error)
    return fail('학생 정보를 불러오는데 실패했습니다.')
  }
}
```

**Step 2: 커밋**

```bash
git add src/lib/actions/counseling/student-insight.ts
git commit -m "feat: 학생 인사이트 데이터 조회 Server Action 추가"
```

---

## Task 4: AI 문서 생성 Server Actions 3종 작성

**Files:**
- Create: `src/lib/actions/counseling/scenario-generation.ts`

**Step 1: 3개 Server Action 작성**

기존 `generateCounselingSummaryFromContentAction` (in `ai.ts`) 패턴을 따른다.

```typescript
// src/lib/actions/counseling/scenario-generation.ts
'use server'

import { z } from 'zod'
import { verifySession } from '@/lib/dal'
import { ok, fail, type ActionResult } from '@/lib/errors/action-result'
import { generateWithProvider } from '@/features/ai-engine/universal-router'
import { getUnifiedPersonalityData } from '@/features/analysis'
import { db } from '@/lib/db/client'
import {
  buildAnalysisReportPrompt,
  buildScenarioPrompt,
  buildParentSummaryPrompt,
} from '@/features/ai-engine/prompts/counseling-scenario'

// --- 1. 분석 보고서 생성 ---
const analysisInputSchema = z.object({
  studentId: z.string().min(1),
  topic: z.string().min(2).max(200),
})

export async function generateAnalysisReportAction(
  input: z.infer<typeof analysisInputSchema>
): Promise<ActionResult<string>> {
  const session = await verifySession()
  if (!session) return fail('인증이 필요합니다.')

  const parsed = analysisInputSchema.safeParse(input)
  if (!parsed.success) return fail('입력값이 올바르지 않습니다.')

  const { studentId, topic } = parsed.data

  try {
    const [student, personalityData, sessions, grades] = await Promise.all([
      db.student.findFirst({
        where: { id: studentId },
        select: { name: true, school: true, grade: true },
      }),
      getUnifiedPersonalityData(studentId, session.userId),
      db.counselingSession.findMany({
        where: { studentId },
        orderBy: { sessionDate: 'desc' },
        take: 5,
        select: { summary: true, sessionDate: true, type: true },
      }),
      db.gradeHistory.findMany({
        where: { studentId },
        orderBy: { testDate: 'desc' },
        take: 10,
        select: { subject: true, score: true, testDate: true },
      }),
    ])

    if (!student) return fail('학생을 찾을 수 없습니다.')

    const prompt = buildAnalysisReportPrompt({
      studentName: student.name,
      school: student.school,
      grade: student.grade,
      topic,
      personality: personalityData,
      previousSessions: sessions,
      gradeHistory: grades,
    })

    const result = await generateWithProvider({
      prompt,
      featureType: 'counseling_analysis',
      maxOutputTokens: 1000,
      temperature: 0.3,
    })

    if (!result.text) return fail('AI 응답이 비어있습니다. 다시 시도해주세요.')
    return ok(result.text)
  } catch (error) {
    console.error('분석 보고서 생성 실패:', error)
    return fail('분석 보고서 생성에 실패했습니다. 다시 시도해주세요.')
  }
}

// --- 2. 상담 시나리오 생성 ---
const scenarioInputSchema = z.object({
  studentId: z.string().min(1),
  topic: z.string().min(2),
  approvedReport: z.string().min(10),
})

export async function generateScenarioAction(
  input: z.infer<typeof scenarioInputSchema>
): Promise<ActionResult<string>> {
  const session = await verifySession()
  if (!session) return fail('인증이 필요합니다.')

  const parsed = scenarioInputSchema.safeParse(input)
  if (!parsed.success) return fail('입력값이 올바르지 않습니다.')

  const { studentId, topic, approvedReport } = parsed.data

  try {
    const student = await db.student.findFirst({
      where: { id: studentId },
      select: {
        name: true,
        personalitySummary: { select: { coreTraits: true } },
      },
    })

    if (!student) return fail('학생을 찾을 수 없습니다.')

    const prompt = buildScenarioPrompt({
      studentName: student.name,
      topic,
      approvedReport,
      personalitySummary: student.personalitySummary?.coreTraits ?? null,
    })

    const result = await generateWithProvider({
      prompt,
      featureType: 'counseling_scenario',
      maxOutputTokens: 1500,
      temperature: 0.5,
    })

    if (!result.text) return fail('AI 응답이 비어있습니다. 다시 시도해주세요.')
    return ok(result.text)
  } catch (error) {
    console.error('상담 시나리오 생성 실패:', error)
    return fail('상담 시나리오 생성에 실패했습니다. 다시 시도해주세요.')
  }
}

// --- 3. 학부모 공유용 생성 ---
const parentInputSchema = z.object({
  studentName: z.string().min(1),
  topic: z.string().min(2),
  scheduledAt: z.string().min(1),
  approvedScenario: z.string().min(10),
})

export async function generateParentSummaryAction(
  input: z.infer<typeof parentInputSchema>
): Promise<ActionResult<string>> {
  const session = await verifySession()
  if (!session) return fail('인증이 필요합니다.')

  const parsed = parentInputSchema.safeParse(input)
  if (!parsed.success) return fail('입력값이 올바르지 않습니다.')

  try {
    const prompt = buildParentSummaryPrompt(parsed.data)

    const result = await generateWithProvider({
      prompt,
      featureType: 'counseling_parent',
      maxOutputTokens: 500,
      temperature: 0.3,
    })

    if (!result.text) return fail('AI 응답이 비어있습니다. 다시 시도해주세요.')
    return ok(result.text)
  } catch (error) {
    console.error('학부모 공유용 생성 실패:', error)
    return fail('학부모 공유용 문서 생성에 실패했습니다. 다시 시도해주세요.')
  }
}
```

**Step 2: 커밋**

```bash
git add src/lib/actions/counseling/scenario-generation.ts
git commit -m "feat: AI 문서 생성 Server Actions 3종 추가"
```

---

## Task 5: 예약+시나리오 일괄 저장 Server Action 작성

**Files:**
- Create: `src/lib/actions/counseling/reservation-with-scenario.ts`

**Step 1: createReservationWithScenarioAction 작성**

기존 `createReservationAction`의 인증/RBAC/트랜잭션 패턴을 따른다.

```typescript
// src/lib/actions/counseling/reservation-with-scenario.ts
'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { verifySession } from '@/lib/dal'
import { getRBACPrisma } from '@/lib/db/common/rbac'
import { ok, fail, type ActionResult } from '@/lib/errors/action-result'
import { db } from '@/lib/db/client'

const inputSchema = z.object({
  scheduledAt: z.string().min(1),
  studentId: z.string().min(1),
  parentId: z.string().min(1),
  topic: z.string().min(2).max(200),
  analysisReport: z.string().optional(),
  scenario: z.string().optional(),
  parentSummary: z.string().optional(),
})

export async function createReservationWithScenarioAction(
  input: z.infer<typeof inputSchema>
): Promise<ActionResult<{ reservationId: string }>> {
  const session = await verifySession()
  if (!session) return fail('인증이 필요합니다.')

  const parsed = inputSchema.safeParse(input)
  if (!parsed.success) return fail('입력값이 올바르지 않습니다.')

  const { scheduledAt, studentId, parentId, topic, analysisReport, scenario, parentSummary } = parsed.data

  // RBAC: 학생 접근 확인
  const rbacDb = getRBACPrisma(session)
  const student = await rbacDb.student.findFirst({
    where: { id: studentId },
    select: { id: true },
  })
  if (!student) return fail('해당 학생에 대한 권한이 없습니다.')

  // 학부모 소속 확인
  const parent = await db.parent.findFirst({
    where: { id: parentId, students: { some: { id: studentId } } },
    select: { id: true },
  })
  if (!parent) return fail('해당 학부모를 찾을 수 없습니다.')

  try {
    // aiSummary 합본
    const hasAiDocs = analysisReport || scenario || parentSummary
    let aiSummary: string | null = null
    if (hasAiDocs) {
      const parts: string[] = []
      if (analysisReport) parts.push(`## 학생 분석 보고서\n\n${analysisReport}`)
      if (scenario) parts.push(`## 상담 시나리오\n\n${scenario}`)
      if (parentSummary) parts.push(`## 학부모 공유용\n\n${parentSummary}`)
      aiSummary = parts.join('\n\n---\n\n')
    }

    const scheduledDate = new Date(scheduledAt)

    // 트랜잭션: 예약 + CounselingSession 일괄 생성
    const result = await db.$transaction(async (tx) => {
      // 시간 충돌 확인 (30분 슬롯)
      const slotStart = new Date(scheduledDate)
      const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000)

      const conflict = await tx.parentCounselingReservation.findFirst({
        where: {
          teacherId: session.userId,
          status: 'SCHEDULED',
          scheduledAt: { gte: slotStart, lt: slotEnd },
        },
      })
      if (conflict) throw new Error('해당 시간에 이미 예약이 있습니다.')

      // CounselingSession 사전 생성 (AI 문서가 있는 경우)
      let counselingSessionId: string | null = null
      if (aiSummary) {
        const counselingSession = await tx.counselingSession.create({
          data: {
            studentId,
            teacherId: session.userId,
            sessionDate: scheduledDate,
            duration: 30,
            type: 'ACADEMIC',
            summary: '',
            aiSummary,
          },
        })
        counselingSessionId = counselingSession.id
      }

      // 예약 생성
      const reservation = await tx.parentCounselingReservation.create({
        data: {
          scheduledAt: scheduledDate,
          studentId,
          teacherId: session.userId,
          parentId,
          topic,
          status: 'SCHEDULED',
          ...(counselingSessionId ? { counselingSessionId } : {}),
        },
      })

      return { reservationId: reservation.id }
    })

    revalidatePath('/counseling')
    revalidatePath(`/students/${studentId}`)
    return ok(result)
  } catch (error) {
    if (error instanceof Error && error.message.includes('이미 예약')) {
      return fail(error.message)
    }
    console.error('예약 생성 실패:', error)
    return fail('예약 생성에 실패했습니다.')
  }
}
```

**Step 2: 커밋**

```bash
git add src/lib/actions/counseling/reservation-with-scenario.ts
git commit -m "feat: 예약+시나리오 일괄 저장 Server Action 추가"
```

---

## Task 6: WizardStepper UI 컴포넌트 작성

**Files:**
- Create: `src/components/counseling/wizard/wizard-stepper.tsx`

**Step 1: 스텝 진행 표시줄 작성**

```typescript
// src/components/counseling/wizard/wizard-stepper.tsx
'use client'

import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

export type WizardStep = 1 | 2 | 3 | 4

interface WizardStepperProps {
  currentStep: WizardStep
  completedSteps: Set<WizardStep>
}

const STEPS = [
  { step: 1 as const, label: '예약 정보' },
  { step: 2 as const, label: '학생 인사이트' },
  { step: 3 as const, label: '상담 시나리오' },
  { step: 4 as const, label: '학부모 공유' },
]

export function WizardStepper({ currentStep, completedSteps }: WizardStepperProps) {
  return (
    <div className="flex items-center justify-between mb-8">
      {STEPS.map(({ step, label }, index) => {
        const isCompleted = completedSteps.has(step)
        const isCurrent = currentStep === step
        const isLast = index === STEPS.length - 1

        return (
          <div key={step} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-colors',
                  isCompleted && 'bg-primary border-primary text-primary-foreground',
                  isCurrent && !isCompleted && 'border-primary text-primary bg-primary/10',
                  !isCurrent && !isCompleted && 'border-muted-foreground/30 text-muted-foreground'
                )}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : step}
              </div>
              <span
                className={cn(
                  'text-xs mt-1 whitespace-nowrap',
                  isCurrent ? 'text-primary font-medium' : 'text-muted-foreground'
                )}
              >
                {label}
              </span>
            </div>
            {!isLast && (
              <div
                className={cn(
                  'flex-1 h-0.5 mx-2 mt-[-1rem]',
                  isCompleted ? 'bg-primary' : 'bg-muted-foreground/20'
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
```

**Step 2: 커밋**

```bash
git add src/components/counseling/wizard/wizard-stepper.tsx
git commit -m "feat: WizardStepper 진행 표시줄 컴포넌트 추가"
```

---

## Task 7: MarkdownEditor 공통 컴포넌트 작성

**Files:**
- Create: `src/components/counseling/wizard/markdown-editor.tsx`

**Step 1: 편집/미리보기 토글 에디터 작성**

Step 2, 3, 4에서 공통으로 사용하는 마크다운 편집기.

```typescript
// src/components/counseling/wizard/markdown-editor.tsx
'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Eye, Pencil, RotateCcw, Check, Loader2, Copy } from 'lucide-react'
import { toast } from 'sonner'

interface MarkdownEditorProps {
  title: string
  content: string
  onChange: (content: string) => void
  onApprove: () => void
  onRegenerate: () => void
  isGenerating: boolean
  isApproved: boolean
  showCopyButton?: boolean
  placeholder?: string
}

export function MarkdownEditor({
  title,
  content,
  onChange,
  onApprove,
  onRegenerate,
  isGenerating,
  isApproved,
  showCopyButton = false,
  placeholder = 'AI가 생성한 내용이 여기에 표시됩니다...',
}: MarkdownEditorProps) {
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('preview')

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content)
    toast.success('클립보드에 복사되었습니다.')
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b">
        <h4 className="text-sm font-medium">{title}</h4>
        <div className="flex items-center gap-1">
          {showCopyButton && content && (
            <Button variant="ghost" size="sm" onClick={handleCopy}>
              <Copy className="h-3.5 w-3.5" />
            </Button>
          )}
          {content && (
            <>
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
            </>
          )}
        </div>
      </div>

      {/* 본문 */}
      <div className="min-h-[200px] max-h-[400px] overflow-y-auto">
        {isGenerating ? (
          <div className="flex items-center justify-center h-[200px]">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">AI가 문서를 생성하고 있습니다...</span>
          </div>
        ) : !content ? (
          <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
            {placeholder}
          </div>
        ) : viewMode === 'edit' ? (
          <textarea
            className="w-full h-full min-h-[200px] p-4 text-sm font-mono resize-none border-0 focus:outline-none"
            value={content}
            onChange={(e) => onChange(e.target.value)}
            disabled={isApproved}
          />
        ) : (
          <div className="p-4 prose prose-sm max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        )}
      </div>

      {/* 액션 바 */}
      {content && (
        <div className="flex items-center justify-end gap-2 px-4 py-2 border-t bg-muted/30">
          <Button
            variant="outline"
            size="sm"
            onClick={onRegenerate}
            disabled={isGenerating || isApproved}
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            재생성
          </Button>
          <Button
            size="sm"
            onClick={onApprove}
            disabled={isGenerating || isApproved}
            className={cn(isApproved && 'bg-green-600 hover:bg-green-600')}
          >
            <Check className="h-3.5 w-3.5 mr-1" />
            {isApproved ? '승인됨' : '승인'}
          </Button>
        </div>
      )}
    </div>
  )
}
```

**Step 2: 커밋**

```bash
git add src/components/counseling/wizard/markdown-editor.tsx
git commit -m "feat: MarkdownEditor 공통 편집/미리보기 컴포넌트 추가"
```

---

## Task 8: Step 1 — ReservationInfoStep 컴포넌트 작성

**Files:**
- Create: `src/components/counseling/wizard/reservation-info-step.tsx`

**Step 1: 컴팩트 달력 + 시간슬롯 + 학생/학부모/주제 폼 작성**

기존 `ReservationForm`의 로직을 추출하여 사용한다. 참고 파일:
- `src/components/counseling/reservation-form.tsx` — 학생 로드, 시간슬롯 로드, 학부모 연동
- `src/components/counseling/reservation-calendar-month.tsx` — 달력 렌더링

핵심 props:
```typescript
interface ReservationInfoStepProps {
  data: {
    selectedDate?: Date
    selectedTime?: string
    selectedStudentId: string
    selectedParentId: string
    topic: string
  }
  onChange: (data: Partial<ReservationInfoStepProps['data']>) => void
  onNext: () => void
}
```

컴포넌트 내부:
- `useEffect` (마운트): `getStudentsAction()` 로 학생 목록 로드
- `useEffect` (날짜 변경): `getReservationsAction()` 로 기예약 슬롯 로드
- 2컬럼 레이아웃: 좌측 DayPicker (컴팩트), 우측 TimeSlotGrid
- 하단: 학생 Select → 학부모 Select (학생.parents 연동) → 상담 주제 Input
- "다음" 버튼: 날짜, 시간, 학생, 주제 모두 입력 시 활성화

**이 컴포넌트는 코드가 100줄 이상이므로 기존 `ReservationForm`에서 로직을 재활용하되, 새 파일로 작성한다.**

**Step 2: 커밋**

```bash
git add src/components/counseling/wizard/reservation-info-step.tsx
git commit -m "feat: Step 1 ReservationInfoStep 컴포넌트 추가"
```

---

## Task 9: Step 2 — StudentInsightStep 컴포넌트 작성

**Files:**
- Create: `src/components/counseling/wizard/student-insight-step.tsx`

**Step 1: 학생 인사이트 표시 + 분석 보고서 생성/편집/승인**

핵심 props:
```typescript
interface StudentInsightStepProps {
  studentId: string
  topic: string
  analysisReport: string
  isReportApproved: boolean
  onReportChange: (report: string) => void
  onReportApprove: () => void
  onSkip: () => void
  onBack: () => void
  onNext: () => void
}
```

컴포넌트 내부:
- `useEffect` (마운트): `getStudentInsightAction(studentId)` 호출
- 상단 카드 영역 (2x2 그리드):
  - 성향 요약 카드 (PersonalitySummaryCard 재활용 또는 간단 표시)
  - MBTI/사주/성명학 요약 배지
  - 최근 상담 5건 타임라인 (날짜, 유형, 요약 첫 50자)
  - 성적 추이 (과목별 최근 점수 나열)
- "AI 보완" 버튼 → `generateAnalysisReportAction()` 호출
- MarkdownEditor (보고서 편집/미리보기/승인)
- 하단: "AI 보완 없이 진행" + "이전" + "승인 후 다음"

**Step 2: 커밋**

```bash
git add src/components/counseling/wizard/student-insight-step.tsx
git commit -m "feat: Step 2 StudentInsightStep 컴포넌트 추가"
```

---

## Task 10: Step 3 — ScenarioStep 컴포넌트 작성

**Files:**
- Create: `src/components/counseling/wizard/scenario-step.tsx`

**Step 1: 시나리오 생성/편집/승인**

핵심 props:
```typescript
interface ScenarioStepProps {
  studentId: string
  topic: string
  approvedReport: string
  scenario: string
  isScenarioApproved: boolean
  onScenarioChange: (scenario: string) => void
  onScenarioApprove: () => void
  onBack: () => void
  onNext: () => void
}
```

컴포넌트 내부:
- `useEffect` (마운트): 자동으로 `generateScenarioAction()` 호출 (Step 2 승인 직후)
- MarkdownEditor (시나리오 편집/미리보기/승인)
- 하단: "이전" + "승인 후 다음"

**Step 2: 커밋**

```bash
git add src/components/counseling/wizard/scenario-step.tsx
git commit -m "feat: Step 3 ScenarioStep 컴포넌트 추가"
```

---

## Task 11: Step 4 — ParentSummaryStep 컴포넌트 작성

**Files:**
- Create: `src/components/counseling/wizard/parent-summary-step.tsx`

**Step 1: 학부모 공유용 생성/편집/승인 + 최종 제출**

핵심 props:
```typescript
interface ParentSummaryStepProps {
  studentName: string
  topic: string
  scheduledAt: string
  approvedScenario: string
  parentSummary: string
  isParentSummaryApproved: boolean
  onParentSummaryChange: (summary: string) => void
  onParentSummaryApprove: () => void
  onBack: () => void
  onSubmit: () => void
  isSubmitting: boolean
}
```

컴포넌트 내부:
- `useEffect` (마운트): 자동으로 `generateParentSummaryAction()` 호출
- MarkdownEditor (showCopyButton=true)
- 하단: "이전" + "예약 등록" (최종 제출, isSubmitting 상태 표시)

**Step 2: 커밋**

```bash
git add src/components/counseling/wizard/parent-summary-step.tsx
git commit -m "feat: Step 4 ParentSummaryStep 컴포넌트 추가"
```

---

## Task 12: ReservationWizard 메인 컴포넌트 작성

**Files:**
- Create: `src/components/counseling/wizard/reservation-wizard.tsx`
- Create: `src/components/counseling/wizard/index.ts`

**Step 1: 위자드 상태 머신 + 스텝 라우팅**

```typescript
// src/components/counseling/wizard/reservation-wizard.tsx
'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { WizardStepper, type WizardStep } from './wizard-stepper'
import { ReservationInfoStep } from './reservation-info-step'
import { StudentInsightStep } from './student-insight-step'
import { ScenarioStep } from './scenario-step'
import { ParentSummaryStep } from './parent-summary-step'
import { createReservationWithScenarioAction } from '@/lib/actions/counseling/reservation-with-scenario'

interface ReservationWizardProps {
  onCancel: () => void
  onSuccess: () => void
}

// 위자드 전체 상태
interface WizardState {
  // Step 1
  selectedDate?: Date
  selectedTime?: string
  selectedStudentId: string
  selectedParentId: string
  topic: string
  // Step 2
  analysisReport: string
  isReportApproved: boolean
  // Step 3
  scenario: string
  isScenarioApproved: boolean
  // Step 4
  parentSummary: string
  isParentSummaryApproved: boolean
  // 학생 정보 (Step 2에서 로드)
  studentName: string
}

export function ReservationWizard({ onCancel, onSuccess }: ReservationWizardProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<WizardStep>(1)
  const [completedSteps, setCompletedSteps] = useState<Set<WizardStep>>(new Set())
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [state, setState] = useState<WizardState>({
    selectedStudentId: '',
    selectedParentId: '',
    topic: '',
    analysisReport: '',
    isReportApproved: false,
    scenario: '',
    isScenarioApproved: false,
    parentSummary: '',
    isParentSummaryApproved: false,
    studentName: '',
  })

  // 스텝 완료 마킹 + 다음 스텝 이동
  const completeStep = useCallback((step: WizardStep) => {
    setCompletedSteps(prev => new Set([...prev, step]))
    if (step < 4) setCurrentStep((step + 1) as WizardStep)
  }, [])

  // 이전 스텝 (승인 상태 해제)
  const goBack = useCallback((step: WizardStep) => {
    if (step > 1) {
      setCurrentStep((step - 1) as WizardStep)
      // 이전으로 가면 이후 스텝 승인 해제
      setCompletedSteps(prev => {
        const next = new Set(prev)
        for (let s = step; s <= 4; s++) next.delete(s as WizardStep)
        return next
      })
      setState(prev => ({
        ...prev,
        ...(step === 2 ? { isReportApproved: false } : {}),
        ...(step === 3 ? { isScenarioApproved: false } : {}),
        ...(step === 4 ? { isParentSummaryApproved: false } : {}),
      }))
    }
  }, [])

  // AI 스킵 (Step 2에서 AI 없이 진행)
  const handleSkip = useCallback(() => {
    // Step 1 완료 마킹 후 바로 예약 생성 (AI 문서 없이)
    handleSubmit(true)
  }, [])

  // 최종 제출
  const handleSubmit = useCallback(async (skipAi = false) => {
    if (!state.selectedDate || !state.selectedTime) return
    setIsSubmitting(true)

    try {
      const [hours, minutes] = state.selectedTime.split(':').map(Number)
      const scheduledAt = new Date(state.selectedDate)
      scheduledAt.setHours(hours, minutes, 0, 0)

      const result = await createReservationWithScenarioAction({
        scheduledAt: scheduledAt.toISOString(),
        studentId: state.selectedStudentId,
        parentId: state.selectedParentId,
        topic: state.topic,
        ...(skipAi ? {} : {
          analysisReport: state.analysisReport || undefined,
          scenario: state.scenario || undefined,
          parentSummary: state.parentSummary || undefined,
        }),
      })

      if (result.success) {
        toast.success('예약이 등록되었습니다.')
        onSuccess()
      } else {
        toast.error(result.error || '예약 등록에 실패했습니다.')
        if (result.error?.includes('이미 예약')) {
          setCurrentStep(1)
        }
      }
    } catch (error) {
      toast.error('오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }, [state, onSuccess])

  return (
    <div className="space-y-6">
      <WizardStepper currentStep={currentStep} completedSteps={completedSteps} />

      {currentStep === 1 && (
        <ReservationInfoStep
          data={{
            selectedDate: state.selectedDate,
            selectedTime: state.selectedTime,
            selectedStudentId: state.selectedStudentId,
            selectedParentId: state.selectedParentId,
            topic: state.topic,
          }}
          onChange={(partial) => setState(prev => ({ ...prev, ...partial }))}
          onNext={() => completeStep(1)}
        />
      )}

      {currentStep === 2 && (
        <StudentInsightStep
          studentId={state.selectedStudentId}
          topic={state.topic}
          analysisReport={state.analysisReport}
          isReportApproved={state.isReportApproved}
          onReportChange={(report) => setState(prev => ({ ...prev, analysisReport: report }))}
          onReportApprove={() => {
            setState(prev => ({ ...prev, isReportApproved: true }))
            completeStep(2)
          }}
          onStudentNameLoaded={(name) => setState(prev => ({ ...prev, studentName: name }))}
          onSkip={handleSkip}
          onBack={() => goBack(2)}
          onNext={() => completeStep(2)}
        />
      )}

      {currentStep === 3 && (
        <ScenarioStep
          studentId={state.selectedStudentId}
          topic={state.topic}
          approvedReport={state.analysisReport}
          scenario={state.scenario}
          isScenarioApproved={state.isScenarioApproved}
          onScenarioChange={(scenario) => setState(prev => ({ ...prev, scenario }))}
          onScenarioApprove={() => {
            setState(prev => ({ ...prev, isScenarioApproved: true }))
            completeStep(3)
          }}
          onBack={() => goBack(3)}
          onNext={() => completeStep(3)}
        />
      )}

      {currentStep === 4 && (
        <ParentSummaryStep
          studentName={state.studentName}
          topic={state.topic}
          scheduledAt={state.selectedDate && state.selectedTime
            ? (() => {
                const d = new Date(state.selectedDate)
                return `${d.toLocaleDateString('ko-KR')} ${state.selectedTime}`
              })()
            : ''}
          approvedScenario={state.scenario}
          parentSummary={state.parentSummary}
          isParentSummaryApproved={state.isParentSummaryApproved}
          onParentSummaryChange={(summary) => setState(prev => ({ ...prev, parentSummary: summary }))}
          onParentSummaryApprove={() => setState(prev => ({ ...prev, isParentSummaryApproved: true }))}
          onBack={() => goBack(4)}
          onSubmit={() => handleSubmit(false)}
          isSubmitting={isSubmitting}
        />
      )}

      {/* 취소 버튼 (항상 표시) */}
      <div className="flex justify-start">
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          취소
        </button>
      </div>
    </div>
  )
}
```

**Step 2: index.ts barrel export 작성**

```typescript
// src/components/counseling/wizard/index.ts
export { ReservationWizard } from './reservation-wizard'
```

**Step 3: 커밋**

```bash
git add src/components/counseling/wizard/
git commit -m "feat: ReservationWizard 메인 컴포넌트 및 barrel export 추가"
```

---

## Task 13: counseling-page-tabs.tsx 연동

**Files:**
- Modify: `src/components/counseling/counseling-page-tabs.tsx`

**Step 1: ReservationForm을 ReservationWizard로 교체**

`counseling-page-tabs.tsx`에서 기존 import 변경:
```typescript
// 기존: import { ReservationForm } from "@/components/counseling/reservation-form"
// 변경:
import { ReservationWizard } from "@/components/counseling/wizard"
```

`formView === "form"` 분기에서:
```typescript
// 기존: <ReservationForm onCancel={...} onSuccess={...} />
// 변경:
<ReservationWizard onCancel={...} onSuccess={...} />
```

**Step 2: 커밋**

```bash
git add src/components/counseling/counseling-page-tabs.tsx
git commit -m "feat: 예약 관리 탭에 ReservationWizard 연동"
```

---

## Task 14: 통합 테스트 (브라우저)

**Step 1: 개발 서버에서 전체 흐름 테스트**

playwright-cli로 다음 시나리오를 순차 검증:

1. `/ko/counseling` → 예약 관리 탭 → "새 예약 등록" 클릭
2. Step 1: 날짜 선택, 시간 선택, 학생 선택, 학부모 자동 연동, 주제 입력 → "다음"
3. Step 2: 학생 인사이트 데이터 로드 확인, "AI 보완" 클릭, 보고서 생성 확인, "승인"
4. Step 3: 시나리오 자동 생성 확인, "승인"
5. Step 4: 학부모 공유용 자동 생성 확인, "승인" → "예약 등록"
6. 예약 목록에 새 예약 표시 확인
7. "AI 보완 없이 진행" 경로도 테스트

**Step 2: TypeScript 빌드 검증**

```bash
npx tsc --noEmit --pretty
```

**Step 3: 커밋**

```bash
git add -A
git commit -m "feat: AI 상담 시나리오 생성 기능 통합 완료"
```

---

## 태스크 의존성

```
Task 1 (프롬프트) ─┐
Task 2 (시드)    ──┤
Task 3 (인사이트) ──┼─→ Task 4 (AI Actions) ─→ Task 5 (일괄저장)
                   │
Task 6 (Stepper) ──┤
Task 7 (Editor)  ──┤
                   │
                   ├─→ Task 8 (Step 1) ─┐
                   ├─→ Task 9 (Step 2) ──┤
                   ├─→ Task 10 (Step 3) ─┼─→ Task 12 (Wizard) ─→ Task 13 (연동) ─→ Task 14 (테스트)
                   └─→ Task 11 (Step 4) ─┘
```

병렬 가능: Task 1-3 (백엔드), Task 6-7 (공통 UI) 동시 작업 가능
