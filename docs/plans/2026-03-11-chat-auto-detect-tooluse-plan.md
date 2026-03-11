# AI 채팅 자동 엔티티 감지 + Tool Use 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** AI 채팅에서 @멘션 없이도 자연어로 학생/교사/팀 정보를 질문하면 DB 자동 조회하여 답변하는 기능 구현

**Architecture:** Layer 1(자동 엔티티 감지)으로 system prompt에 데이터 사전 주입 + Layer 2(Tool Use)로 AI가 추가 정보 필요 시 직접 DB 조회. Vercel AI SDK v6의 `streamText` + `tools` + `stopWhen: stepCountIs(3)` 사용. 스트리밍은 `fullStream` → 커스텀 SSE TransformStream으로 text-delta만 클라이언트에 전달.

**Tech Stack:** Vercel AI SDK v6 (`tool`, `streamText`, `stepCountIs`), Zod, Prisma, Next.js API Route

---

## Task 1: Tool 정의 (src/lib/chat/tools.ts)

**Files:**
- Create: `src/lib/chat/tools.ts`
- Test: `src/lib/chat/__tests__/tools.test.ts`

**Step 1: 테스트 파일 생성**

```typescript
// src/lib/chat/__tests__/tools.test.ts
import { describe, it, expect } from 'vitest'

describe('chat tools', () => {
  it('chatTools 객체에 8개 도구가 정의되어 있다', async () => {
    const { createChatTools } = await import('../tools')
    const mockSession = { userId: 'test', role: 'DIRECTOR' as const, teamId: null }
    const tools = createChatTools(mockSession)
    expect(Object.keys(tools)).toHaveLength(8)
  })

  it('각 도구에 description과 inputSchema가 있다', async () => {
    const { createChatTools } = await import('../tools')
    const mockSession = { userId: 'test', role: 'DIRECTOR' as const, teamId: null }
    const tools = createChatTools(mockSession)
    for (const [name, t] of Object.entries(tools)) {
      expect(t.description, `${name} has description`).toBeTruthy()
      expect(t.inputSchema, `${name} has inputSchema`).toBeTruthy()
    }
  })
})
```

**Step 2: 테스트 실행 → 실패 확인**

Run: `pnpm test src/lib/chat/__tests__/tools.test.ts`
Expected: FAIL (모듈 없음)

**Step 3: 8개 도구 구현**

