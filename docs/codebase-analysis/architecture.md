# Architecture

**Analysis Date:** 2026-02-27

## Pattern Overview

**Overall:** Feature-Sliced Design (FSD) adapted for Next.js 15 App Router

**Key Characteristics:**
- 레이어 기반 아키텍처: `app` > `components` > `features` > `lib` > `shared`
- Server Actions를 통한 데이터 변경 (mutation), Server Components로 데이터 조회
- `eslint-plugin-boundaries`로 레이어 간 의존 방향을 강제 (위에서 아래로만)
- JWT 기반 세션 + PostgreSQL RLS로 멀티테넌트 격리
- AI Engine (Universal Router)을 통해 다수 LLM 프로바이더를 단일 인터페이스로 추상화

## Layer Hierarchy & Dependency Rules

FSD 레이어 의존 방향 (`eslint.config.mjs` 에서 `boundaries/element-types` 규칙으로 강제):

```
app          ─── 가장 상위. 모든 레이어 import 가능
  ↓
components   ─── app import 금지
  ↓
features     ─── app, components import 금지
  ↓
lib          ─── app, components import 금지 (features는 허용)
  ↓
shared       ─── app, components, features import 금지
types        ─── app, components, features import 금지
hooks        ─── (명시적 제약 없음, 실질적으로 shared 수준)
data         ─── (정적 데이터, 제약 없음)
i18n         ─── (국제화 설정)
messages     ─── (번역 JSON)
```

**설정 파일:** `eslint.config.mjs` (lines 42-107)

**주의:** `lib`에서 `features`로의 import가 **허용**됨 (FSD 표준과 다른 점). 이는 Server Actions(`lib/actions/`)가 features 레이어의 서비스를 호출해야 하기 때문.

## Layers

### app Layer
- **Purpose:** Next.js App Router 라우팅, 페이지 렌더링, API 라우트
- **Location:** `src/app/`
- **Contains:** `page.tsx`, `layout.tsx`, `loading.tsx`, API route handlers (`route.ts`)
- **Depends on:** components, features, lib, shared
- **Used by:** Next.js 프레임워크가 직접 호출

**구조:**
```
src/app/
├── layout.tsx                         # Root layout (children만 pass-through)
├── page.tsx                           # Root redirect
├── [locale]/                          # i18n 동적 세그먼트 (ko, en)
│   ├── layout.tsx                     # 폰트, NextIntlClientProvider, Toaster
│   ├── page.tsx                       # /auth/login으로 redirect
│   ├── (dashboard)/                   # 인증 필요 라우트 그룹
│   │   ├── layout.tsx                 # 대시보드 헤더/네비게이션/역할별 메뉴
│   │   ├── students/                  # 학생 관리
│   │   ├── teachers/                  # 교사 관리
│   │   ├── grades/                    # 성적 관리 (신규)
│   │   ├── counseling/                # 상담 관리
│   │   ├── matching/                  # 교사-학생 매칭
│   │   ├── chat/                      # AI 챗
│   │   ├── analytics/                 # 통계
│   │   ├── teams/                     # 팀 관리
│   │   ├── satisfaction/              # 만족도
│   │   ├── issues/                    # 이슈 관리
│   │   └── admin/                     # 관리자 전용
│   ├── auth/                          # 인증 (login, register, reset-password)
│   ├── admin/                         # LLM 프로바이더/기능 관리 (별도 레이아웃)
│   └── debug-markdown/               # 마크다운 디버그 페이지
└── api/                               # API 라우트 (locale 바깥)
    ├── chat/                          # 채팅 스트리밍 API
    ├── health/                        # 헬스체크
    ├── providers/                     # LLM 프로바이더 CRUD
    ├── feature-mappings/              # 기능-모델 매핑
    ├── students/                      # 학생 API
    ├── compatibility/                 # 궁합 계산
    ├── upload/                        # 이미지 업로드
    ├── cloudinary/                    # Cloudinary 서명
    ├── cron/                          # 배치 작업
    ├── internal/                      # 내부 이슈 트래킹 API
    └── events/                        # SSE 이벤트 스트림
```

