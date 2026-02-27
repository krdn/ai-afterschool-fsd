# 코드 품질 분석 보고서

**분석일:** 2026-02-27
**분석 대상:** ai-afterschool-fsd (Next.js 15 + FSD Architecture)
**총 소스 파일:** 688개 (`.ts`, `.tsx`)
**총 라인 수:** ~101,500 LOC

---

## 1. 테스트 커버리지 현황

### 1.1 테스트 프레임워크

| 구분 | 도구 | 설정 파일 |
|------|------|-----------|
| 단위 테스트 | Vitest 4 | `vitest.config.ts` |
| E2E 테스트 | Playwright | `playwright.config.ts` |

**Vitest 설정:**
- 테스트 파일 패턴: `src/**/*.{test,spec}.{ts,tsx}`
- `passWithNoTests: true` -- 테스트 없이도 통과 허용
- 경로 별칭: `@/` -> `./src`
- 환경: 기본 Node.js (jsdom 미설정 -- 컴포넌트 테스트 불가)

**Playwright 설정:**
- E2E 테스트 디렉토리: `./e2e` (현재 비어 있음)
- 브라우저: Chromium만
- CI 환경에서 2회 재시도

### 1.2 테스트 파일 현황

**총 테스트 파일: 19개** (688개 소스 파일 대비 약 2.8% 파일 커버리지)

| 위치 | 테스트 파일 | 테스트 대상 |
|------|------------|-------------|
| `src/components/common/__tests__/` | `saju-utils.test.ts` | 사주 유틸리티 |
| `src/features/ai-engine/__tests__/` | `failover.test.ts` | LLM 페일오버 로직 |
| `src/features/ai-engine/prompts/__tests__/` | `counseling-scenario.test.ts` | 상담 시나리오 프롬프트 |
| `src/features/analysis/compatibility/__tests__/` | `compatibility-scoring.test.ts` | 궁합 점수 계산 |
| `src/features/analysis/mbti/__tests__/` | `mbti-scoring.test.ts` | MBTI 채점 로직 |
| `src/features/analysis/name/__tests__/` | `name-numerology.test.ts` | 성명학 수리 계산 |
| `src/features/analysis/vark/__tests__/` | `vark-scoring.test.ts` | VARK 채점 로직 |
| `src/features/grade-management/analysis/__tests__/` | `stat-analyzer.test.ts` | 성적 통계 분석 |
| `src/features/grade-management/ocr/__tests__/` | `ocr-prompts.test.ts` | OCR 프롬프트 |
| `src/features/grade-management/ocr/__tests__/` | `ocr-validator.test.ts` | OCR 검증 |
| `src/features/matching/__tests__/` | `auto-assignment.test.ts` | 자동 배정 알고리즘 |
| `src/lib/chat/__tests__/` | `parse-mention-chips.test.ts` | 멘션 파싱 |
| `src/lib/errors/__tests__/` | `action-result.test.ts` | ActionResult 헬퍼 |
| `src/lib/validations/__tests__/` | `counseling.test.ts` | 상담 스키마 검증 |
| `src/lib/validations/__tests__/` | `reservations.test.ts` | 예약 스키마 검증 |
| `src/lib/validations/__tests__/` | `session-notes.test.ts` | 상담 노트 스키마 |
| `src/shared/utils/__tests__/` | `date-range.test.ts` | 날짜 범위 유틸리티 |
| `src/shared/utils/__tests__/` | `extract-json.test.ts` | LLM JSON 추출 |
| `src/shared/utils/__tests__/` | `pagination.test.ts` | 페이지네이션 유틸리티 |

### 1.3 테스트가 없는 주요 영역

| 영역 | 파일 수 (추정) | 위험도 | 비고 |
|------|---------------|--------|------|
| Server Actions (`src/lib/actions/`) | ~65개 | **높음** | 비즈니스 로직 핵심, 테스트 0 |
| API Routes (`src/app/api/`) | ~20개 | **높음** | 인증, 채팅, CRON 등 |
| 컴포넌트 (`src/components/`) | ~130개+ | 중간 | jsdom 환경 미설정 |
| DB 쿼리 (`src/lib/db/`) | ~15개 | 높음 | 데이터 접근 계층 |
| 인증/세션 (`src/lib/session.ts`, `src/lib/dal.ts`) | ~5개 | **높음** | 보안 관련 |
| 상담 Repository (`src/features/counseling/repositories/`) | ~3개 | 중간 | 복잡한 쿼리 |