```typescript
// src/lib/chat/tools.ts
import 'server-only'
import { tool } from 'ai'
import { z } from 'zod'
import { db } from '@/lib/db/client'
import type { TeacherRole } from '@/lib/db/common/rbac'

type Session = {
  userId: string
  role: TeacherRole
  teamId: string | null
}

/** RBAC where 조건: DIRECTOR는 전체, 일반 교사는 자기 팀만 */
function studentWhere(session: Session) {
  if (session.role === 'DIRECTOR') return {}
  return { teamId: session.teamId }
}

function teacherWhere(session: Session) {
  if (session.role === 'DIRECTOR') return {}
  return { teamId: session.teamId }
}

/** 세션 기반 RBAC가 적용된 채팅 도구 8개를 생성한다 */
export function createChatTools(session: Session) {
  return {
    searchStudents: tool({
      description: '이름, 학교, 학년으로 학생을 검색합니다. 최대 10건 반환.',
      inputSchema: z.object({
        query: z.string().describe('검색어 (학생 이름, 학교명 등)'),
        school: z.string().optional().describe('학교명 필터'),
        grade: z.number().optional().describe('학년 필터'),
      }),
      execute: async ({ query, school, grade }) => {
        const where: Record<string, unknown> = {
          ...studentWhere(session),
          OR: [
            { name: { contains: query } },
            { school: { contains: query } },
          ],
        }
        if (school) where.school = { contains: school }
        if (grade) where.grade = grade

        const students = await db.student.findMany({
          where,
          select: { id: true, name: true, grade: true, school: true, phone: true },
          take: 10,
          orderBy: { name: 'asc' },
        })
        return { count: students.length, students }
      },
    }),

    getStudentDetail: tool({
      description: '학생 ID로 상세 정보(기본정보, 보호자, 출석률, 목표대학)를 조회합니다.',
      inputSchema: z.object({
        studentId: z.string().describe('학생 ID'),
      }),
      execute: async ({ studentId }) => {
        const student = await db.student.findFirst({
          where: { id: studentId, ...studentWhere(session) },
          select: {
            id: true, name: true, grade: true, school: true,
            phone: true, birthDate: true, bloodType: true,
            targetUniversity: true, targetMajor: true,
            attendanceRate: true, initialGradeLevel: true, nationality: true,
            parents: {
              select: { name: true, phone: true, email: true, relation: true, isPrimary: true },
              orderBy: { isPrimary: 'desc' },
            },
            teacher: { select: { name: true } },
            team: { select: { name: true } },
          },
        })
        if (!student) return { error: '학생을 찾을 수 없거나 접근 권한이 없습니다.' }
        return student
      },
    }),

    searchTeachers: tool({
      description: '이름, 역할로 선생님을 검색합니다.',
      inputSchema: z.object({
        query: z.string().describe('검색어 (선생님 이름)'),
        role: z.string().optional().describe('역할 필터 (DIRECTOR, TEAM_LEADER, TEACHER 등)'),
      }),
      execute: async ({ query, role }) => {
        const where: Record<string, unknown> = {
          ...teacherWhere(session),
          name: { contains: query },
        }
        if (role) where.role = role

        const teachers = await db.teacher.findMany({
          where,
          select: { id: true, name: true, role: true, team: { select: { name: true } } },
          take: 10,
        })
        return { count: teachers.length, teachers }
      },
    }),

    getTeacherDetail: tool({
      description: '선생님 ID로 상세 정보(담당학생 포함)를 조회합니다.',
      inputSchema: z.object({
        teacherId: z.string().describe('선생님 ID'),
      }),
      execute: async ({ teacherId }) => {
        const teacher = await db.teacher.findFirst({
          where: { id: teacherId, ...teacherWhere(session) },
          select: {
            id: true, name: true, role: true, email: true, phone: true,
            team: { select: { name: true } },
            students: { select: { id: true, name: true, grade: true, school: true } },
          },
        })
        if (!teacher) return { error: '선생님을 찾을 수 없거나 접근 권한이 없습니다.' }
        return teacher
      },
    }),

    getTeamInfo: tool({
      description: '팀(학급) ID로 구성원(교사, 학생) 전체를 조회합니다.',
      inputSchema: z.object({
        teamId: z.string().describe('팀 ID'),
      }),
      execute: async ({ teamId }) => {
        if (session.role !== 'DIRECTOR' && teamId !== session.teamId) {
          return { error: '해당 팀에 접근 권한이 없습니다.' }
        }
        const team = await db.team.findUnique({
          where: { id: teamId },
          select: {
            id: true, name: true,
            teachers: { select: { id: true, name: true, role: true } },
            students: { select: { id: true, name: true, grade: true, school: true, phone: true } },
          },
        })
        if (!team) return { error: '팀을 찾을 수 없습니다.' }
        return team
      },
    }),

    getStudentGrades: tool({
      description: '학생의 성적을 조회합니다. 과목별 필터 가능.',
      inputSchema: z.object({
        studentId: z.string().describe('학생 ID'),
        subject: z.string().optional().describe('과목명 필터 (예: 수학, 영어)'),
      }),
      execute: async ({ studentId, subject }) => {
        // RBAC: 학생 접근 권한 확인
        const student = await db.student.findFirst({
          where: { id: studentId, ...studentWhere(session) },
          select: { id: true, name: true },
        })
        if (!student) return { error: '학생을 찾을 수 없거나 접근 권한이 없습니다.' }

        const where: Record<string, unknown> = { studentId }
        if (subject) where.subject = { contains: subject }

        const grades = await db.gradeHistory.findMany({
          where,
          select: {
            subject: true, score: true, maxScore: true, normalizedScore: true,
            testDate: true, gradeType: true, academicYear: true, semester: true,
            classRank: true, gradeRank: true, totalStudents: true, classAverage: true,
          },
          orderBy: { testDate: 'desc' },
          take: 20,
        })
        return { studentName: student.name, count: grades.length, grades }
      },
    }),

    getStudentAnalysis: tool({
      description: '학생의 분석 결과(사주, MBTI, VARK, 별자리, 성격종합 등)를 조회합니다.',
      inputSchema: z.object({
        studentId: z.string().describe('학생 ID'),
        analysisType: z.enum(['saju', 'mbti', 'vark', 'zodiac', 'name', 'face', 'palm', 'personality', 'all'])
          .optional()
          .describe('분석 유형 (생략 시 전체)'),
      }),
      execute: async ({ studentId, analysisType }) => {
        const student = await db.student.findFirst({
          where: { id: studentId, ...studentWhere(session) },
          select: { id: true, name: true },
        })
        if (!student) return { error: '학생을 찾을 수 없거나 접근 권한이 없습니다.' }

        const type = analysisType ?? 'all'
        const result: Record<string, unknown> = { studentName: student.name }

        if (type === 'all' || type === 'saju') {
          result.saju = await db.sajuAnalysis.findFirst({
            where: { subjectType: 'STUDENT', subjectId: studentId },
            select: { interpretation: true, calculatedAt: true },
          })
        }
        if (type === 'all' || type === 'mbti') {
          result.mbti = await db.mbtiAnalysis.findFirst({
            where: { subjectType: 'STUDENT', subjectId: studentId },
            select: { mbtiType: true, interpretation: true },
          })
        }
        if (type === 'all' || type === 'vark') {
          result.vark = await db.varkAnalysis.findFirst({
            where: { studentId },
            select: { varkType: true, interpretation: true },
          })
        }
        if (type === 'all' || type === 'zodiac') {
          result.zodiac = await db.zodiacAnalysis.findFirst({
            where: { studentId },
            select: { zodiacSign: true, zodiacName: true, interpretation: true },
          })
        }
        if (type === 'all' || type === 'name') {
          result.name = await db.nameAnalysis.findFirst({
            where: { subjectType: 'STUDENT', subjectId: studentId },
            select: { interpretation: true },
          })
        }
        if (type === 'all' || type === 'face') {
          result.face = await db.faceAnalysis.findFirst({
            where: { subjectType: 'STUDENT', subjectId: studentId },
            select: { result: true },
          })
        }
        if (type === 'all' || type === 'palm') {
          result.palm = await db.palmAnalysis.findFirst({
            where: { subjectType: 'STUDENT', subjectId: studentId },
            select: { result: true },
          })
        }
        if (type === 'all' || type === 'personality') {
          result.personality = await db.personalitySummary.findFirst({
            where: { studentId },
            select: { coreTraits: true },
          })
        }
        return result
      },
    }),

    getCounselingHistory: tool({
      description: '학생의 상담 이력을 조회합니다.',
      inputSchema: z.object({
        studentId: z.string().describe('학생 ID'),
        limit: z.number().optional().describe('조회 건수 (기본 5건)'),
      }),
      execute: async ({ studentId, limit }) => {
        const student = await db.student.findFirst({
          where: { id: studentId, ...studentWhere(session) },
          select: { id: true, name: true },
        })
        if (!student) return { error: '학생을 찾을 수 없거나 접근 권한이 없습니다.' }

        const sessions = await db.counselingSession.findMany({
          where: { studentId },
          select: {
            sessionDate: true, summary: true, category: true,
            teacher: { select: { name: true } },
          },
          orderBy: { sessionDate: 'desc' },
          take: limit ?? 5,
        })
        return { studentName: student.name, count: sessions.length, sessions }
      },
    }),
  }
}
```