### components Layer
- **Purpose:** UI 컴포넌트 (페이지별 Client Components + 공통 UI)
- **Location:** `src/components/`
- **Contains:** React Client Components, shadcn/ui 기반 UI 원자
- **Depends on:** features, lib (actions), shared, hooks
- **Used by:** app layer (pages, layouts)

**구조:**
```
src/components/
├── ui/                   # shadcn/ui 기본 컴포넌트 (button, card, dialog 등 26종)
├── common/               # 공통 컴포넌트 (NotificationProvider, __tests__)
├── layout/               # 레이아웃 컴포넌트 (notification-bell, user-menu, locale-switcher, llm-query-bar)
├── auth/                 # 인증 폼
├── students/             # 학생 관련 (tabs/ 하위)
├── teachers/             # 교사 관련
├── grades/               # 성적관리 UI (14개 컴포넌트)
├── counseling/           # 상담 (session-live/, wizard/)
├── chat/                 # AI 채팅 UI
├── matching/             # 매칭 UI
├── mbti/                 # MBTI 설문 UI
├── vark/                 # VARK 설문 UI
├── compatibility/        # 궁합 UI
├── analytics/            # 분석 차트
├── statistics/           # 통계 차트
├── satisfaction/         # 만족도 조사 UI
├── issues/               # 이슈 리포트 UI
├── admin/                # 관리자 패널 (llm-features/, llm-providers/, llm-usage/, tabs/)
├── assignment/           # 배정 제안 UI
├── help/                 # 도움말
├── dev/                  # 개발용 (DevUserSwitcher)
└── errors/               # 에러 바운더리
```

### features Layer
- **Purpose:** 핵심 비즈니스 로직과 도메인 서비스 (DB 직접 접근, LLM 호출)
- **Location:** `src/features/`
- **Contains:** 서비스 함수, 알고리즘, 프롬프트, 타입, 리포지토리, 테스트
- **Depends on:** lib (db, logger, errors), shared
- **Used by:** lib/actions (Server Actions), app/api (API routes)

**6개 Feature Slice:**

| Feature | 경로 | 책임 |
|---------|------|------|
| `ai-engine` | `src/features/ai-engine/` | LLM 프로바이더 라우팅, 페일오버, 사용량 추적, 프롬프트 관리 |
| `analysis` | `src/features/analysis/` | 사주, 이름, MBTI, VARK, 띠, 궁합 분석 |
| `counseling` | `src/features/counseling/` | 상담 예약/세션 관리, 통계 |
| `grade-management` | `src/features/grade-management/` | OCR 성적 추출, AI 분석, 동료비교, 학습계획, 학부모 리포트 |
| `matching` | `src/features/matching/` | 교사-학생 자동배정, 공정성 메트릭, 팀 구성 분석 |
| `report` | `src/features/report/` | PDF 리포트 생성 (@react-pdf/renderer) |

### lib Layer
- **Purpose:** 인프라/서비스 레이어 (DB 클라이언트, Server Actions, 세션, 로깅, 유틸)
- **Location:** `src/lib/`
- **Contains:** Server Actions, DB 클라이언트, 세션 관리, 인증, 로거, 검증, 유틸
- **Depends on:** features, shared (FSD 표준 대비 features 의존성 추가)
- **Used by:** app (pages, layouts), components (클라이언트에서 action 호출)

**핵심 하위 모듈:**

