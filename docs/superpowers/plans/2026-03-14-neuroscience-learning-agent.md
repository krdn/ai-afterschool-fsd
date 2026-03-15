# 뇌과학 기반 학습 Agent Phase 1 MVP 구현 계획

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 학생의 조건(프로필/상황/목표/성적)에 따라 뇌과학 근거 기반 학습 전략을 추천하는 기능을 `src/features/neuroscience/` Feature Slice로 구현한다.

**Architecture:** 기존 ai-engine의 `generateWithProvider()`를 활용하고, `grade-management`의 `getStudentProfile()`로 학생 데이터를 수집한다. condition-builder가 4가지 조건을 LLM 프롬프트 컨텍스트로 변환하고, 결과는 DB 캐시(NeuroscienceCache)로 관리한다.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Prisma, Zod, Vercel AI SDK, next-intl, Tailwind CSS + shadcn/ui

**Spec:** `docs/superpowers/specs/2026-03-14-neuroscience-learning-agent-design.md`

---

## Chunk 1: Feature 기반 인프라

### Task 1: Prisma 스키마 — NeuroscienceCache 모델 추가

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: NeuroscienceCache 모델 추가**

`prisma/schema.prisma`의 마지막 모델 뒤에 추가:

```prisma
model NeuroscienceCache {
  id            String   @id @default(cuid())
  studentId     String?
  conditionHash String
  requestType   String   // strategy | knowledge | coaching
  condition     Json
  response      Json
  provider      String
  modelId       String
  tokenUsage    Int      @default(0)
  createdAt     DateTime @default(now())
  expiresAt     DateTime

  student       Student? @relation(fields: [studentId], references: [id], onDelete: Cascade)

  @@unique([conditionHash, requestType])
  @@index([expiresAt])
  @@index([studentId])
}
```

`Student` 모델에 relation 추가:

```prisma
// Student 모델 내부에 추가
neuroscienceCaches   NeuroscienceCache[]
```

- [ ] **Step 2: Prisma 클라이언트 생성**

Run: `pnpm db:push && pnpm db:generate`
Expected: 스키마 반영 성공, 타입 재생성 완료

- [ ] **Step 3: 커밋**

```bash
git add prisma/schema.prisma
git commit -m "feat: NeuroscienceCache Prisma 모델 추가"
```

---

### Task 2: ai-engine FeatureType 확장

**Files:**
- Modify: `src/features/ai-engine/providers/types.ts` (19행 부근)

- [ ] **Step 1: FeatureType 유니온에 3개 추가**

`src/features/ai-engine/providers/types.ts`에서 `'general_chat'` 뒤에 추가:

```typescript
export type FeatureType =
  | 'learning_analysis'
  // ... 기존 유지 ...
  | 'general_chat'
  | 'neuroscience_strategy'    // 뇌과학 학습 전략 추천
  | 'neuroscience_knowledge'   // 뇌과학 지식 조회
  | 'neuroscience_coaching';   // 실시간 학습 코칭
```

- [ ] **Step 2: 타입 체크**

Run: `pnpm typecheck`
Expected: 오류 없음 (FeatureType은 string 유니온이므로 기존 코드에 영향 없음)

- [ ] **Step 3: FeatureMapping DB 매핑 안내**

> **중요**: `FeatureType`을 types.ts에 추가하는 것만으로는 LLM 라우팅이 동작하지 않는다.
> Admin UI (`/admin` → LLM 설정 → 기능 매핑)에서 아래 3개 매핑을 생성해야 한다:
>
> | featureType | matchMode | 권장 태그 | fallbackMode |
> |-------------|-----------|----------|-------------|
> | `neuroscience_strategy` | `auto_tag` | `text`, `long_output` | `any_available` |
> | `neuroscience_knowledge` | `auto_tag` | `text` | `any_available` |
> | `neuroscience_coaching` | `auto_tag` | `text`, `fast` | `any_available` |
>
> 또는 개발 환경에서 Prisma Studio(`pnpm db:studio`)로 직접 `FeatureMapping` 레코드를 생성한다.
> 이 매핑 없이 `generateWithProvider`를 호출하면 provider 라우팅 실패로 런타임 에러가 발생한다.

- [ ] **Step 4: 커밋**

```bash
git add src/features/ai-engine/providers/types.ts
git commit -m "feat: 뇌과학 FeatureType 3개 추가 (strategy/knowledge/coaching)"
```

---

### Task 3: neuroscience Feature — 타입 정의

**Files:**
- Create: `src/features/neuroscience/types.ts`

- [ ] **Step 1: 타입 파일 작성**