**Step 4: 테스트 실행 → 통과 확인**

Run: `pnpm test src/lib/chat/__tests__/tools.test.ts`
Expected: PASS

**Step 5: 커밋**

```bash
git add src/lib/chat/tools.ts src/lib/chat/__tests__/tools.test.ts
git commit -m "feat: AI 채팅 Tool Use 8개 읽기 전용 도구 정의"
```

---

## Task 2: 자동 엔티티 감지 (src/lib/chat/auto-detect.ts)

**Files:**
- Create: `src/lib/chat/auto-detect.ts`
- Test: `src/lib/chat/__tests__/auto-detect.test.ts`

**Step 1: 테스트 파일 생성**

```typescript
// src/lib/chat/__tests__/auto-detect.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// db mock
vi.mock('@/lib/db/client', () => ({
  db: {
    student: { findMany: vi.fn() },
    teacher: { findMany: vi.fn() },
    team: { findMany: vi.fn() },
  },
}))

describe('autoDetectEntities', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    // 캐시 초기화를 위해 모듈 리임포트
    vi.resetModules()
  })

  it('메시지에서 학생 이름을 감지한다', async () => {
    const { db } = await import('@/lib/db/client')
    vi.mocked(db.student.findMany).mockResolvedValue([
      { id: 's1', name: '정수민', teamId: 't1' },
      { id: 's2', name: '김나경', teamId: 't1' },
    ] as never)
    vi.mocked(db.teacher.findMany).mockResolvedValue([] as never)
    vi.mocked(db.team.findMany).mockResolvedValue([] as never)

    const { autoDetectEntities } = await import('../auto-detect')
    const result = await autoDetectEntities(
      '정수민 전화번호 알려줘',
      { userId: 'u1', role: 'DIRECTOR', teamId: null },
      [] // 기존 멘션 없음
    )
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'student', id: 's1' }),
      ])
    )
  })

  it('1글자 이름은 감지하지 않는다', async () => {
    const { db } = await import('@/lib/db/client')
    vi.mocked(db.student.findMany).mockResolvedValue([
      { id: 's1', name: '이', teamId: 't1' },
    ] as never)
    vi.mocked(db.teacher.findMany).mockResolvedValue([] as never)
    vi.mocked(db.team.findMany).mockResolvedValue([] as never)

    const { autoDetectEntities } = await import('../auto-detect')
    const result = await autoDetectEntities(
      '이 학생 알려줘',
      { userId: 'u1', role: 'DIRECTOR', teamId: null },
      []
    )
    expect(result).toHaveLength(0)
  })

  it('이미 멘션된 엔티티는 중복 감지하지 않는다', async () => {
    const { db } = await import('@/lib/db/client')
    vi.mocked(db.student.findMany).mockResolvedValue([
      { id: 's1', name: '정수민', teamId: 't1' },
    ] as never)
    vi.mocked(db.teacher.findMany).mockResolvedValue([] as never)
    vi.mocked(db.team.findMany).mockResolvedValue([] as never)

    const { autoDetectEntities } = await import('../auto-detect')
    const result = await autoDetectEntities(
      '정수민 전화번호',
      { userId: 'u1', role: 'DIRECTOR', teamId: null },
      [{ type: 'student', id: 's1' }] // 이미 멘션됨
    )
    expect(result).toHaveLength(0)
  })

  it('DIRECTOR가 아닌 교사는 자기 팀 학생만 감지된다', async () => {
    const { db } = await import('@/lib/db/client')
    vi.mocked(db.student.findMany).mockResolvedValue([
      { id: 's1', name: '정수민', teamId: 't1' },
      { id: 's2', name: '김나경', teamId: 't2' },
    ] as never)
    vi.mocked(db.teacher.findMany).mockResolvedValue([] as never)
    vi.mocked(db.team.findMany).mockResolvedValue([] as never)

    const { autoDetectEntities } = await import('../auto-detect')
    const result = await autoDetectEntities(
      '정수민 김나경 정보',
      { userId: 'u1', role: 'TEACHER', teamId: 't1' },
      []
    )
    // 정수민(t1)만 감지, 김나경(t2)은 제외
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('s1')
  })
})
```