| 모듈 | 경로 | 역할 |
|------|------|------|
| `actions/` | `src/lib/actions/` | Server Actions (admin, auth, chat, counseling, matching, student, teacher) |
| `db/` | `src/lib/db/` | Prisma Client (PrismaPg 어댑터), RBAC, RLS |
| `session.ts` | `src/lib/session.ts` | JWT 세션 (jose, encrypt/decrypt/create/delete) |
| `dal.ts` | `src/lib/dal.ts` | Data Access Layer (verifySession, getCurrentTeacher, RBAC DB) |
| `logger/` | `src/lib/logger/` | pino 로거 (redact 설정 포함) |
| `errors/` | `src/lib/errors/` | ActionResult 타입 (ok/fail/fieldError) |
| `validations/` | `src/lib/validations/` | Zod 스키마 (학생, 교사, 인증, 채팅 등) |
| `analysis/` | `src/lib/analysis/` | 성적 통계 유틸 (grade-analytics, team-composition) |
| `chat/` | `src/lib/chat/` | 챗 멘션 해석, 컨텍스트 빌더 |
| `events/` | `src/lib/events/` | SSE 이벤트 |
| `storage/` | `src/lib/storage/` | 파일 스토리지 추상화 (local, S3/MinIO) |
| `github/` | `src/lib/github/` | GitHub 이슈 연동 (Octokit) |
| `screenshot/` | `src/lib/screenshot/` | 스크린샷 캡처 |
| `optimization/` | `src/lib/optimization/` | 성능 최적화 유틸 |

### shared Layer
- **Purpose:** 모든 레이어에서 사용하는 공통 타입, 유틸, 상수, 검증
- **Location:** `src/shared/`
- **Contains:** 타입, 유틸리티 함수, 상수, 에러 타입, Zod 검증 스키마
- **Depends on:** 없음 (최하위 레이어)
- **Used by:** 모든 레이어

**하위 모듈:**

| 모듈 | 주요 파일 |
|------|----------|
| `types/` | `enums.ts` (Role, GradeType 등), `common.ts`, `follow-up.ts`, `statistics.ts` |
| `utils/` | `extract-json.ts`, `format-date.ts`, `date-range.ts`, `pagination.ts`, `change-formatter.ts` |
| `constants/` | `index.ts` (앱 전역 상수) |
| `errors/` | `action-result.ts` (공유 에러 타입 - lib/errors와 별도) |
| `validations/` | Zod 스키마 (auth, students, teachers, teams, reservations 등 12개) |

### 기타 레이어

| 레이어 | 위치 | 역할 |
|--------|------|------|
| `hooks/` | `src/hooks/` | 클라이언트 훅 (`use-chat-stream.ts`, `use-mention.ts`) |
| `types/` | `src/types/` | 전역 타입 (`counseling.ts`, `follow-up.ts`, `llm-usage.ts`, `statistics.ts`, `resend.d.ts`) |
| `data/` | `src/data/` | 정적 데이터 (`mbti/`, `vark/` 설문 문항) |
| `i18n/` | `src/i18n/` | next-intl 설정 (`routing.ts`, `request.ts`, `navigation.ts`) |
| `messages/` | `src/messages/` | 번역 파일 (`ko.json`, `en.json`) |

## Data Flow

### 1. Server Component 조회 (Read)

```
[Browser] → Next.js App Router → page.tsx (Server Component)
  → getCurrentTeacher() (lib/dal.ts)           // 1. 세션 검증 + RLS 설정
  → db.xxx.findMany() (Prisma)                 // 2. DB 직접 조회
  → <ClientComponent data={...} />             // 3. 결과를 props로 전달
```

**대표 예시:** `src/app/[locale]/(dashboard)/grades/page.tsx`
```typescript
const teacher = await getCurrentTeacher();
const students = await db.student.findMany({ where: { teacherId: teacher.id } });
return <GradeDashboard students={students} />;
```

### 2. Server Action 변경 (Mutation)

```
[Browser] → Client Component → Server Action (lib/actions/)
  → getCurrentTeacher() / verifySession()      // 1. 인증
  → Zod schema validation                      // 2. 입력 검증
  → Feature Service (features/xxx/)            // 3. 비즈니스 로직
    → LLM call (features/ai-engine/)           // 3a. (선택적) AI 분석
    → db.xxx.create/update/delete              // 3b. DB 변경
  → revalidatePath()                           // 4. 캐시 무효화
  → return ok(data) / fail(message)            // 5. ActionResult 반환
```