```typescript
import { z } from 'zod';

// ─── 조건 타입 ───

export type NeuroscienceCondition = {
  profile?: {
    studentId: string;
    name: string;
    age: number;
    grade: number;
    varkType?: string | null;
    mbtiType?: string | null;
    sajuTraits?: string | null;
    personalitySummary?: string | null;
  };
  situation?: {
    subject: string;
    difficulty: 'easy' | 'medium' | 'hard';
    timeOfDay: 'morning' | 'afternoon' | 'evening';
    fatigueLevel?: 'low' | 'medium' | 'high';
    concentrationLevel?: 'low' | 'medium' | 'high';
    studyDuration?: number;
  };
  goal?: {
    type: 'memorization' | 'comprehension' | 'problem_solving' | 'creativity' | 'review';
    specificTopic?: string;
  };
  gradeContext?: {
    recentTrend: 'improving' | 'stable' | 'declining';
    weakSubjects: string[];
    strongSubjects: string[];
    averageScore?: number;
  };
};

export type BuiltCondition = {
  condition: NeuroscienceCondition;
  contextString: string;
  hash: string;
};

// ─── 응답 Zod 스키마 ───

export const NeuroscienceStrategySchema = z.object({
  strategies: z.array(z.object({
    name: z.string(),
    neuroBasis: z.string(),
    fitReason: z.string(),
    steps: z.array(z.string()),
    expectedEffect: z.string(),
    caution: z.string().optional(),
  })).min(1).max(5),
  overallAdvice: z.string(),
  references: z.array(z.string()),
});

export type NeuroscienceStrategy = z.infer<typeof NeuroscienceStrategySchema>;

// ─── Server Action 입력 스키마 ───

export const strategyInputSchema = z.object({
  studentId: z.string().min(1, '학생을 선택해주세요'),
  situation: z.object({
    subject: z.string().min(1, '과목을 입력해주세요'),
    difficulty: z.enum(['easy', 'medium', 'hard']),
    timeOfDay: z.enum(['morning', 'afternoon', 'evening']),
    fatigueLevel: z.enum(['low', 'medium', 'high']).optional(),
    concentrationLevel: z.enum(['low', 'medium', 'high']).optional(),
    studyDuration: z.coerce.number().int().min(10).max(240).optional(),
  }),
  goal: z.object({
    type: z.enum(['memorization', 'comprehension', 'problem_solving', 'creativity', 'review']),
    specificTopic: z.string().optional(),
  }),
  locale: z.enum(['ko', 'en']).default('ko'),
});

export type StrategyInput = z.infer<typeof strategyInputSchema>;
```

- [ ] **Step 2: 타입 체크**

Run: `pnpm typecheck`
Expected: 오류 없음

- [ ] **Step 3: 커밋**

```bash
git add src/features/neuroscience/types.ts
git commit -m "feat: neuroscience Feature 타입 및 Zod 스키마 정의"
```

---

## Chunk 2: 핵심 비즈니스 로직

### Task 4: condition-builder — 테스트 작성

**Files:**
- Create: `src/features/neuroscience/__tests__/condition-builder.test.ts`

- [ ] **Step 1: 테스트 작성**

```typescript
import { describe, it, expect } from 'vitest';
import { buildCondition } from '../condition-builder';
import type { NeuroscienceCondition } from '../types';

describe('buildCondition', () => {
  it('프로필만 있을 때 컨텍스트 문자열에 학생 정보가 포함된다', () => {
    const condition: NeuroscienceCondition = {
      profile: {
        studentId: 'stu-1',
        name: '김철수',
        age: 10,
        grade: 3,
        varkType: 'A',
        mbtiType: 'ENFP',
        sajuTraits: null,
        personalitySummary: '활발하고 창의적',
      },
    };

    const result = buildCondition(condition);

    expect(result.contextString).toContain('김철수');
    expect(result.contextString).toContain('3학년');
    expect(result.contextString).toContain('청각형');
    expect(result.contextString).toContain('ENFP');
    expect(result.hash).toBeTruthy();
  });

  it('모든 조건이 있을 때 4개 섹션이 모두 포함된다', () => {
    const condition: NeuroscienceCondition = {
      profile: {
        studentId: 'stu-1', name: '이영희', age: 16, grade: 2,
        varkType: 'V', mbtiType: 'INTJ', sajuTraits: null, personalitySummary: null,
      },
      situation: {
        subject: '수학', difficulty: 'hard', timeOfDay: 'afternoon',
        fatigueLevel: 'high', concentrationLevel: 'low', studyDuration: 60,
      },
      goal: { type: 'problem_solving', specificTopic: '이차방정식' },
      gradeContext: {
        recentTrend: 'declining', weakSubjects: ['수학'], strongSubjects: ['영어'],
        averageScore: 72,
      },
    };

    const result = buildCondition(condition);

    expect(result.contextString).toContain('학생 프로필');
    expect(result.contextString).toContain('학습 상황');
    expect(result.contextString).toContain('학습 목표');
    expect(result.contextString).toContain('성적');
  });

  it('빈 조건일 때도 에러 없이 동작한다', () => {
    const result = buildCondition({});
    expect(result.contextString).toBeTruthy();
    expect(result.hash).toBeTruthy();
  });

  it('같은 조건은 같은 해시를 생성한다', () => {
    const condition: NeuroscienceCondition = {
      situation: { subject: '영어', difficulty: 'easy', timeOfDay: 'morning' },
    };
    const r1 = buildCondition(condition);
    const r2 = buildCondition(condition);
    expect(r1.hash).toBe(r2.hash);
  });

  it('다른 조건은 다른 해시를 생성한다', () => {
    const r1 = buildCondition({ situation: { subject: '영어', difficulty: 'easy', timeOfDay: 'morning' } });
    const r2 = buildCondition({ situation: { subject: '수학', difficulty: 'easy', timeOfDay: 'morning' } });
    expect(r1.hash).not.toBe(r2.hash);
  });
});
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

Run: `pnpm test src/features/neuroscience/__tests__/condition-builder.test.ts`
Expected: FAIL — `Cannot find module '../condition-builder'`

---

### Task 5: condition-builder — 구현

**Files:**
- Create: `src/features/neuroscience/condition-builder.ts`

- [ ] **Step 1: 구현**

```typescript
import { createHash } from 'crypto';
import type { NeuroscienceCondition, BuiltCondition } from './types';

const VARK_LABELS: Record<string, string> = {
  V: '시각형(Visual)', A: '청각형(Auditory)',
  R: '읽기쓰기형(Read/Write)', K: '운동감각형(Kinesthetic)',
};

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: '쉬움', medium: '보통', hard: '어려움',
};

const TIME_LABELS: Record<string, string> = {
  morning: '오전', afternoon: '오후', evening: '저녁',
};