**Step 2: 테스트 실행 → 실패 확인**

Run: `pnpm test src/lib/chat/__tests__/auto-detect.test.ts`
Expected: FAIL

**Step 3: 자동 엔티티 감지 구현**

```typescript
// src/lib/chat/auto-detect.ts
import 'server-only'
import { db } from '@/lib/db/client'
import type { TeacherRole } from '@/lib/db/common/rbac'
import type { MentionItem } from './mention-types'

type Session = {
  userId: string
  role: TeacherRole
  teamId: string | null
}

type EntityCacheEntry = {
  students: Array<{ id: string; name: string; teamId: string | null }>
  teachers: Array<{ id: string; name: string; teamId: string | null }>
  teams: Array<{ id: string; name: string }>
  expiry: number
}

const CACHE_TTL_MS = 5 * 60 * 1000 // 5분
const entityCache = new Map<string, EntityCacheEntry>()

/** 인메모리 캐시에서 엔티티 이름 목록 조회 (miss 시 DB 조회) */
async function getEntityNames(session: Session): Promise<Omit<EntityCacheEntry, 'expiry'>> {
  const cacheKey = `entities:${session.userId}`
  const cached = entityCache.get(cacheKey)
  if (cached && cached.expiry > Date.now()) {
    return cached
  }

  const [students, teachers, teams] = await Promise.all([
    db.student.findMany({
      where: session.role === 'DIRECTOR' ? {} : { teamId: session.teamId },
      select: { id: true, name: true, teamId: true },
    }),
    db.teacher.findMany({
      where: session.role === 'DIRECTOR' ? {} : { teamId: session.teamId },
      select: { id: true, name: true, teamId: true },
    }),
    db.team.findMany({
      select: { id: true, name: true },
    }),
  ])

  const entry: EntityCacheEntry = {
    students,
    teachers,
    teams,
    expiry: Date.now() + CACHE_TTL_MS,
  }
  entityCache.set(cacheKey, entry)
  return entry
}

/**
 * 메시지에서 학생/교사/팀 이름을 자동 감지하여 MentionItem[] 반환.
 * - 2글자 이상 이름만 매칭 (오탐 방지)
 * - 이미 멘션된 엔티티는 제외
 * - RBAC: DIRECTOR는 전체, 일반 교사는 자기 팀만
 */
export async function autoDetectEntities(
  message: string,
  session: Session,
  existingMentions: MentionItem[]
): Promise<MentionItem[]> {
  const entities = await getEntityNames(session)
  const existingKeys = new Set(existingMentions.map(m => `${m.type}:${m.id}`))
  const detected: MentionItem[] = []
  const detectedKeys = new Set<string>()

  // 학생 이름 매칭
  for (const student of entities.students) {
    if (student.name.length < 2) continue
    if (!message.includes(student.name)) continue
    // RBAC: 일반 교사는 자기 팀만
    if (session.role !== 'DIRECTOR' && student.teamId !== session.teamId) continue
    const key = `student:${student.id}`
    if (existingKeys.has(key) || detectedKeys.has(key)) continue
    detectedKeys.add(key)
    detected.push({ type: 'student', id: student.id })
  }

  // 교사 이름 매칭
  for (const teacher of entities.teachers) {
    if (teacher.name.length < 2) continue
    if (!message.includes(teacher.name)) continue
    if (session.role !== 'DIRECTOR' && teacher.teamId !== session.teamId) continue
    const key = `teacher:${teacher.id}`
    if (existingKeys.has(key) || detectedKeys.has(key)) continue
    detectedKeys.add(key)
    detected.push({ type: 'teacher', id: teacher.id })
  }

  // 팀 이름 매칭
  for (const team of entities.teams) {
    if (team.name.length < 2) continue
    if (!message.includes(team.name)) continue
    if (session.role !== 'DIRECTOR' && team.id !== session.teamId) continue
    const key = `team:${team.id}`
    if (existingKeys.has(key) || detectedKeys.has(key)) continue
    detectedKeys.add(key)
    detected.push({ type: 'team', id: team.id })
  }

  return detected
}
```