**대표 예시:** `src/lib/actions/student/grade-analysis.ts`
```typescript
export async function analyzeStudentStrengthWeakness(studentId: string) {
  const teacher = await getCurrentTeacher();                        // 인증
  const result = await analyzeStrengthWeakness(studentId, teacher.id);  // feature 서비스 호출
  return ok(result);                                                // ActionResult 반환
}
```

### 3. API Route 스트리밍 (Chat)

```
[Browser] → POST /api/chat → route.ts
  → verifySession()                            // 1. 인증
  → ChatRequestSchema.safeParse()              // 2. 입력 검증
  → resolveMentions() + buildMentionContext()  // 3. 멘션 처리
  → db.chatMessage.create() (user)             // 4. 사용자 메시지 저장
  → streamWithProvider() (ai-engine)           // 5. LLM 스트리밍
  → stream.tee() → Response + DB save          // 6. 클라이언트 + DB 동시 전달
```

### 4. OCR → AI 분석 → DB 저장 (Grade Management)

```
[Browser] → uploadAndProcessGradeImage (Server Action)
  → processGradeImage() (features/grade-management/ocr/)
    → generateWithVision() (ai-engine)         // Vision LLM 호출
    → extractJsonFromLLM()                     // JSON 추출
    → validateByDocumentType()                 // Zod 검증
  → db.gradeOcrScan.update()                   // 스캔 결과 저장
  ↓
[Browser] → confirmOcrResult (Server Action)
  → db.gradeHistory.createMany()               // 성적 데이터 저장
  ↓
[Browser] → analyzeStudentStrengthWeakness (Server Action)
  → analyzeStrengthWeakness() (features/grade-management/analysis/)
    → getStudentProfile()                      // 학생 프로필 수집
    → analyzeSubjectStrengths()                // 통계 분석
    → generateAnalysis() → generateWithProvider() // LLM 인사이트
    → db.learningAnalysis.create()             // 분석 결과 캐싱 (24h)
```

### State Management

- **서버 상태:** React Server Components + `cache()` (React 캐시) + `revalidatePath()` (Next.js 캐시)
- **클라이언트 상태:** React `useState`/`useReducer` (전역 상태 관리 라이브러리 없음)
- **폼 상태:** `react-hook-form` + `@hookform/resolvers` + Zod
- **AI 분석 캐시:** `LearningAnalysis` 테이블에 24시간 TTL로 캐싱

## Key Abstractions

### ActionResult Pattern
- **Purpose:** Server Action의 일관된 성공/실패 반환 타입
- **Location:** `src/lib/errors/action-result.ts`
- **Pattern:** Discriminated Union (`{ success: true, data: T }` | `{ success: false, error: string }`)
- **사용법:**
```typescript
import { ok, fail, type ActionResult } from '@/lib/errors/action-result';
return ok(data);    // 성공
return fail("msg"); // 실패
```

### Universal Router (AI Engine)
- **Purpose:** 다수 LLM 프로바이더를 단일 인터페이스로 추상화, 자동 페일오버
- **Location:** `src/features/ai-engine/universal-router.ts`
- **Pattern:** Strategy + Chain of Responsibility
- **핵심 함수:**
  - `generateWithProvider()` - 텍스트 생성 (자동 라우팅/페일오버)
  - `streamWithProvider()` - 텍스트 스트리밍
  - `generateWithVision()` - 이미지+텍스트 (Vision)
- **라우팅 순서:** `getProviderOrder(featureType)` → DB `FeatureMapping` → 우선순위/페일오버

### Repository Pattern (Feature Slice 내)
- **Purpose:** DB 접근 로직을 feature 내부에 캡슐화
- **Location:** 각 feature의 `repositories/` 디렉토리
- **Examples:**
  - `src/features/analysis/repositories/` (13개 파일: analysis, mbti, vark, saju, name, face, palm 등)
  - `src/features/counseling/repositories/` (reports, reservations)
  - `src/features/matching/repositories/` (assignment, compatibility-result, fetch-analysis)

