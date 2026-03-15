# 뇌과학 기반 학습 Agent 설계

> **날짜**: 2026-03-14
> **상태**: Reviewed
> **결정**: 프로젝트 내부 Feature Slice (`src/features/neuroscience/`)

## 1. 개요

### 목적
교사가 학생의 개별 조건(프로필, 학습 상황, 목표, 성적)에 따라 뇌과학 근거 기반의 효율적 학습 전략을 조회하고, 실시간 코칭 조언을 받을 수 있는 시스템.

### 핵심 결정: 내부 구현
| 판정 기준 | 결과 |
|----------|------|
| 기존 DB 4개 테이블 직접 접근 필요 (VARK, MBTI, 사주, 성적) | 내부 |
| ai-engine의 `generateWithProvider()` 활용 | 내부 |
| FeatureType 3개 추가만으로 확장 가능 | 내부 |
| 교사 인증(`verifySession`) 재사용 | 내부 |
| 별도 배포/인프라 불필요 | 내부 |
| 재사용 계획 없음 (이 프로젝트 전용) | 내부 |

외부 분리(마이크로서비스, NPM 패키지, MCP 서버) 대비 내부 Feature Slice가 데이터 접근성, 인프라 재사용, 배포 단순성 모든 면에서 우위.

### 사용자
- 교사/강사 (기존 ai-afterschool-fsd 사용자)

### 데이터 소스
- LLM 생성 의존 (기존 ai-engine 인프라 활용)
- 별도 벡터 DB나 RAG 파이프라인 불필요

## 2. 아키텍처

### 디렉토리 구조

```
src/features/neuroscience/
├── types.ts                        # 조건/응답 타입 정의
├── condition-builder.ts            # 학생 데이터 → 프롬프트 컨텍스트 변환
├── services/
│   ├── strategy-recommender.ts     # 학습 전략 추천 (핵심)
│   ├── knowledge-provider.ts       # 뇌과학 팩트/원리 조회
│   └── learning-coach.ts           # 실시간 학습 코칭 조언
├── prompts/
│   ├── strategy.ts                 # 전략 추천 시스템 프롬프트
│   ├── knowledge.ts                # 뇌과학 지식 프롬프트
│   └── coaching.ts                 # 코칭 프롬프트
├── repositories/
│   └── neuroscience-cache.ts       # 응답 캐싱 (조건 해시 기반, 24h TTL)
└── __tests__/
    ├── condition-builder.test.ts
    └── strategy-recommender.test.ts
```

### FSD 의존 방향

```
app (pages/API routes)
  ↓
components/neuroscience/         ← UI 컴포넌트
  ↓
lib/actions/neuroscience/        ← Server Actions (인증 + 검증 + 호출)
  ↓
features/neuroscience/           ← 비즈니스 로직
  ↓
features/ai-engine/              ← LLM 호출 (generateWithProvider)
features/analysis/               ← 기존 분석 데이터 조회 (VARK, MBTI 등)
features/grade-management/       ← 성적 데이터 조회
  ↓
shared/                          ← 공통 유틸, 타입
```

순환 참조 없음. `neuroscience`는 하위 Feature만 참조.

### Feature 간 의존 전략

`neuroscience`가 `analysis`, `grade-management`의 내부 서비스를 직접 import하면 결합도가 높아진다.
대신 **DB 직접 조회 + 기존 유틸 재사용** 접근을 취한다:

- **학생 프로필 수집**: `grade-management`의 `getStudentProfile()` 재사용 (이미 VARK, MBTI, 성적, 성향 요약을 한번에 조회)
- **사주 데이터**: Prisma DB 직접 조회 (`db.sajuAnalysis.findFirst()`)
- **추가 조건(situation, goal)**: `condition-builder`가 프로필 데이터와 결합

이 방식으로 `neuroscience → grade-management` 의존은 1개로 최소화하고, `analysis` feature 직접 의존은 제거한다.

### 타입 컨벤션

모든 타입은 `type` 키워드 사용 (`interface` 지양). 기존 `ai-engine/providers/types.ts`의 `interface` 패턴을 따르지 않는다.

### ai-engine 확장 (최소 변경)

`FeatureType`에 3개 추가:

| FeatureType | 용도 |
|-------------|------|
| `neuroscience_strategy` | 학습 전략 추천 |
| `neuroscience_knowledge` | 뇌과학 지식 조회 |
| `neuroscience_coaching` | 실시간 코칭 |

DB `FeatureMapping`에 3개 매핑 생성 (Admin UI에서 설정).