**Step 4: 테스트 실행 → 통과 확인**

Run: `pnpm test src/lib/chat/__tests__/auto-detect.test.ts`
Expected: PASS

**Step 5: 커밋**

```bash
git add src/lib/chat/auto-detect.ts src/lib/chat/__tests__/auto-detect.test.ts
git commit -m "feat: AI 채팅 자동 엔티티 감지 (인메모리 캐시 + RBAC)"
```

---

## Task 3: GenerateOptions + streamWithProvider에 tools 지원 추가

**Files:**
- Modify: `src/features/ai-engine/universal-router.ts:27-46` (GenerateOptions, StreamResult)
- Modify: `src/features/ai-engine/universal-router.ts:233-252` (streamText 호출)

**Step 1: GenerateOptions에 tools와 maxSteps 추가**

`src/features/ai-engine/universal-router.ts` 수정:

```typescript
// 기존 import에 추가
import { generateText, streamText, stepCountIs } from 'ai';
import type { Tool } from 'ai';

// GenerateOptions에 필드 추가
export interface GenerateOptions {
  prompt: string;
  featureType: string;
  teacherId?: string;
  maxOutputTokens?: number;
  temperature?: number;
  system?: string;
  providerId?: string;
  modelId?: string;
  messages?: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  /** Tool Use: AI가 호출할 수 있는 도구 맵 */
  tools?: Record<string, Tool>;
  /** Tool Use: 최대 스텝 수 (기본값 없음, tools 사용 시 권장: 3) */
  maxSteps?: number;
}

export interface StreamResult {
  stream: ReturnType<typeof streamText>;
  provider: string;
  model: string;
  /** tools가 전달되었는지 여부 (클라이언트 스트리밍 방식 결정에 사용) */
  hasTools: boolean;
}
```