### DAL (Data Access Layer)
- **Purpose:** 세션 검증 + RBAC + RLS 컨텍스트 설정을 단일 호출로 통합
- **Location:** `src/lib/dal.ts`
- **핵심 함수:**
  - `verifySession()` - 세션 검증 + RLS 설정 (모든 Server Action/Component에서 호출)
  - `getCurrentTeacher()` - 현재 교사 정보 조회
  - `getRBACDB()` - 팀 필터링이 적용된 Prisma 클라이언트

## Entry Points

### 1. Web Application
- **Location:** `src/app/layout.tsx` → `src/app/[locale]/layout.tsx`
- **Triggers:** 브라우저 요청 → Next.js App Router
- **Responsibilities:** HTML 렌더링, 폰트/i18n 설정, 인증 리다이렉트

### 2. API Routes
- **Location:** `src/app/api/`
- **Triggers:** HTTP 요청 (클라이언트 fetch, 외부 시스템)
- **주요 엔드포인트:**
  - `POST /api/chat` - AI 채팅 스트리밍
  - `GET /api/health` - 헬스체크 (Docker/LB)
  - `GET /api/events` - SSE 알림
  - `POST /api/upload/screenshot` - 스크린샷 업로드
  - `POST /api/compatibility/calculate` - 궁합 계산
  - CRUD: `/api/providers/`, `/api/feature-mappings/`, `/api/students/`, `/api/teams/`
  - `POST /api/cron/aggregate-llm-usage` - LLM 사용량 집계

### 3. Middleware
- **Location:** `src/middleware.ts`
- **Triggers:** 모든 페이지 요청 (API, static 제외)
- **Responsibilities:**
  - next-intl 로케일 라우팅 (`ko`, `en`)
  - JWT 세션 확인 → 미인증 시 로그인 리다이렉트
  - 역할 기반 접근 제어 (admin 라우트 → DIRECTOR만)
  - 무효 세션 쿠키 자동 삭제
  - Request ID 부여 (distributed tracing)

### 4. Prisma Seed
- **Location:** `prisma/seed.ts` (tsx로 실행)
- **Triggers:** `pnpm db:seed`
- **Responsibilities:** 초기 데이터 (교사, 학생, 팀 등)

## Error Handling

**Strategy:** Server Action 레벨 try-catch + ActionResult 타입 + 구조화된 로깅

**Patterns:**

1. **Server Action:** try-catch → `ok(data)` / `fail(message)` 반환
   ```typescript
   try {
     const result = await featureService(args);
     return ok(result);
   } catch (error) {
     logger.error({ err: error }, 'Context message');
     return fail(error instanceof Error ? error.message : 'Fallback message');
   }
   ```

2. **API Route:** try-catch → NextResponse.json with status code
   ```typescript
   try { ... }
   catch (error) {
     return Response.json({ error: message }, { status: 500 });
   }
   ```

3. **AI Engine Failover:** 프로바이더 실패 시 다음 프로바이더 자동 시도
   - `isRetryableError()` 판단 → 재시도 불가 에러는 체인 중단
   - `isRefusalResponse()` → LLM 거부 시 다음 모델 시도
   - `trackFailure()` → 실패 기록 저장

4. **OCR 검증:** Zod 스키마 검증 → 실패 시 `{ isValid: false, errors: [...] }` 반환

## Cross-Cutting Concerns

### Authentication & Authorization
- **Session:** JWT (jose) → `src/lib/session.ts`
- **Verification:** `verifySession()` (dal.ts) - 모든 protected 코드 진입점에서 호출
- **RBAC:** 4개 역할 (`DIRECTOR` > `TEAM_LEADER` > `MANAGER` > `TEACHER`)
- **RLS:** PostgreSQL `SET LOCAL rls.teacher_id` → `src/lib/db/common/rbac.ts`
- **Middleware:** UX용 빠른 리다이렉트 (보안은 `verifySession()`이 담당)