const LEVEL_LABELS: Record<string, string> = {
  low: '낮음', medium: '보통', high: '높음',
};

const GOAL_LABELS: Record<string, string> = {
  memorization: '암기', comprehension: '이해',
  problem_solving: '문제풀이', creativity: '창의성', review: '복습',
};

const TREND_LABELS: Record<string, string> = {
  improving: '상승세', stable: '안정', declining: '하락세',
};

function buildProfileSection(profile: NonNullable<NeuroscienceCondition['profile']>): string {
  const parts: string[] = [
    `이름: ${profile.name}`,
    `나이: ${profile.age}세`,
    `학년: ${profile.grade}학년`,
  ];
  if (profile.varkType) {
    const label = profile.varkType.split('').map(c => VARK_LABELS[c] || c).join('+');
    parts.push(`VARK 학습유형: ${label}`);
  }
  if (profile.mbtiType) parts.push(`MBTI: ${profile.mbtiType}`);
  if (profile.personalitySummary) parts.push(`성향 요약: ${profile.personalitySummary}`);
  if (profile.sajuTraits) parts.push(`사주 성향: ${profile.sajuTraits}`);
  return `[학생 프로필]\n${parts.join('\n')}`;
}

function buildSituationSection(sit: NonNullable<NeuroscienceCondition['situation']>): string {
  const parts: string[] = [
    `과목: ${sit.subject}`,
    `난이도: ${DIFFICULTY_LABELS[sit.difficulty] || sit.difficulty}`,
    `학습 시간대: ${TIME_LABELS[sit.timeOfDay] || sit.timeOfDay}`,
  ];
  if (sit.fatigueLevel) parts.push(`피로도: ${LEVEL_LABELS[sit.fatigueLevel]}`);
  if (sit.concentrationLevel) parts.push(`집중력: ${LEVEL_LABELS[sit.concentrationLevel]}`);
  if (sit.studyDuration) parts.push(`학습 예정 시간: ${sit.studyDuration}분`);
  return `[학습 상황]\n${parts.join('\n')}`;
}

function buildGoalSection(goal: NonNullable<NeuroscienceCondition['goal']>): string {
  const parts: string[] = [`학습 목표: ${GOAL_LABELS[goal.type] || goal.type}`];
  if (goal.specificTopic) parts.push(`구체적 주제: ${goal.specificTopic}`);
  return `[학습 목표]\n${parts.join('\n')}`;
}

function buildGradeSection(ctx: NonNullable<NeuroscienceCondition['gradeContext']>): string {
  const parts: string[] = [`성적 추이: ${TREND_LABELS[ctx.recentTrend] || ctx.recentTrend}`];
  if (ctx.averageScore !== undefined) parts.push(`평균 점수: ${ctx.averageScore}점`);
  if (ctx.weakSubjects.length > 0) parts.push(`취약 과목: ${ctx.weakSubjects.join(', ')}`);
  if (ctx.strongSubjects.length > 0) parts.push(`강점 과목: ${ctx.strongSubjects.join(', ')}`);
  return `[성적 데이터]\n${parts.join('\n')}`;
}

export function buildCondition(condition: NeuroscienceCondition): BuiltCondition {
  const sections: string[] = [];

  if (condition.profile) sections.push(buildProfileSection(condition.profile));
  if (condition.situation) sections.push(buildSituationSection(condition.situation));
  if (condition.goal) sections.push(buildGoalSection(condition.goal));
  if (condition.gradeContext) sections.push(buildGradeSection(condition.gradeContext));

  if (sections.length === 0) {
    sections.push('[조건 없음]\n일반적인 뇌과학 학습 전략을 추천해주세요.');
  }

  const contextString = sections.join('\n\n');
  const hash = createHash('sha256').update(JSON.stringify(condition)).digest('hex');

  return { condition, contextString, hash };
}
```

- [ ] **Step 2: 테스트 실행 — 통과 확인**

Run: `pnpm test src/features/neuroscience/__tests__/condition-builder.test.ts`
Expected: 모든 테스트 PASS

- [ ] **Step 3: 커밋**

```bash
git add src/features/neuroscience/condition-builder.ts src/features/neuroscience/__tests__/condition-builder.test.ts
git commit -m "feat: neuroscience condition-builder 구현 및 테스트"
```

---

### Task 6: 프롬프트 정의

**Files:**
- Create: `src/features/neuroscience/prompts/strategy.ts`

- [ ] **Step 1: 전략 추천 프롬프트 작성**

```typescript
export function getStrategySystemPrompt(locale: string = 'ko'): string {
  if (locale === 'en') return STRATEGY_SYSTEM_PROMPT_EN;
  return STRATEGY_SYSTEM_PROMPT_KO;
}

const STRATEGY_SYSTEM_PROMPT_KO = `당신은 교육신경과학(Educational Neuroscience) 전문가입니다.
방과후학교 교사에게 학생 맞춤형 학습 전략을 추천합니다.

## 핵심 원칙
1. 모든 추천은 뇌과학 연구 근거를 명시하세요 (해마, 전전두엽, 도파민 시스템 등)
2. 학생의 개별 조건(나이, VARK 학습유형, MBTI, 성적)에 맞춤화하세요
3. 교사가 즉시 적용할 수 있는 구체적 방법을 제시하세요
4. 근거가 불확실한 내용은 "연구 중인 영역"으로 명시하세요
5. 학습 신화(learning myths)와 과학적 사실을 구분하세요

## 주요 뇌과학 도메인
- 기억: 해마, 장기강화(LTP), 간격 반복, 인출 연습
- 주의력: 전전두엽, 선택적 주의, 주의 피로, 울트라디안 리듬
- 동기: 도파민 보상 회로, 내재적/외재적 동기, 자기결정이론
- 감정: 편도체, 스트레스-코르티솔-학습 관계, 심리적 안전감
- 수면/신체: 수면과 기억 고정화, 운동과 BDNF, 영양과 인지
- 발달: 뇌 성숙도, 전두엽 발달 시기, 연령별 적합 학습법

## 출력 형식 (반드시 JSON)
{
  "strategies": [
    {
      "name": "전략 이름",
      "neuroBasis": "뇌과학 근거 (어떤 뇌 메커니즘에 기반하는지)",
      "fitReason": "이 학생에게 적합한 이유",
      "steps": ["구체적 실행 단계 1", "단계 2", "단계 3"],
      "expectedEffect": "예상 효과",
      "caution": "주의사항 (선택)"
    }
  ],
  "overallAdvice": "종합 조언 (2-3문장)",
  "references": ["관련 뇌과학 개념/이론 키워드"]
}

3~5개 전략을 추천하세요. JSON만 출력하세요.`;