**Step 2: streamText 호출에 tools/stopWhen 전달**

`streamWithProvider` 함수 수정 — streamText 호출 부분:

```typescript
// 기존 streamText 호출을 tools 지원으로 확장
const toolsConfig = options.tools
  ? { tools: options.tools, stopWhen: stepCountIs(options.maxSteps ?? 3) }
  : {};

const result = messages && messages.length > 0
  ? streamText({
      model: languageModel,
      messages,
      system,
      maxOutputTokens,
      temperature,
      maxRetries: 0,
      onFinish: onFinishCallback,
      ...toolsConfig,
    })
  : streamText({
      model: languageModel,
      prompt,
      system,
      maxOutputTokens,
      temperature,
      maxRetries: 0,
      onFinish: onFinishCallback,
      ...toolsConfig,
    });

return {
  stream: result,
  provider: provider.providerType,
  model: model.modelId,
  hasTools: !!options.tools,
};
```

**Step 3: 타입체크**

Run: `pnpm typecheck`
Expected: 성공 (StreamResult 사용처에 hasTools 접근하는 곳 수정 필요할 수 있음)

**Step 4: 커밋**

```bash
git add src/features/ai-engine/universal-router.ts
git commit -m "feat: streamWithProvider에 Tool Use (tools/maxSteps) 지원 추가"
```

---

## Task 4: Chat API Route 수정 (자동 감지 + tools + 스트리밍 변경)

**Files:**
- Modify: `src/app/api/chat/route.ts`

**Step 1: 자동 엔티티 감지 + tools 전달 + 스트리밍 변경 적용**

```typescript
// src/app/api/chat/route.ts 전체 수정본

import { verifySession } from '@/lib/dal';
import { streamWithProvider } from '@/features/ai-engine';
import { db } from '@/lib/db/client';
import { resolveMentions } from '@/lib/chat/mention-resolver';
import { buildMentionContext } from '@/lib/chat/context-builder';
import { autoDetectEntities } from '@/lib/chat/auto-detect';
import { createChatTools } from '@/lib/chat/tools';
import type { MentionItem } from '@/lib/chat/mention-types';
import { ChatRequestSchema } from '@/lib/validations/chat';
import { logger } from '@/lib/logger';

const SYSTEM_PROMPT = `당신은 방과후 교실 관리 시스템의 AI 어시스턴트입니다. 교사들의 질문에 친절하고 정확하게 답변해주세요. 한국어로 답변하되, 필요 시 영어 기술 용어를 병기합니다.