## 3. 조건 시스템

### 4가지 조건 타입

```typescript
type NeuroscienceCondition = {
  // 1. 학생 프로필 기반 (기존 DB에서 자동 수집)
  profile?: {
    age: number;
    grade: number;
    varkType?: VarkType;              // Visual | Auditory | ReadWrite | Kinesthetic
    mbtiType?: string;                // ENFP 등
    sajuTraits?: string[];            // 사주 성향 키워드
    personalitySummary?: string;      // 통합 성향 요약
  };

  // 2. 학습 상황 기반 (교사가 직접 입력)
  situation?: {
    subject: string;                  // 과목
    difficulty: 'easy' | 'medium' | 'hard';
    timeOfDay: 'morning' | 'afternoon' | 'evening';
    fatigueLevel?: 'low' | 'medium' | 'high';
    concentrationLevel?: 'low' | 'medium' | 'high';
    studyDuration?: number;           // 예정 학습 시간 (분)
  };

  // 3. 학습 목표 기반 (교사가 선택)
  goal?: {
    type: 'memorization' | 'comprehension' | 'problem_solving' | 'creativity' | 'review';
    specificTopic?: string;
  };

  // 4. 성적 데이터 기반 (기존 DB에서 자동 수집)
  gradeContext?: {
    recentTrend: 'improving' | 'stable' | 'declining';
    weakSubjects: string[];
    strongSubjects: string[];
    averageScore?: number;
  };
};
```

- 조건 1, 4는 학생 선택 시 **자동 수집** (기존 DB 조회)
- 조건 2, 3은 교사가 **직접 입력** (UI 폼)
- 모든 조건은 optional — 가용한 정보만으로도 동작

### condition-builder

학생의 분산된 데이터(4개 테이블)를 하나의 구조화된 프롬프트 컨텍스트로 조합:

```
"대상 학생: 초등 3학년(9세), VARK 청각형, MBTI ENFP
 학습 상황: 수학, 중간 난이도, 오후 시간대, 피로도 높음
 학습 목표: 암기 (구구단)
 성적 추이: 수학 하락세, 평균 72점, 국어·사회 강점"
```

조건 간 상관관계(예: "청각형 + 암기 목표 → 음성 반복 강조")를 반영한 컨텍스트 구성.

## 4. 서비스 상세

### 3개 서비스의 책임 분리

| 서비스 | 시나리오 | 입력 | 출력 |
|--------|---------|------|------|
| **strategy-recommender** | 수업 준비 시 | 4가지 조건 전체 | 맞춤 학습 전략 3-5개 + 뇌과학 근거 + 실행 가이드 |
| **knowledge-provider** | 궁금할 때 | 키워드/주제 | 뇌과학 팩트 + 출처 근거 + 교육 적용법 |
| **learning-coach** | 수업 중 | 현재 상황 + 프로필 | 즉시 실행 가능한 1-2개 조언 (간결) |

### 응답 스키마 (Zod 검증)

```typescript
// 전략 추천 응답
const NeuroscienceStrategySchema = z.object({
  strategies: z.array(z.object({
    name: z.string(),
    neuroBasis: z.string(),         // 뇌과학 근거
    fitReason: z.string(),          // 학생 맞춤 이유
    steps: z.array(z.string()),     // 실행 단계
    expectedEffect: z.string(),
    caution: z.string().optional(),
  })).min(1).max(5),
  overallAdvice: z.string(),
  references: z.array(z.string()),  // 관련 뇌과학 개념/이론
});

// 뇌과학 지식 응답
const NeuroscienceKnowledgeSchema = z.object({
  facts: z.array(z.object({
    title: z.string(),
    explanation: z.string(),
    brainMechanism: z.string(),     // 관련 뇌 메커니즘
    educationalApplication: z.string(),
    evidenceLevel: z.enum(['strong', 'moderate', 'emerging']),
  })),
  relatedTopics: z.array(z.string()),
});

// 코칭 조언 응답
const NeuroscienceCoachingSchema = z.object({
  advice: z.array(z.object({
    action: z.string(),             // 즉시 실행할 행동
    reason: z.string(),             // 뇌과학적 이유 (한 줄)
    duration: z.string().optional(), // 소요 시간
  })).min(1).max(2),
  encouragement: z.string(),       // 교사에게 격려 메시지
});
```

## 5. 프롬프트 설계

### 시스템 프롬프트 핵심 원칙