### 1.4 테스트 패턴 및 구조

**파일 배치:** `__tests__` 디렉토리 방식 (co-located)

```
src/features/analysis/mbti/
  ├── mbti-scoring.ts       # 구현
  ├── index.ts              # 배럴 export
  └── __tests__/
      └── mbti-scoring.test.ts  # 테스트
```

**테스트 구조 패턴:**

```typescript
import { describe, it, expect } from "vitest"
import { targetFunction } from "../target-module"

describe("함수명/모듈명", () => {
  // 한국어 테스트 설명 사용
  it("유효한 데이터를 통과시킨다", () => {
    const result = targetFunction(input)
    expect(result).toEqual(expected)
  })

  // 경계값 테스트
  it("duration이 5분 미만이면 실패한다", () => {
    const result = schema.safeParse({ ...validData, duration: 4 })
    expect(result.success).toBe(false)
  })

  // it.each를 사용한 파라미터화 테스트
  it.each(["ACADEMIC", "CAREER", "PSYCHOLOGICAL", "BEHAVIORAL"] as const)(
    "상담 유형 '%s'을 허용한다",
    (type) => {
      const result = schema.safeParse({ ...validData, type })
      expect(result.success).toBe(true)
    }
  )
})
```

**모킹 패턴:**

```typescript
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}))

vi.mock('../usage-tracker', () => ({
  trackFailure: vi.fn().mockResolvedValue(undefined),
}))
```

---

## 2. 코드 패턴 일관성

### 2.1 Server Action 패턴

프로젝트에는 **두 가지 Server Action 반환 패턴**이 공존하며, 이것이 가장 큰 일관성 이슈이다.

#### 패턴 A: FormState 패턴 (초기 구현)

`src/lib/actions/auth/login.ts`, `src/lib/actions/student/crud.ts`, `src/lib/actions/teacher/crud.ts` 에서 사용.

```typescript
// 타입: 파일별로 로컬 정의
export type StudentFormState = {
  errors?: {
    name?: string[]
    birthDate?: string[]
    _form?: string[]
  }
  message?: string
  success?: boolean
}

// 사용: React의 useActionState와 직접 연동
export async function createStudent(
  prevState: StudentFormState,
  formData: FormData
): Promise<StudentFormState> {
  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors }
  }
  // ...
  return { errors: { _form: ["에러 메시지"] } }
}
```

#### 패턴 B: ActionResult 패턴 (표준화된 구현)

`src/lib/errors/action-result.ts`에 정의. 27개 Server Action 파일에서 사용 중.

```typescript
import { ok, fail, type ActionResult } from "@/lib/errors/action-result"

export async function getStudentsAction(): Promise<ActionResult<StudentListData>> {
  try {
    const students = await db.student.findMany(...)
    return ok({ data: students })
  } catch (error) {
    logger.error({ err: error }, 'Failed to get students')
    return fail("학생 목록 조회 중 오류가 발생했습니다.")
  }
}
```

#### 혼재 현황

| 패턴 | 사용 파일 수 | 주요 영역 |
|------|-------------|-----------|
| FormState | ~7개 | auth, student/teacher CRUD (폼 제출) |
| ActionResult | 27개 | 조회, 분석, 매칭, 상담 AI 등 |

**`src/lib/actions/student/crud.ts` 파일은 양쪽 패턴을 모두 사용** -- `createStudent`는 FormState, `getStudentsAction`는 ActionResult를 반환한다.

### 2.2 에러 처리 패턴

Server Action에서의 에러 처리는 일관된다:

```typescript
try {
  // 비즈니스 로직
  return ok(result)  // 또는 FormState 반환
} catch (error) {
  logger.error({ err: error }, '영문 에러 설명')  // pino 로그
  return fail("한국어 사용자 에러 메시지")        // 또는 FormState 에러
}
```

**특이 사항:**
- `logger.error`의 메시지는 영문, 사용자 반환 에러는 한국어 -- 이 규칙은 잘 지켜지고 있다
- 에러 객체를 `{ err: error }` 형태로 전달 (pino 권장 패턴)

### 2.3 Zod 검증 패턴

```typescript
// 1. 스키마 정의 (파일 상단)
const GradeSchema = z.object({
  subject: z.string().min(1, "과목명을 입력해주세요."),
  score: z.coerce.number().min(0).max(100, "0~100 사이의 점수를 입력해주세요."),
})

// 2. safeParse 사용
const validatedFields = Schema.safeParse(rawData)
if (!validatedFields.success) {
  return { errors: validatedFields.error.flatten().fieldErrors }
}

// 3. 또는 parse 사용 (try-catch 내부에서)
const validatedData = GradeSchema.parse(rawData)
```

**safeParse vs parse 혼용:** 대부분 `safeParse`를 사용하나, `src/lib/actions/student/grade.ts`는 `parse`를 사용한다. `safeParse`가 표준 패턴이다.

### 2.4 타입 정의 방식

- `type` 키워드 사용 (interface 거의 없음, RequestMetadata 같은 일부 제외)
- Zod 스키마에서 `z.infer<typeof Schema>` 로 타입 추출
- Prisma enum은 `@/lib/db`에서 re-export
- 공유 enum은 `src/shared/types/enums.ts`에 별도 정의 (TypeScript union literal 방식)

---

## 3. 공통 컴포넌트 재사용성

### 3.1 UI 컴포넌트 (`src/components/ui/`)

26개 기본 UI 컴포넌트. **shadcn/ui 기반**이며, CVA(class-variance-authority) + Radix UI 패턴을 따른다.

| 컴포넌트 | 파일 |
|----------|------|
| Button | `src/components/ui/button.tsx` |
| Card | `src/components/ui/card.tsx` |
| Dialog | `src/components/ui/dialog.tsx` |
| Form | `src/components/ui/form.tsx` |
| Input | `src/components/ui/input.tsx` |
| Select | `src/components/ui/select.tsx` |
| Table | `src/components/ui/table.tsx` |
| Tabs | `src/components/ui/tabs.tsx` |
| ... | 총 26개 |

**스타일 패턴:**

```typescript
import { cn } from "@/lib/utils"   // clsx + tailwind-merge
import { cva, type VariantProps } from "class-variance-authority"

const buttonVariants = cva("base-classes", {
  variants: {
    variant: { default: "...", destructive: "...", outline: "..." },
    size: { default: "...", sm: "...", lg: "...", icon: "..." },
  },
  defaultVariants: { variant: "default", size: "default" },
})
```

`cn` 유틸리티 위치: `src/lib/utils.ts` (31개 파일에서 import)

### 3.2 Common 컴포넌트 (`src/components/common/`)

| 파일 | 용도 |
|------|------|
| `analysis-panel.tsx` | 분석 결과 표시 공통 패널 |
| `saju-panel.tsx` | 사주 정보 표시 패널 |
| `notification-provider.tsx` | 알림 컨텍스트 제공 |
| `saju-utils.ts` | 사주 관련 유틸리티 |

**재사용성 평가:** 도메인 특화 컴포넌트가 common에 있음 (`saju-panel`, `saju-utils`). 이들은 `components/students/` 또는 `features/analysis/` 쪽이 더 적절할 수 있다.

### 3.3 도메인별 컴포넌트

`src/components/` 아래 20개 이상의 도메인 디렉토리:

```
src/components/
├── admin/          # 관리자 탭, LLM 설정 UI
├── analytics/      # 분석 대시보드 차트
├── assignment/     # 배정 폼, 도움말
├── auth/           # 로그인/회원가입 폼
├── chat/           # 채팅 UI (사이드바, 메시지, 입력)
├── compatibility/  # 궁합 점수 카드, 레이더 차트
├── counseling/     # 상담 예약, 세션 폼
├── grades/         # 성적 관리 UI
├── layout/         # 네비게이션, 사용자 메뉴
├── matching/       # 매칭 UI
├── mbti/           # MBTI 설문/결과
├── satisfaction/   # 만족도 조사
├── statistics/     # 통계 대시보드
├── students/       # 학생 상세, 분석 패널들
├── teachers/       # 교사 상세, 분석
├── ui/             # shadcn/ui 기본 컴포넌트
└── vark/           # VARK 설문/결과
```

**주요 재사용 이슈:**
- `src/components/compatibility/compatibility-score-card.tsx`와 `src/components/counseling/compatibility-score-card.tsx` -- 이름이 동일한 두 컴포넌트 존재
- 분석 패널 컴포넌트(`saju-analysis-panel`, `face-analysis-panel`, `palm-analysis-panel` 등)가 유사한 구조를 가지나 각각 독립 구현

---

## 4. 타입 안전성

### 4.1 TypeScript 설정

`tsconfig.json` 핵심 설정:

```json
{
  "compilerOptions": {
    "strict": true,         // strict 모드 활성화
    "noEmit": true,         // Next.js가 빌드 담당
    "skipLibCheck": true,   // 라이브러리 타입 체크 스킵
    "paths": { "@/*": ["./src/*"] }
  }
}
```

**`strict: true` 활성화** -- 이것은 `strictNullChecks`, `strictFunctionTypes`, `noImplicitAny` 등을 모두 포함한다. 좋은 설정이다.

### 4.2 ESLint TypeScript 규칙

`eslint.config.mjs`에서:

```javascript
"@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
"@typescript-eslint/no-explicit-any": "warn",  // error가 아닌 warn
```

`no-explicit-any`가 `warn` -- `any` 사용을 완전히 차단하지 않는다.

### 4.3 Zod 스키마 활용

**일관성 높음:** 모든 사용자 입력은 Zod 스키마를 통해 검증된다.

| 스키마 위치 | 용도 | 파일 수 |
|------------|------|---------|
| `src/lib/validations/` | Server Action 전용 검증 | 16개 |
| `src/shared/validations/` | 공유 검증 스키마 | 11개 |
| Server Action 파일 내 인라인 | 해당 Action에서만 사용 | ~3개 |

**패턴:**
```typescript
// 한국어 에러 메시지 포함 스키마
export const CreateStudentSchema = z.object({
  name: z.string().min(2, "이름은 2자 이상이어야 해요"),
  birthDate: z.string().refine(val => !Number.isNaN(new Date(val).getTime()), "올바른 생년월일을 입력해주세요"),
})

// 스키마에서 타입 추출
export type CreateStudentInput = z.infer<typeof CreateStudentSchema>
```

### 4.4 Shared Types

`src/shared/types/enums.ts` -- Prisma enum의 TypeScript 대응 타입을 union literal로 정의:

```typescript
export type Role = "DIRECTOR" | "TEAM_LEADER" | "MANAGER" | "TEACHER"
export type BloodType = "A" | "B" | "AB" | "O"
export type CounselingType = "ACADEMIC" | "CAREER" | "PSYCHOLOGICAL" | "BEHAVIORAL"
```

Prisma의 `@prisma/client`가 이미 enum 타입을 제공하지만, `@/lib/db`에서 접근 불가능한 레이어(shared, components)를 위해 별도 정의한다.

---

## 5. 로깅 전략

### 5.1 pino 설정

**설정 파일:** `src/lib/logger/index.ts`

```typescript
const loggerOptions: pino.LoggerOptions = {
  level: isDevelopment ? 'debug' : 'info',
  enabled: !isTest,                      // 테스트 시 비활성화
  redact: {
    paths: ['password', 'token', 'apiKey', '*.password', '*.token',
            'req.headers.authorization', 'req.headers.cookie'],
    remove: true,                        // 값을 제거 (마스킹이 아닌 삭제)
  },
  base: {
    env: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '0.1.0',
  },
}
```