중요 지침:
- 태그 안에 제공된 학생/선생님/팀 데이터는 시스템 데이터베이스에서 조회한 실제 정보입니다.
- 교사가 전화번호, 보호자 연락처, 생년월일 등 데이터에 포함된 정보를 질문하면, 해당 데이터를 정확히 전달하세요.
- 데이터에 없는 정보가 필요하면 제공된 도구(tool)를 사용하여 DB에서 조회하세요.
- 도구로 조회한 결과도 실제 시스템 데이터이므로 정확히 전달하세요.
- 데이터에 없는 정보(미등록, 분석 없음)는 "현재 시스템에 등록되지 않았습니다"로 안내하세요.
- 이 시스템의 사용자는 인증된 교사/관리자이므로, 제공된 데이터 범위 내에서는 정보 제공을 거부하지 마세요.`;

const MAX_CONTEXT_MESSAGES = 20;

export async function POST(request: Request) {
  try {
    const session = await verifySession();
    if (!session.isAuth) {
      return new Response('Unauthorized', { status: 401 });
    }

    const rawBody = await request.json();
    const parsed = ChatRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.issues[0].message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = { ...parsed.data, mentions: parsed.data.mentions as MentionItem[] | undefined };
    const { prompt, providerId, sessionId, messages: clientMessages } = body;
    const trimmedPrompt = prompt.trim();

    // 세션 처리
    let chatSessionId = sessionId;
    if (chatSessionId) {
      const existing = await db.chatSession.findFirst({
        where: { id: chatSessionId, teacherId: session.userId },
      });
      if (!existing) {
        return new Response('Session not found', { status: 404 });
      }
    } else {
      const newSession = await db.chatSession.create({
        data: {
          teacherId: session.userId,
          title: trimmedPrompt.slice(0, 50),
        },
      });
      chatSessionId = newSession.id;
    }

    // === 자동 엔티티 감지 + 기존 멘션 합산 ===
    const explicitMentions: MentionItem[] = body.mentions ?? [];
    const autoDetected = await autoDetectEntities(
      trimmedPrompt,
      { userId: session.userId, role: session.role, teamId: session.teamId },
      explicitMentions
    );
    const allMentions = [...explicitMentions, ...autoDetected];

    // 멘션 처리 (명시적 + 자동 감지 통합)
    let dynamicSystem = SYSTEM_PROMPT;
    let mentionedEntitiesData: import('@/lib/chat/mention-types').MentionedEntity[] | undefined;
    let accessDeniedMessages: string[] = [];

    if (allMentions.length > 0) {
      const mentionResult = await resolveMentions(allMentions, {
        userId: session.userId,
        role: session.role,
        teamId: session.teamId,
      });

      const mentionContext = buildMentionContext(mentionResult.resolved);
      if (mentionContext) {
        dynamicSystem = `${SYSTEM_PROMPT}\n\n${mentionContext}`;
      }

      mentionedEntitiesData = mentionResult.metadata;
      accessDeniedMessages = mentionResult.accessDeniedMessages;
    }

    // 멀티턴 메시지 구성
    let messagesForLLM: Array<{
      role: 'user' | 'assistant' | 'system';
      content: string;
    }> | undefined;

    if (clientMessages && clientMessages.length > 0) {
      const contextMessages = clientMessages.slice(-MAX_CONTEXT_MESSAGES);
      messagesForLLM = [
        ...contextMessages,
        { role: 'user' as const, content: trimmedPrompt },
      ];
    }

    // user 메시지 DB 저장
    await db.chatMessage.create({
      data: {
        sessionId: chatSessionId,
        role: 'user',
        content: trimmedPrompt,
        mentionedEntities: mentionedEntitiesData
          ? (mentionedEntitiesData as import('@/lib/db').Prisma.InputJsonValue)
          : undefined,
      },
    });

    // 세션 updatedAt 갱신
    await db.chatSession.update({
      where: { id: chatSessionId },
      data: { updatedAt: new Date() },
    });

    // auto 모드: 첫 번째 활성 provider fallback
    let effectiveProviderId = providerId || undefined;
    if (!effectiveProviderId) {
      const firstProvider = await db.provider.findFirst({
        where: { isEnabled: true, models: { some: {} } },
        orderBy: { name: 'asc' },
        select: { id: true },
      });
      effectiveProviderId = firstProvider?.id;
    }

    // === Tool Use: 세션 기반 RBAC 도구 생성 ===
    const chatTools = createChatTools({
      userId: session.userId,
      role: session.role,
      teamId: session.teamId,
    });

    const result = await streamWithProvider({
      prompt: trimmedPrompt,
      featureType: 'general_chat',
      teacherId: session.userId,
      providerId: effectiveProviderId,
      system: dynamicSystem,
      messages: messagesForLLM,
      tools: chatTools,
      maxSteps: 3,
    });

    // === 스트리밍: fullStream에서 text-delta만 추출하는 SSE 방식 ===
    const encoder = new TextEncoder();
    let fullText = '';

    const transformStream = new TransformStream({
      transform(chunk: { type: string; text?: string }, controller) {
        if (chunk.type === 'text-delta' && chunk.text) {
          fullText += chunk.text;
          controller.enqueue(encoder.encode(chunk.text));
        }
      },
      async flush() {
        // 스트림 완료 후 assistant 메시지 DB 저장
        if (fullText.trim()) {
          try {
            await db.chatMessage.create({
              data: {
                sessionId: chatSessionId!,
                role: 'assistant',
                content: fullText,
                provider: result.provider,
                model: result.model,
              },
            });
          } catch (e) {
            logger.error({ err: e }, '[Chat API] Failed to save assistant message');
          }
        }
      },
    });

    const readableStream = result.stream.fullStream.pipeThrough(transformStream);

    const headers = new Headers({
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Provider': result.provider,
      'X-Model': result.model,
      'X-Session-Id': chatSessionId!,
    });

    if (autoDetected.length > 0) {
      headers.set('X-Auto-Detected', String(autoDetected.length));
    }
    if (accessDeniedMessages.length > 0) {
      headers.set('X-Mention-Warnings', JSON.stringify(accessDeniedMessages));
    }

    return new Response(readableStream, { status: 200, headers });
  } catch (error) {
    logger.error({ err: error }, '[Chat API] Error');
    const message =
      error instanceof Error ? error.message : 'Internal server error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
```