const STRATEGY_SYSTEM_PROMPT_EN = `You are an Educational Neuroscience expert.
You recommend personalized learning strategies to after-school teachers based on brain science.

## Core Principles
1. All recommendations must cite neuroscience evidence (hippocampus, prefrontal cortex, dopamine system, etc.)
2. Personalize to the student's conditions (age, VARK type, MBTI, grades)
3. Provide concrete, immediately actionable methods for teachers
4. Mark uncertain evidence as "area under research"
5. Distinguish learning myths from scientific facts

## Output Format (must be JSON)
{
  "strategies": [
    {
      "name": "Strategy name",
      "neuroBasis": "Neuroscience basis",
      "fitReason": "Why this fits this student",
      "steps": ["Step 1", "Step 2", "Step 3"],
      "expectedEffect": "Expected effect",
      "caution": "Caution (optional)"
    }
  ],
  "overallAdvice": "Overall advice (2-3 sentences)",
  "references": ["Related neuroscience concepts"]
}

Recommend 3-5 strategies. Output JSON only.`;
```

- [ ] **Step 2: 타입 체크**

Run: `pnpm typecheck`
Expected: 오류 없음

- [ ] **Step 3: 커밋**

```bash
git add src/features/neuroscience/prompts/strategy.ts
git commit -m "feat: 뇌과학 전략 추천 시스템 프롬프트 정의 (ko/en)"
```

---

### Task 7: strategy-recommender 서비스

**Files:**
- Create: `src/features/neuroscience/services/strategy-recommender.ts`

- [ ] **Step 1: 서비스 구현**

```typescript
import { generateWithProvider } from '@/features/ai-engine';
import { db, Prisma } from '@/lib/db/client';
import { logger } from '@/lib/logger';
import { buildCondition } from '../condition-builder';
import { NeuroscienceStrategySchema, type NeuroscienceCondition, type NeuroscienceStrategy } from '../types';
import { getStrategySystemPrompt } from '../prompts/strategy';

type StrategyResult = {
  strategy: NeuroscienceStrategy;
  provider: string;
  model: string;
  cached: boolean;
};

export async function getStrategyRecommendation(
  condition: NeuroscienceCondition,
  options: { teacherId: string; locale?: string; forceRefresh?: boolean }
): Promise<StrategyResult> {
  const { teacherId, locale = 'ko', forceRefresh = false } = options;
  const built = buildCondition(condition);

  // 캐시 확인
  if (!forceRefresh) {
    const cached = await db.neuroscienceCache.findUnique({
      where: { conditionHash_requestType: { conditionHash: built.hash, requestType: 'strategy' } },
    });
    if (cached && cached.expiresAt > new Date()) {
      return {
        strategy: cached.response as NeuroscienceStrategy,
        provider: cached.provider,
        model: cached.modelId,
        cached: true,
      };
    }
  }

  // LLM 호출
  const result = await generateWithProvider({
    featureType: 'neuroscience_strategy',
    prompt: built.contextString,
    system: getStrategySystemPrompt(locale),
    teacherId,
    maxOutputTokens: 4096,
  });

  // 응답 파싱
  const parsed = NeuroscienceStrategySchema.safeParse(JSON.parse(result.text));
  if (!parsed.success) {
    logger.error({ err: parsed.error, rawText: result.text.slice(0, 500) }, 'Failed to parse neuroscience strategy response');
    throw new Error('학습 전략 응답 형식이 올바르지 않습니다.');
  }

  // 캐시 저장
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await db.neuroscienceCache.upsert({
    where: { conditionHash_requestType: { conditionHash: built.hash, requestType: 'strategy' } },
    create: {
      studentId: condition.profile?.studentId ?? null,
      conditionHash: built.hash,
      requestType: 'strategy',
      condition: condition as unknown as Prisma.InputJsonValue,
      response: parsed.data as unknown as Prisma.InputJsonValue,
      provider: result.provider,
      modelId: result.model,
      tokenUsage: (result.usage?.inputTokens ?? 0) + (result.usage?.outputTokens ?? 0),
      expiresAt,
    },
    update: {
      response: parsed.data as unknown as Prisma.InputJsonValue,
      provider: result.provider,
      modelId: result.model,
      tokenUsage: (result.usage?.inputTokens ?? 0) + (result.usage?.outputTokens ?? 0),
      expiresAt,
    },
  });

  return {
    strategy: parsed.data,
    provider: result.provider,
    model: result.model,
    cached: false,
  };
}
```

- [ ] **Step 2: Feature index 파일 생성**

Create `src/features/neuroscience/index.ts`:

```typescript
export { buildCondition } from './condition-builder';
export { getStrategyRecommendation } from './services/strategy-recommender';
export { getStrategySystemPrompt } from './prompts/strategy';
export type { NeuroscienceCondition, NeuroscienceStrategy, StrategyInput } from './types';
export { NeuroscienceStrategySchema, strategyInputSchema } from './types';
```

- [ ] **Step 3: 타입 체크**

Run: `pnpm typecheck`
Expected: 오류 없음

- [ ] **Step 4: 커밋**

```bash
git add src/features/neuroscience/services/strategy-recommender.ts src/features/neuroscience/index.ts
git commit -m "feat: strategy-recommender 서비스 및 캐싱 구현"
```

---

## Chunk 3: Server Action + 학생 데이터 수집

### Task 8: Server Action 구현

**Files:**
- Create: `src/lib/actions/neuroscience/strategy.ts`

- [ ] **Step 1: Server Action 작성**

```typescript
'use server';