**개발 환경:** `pino-pretty`로 가독성 있는 출력

### 5.2 Request Logger

`src/lib/logger/request.ts` -- Next.js 요청 컨텍스트에서 자녀 로거 생성:

```typescript
export function createRequestLogger(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || uuidv4()
  return logger.child({
    requestId,
    method: req.method,
    pathname: req.nextUrl.pathname,
    ip: forwardedFor || realIp,
    userAgent: userAgent?.slice(0, 200),
  })
}
```

### 5.3 사용 패턴

Server Action에서의 로깅:

```typescript
import { logger } from "@/lib/logger"

// 에러 로깅 (일관된 패턴)
logger.error({ err: error }, 'Failed to create student')      // 영문 메시지
logger.error({ detail: imageResult.error }, 'Failed to save student image')

// 일반 로깅 (드물게 사용)
logger.info({ studentId }, 'Student created successfully')
```

**주요 관찰:**
- 에러 로깅은 일관되게 사용
- 성공/정보 로깅은 거의 없음 -- 디버깅 시 추적 어려움
- Request Logger (`createRequestLogger`)의 실제 사용 빈도가 낮아 보임 (API Route에서만 가능)

---

## 6. 에러 핸들링 패턴

### 6.1 ActionResult 시스템 (`src/lib/errors/action-result.ts`)

**표준 반환 타입:**

```typescript
type ActionResult<T> = ActionSuccess<T> | ActionFailure | ActionFieldError
type ActionVoidResult = ActionVoidSuccess | ActionFailure | ActionFieldError

// 헬퍼 함수
ok<T>(data: T): ActionSuccess<T>
okVoid(): ActionVoidSuccess
fail(error: string, code?: string): ActionFailure
fieldError(fieldErrors: Record<string, string[]>, error?: string): ActionFieldError

// 타입 가드
isOk(result): boolean
isFieldError(result): boolean
```

### 6.2 Stale Deployment 에러 처리

`src/lib/errors/stale-deployment.ts` -- 배포 후 캐시 불일치 자동 감지:

```typescript
export function handleStaleDeploymentError(error: unknown): boolean {
  if (!isStaleDeploymentError(error)) return false
  toast.info('새 버전이 배포되었습니다. 페이지를 새로고침합니다.')
  setTimeout(() => window.location.reload(), 1500)
  return true
}
```

### 6.3 FSD 레이어 경계 보호

ESLint `boundaries` 플러그인으로 레이어 간 잘못된 import를 감지:

```javascript
// components -> app import 금지
// features -> app, components import 금지
// lib -> app, components import 금지
// shared -> app, components, features import 금지
```

현재 **"warn"** 레벨 -- 위반해도 빌드가 중단되지 않는다.

---

## 7. 코드 중복 분석

### 7.1 심각한 중복: action-result.ts

**파일 A:** `src/lib/errors/action-result.ts` (118줄)
**파일 B:** `src/shared/errors/action-result.ts` (77줄)

**내용이 완전히 동일하다** (세미콜론 스타일만 다름). 두 파일 모두 같은 타입과 헬퍼 함수를 정의한다.

**현재 사용 현황:**
- `@/lib/errors/action-result` -- 27개 파일에서 import
- `@/shared/errors/action-result` -- 0개 파일에서 직접 import (barrel export를 통해 `@/shared`에서 간접 접근 가능하나 실제 사용 0)

**권장:** `src/shared/errors/action-result.ts`를 제거하고 `@/lib/errors/action-result`로 통합

### 7.2 심각한 중복: Validation 스키마

| 중복 파일 쌍 | 내용 |
|-------------|------|
| `src/lib/validations/students.ts` <-> `src/shared/validations/students.ts` | CreateStudentSchema, UpdateStudentSchema 등 **완전 동일** |
| `src/lib/validations/auth.ts` <-> `src/shared/validations/auth.ts` | LoginSchema, SignupSchema 등 **완전 동일** |

**원인 추정:** FSD 아키텍처 도입 시 `lib` -> `shared` 마이그레이션 과정에서 원본을 제거하지 않았다.