### Logging
- **Framework:** pino (`src/lib/logger/index.ts`)
- **Features:** 구조화된 JSON, 민감 데이터 자동 redact, 환경별 레벨
- **Pattern:** `logger.info({ key: value }, 'message')` / `logger.error({ err: error }, 'message')`

### Validation
- **Library:** Zod (v4)
- **Location:** `src/shared/validations/` (공유) + `src/lib/validations/` (lib 전용)
- **Pattern:** Server Action 진입점에서 `schema.safeParse()`

### Internationalization
- **Library:** next-intl (v4)
- **Locales:** `ko` (기본), `en`
- **Messages:** `src/messages/ko.json`, `src/messages/en.json`
- **Routing:** `src/i18n/routing.ts` → `[locale]` 동적 세그먼트

### Monitoring
- **Error Tracking:** Sentry (`@sentry/nextjs`)
- **Tunnel:** `/monitoring` 라우트로 ad-blocker 우회
- **Source Maps:** 프로덕션 빌드 시 Sentry에 업로드 후 삭제

## Feature Slice Details

### ai-engine (`src/features/ai-engine/`)
**책임:** LLM 프로바이더 통합, 모델 라우팅, 사용량 추적, 예산 관리

| 파일/디렉토리 | 역할 |
|--------------|------|
| `universal-router.ts` | 텍스트 생성/스트리밍 (메인 엔트리) |
| `router-vision.ts` | Vision (이미지 포함) 생성 |
| `router-utils.ts` | 프로바이더 순서 결정, 모델 생성, 환경 설정 |
| `feature-resolver.ts` | featureType → 프로바이더/모델 매핑 해석 |
| `provider-registry.ts` | 프로바이더 CRUD, 모델 관리 |
| `failover.ts` | 에러 재시도 가능성 판단, 페일오버 실행기 |
| `smart-routing.ts` | 예산 임계치 체크, 비용 기반 라우팅 |
| `usage-tracker.ts` | 사용량 기록 (LLMUsage 테이블) |
| `usage-aggregation.ts` | 월간 사용량 집계 (LLMUsageMonthly) |
| `encryption.ts` | API 키 암복호화 |
| `adapters/` | 프로바이더별 어댑터 (ai SDK 연동) |
| `providers/` | 프로바이더 타입 정의, 비용 설정, Ollama 전용 |
| `prompts/` | 프롬프트 관리 |
| `router/` | 라우팅 알고리즘 (cost estimation, failover) |
| `templates.ts` | 프로바이더 초기 설정 템플릿 |
| `types.ts` | 핵심 타입 (ProviderType, FeatureType, GenerateOptions 등) |

**지원 프로바이더:** OpenAI, Anthropic, Google, Ollama, DeepSeek, Mistral, Cohere, xAI, Zhipu, Moonshot, OpenRouter, Custom

### analysis (`src/features/analysis/`)
**책임:** 학생/교사 성격/적성 분석 (사주, 이름풀이, MBTI, VARK, 띠, 궁합)

| 하위 모듈 | 역할 |
|-----------|------|
| `saju/` | 사주 분석 (생년월일시 기반 오행 분석) |
| `name/` | 이름 해석 (한자 풀이, 수리 분석) |
| `mbti/` | MBTI 설문 및 분석 |
| `vark/` | VARK 학습스타일 분석 |
| `zodiac/` | 띠(생년) 분석 |
| `compatibility/` | 교사-학생 궁합 종합 점수 |
| `integration/` | 분석 결과 통합 |
| `repositories/` | DB 접근 (13개 리포지토리: 분석 결과 CRUD, 프롬프트 프리셋 관리) |

### grade-management (`src/features/grade-management/`)
**책임:** 성적 관리 전체 파이프라인 (OCR → 분석 → 코칭 → 학부모 리포트)