import { getCurrentTeacher } from '@/lib/dal';
import { ok, fail, fieldError, type ActionResult } from '@/lib/errors/action-result';
import { logger } from '@/lib/logger';
import { getStudentProfile } from '@/features/grade-management/analysis/student-profiler';
import { getStrategyRecommendation } from '@/features/neuroscience';
import { strategyInputSchema, type NeuroscienceStrategy, type NeuroscienceCondition } from '@/features/neuroscience/types';
import { db } from '@/lib/db/client';

type StrategyActionResult = {
  strategy: NeuroscienceStrategy;
  provider: string;
  model: string;
  cached: boolean;
};

function deriveGradeContext(profile: {
  gradeHistory: { subject: string; score: number; testDate: Date }[];
}): NeuroscienceCondition['gradeContext'] {
  const history = profile.gradeHistory;
  if (history.length === 0) return undefined;

  // 과목별 평균 점수
  const subjectScores = new Map<string, number[]>();
  for (const g of history) {
    const arr = subjectScores.get(g.subject) ?? [];
    arr.push(g.score);
    subjectScores.set(g.subject, arr);
  }

  const subjectAvgs = Array.from(subjectScores.entries()).map(([subject, scores]) => ({
    subject,
    avg: scores.reduce((a, b) => a + b, 0) / scores.length,
  }));

  const overallAvg = subjectAvgs.reduce((sum, s) => sum + s.avg, 0) / subjectAvgs.length;

  // 추이 판단 (최근 3개 vs 이전 3개 평균 비교)
  const allScores = history.map(h => h.score);
  let recentTrend: 'improving' | 'stable' | 'declining' = 'stable';
  if (allScores.length >= 6) {
    const recent = allScores.slice(-3).reduce((a, b) => a + b, 0) / 3;
    const previous = allScores.slice(-6, -3).reduce((a, b) => a + b, 0) / 3;
    if (recent - previous > 5) recentTrend = 'improving';
    else if (previous - recent > 5) recentTrend = 'declining';
  }

  const sorted = [...subjectAvgs].sort((a, b) => a.avg - b.avg);
  const weakSubjects = sorted.slice(0, 2).filter(s => s.avg < overallAvg).map(s => s.subject);
  const strongSubjects = sorted.slice(-2).filter(s => s.avg >= overallAvg).map(s => s.subject);

  return {
    recentTrend,
    weakSubjects,
    strongSubjects,
    averageScore: Math.round(overallAvg),
  };
}