**현재 import 현황:**
- `src/lib/validations/` -- Server Action에서 직접 import (27개+)
- `src/shared/validations/` -- barrel export(`@/shared`)를 통해 일부 접근 (8개), 또한 `src/shared/validations/index.ts`가 `@/lib/validations/counseling`을 re-export

### 7.3 세미콜론 스타일 불일치

| 스타일 | 사용 영역 |
|--------|----------|
| **세미콜론 없음** | `src/lib/errors/action-result.ts`, `src/lib/validations/auth.ts`, 대부분의 Server Actions |
| **세미콜론 있음** | `src/shared/errors/action-result.ts`, `src/shared/validations/auth.ts`, `src/lib/actions/student/grade.ts` |

**Prettier가 설정되어 있지 않다** (`.prettierrc` 파일 없음). `prettier` 패키지는 devDependencies에 존재하지만, 설정 파일과 스크립트(`format` 등)가 없다.

### 7.4 Server Action 구조 중복

`src/lib/actions/student/index.ts`에 주석이 중복 문제를 직접 언급:

```typescript
// crud.ts와 detail.ts에 중복 export가 있으므로 개별 파일에서 직접 import 필요
// (deleteStudent, getStudents가 양쪽에 존재)
```

```typescript
// name-interpretation.ts와 calculation-analysis.ts에 runNameAnalysis 중복
// export * from "./name-interpretation";
```

### 7.5 분석 패널 컴포넌트 구조 유사성

`src/components/students/` 디렉토리에 유사 구조의 분석 패널이 7개 존재:
- `saju-analysis-panel.tsx`
- `face-analysis-panel.tsx`
- `palm-analysis-panel.tsx`
- `mbti-analysis-panel.tsx` (별도 디렉토리 `src/components/mbti/`)
- `vark-analysis-panel.tsx`
- `name-analysis-panel.tsx`
- `zodiac-analysis-panel.tsx`

동일하게 교사 쪽에도:
- `src/components/teachers/teacher-saju-panel.tsx`
- `src/components/teachers/teacher-face-panel.tsx`
- `src/components/teachers/teacher-palm-panel.tsx`
- `src/components/teachers/teacher-name-panel.tsx`
- `src/components/teachers/teacher-mbti-panel.tsx`

**공통 추상화 가능성 있음** -- `src/components/common/analysis-panel.tsx`가 이미 존재하나, 개별 패널이 이를 충분히 활용하는지 확인 필요.

---

## 8. FSD 아키텍처 준수도

### 8.1 레이어 의존성 방향

ESLint `boundaries` 플러그인 설정:

```
app → 모든 레이어 사용 가능
components → features, lib, hooks, shared, types, i18n, data, messages
features → lib, hooks, shared, types
lib → features, hooks, shared, types (단, app/components 금지)
shared, types → 자신 + 하위만 (상위 레이어 금지)
```

**위반 수준:** `warn` (빌드 중단 안 됨)

### 8.2 feature 모듈 구조

```
src/features/
├── ai-engine/      # LLM 통합, 라우팅, 페일오버
├── analysis/       # 분석 (사주, MBTI, VARK, 궁합 등)
├── counseling/     # 상담 리포지토리
├── grade-management/ # 성적 OCR, 분석, 비교
├── matching/       # 자동 배정 알고리즘
└── report/         # 리포트 생성 (PDF)
```

각 feature는 `index.ts` 배럴을 통해 public API를 노출한다.

---

## 9. 대용량 파일 분석 (복잡도 위험)

500줄 이상 파일 목록 (상위 10개):