```
역할: 뇌과학 기반 교육 전문가 (교육신경과학 박사급)

원칙:
1. 모든 추천은 뇌과학 연구 근거를 명시할 것
   (해마의 기억 고정화, 전전두엽의 실행 기능, 도파민 보상 시스템 등)
2. 학생의 개별 조건(나이, 학습유형, 성향)에 맞춤화할 것
3. 교사가 즉시 적용할 수 있는 구체적 방법을 제시할 것
4. 근거가 불확실한 내용은 "연구 중인 영역"으로 명시할 것
5. 학습 신화(learning myths)와 과학적 사실을 구분할 것
```

### 주요 뇌과학 도메인 (프롬프트에 포함)

| 도메인 | 핵심 개념 | 교육 적용 |
|--------|----------|----------|
| 기억 | 해마, 장기강화(LTP), 간격 반복 | 복습 타이밍 최적화 |
| 주의력 | 전전두엽, 선택적 주의, 주의 피로 | 집중 시간 관리, 휴식 설계 |
| 동기 | 도파민 보상 회로, 내재적 동기 | 성취감 설계, 난이도 조절 |
| 감정 | 편도체, 스트레스-학습 관계 | 안전한 학습 환경, 불안 관리 |
| 수면/신체 | 수면과 기억 고정화, 운동과 BDNF | 학습 시간대 추천, 신체 활동 |
| 발달 | 뇌 성숙도, 전두엽 발달 시기 | 연령별 적합한 학습법 |

## 6. 캐싱

### DB 모델

```prisma
model NeuroscienceCache {
  id            String   @id @default(cuid())
  studentId     String?  // knowledge 요청은 학생 무관 (nullable)
  conditionHash String   // SHA256(조건 JSON) — studentId 미포함
  requestType   String   // strategy | knowledge | coaching
  condition     Json     // 원본 조건
  response      Json     // LLM 응답
  provider      String   // 사용된 LLM 제공자
  modelId       String   // 사용된 모델
  tokenUsage    Int      // 토큰 사용량
  createdAt     DateTime @default(now())
  expiresAt     DateTime // createdAt + 24h

  student       Student? @relation(fields: [studentId], references: [id])

  @@unique([conditionHash, requestType])
  @@index([expiresAt])
  @@index([studentId])
}
```

### 캐싱 전략

- **키**: `SHA256(conditionJSON)` — 같은 조건이면 캐시 히트 (studentId는 DB 필드로 별도 관리)
- **TTL**: 24시간 (학생 상태가 날마다 바뀔 수 있으므로)
- **무효화**: 학생 분석 데이터 변경 시 (VARK/MBTI 재분석) `studentId`로 관련 캐시 삭제
- **저장**: Prisma DB 테이블 (Redis 불필요)
- **정리**: 조회 시 lazy cleanup — 만료된 캐시는 `expiresAt < now()` 조건으로 필터링하고, 일 1회 배치로 오래된 레코드 삭제 (Server Action 또는 cron)
- **knowledge 캐시**: `studentId`가 null — 범용 뇌과학 지식은 학생 무관하게 공유 캐시

## 7. Server Action 패턴

```typescript
// src/lib/actions/neuroscience/strategy.ts
'use server';

import { getCurrentTeacher } from '@/lib/dal';
import { ok, fail, fieldError, type ActionResult } from '@/lib/errors/action-result';
import { logger } from '@/lib/logger';

export async function getStrategyRecommendation(
  input: StrategyInput
): Promise<ActionResult<NeuroscienceStrategy>> {
  try {
    // 1. 인증
    const teacher = await getCurrentTeacher();

    // 2. 입력 검증 (safeParse 사용 — parse 아님)
    const parsed = strategyInputSchema.safeParse(input);
    if (!parsed.success) return fieldError(parsed.error.flatten().fieldErrors);

    // 3. 학생 프로필 자동 수집 (grade-management의 getStudentProfile 재사용)
    const profile = await getStudentProfile(parsed.data.studentId);

    // 4. 조건 빌드
    const condition = buildCondition({ profile, ...parsed.data });

    // 5. 캐시 확인
    const cached = await checkCache(parsed.data.studentId, condition, 'strategy');
    if (cached) return ok(cached);

    // 6. LLM 생성
    const result = await generateWithProvider({
      featureType: 'neuroscience_strategy',
      prompt: condition.contextString,
      systemPrompt: getStrategyPrompt(parsed.data.locale),
      teacherId: teacher.id,
    });

    // 7. 응답 파싱 + 검증 (safeParse 사용)
    const strategyResult = NeuroscienceStrategySchema.safeParse(
      JSON.parse(result.text)
    );
    if (!strategyResult.success) {
      logger.error({ err: strategyResult.error }, 'Failed to parse neuroscience strategy response');
      return fail('학습 전략 응답 형식이 올바르지 않습니다. 다시 시도해주세요.');
    }

    // 8. 캐시 저장
    await saveCache(parsed.data.studentId, condition, 'strategy', strategyResult.data, result);

    return ok(strategyResult.data);
  } catch (error) {
    logger.error({ err: error }, 'Failed to get neuroscience strategy recommendation');
    return fail(error instanceof Error ? error.message : '학습 전략 추천 중 오류가 발생했습니다.');
  }
}
```