| 하위 모듈 | 파일 | 역할 |
|-----------|------|------|
| `ocr/` | `ocr-processor.ts`, `ocr-prompts.ts`, `ocr-validator.ts` | Vision LLM으로 성적표 이미지 → JSON 추출 |
| `analysis/` | `strength-weakness.ts`, `goal-gap-analyzer.ts`, `study-plan-generator.ts`, `coaching-report.ts`, `teacher-alerts.ts`, `stat-analyzer.ts`, `student-profiler.ts`, `llm-composer.ts` | AI 기반 학습 분석 (강점/약점, 목표갭, 학습계획, 코칭, 알림) |
| `peer-comparison/` | `peer-comparison.ts` | 같은 반/학년 학생 간 성적 비교 |
| `study-habits/` | `habit-analyzer.ts`, `study-log-service.ts` | 학습 습관 분석, 학습 기록 관리 |
| `report/` | `parent-report-generator.ts` | 학부모용 리포트 데이터 생성/저장/발송 기록 |
| `types.ts` | (루트) | OCR 결과, 분석 결과 타입 정의 |

### matching (`src/features/matching/`)
**책임:** 교사-학생 매칭 알고리즘, 공정성 분석, 팀 구성

| 파일 | 역할 |
|------|------|
| `auto-assignment.ts` | 자동 배정 알고리즘 (호환성 점수 기반) |
| `fairness-metrics.ts` | 공정성 지표 (ABROCA, 편차 지수, 분포 균형) |
| `team-composition.ts` | 팀 구성 분석 (Shannon 다양성, MBTI/학습스타일 분포) |
| `repositories/` | 배정 제안 CRUD, 호환성 결과 조회, 분석 데이터 패치 |

### counseling (`src/features/counseling/`)
**책임:** 상담 예약/세션 관리, 통계

| 파일 | 역할 |
|------|------|
| `types.ts` | 상담 타입, 예약 상태, 후속 관리 타입 |
| `stats.ts` | 유형 분포, 월별 추세, 후속 관리 상태 계산 |
| `repositories/` | 상담 리포트, 예약 CRUD (11자 기준 최대 파일) |

### report (`src/features/report/`)
**책임:** PDF 상담 리포트 생성 (`@react-pdf/renderer`)

| 파일 | 역할 |
|------|------|
| `generator.ts` | PDF 생성 → Buffer 변환, 파일명 생성 |
| `styles.ts` | 리포트 스타일, 색상 팔레트 |
| `fonts.ts` | 폰트 설정 (한글 지원) |
| `templates/` | React PDF 컴포넌트 (Header, StudentInfo, AnalysisResults, AIRecommendations, Footer) |

## Database Architecture

### ORM & Connection

- **ORM:** Prisma (v7) with `@prisma/adapter-pg` (native pg Pool)
- **Client:** `src/lib/db/client.ts` - 싱글톤 PrismaClient + pg Pool
- **Connection Pool:** max 10, idle timeout 30s, connection timeout 2s
- **RLS:** PostgreSQL Row Level Security via `SET LOCAL` 변수

### Key Models (42+ models)

**Core Entities:**
- `Teacher`, `Student`, `Team`, `Parent`

**Analysis Models:**
- `SajuAnalysis`, `NameAnalysis`, `MbtiAnalysis`, `VarkAnalysis`, `ZodiacAnalysis`
- `FaceAnalysis`, `PalmAnalysis`, `CompatibilityResult`, `PersonalitySummary`

**Grade Management:**
- `GradeHistory`, `MockExamResult`, `GradeOcrScan`, `LearningAnalysis`, `StudyLog`, `ParentGradeReport`

**Counseling:**
- `CounselingSession`, `CounselingNote`, `ParentCounselingReservation`

**AI Infrastructure:**
- `Provider`, `Model`, `FeatureMapping`, `ProviderTemplate`
- `LLMUsage`, `LLMUsageMonthly`, `LLMBudget`, `LLMFeatureConfig`

**System:**
- `AuditLog`, `SystemLog`, `Issue`, `IssueEvent`, `ChatSession`, `ChatMessage`

---

*Architecture analysis: 2026-02-27*