| 파일 | 줄 수 | 위험 평가 |
|------|-------|----------|
| `src/lib/help/help-content.ts` | 1,294 | 낮음 (정적 콘텐츠) |
| `src/features/ai-engine/prompts/saju.ts` | 733 | 낮음 (프롬프트 텍스트) |
| `src/lib/chat/mention-resolver.ts` | 701 | **높음** (복잡한 로직) |
| `src/lib/actions/teacher/analysis.ts` | 629 | **높음** (비즈니스 로직) |
| `src/features/analysis/name/hanja-strokes-data.ts` | 606 | 낮음 (데이터) |
| `src/lib/actions/student/crud.ts` | 597 | **높음** (CRUD + 복잡한 update) |
| `src/lib/db/common/performance.ts` | 590 | 중간 (DB 쿼리) |
| `src/components/admin/tabs/saju-prompts-tab.tsx` | 563 | 중간 (UI) |
| `src/features/ai-engine/templates.ts` | 561 | 낮음 (설정 데이터) |
| `src/lib/actions/counseling/ai.ts` | 514 | **높음** (AI 통합) |

---

## 10. TODO/FIXME 현황

| 위치 | 내용 | 심각도 |
|------|------|--------|
| `src/lib/actions/student/analysis.ts:41` | `TODO: 실제 LLM (OpenAI/Claude) 연동` | 높음 -- 스텁 코드 |
| `src/lib/actions/student/parent-report.ts:67` | `TODO: 실제 발송 로직` | 높음 -- 미구현 기능 |
| `src/app/[locale]/(dashboard)/analytics/page.tsx:87` | `TODO: 실제 GradeHistory 데이터 집계 로직 구현` | 높음 -- 미구현 |
| `src/lib/actions/teacher/palm-analysis.ts:124` | `TODO: Add RBAC check based on teacher roles` | 중간 -- 권한 체크 누락 |
| `src/features/ai-engine/adapters/openrouter.ts:197` | `TODO(human): 모델 ID를 사람이 읽기 좋은 표시명으로 변환` | 낮음 |
| `src/components/admin/tabs/teams-tab.tsx:132` | `TODO(human): 삭제 확인 후 실행하는 handleDelete 함수 구현` | 중간 |
| `src/components/admin/tabs/saju-prompts-tab.tsx:342` | `TODO(human): 프롬프트 템플릿 편집기` | 낮음 |
| `src/components/help/inline-help.tsx:163` | `TODO: 관련 주제로 이동` | 낮음 |
| `src/components/assignment/assignment-help-dialog.tsx:385` | `TODO(human): FAQ 항목 추가` | 낮음 |

`TODO(human)` 태그는 사람의 판단이 필요한 항목을 표시하는 프로젝트 컨벤션이다.

---

## 11. 권장 개선 사항 (우선순위별)

### P0: 즉시 수정

1. **중복 파일 제거** -- `src/shared/errors/action-result.ts`, `src/shared/validations/students.ts`, `src/shared/validations/auth.ts` 중 하나를 canonical source로 정하고 나머지 제거. `@/lib/errors/action-result`가 27개 파일에서 사용되므로 이것을 유지하고 `@/shared/errors`가 이를 re-export하도록 변경.

2. **Prettier 설정 추가** -- `.prettierrc` 파일을 생성하고 `format` 스크립트를 `package.json`에 추가. 세미콜론 규칙 통일.

### P1: 단기 개선

3. **테스트 커버리지 확대** -- Server Actions에 대한 단위 테스트 추가 (최소한 핵심 비즈니스 로직).

4. **ESLint boundaries를 `"error"`로 격상** -- FSD 레이어 위반을 빌드 시 차단.

5. **`no-explicit-any`를 `"error"`로 격상** -- `any` 사용을 점진적으로 제거.

### P2: 중기 개선

6. **Server Action 패턴 통일** -- FormState 패턴을 ActionResult 패턴으로 마이그레이션.

7. **student/crud.ts 리팩토링** -- 597줄 파일을 create/update/delete/list로 분리.

8. **Vitest 환경에 jsdom 추가** -- 컴포넌트 테스트 가능하도록 설정.

9. **E2E 테스트 기본 시나리오 추가** -- `e2e/` 디렉토리가 비어 있음.

### P3: 장기 개선

10. **분석 패널 컴포넌트 추상화** -- 7개 유사 패널의 공통 구조를 HOC/render props로 추출.

11. **hooks 디렉토리 통합** -- `src/hooks/`와 `src/lib/hooks/`가 분리되어 있음. 한 곳으로 통합.

---

*분석 완료: 2026-02-27*