**핵심 변경점:**
1. `autoDetectEntities()` 호출 → 자동 감지된 엔티티를 기존 멘션에 합산
2. `createChatTools()` → RBAC 적용된 8개 도구 생성
3. `streamWithProvider`에 `tools`, `maxSteps: 3` 전달
4. `fullStream.pipeThrough(TransformStream)` → text-delta만 클라이언트에 전달
5. `flush()`에서 DB 저장 (기존 `tee()` 패턴 대체)

**Step 2: 타입체크**

Run: `pnpm typecheck`
Expected: 성공

**Step 3: 커밋**

```bash
git add src/app/api/chat/route.ts
git commit -m "feat: Chat API에 자동 엔티티 감지 + Tool Use 통합"
```

---

## Task 5: System Prompt 업데이트 (이미 적용됨 — 확인만)

route.ts의 SYSTEM_PROMPT가 Task 4에서 이미 도구 사용 지침을 포함하므로 별도 작업 없음.

---

## Task 6: 통합 테스트 + Playwright 검증

**Step 1: 타입체크 + lint**

Run: `pnpm typecheck && pnpm lint`
Expected: 성공

**Step 2: 단위 테스트 전체 실행**

Run: `pnpm test`
Expected: 기존 테스트 + 새 테스트 모두 통과

**Step 3: Playwright 수동 테스트**

브라우저에서 다음 시나리오를 테스트:

| # | 입력 (멘션 없이) | 기대 결과 |
|---|-----------------|----------|
| 1 | `정수민 전화번호` | "010-5500-2005" (자동 감지 → system prompt 주입) |
| 2 | `서울중학교 학생 알려줘` | searchStudents 도구 사용하여 학생 목록 반환 |
| 3 | `최수아 MBTI 결과` | getStudentAnalysis 도구 사용하여 MBTI 결과 반환 |
| 4 | `@김나경 이 학생 성적 알려줘` | 기존 멘션 + getStudentGrades 도구 조합 |

**Step 4: 최종 커밋**

```bash
git add -A
git commit -m "feat: AI 채팅 자동 엔티티 감지 + Tool Use 통합 완료"
```