export async function runStrategyRecommendation(
  input: unknown
): Promise<ActionResult<StrategyActionResult>> {
  try {
    const teacher = await getCurrentTeacher();

    const parsed = strategyInputSchema.safeParse(input);
    if (!parsed.success) return fieldError(parsed.error.flatten().fieldErrors);

    const { studentId, situation, goal, locale } = parsed.data;

    // 학생 프로필 수집 (grade-management 재사용)
    const profile = await getStudentProfile(studentId);
    if (!profile) return fail('학생을 찾을 수 없습니다.');

    // 사주 분석 데이터 조회
    const sajuAnalysis = await db.sajuAnalysis.findFirst({
      where: { subjectId: studentId, subjectType: 'STUDENT' },
      select: { interpretation: true },
    });

    // 나이 계산
    const student = await db.student.findUnique({
      where: { id: studentId },
      select: { birthDate: true },
    });
    const age = student?.birthDate
      ? Math.floor((Date.now() - student.birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : profile.grade + 6; // 학년으로 추정

    // 조건 빌드
    const condition: NeuroscienceCondition = {
      profile: {
        studentId,
        name: profile.name,
        age,
        grade: profile.grade,
        varkType: profile.varkType,
        mbtiType: profile.mbtiType,
        sajuTraits: sajuAnalysis?.interpretation?.toString().slice(0, 200) ?? null,
        personalitySummary: profile.personalitySummary?.toString() ?? null,
      },
      situation,
      goal,
      gradeContext: deriveGradeContext(profile),
    };

    const result = await getStrategyRecommendation(condition, {
      teacherId: teacher.id,
      locale,
    });

    return ok(result);
  } catch (error) {
    logger.error({ err: error }, 'Failed to get neuroscience strategy recommendation');
    return fail(error instanceof Error ? error.message : '학습 전략 추천 중 오류가 발생했습니다.');
  }
}
```

- [ ] **Step 2: 타입 체크**

Run: `pnpm typecheck`
Expected: 오류 없음

- [ ] **Step 3: 커밋**

```bash
git add src/lib/actions/neuroscience/strategy.ts
git commit -m "feat: 뇌과학 전략 추천 Server Action 구현"
```

---

## Chunk 4: UI 페이지 및 컴포넌트

### Task 9: i18n 메시지 추가

**Files:**
- Modify: `src/messages/ko.json`
- Modify: `src/messages/en.json`

- [ ] **Step 1: ko.json에 Neuroscience 섹션 추가**

`Navigation` 섹션에 추가:
```json
"neuroscience": "뇌과학 학습"
```

파일 최하단에 `Neuroscience` 섹션 추가:
```json
"Neuroscience": {
  "title": "뇌과학 학습 전략",
  "description": "뇌과학 연구에 기반한 맞춤형 학습 전략을 추천합니다",
  "strategy": "학습 전략 추천",
  "knowledge": "뇌과학 지식",
  "coaching": "실시간 코칭",
  "selectStudent": "학생을 선택하세요",
  "subject": "과목",
  "subjectPlaceholder": "예: 수학, 영어, 과학",
  "difficulty": "난이도",
  "difficultyEasy": "쉬움",
  "difficultyMedium": "보통",
  "difficultyHard": "어려움",
  "timeOfDay": "학습 시간대",
  "timeMorning": "오전",
  "timeAfternoon": "오후",
  "timeEvening": "저녁",
  "fatigue": "피로도",
  "concentration": "집중력",
  "levelLow": "낮음",
  "levelMedium": "보통",
  "levelHigh": "높음",
  "studyDuration": "학습 예정 시간 (분)",
  "goalType": "학습 목표",
  "goalMemorization": "암기",
  "goalComprehension": "이해",
  "goalProblemSolving": "문제풀이",
  "goalCreativity": "창의성",
  "goalReview": "복습",
  "specificTopic": "구체적 학습 주제",
  "specificTopicPlaceholder": "예: 이차방정식, 영어 문법",
  "getRecommendation": "전략 추천받기",
  "analyzing": "뇌과학 기반 전략 분석 중...",
  "resultTitle": "맞춤 학습 전략",
  "neuroBasis": "뇌과학 근거",
  "fitReason": "맞춤 이유",
  "steps": "실행 단계",
  "expectedEffect": "예상 효과",
  "caution": "주의사항",
  "overallAdvice": "종합 조언",
  "references": "관련 뇌과학 개념",
  "provider": "AI 모델",
  "cached": "캐시 응답",
  "profileLoaded": "학생 프로필이 로드되었습니다",
  "noProfile": "분석 데이터가 없습니다. 학생의 VARK/MBTI 분석을 먼저 진행해주세요."
}
```

- [ ] **Step 2: en.json에 동일 구조 영문 추가**

`Navigation`에 추가:
```json
"neuroscience": "Brain Science"
```

`Neuroscience` 섹션:
```json
"Neuroscience": {
  "title": "Brain Science Learning Strategy",
  "description": "Personalized learning strategies based on neuroscience research",
  "strategy": "Strategy Recommendation",
  "selectStudent": "Select a student",
  "subject": "Subject",
  "subjectPlaceholder": "e.g., Math, English, Science",
  "difficulty": "Difficulty",
  "difficultyEasy": "Easy",
  "difficultyMedium": "Medium",
  "difficultyHard": "Hard",
  "timeOfDay": "Time of Day",
  "timeMorning": "Morning",
  "timeAfternoon": "Afternoon",
  "timeEvening": "Evening",
  "fatigue": "Fatigue Level",
  "concentration": "Concentration",
  "levelLow": "Low",
  "levelMedium": "Medium",
  "levelHigh": "High",
  "studyDuration": "Study Duration (min)",
  "goalType": "Learning Goal",
  "goalMemorization": "Memorization",
  "goalComprehension": "Comprehension",
  "goalProblemSolving": "Problem Solving",
  "goalCreativity": "Creativity",
  "goalReview": "Review",
  "specificTopic": "Specific Topic",
  "specificTopicPlaceholder": "e.g., Quadratic equations",
  "getRecommendation": "Get Recommendations",
  "analyzing": "Analyzing with brain science...",
  "resultTitle": "Personalized Strategies",
  "neuroBasis": "Neuroscience Basis",
  "fitReason": "Why It Fits",
  "steps": "Action Steps",
  "expectedEffect": "Expected Effect",
  "caution": "Caution",
  "overallAdvice": "Overall Advice",
  "references": "Related Concepts",
  "provider": "AI Model",
  "cached": "Cached Response",
  "profileLoaded": "Student profile loaded",
  "noProfile": "No analysis data. Please run VARK/MBTI analysis for this student first."
}
```

- [ ] **Step 3: 커밋**

```bash
git add src/messages/ko.json src/messages/en.json
git commit -m "feat: 뇌과학 학습 i18n 메시지 추가 (ko/en)"
```

---

### Task 10: 사이드바 네비게이션에 메뉴 추가

**Files:**
- Modify: `src/components/layout/app-sidebar.tsx`

- [ ] **Step 1: lucide-react에서 Brain 아이콘 import 추가**

기존 import에 `Brain` 추가:

```typescript
import {
  // ... 기존 아이콘들
  Brain,
  type LucideIcon,
} from "lucide-react"
```

- [ ] **Step 2: mainMenuItems에 뇌과학 메뉴 추가**

`aiChat` 항목 뒤에 추가:

```typescript
const mainMenuItems: MenuItem[] = [
  { key: "dashboard", href: "/dashboard", icon: LayoutDashboard },
  { key: "students", href: "/students", icon: Users },
  { key: "counseling", href: "/counseling", icon: MessageSquare },
  { key: "grades", href: "/grades", icon: BookOpen },
  { key: "aiChat", href: "/chat", icon: MessageCircle },
  { key: "neuroscience", href: "/neuroscience", icon: Brain },
]
```

- [ ] **Step 3: 타입 체크**

Run: `pnpm typecheck`
Expected: 오류 없음

- [ ] **Step 4: 커밋**

```bash
git add src/components/layout/app-sidebar.tsx
git commit -m "feat: 사이드바에 뇌과학 학습 메뉴 추가"
```

---

### Task 11: 전략 추천 클라이언트 컴포넌트

**Files:**
- Create: `src/components/neuroscience/strategy-form.tsx`

- [ ] **Step 1: 전략 추천 폼 컴포넌트 작성**

```typescript
'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Brain, Loader2, Sparkles, AlertTriangle } from 'lucide-react';
import { runStrategyRecommendation } from '@/lib/actions/neuroscience/strategy';
import type { NeuroscienceStrategy } from '@/features/neuroscience/types';

type Student = {
  id: string;
  name: string;
  school: string;
  grade: number;
  hasVark: boolean;
  hasMbti: boolean;
};

type Props = {
  students: Student[];
  locale: string;
};

export default function StrategyForm({ students, locale }: Props) {
  const t = useTranslations('Neuroscience');
  const [isPending, startTransition] = useTransition();
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [result, setResult] = useState<{
    strategy: NeuroscienceStrategy;
    provider: string;
    model: string;
    cached: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 폼 상태
  const [subject, setSubject] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [timeOfDay, setTimeOfDay] = useState<'morning' | 'afternoon' | 'evening'>('afternoon');
  const [fatigueLevel, setFatigueLevel] = useState<'low' | 'medium' | 'high' | ''>('');
  const [concentrationLevel, setConcentrationLevel] = useState<'low' | 'medium' | 'high' | ''>('');
  const [studyDuration, setStudyDuration] = useState('');
  const [goalType, setGoalType] = useState<'memorization' | 'comprehension' | 'problem_solving' | 'creativity' | 'review'>('comprehension');
  const [specificTopic, setSpecificTopic] = useState('');

  const selectedStudent = students.find(s => s.id === selectedStudentId);

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const res = await runStrategyRecommendation({
        studentId: selectedStudentId,
        situation: {
          subject,
          difficulty,
          timeOfDay,
          ...(fatigueLevel && { fatigueLevel }),
          ...(concentrationLevel && { concentrationLevel }),
          ...(studyDuration && { studyDuration: parseInt(studyDuration, 10) }),
        },
        goal: {
          type: goalType,
          ...(specificTopic && { specificTopic }),
        },
        locale,
      });

      if (res.success) {
        setResult(res.data);
      } else if ('fieldErrors' in res) {
        const firstError = Object.values(res.fieldErrors).flat()[0];
        setError(firstError ?? '입력 값을 확인해주세요.');
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* 학생 선택 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            {t('strategy')}
          </CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>{t('selectStudent')}</Label>
            <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
              <SelectTrigger><SelectValue placeholder={t('selectStudent')} /></SelectTrigger>
              <SelectContent>
                {students.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} ({s.school} {s.grade}학년)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedStudent && (
              <div className="mt-2 flex gap-2">
                {selectedStudent.hasVark && <Badge variant="secondary">VARK</Badge>}
                {selectedStudent.hasMbti && <Badge variant="secondary">MBTI</Badge>}
                {!selectedStudent.hasVark && !selectedStudent.hasMbti && (
                  <p className="text-sm text-muted-foreground">{t('noProfile')}</p>
                )}
              </div>
            )}
          </div>

          {/* 학습 상황 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t('subject')}</Label>
              <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder={t('subjectPlaceholder')} />
            </div>
            <div>
              <Label>{t('difficulty')}</Label>
              <Select value={difficulty} onValueChange={v => setDifficulty(v as typeof difficulty)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">{t('difficultyEasy')}</SelectItem>
                  <SelectItem value="medium">{t('difficultyMedium')}</SelectItem>
                  <SelectItem value="hard">{t('difficultyHard')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('timeOfDay')}</Label>
              <Select value={timeOfDay} onValueChange={v => setTimeOfDay(v as typeof timeOfDay)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="morning">{t('timeMorning')}</SelectItem>
                  <SelectItem value="afternoon">{t('timeAfternoon')}</SelectItem>
                  <SelectItem value="evening">{t('timeEvening')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('studyDuration')}</Label>
              <Input type="number" value={studyDuration} onChange={e => setStudyDuration(e.target.value)} placeholder="60" min={10} max={240} />
            </div>
            <div>
              <Label>{t('fatigue')}</Label>
              <Select value={fatigueLevel} onValueChange={v => setFatigueLevel(v as typeof fatigueLevel)}>
                <SelectTrigger><SelectValue placeholder="-" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">{t('levelLow')}</SelectItem>
                  <SelectItem value="medium">{t('levelMedium')}</SelectItem>
                  <SelectItem value="high">{t('levelHigh')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('concentration')}</Label>
              <Select value={concentrationLevel} onValueChange={v => setConcentrationLevel(v as typeof concentrationLevel)}>
                <SelectTrigger><SelectValue placeholder="-" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">{t('levelLow')}</SelectItem>
                  <SelectItem value="medium">{t('levelMedium')}</SelectItem>
                  <SelectItem value="high">{t('levelHigh')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 학습 목표 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t('goalType')}</Label>
              <Select value={goalType} onValueChange={v => setGoalType(v as typeof goalType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="memorization">{t('goalMemorization')}</SelectItem>
                  <SelectItem value="comprehension">{t('goalComprehension')}</SelectItem>
                  <SelectItem value="problem_solving">{t('goalProblemSolving')}</SelectItem>
                  <SelectItem value="creativity">{t('goalCreativity')}</SelectItem>
                  <SelectItem value="review">{t('goalReview')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('specificTopic')}</Label>
              <Input value={specificTopic} onChange={e => setSpecificTopic(e.target.value)} placeholder={t('specificTopicPlaceholder')} />
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={isPending || !selectedStudentId || !subject}
            className="w-full"
          >
            {isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t('analyzing')}</>
            ) : (
              <><Sparkles className="mr-2 h-4 w-4" />{t('getRecommendation')}</>
            )}
          </Button>

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4" />{error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 결과 표시 */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle>{t('resultTitle')}</CardTitle>
            <div className="flex gap-2 text-sm text-muted-foreground">
              <Badge variant="outline">{t('provider')}: {result.provider}/{result.model}</Badge>
              {result.cached && <Badge variant="secondary">{t('cached')}</Badge>}
            </div>
          </CardHeader>
          <CardContent>
            <Accordion type="multiple" className="space-y-2">
              {result.strategy.strategies.map((s, i) => (
                <AccordionItem key={i} value={`strategy-${i}`}>
                  <AccordionTrigger className="text-left">
                    <span className="font-medium">{i + 1}. {s.name}</span>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3 pt-2">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{t('neuroBasis')}</p>
                      <p className="text-sm">{s.neuroBasis}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{t('fitReason')}</p>
                      <p className="text-sm">{s.fitReason}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{t('steps')}</p>
                      <ol className="list-decimal list-inside space-y-1 text-sm">
                        {s.steps.map((step, j) => <li key={j}>{step}</li>)}
                      </ol>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{t('expectedEffect')}</p>
                      <p className="text-sm">{s.expectedEffect}</p>
                    </div>
                    {s.caution && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">{t('caution')}</p>
                        <p className="text-sm text-amber-600 dark:text-amber-400">{s.caution}</p>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>

            <div className="mt-6 space-y-3 border-t pt-4">
              <div>
                <p className="font-medium">{t('overallAdvice')}</p>
                <p className="text-sm text-muted-foreground">{result.strategy.overallAdvice}</p>
              </div>
              <div className="flex flex-wrap gap-1">
                <span className="text-sm font-medium">{t('references')}:</span>
                {result.strategy.references.map((ref, i) => (
                  <Badge key={i} variant="outline" className="text-xs">{ref}</Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 타입 체크**

Run: `pnpm typecheck`
Expected: 오류 없음

- [ ] **Step 3: 커밋**

```bash
git add src/components/neuroscience/strategy-form.tsx
git commit -m "feat: 뇌과학 전략 추천 UI 컴포넌트 구현"
```

---

### Task 12: 페이지 라우트 생성

**Files:**
- Create: `src/app/[locale]/(dashboard)/neuroscience/page.tsx`
- Create: `src/app/[locale]/(dashboard)/neuroscience/strategy/page.tsx`

- [ ] **Step 1: 메인 대시보드 페이지**

```typescript
// src/app/[locale]/(dashboard)/neuroscience/page.tsx
import { redirect } from 'next/navigation';

export default function NeurosciencePage() {
  redirect('/neuroscience/strategy');
}
```

- [ ] **Step 2: 전략 추천 페이지**

```typescript
// src/app/[locale]/(dashboard)/neuroscience/strategy/page.tsx
import { verifySession } from '@/lib/dal';
import { getRBACPrisma } from '@/lib/db/common/rbac';
import StrategyForm from '@/components/neuroscience/strategy-form';
import { getLocale } from 'next-intl/server';

export default async function NeuroscienceStrategyPage() {
  const session = await verifySession();
  const rbacDb = getRBACPrisma(session);
  const locale = await getLocale();

  const students = await rbacDb.student.findMany({
    select: {
      id: true,
      name: true,
      school: true,
      grade: true,
      varkAnalysis: { select: { id: true } },
      _count: { select: { sajuAnalysisHistories: true } },
    },
    orderBy: { name: 'asc' },
  });

  const studentsWithFlags = students.map(s => ({
    id: s.id,
    name: s.name,
    school: s.school,
    grade: s.grade,
    hasVark: !!s.varkAnalysis,
    hasMbti: false, // MBTI는 별도 테이블이므로 단순 flag
  }));

  // MBTI 보유 여부 일괄 조회
  if (studentsWithFlags.length > 0) {
    const mbtiResults = await rbacDb.mbtiAnalysis.findMany({
      where: {
        subjectId: { in: studentsWithFlags.map(s => s.id) },
        subjectType: 'STUDENT',
      },
      select: { subjectId: true },
    });
    const mbtiSet = new Set(mbtiResults.map(m => m.subjectId));
    for (const s of studentsWithFlags) {
      s.hasMbti = mbtiSet.has(s.id);
    }
  }

  return (
    <div className="container mx-auto max-w-3xl py-6">
      <StrategyForm students={studentsWithFlags} locale={locale} />
    </div>
  );
}
```

- [ ] **Step 3: 타입 체크**

Run: `pnpm typecheck`
Expected: 오류 없음

- [ ] **Step 4: 커밋**

```bash
git add src/app/[locale]/(dashboard)/neuroscience/
git commit -m "feat: 뇌과학 학습 페이지 라우트 생성"
```

---

## Chunk 5: 통합 검증

### Task 13: 빌드 검증 및 lint

- [ ] **Step 1: lint 실행**

Run: `pnpm lint`
Expected: neuroscience 관련 새 파일에 에러 없음

- [ ] **Step 2: 타입 체크**

Run: `pnpm typecheck`
Expected: 전체 프로젝트 오류 없음

- [ ] **Step 3: 테스트 실행**

Run: `pnpm test`
Expected: condition-builder 테스트 포함 전체 통과

- [ ] **Step 4: 빌드 검증**

Run: `pnpm build`
Expected: 빌드 성공

- [ ] **Step 5: 최종 커밋 (필요 시)**

빌드 과정에서 수정이 필요한 부분이 있으면 수정 후 커밋:

```bash
git add -A
git commit -m "fix: 뇌과학 학습 Agent 빌드 오류 수정"
```