### 컨벤션 준수 사항

- **검증**: 모든 Zod 검증에 `safeParse()` 사용 (`parse()` 사용 금지)
- **인증**: 첫 줄에 `getCurrentTeacher()` 또는 `verifySession()`
- **에러**: `try-catch` + `logger.error({ err }, '영문 메시지')` + `fail(한국어 메시지)`
- **타입**: `type` 키워드 사용 (`interface` 지양)
- **캐시 무효화**: 조회 전용이므로 `revalidatePath()` 불필요 (데이터 변경 없음)
- **i18n**: 프롬프트에 `locale` 파라미터 전달하여 응답 언어 제어

### 접근 권한 (RBAC)

- **TEACHER** 역할: 전체 기능 접근 가능 (본인 담당 학생 한정)
- **ADMIN** 역할: 전체 학생 접근 가능 + 프롬프트 프리셋 관리 (Phase 3)
- RLS 컨텍스트: 기존 `dal.ts`의 `teacherId` 기반 필터링 재사용

## 8. UI 구조

### 페이지 라우트

```
/[locale]/(dashboard)/neuroscience/           → 메인 대시보드
/[locale]/(dashboard)/neuroscience/strategy/  → 전략 추천
/[locale]/(dashboard)/neuroscience/knowledge/ → 뇌과학 지식 검색
/[locale]/(dashboard)/neuroscience/coaching/  → 실시간 코칭
```

### 전략 추천 UI 흐름

```
Step 1: 학생 선택 (기존 StudentSelector 재사용)
           ↓ 프로필 자동 로드 (VARK, MBTI, 사주, 성적)
Step 2: 학습 상황 입력 (과목, 난이도, 시간대, 피로도)
           ↓
Step 3: 학습 목표 선택 (암기/이해/문제풀이/창의성/복습)
           ↓
Step 4: 결과 표시
         ├─ 전략 카드 목록 (이름 + 요약)
         ├─ 각 카드 펼치면: 뇌과학 근거 + 실행 단계
         └─ 종합 조언 + 관련 뇌과학 개념

## 9. 테스트 전략

| 레벨 | 대상 | 방법 |
|------|------|------|
| 단위 | condition-builder | 조건 조합별 컨텍스트 문자열 검증 (Vitest) |
| 단위 | Zod 스키마 | 응답 파싱 성공/실패 케이스 |
| 단위 | 캐시 해시 생성 | 같은 조건 = 같은 해시 검증 |
| 통합 | Server Action | 인증 + 검증 + 서비스 호출 흐름 (mock LLM) |
| E2E | 전략 추천 UI | 학생 선택 → 결과 표시 (Playwright, 향후) |

## 10. 구현 범위 및 우선순위

### Phase 1 (MVP)
- [ ] `neuroscience` Feature Slice 기본 구조 + types.ts
- [ ] condition-builder (getStudentProfile 재사용) + strategy-recommender 서비스
- [ ] 전략 추천 프롬프트 (i18n locale 지원)
- [ ] Server Action (safeParse + try-catch 패턴)
- [ ] 전략 추천 페이지 UI
- [ ] FeatureType 3개 추가 (ai-engine types.ts + DB FeatureMapping)
- [ ] NeuroscienceCache DB 모델 + 캐싱 로직 (Server Action에서 사용하므로 함께 구현)
- [ ] condition-builder 단위 테스트

### Phase 2
- [ ] knowledge-provider 서비스 + UI (studentId nullable 캐시)
- [ ] learning-coach 서비스 + UI
- [ ] 네비게이션 통합 (사이드바 메뉴 추가)

### Phase 3 (향후)
- [ ] 프롬프트 프리셋 (DB 관리, Admin UI)
- [ ] 학생별 학습 전략 이력 조회
- [ ] 전략 효과 피드백 수집
