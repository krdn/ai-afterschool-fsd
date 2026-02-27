# AI Afterschool FSD

AI 기반 방과후학교 관리 시스템. 학생/교사 관리, 성격 분석(사주/MBTI/VARK), 성적 관리(OCR), 상담, 매칭을 제공.

## 기술 스택

- **프레임워크**: Next.js 15 (App Router, `output: standalone`) + React 19 + TypeScript 5.5+
- **스타일링**: Tailwind CSS 4 + shadcn/ui (CVA) + Radix UI
- **DB**: PostgreSQL + Prisma 7 (`@prisma/adapter-pg`, 42+ 모델)
- **AI**: Vercel AI SDK v6 (11개 LLM provider) + Universal Router 패턴
- **인증**: 커스텀 JWT (jose, HS256) + argon2 + RLS
- **i18n**: next-intl (ko/en)
- **테스트**: Vitest 4 (단위) + Playwright (E2E, 미작성)
- **배포**: Docker (multi-stage) + GitHub Actions (self-hosted runner)
- **패키지 매니저**: pnpm, `@/*` = `./src/*`

## 아키텍처 (FSD - Feature-Sliced Design)

### 레이어 의존 방향 (위 → 아래만 허용)

```
app          → 모든 레이어 import 가능 (pages, layouts, API routes)
components   → features, lib, shared (app import 금지)
features     → lib, shared (app, components import 금지)
lib          → features, shared (★ FSD 변형: Server Actions가 feature 서비스 호출)
shared       → 없음 (최하위 레이어)
```

**강제**: `eslint-plugin-boundaries` (현재 warn 레벨)

### Feature Slices (6개)

| Feature | 경로 | 책임 |
|---------|------|------|
| `ai-engine` | `src/features/ai-engine/` | LLM 라우팅, 페일오버, 사용량 추적, 프롬프트 |
| `analysis` | `src/features/analysis/` | 사주, 이름, MBTI, VARK, 띠, 궁합 분석 |
| `counseling` | `src/features/counseling/` | 상담 예약/세션 관리 |
| `grade-management` | `src/features/grade-management/` | OCR 성적 추출, AI 분석, 동료비교, 학부모 리포트 |
| `matching` | `src/features/matching/` | 교사-학생 자동배정, 공정성 메트릭 |
| `report` | `src/features/report/` | PDF 리포트 생성 (@react-pdf/renderer) |

## 핵심 데이터 흐름

### Server Component 조회

```
page.tsx → getCurrentTeacher() → db.xxx.findMany() → <ClientComponent data={...} />
```

### Server Action 변경

```
Client Component → Server Action (lib/actions/)
  → getCurrentTeacher() / verifySession()    # 인증
  → Zod schema validation                   # 검증
  → Feature Service (features/)             # 비즈니스 로직
  → revalidatePath()                        # 캐시 무효화
  → return ok(data) / fail(message)         # ActionResult 반환
```

### AI 분석 파이프라인

```
Vision LLM (OCR) → extractJsonFromLLM() → Zod 검증 → DB 저장
→ 분석 서비스 → generateWithProvider() → LearningAnalysis 캐시 (24h TTL)
```

## 코드 추가 가이드

### 새 기능 추가 순서

1. **Feature**: `src/features/<name>/` (서비스, 타입, 리포지토리, 테스트)
2. **Server Action**: `src/lib/actions/<domain>/` (`"use server"` + 인증 + ok/fail)
3. **Component**: `src/components/<domain>/` (Client Component)
4. **Page**: `src/app/[locale]/(dashboard)/<route>/page.tsx` (Server Component)
5. **Validation**: `src/shared/validations/` 또는 `src/lib/validations/`

### Server Action 템플릿

```typescript
'use server';
import { getCurrentTeacher } from '@/lib/dal';
import { ok, fail, type ActionResult } from '@/lib/errors/action-result';
import { logger } from '@/lib/logger';

export async function myAction(input: string): Promise<ActionResult<MyType>> {
  try {
    const teacher = await getCurrentTeacher();
    const result = await featureService(input, teacher.id);
    revalidatePath('/path');
    return ok(result);
  } catch (error) {
    logger.error({ err: error }, 'Failed to do something');
    return fail(error instanceof Error ? error.message : '오류가 발생했습니다.');
  }
}
```

### LLM 기능 추가

1. `src/features/ai-engine/providers/types.ts`에 `FeatureType` 추가
2. DB `FeatureMapping`에 매핑 생성 (Admin UI)
3. `generateWithProvider({ featureType: 'new_feature', prompt, systemPrompt })` 호출

### DB 스키마 변경

```bash
# 스키마 수정 후
pnpm db:push        # 개발 환경 반영
pnpm db:generate    # 타입 재생성
```

## 핵심 인프라 파일

| 파일 | 역할 |
|------|------|
| `src/lib/dal.ts` | 인증(verifySession) + RBAC + RLS 컨텍스트 |
| `src/lib/session.ts` | JWT 세션 (생성/검증/삭제, 7일 만료) |
| `src/lib/db/client.ts` | Prisma 싱글톤 (pg Pool, max:10) |
| `src/lib/errors/action-result.ts` | ActionResult 패턴 (ok/fail/fieldError) |
| `src/middleware.ts` | Edge 미들웨어 (인증 + i18n + Request ID) |
| `src/features/ai-engine/universal-router.ts` | LLM 라우팅/페일오버 핵심 |

## 컨벤션

- **파일명**: kebab-case (`grade-dashboard.tsx`)
- **테스트**: `__tests__/` 디렉토리, `describe` 한국어, vitest
- **로깅**: `logger.error({ err: error }, '영문 메시지')` / 사용자 에러는 한국어
- **인증**: 모든 Server Action 첫 줄에 `verifySession()` 또는 `getCurrentTeacher()` 필수
- **검증**: Zod `safeParse()` 사용 (parse 아님)
- **타입**: `type` 키워드 사용 (interface 지양), Zod에서 `z.infer<>` 추출
- **Import**: `@/` 경로 별칭 사용

## 알려진 이슈

- **Server Action 패턴 혼재**: FormState(폼 전용, useActionState) vs ActionResult(데이터 조회) - 양립 의도적
- **FSD feature 간 import**: `grade-management → ai-engine` 등 하향식 일방향만 존재 (순환 없음)
- **테스트 커버리지**: 2.8% (19/688 파일). Server Actions/API Routes 테스트 전무
- **Validation 정의 위치**: canonical source는 `src/lib/validations/`, `src/shared/validations/`는 re-export

## 주요 명령어

```bash
pnpm dev              # 개발 서버 (Turbopack)
pnpm build            # 프로덕션 빌드
pnpm lint             # ESLint
pnpm typecheck        # TypeScript 타입 체크
pnpm test             # Vitest 단위 테스트
pnpm test:e2e         # Playwright E2E
pnpm format           # Prettier 포맷팅
pnpm format:check     # 포맷팅 체크
pnpm db:generate      # Prisma 클라이언트 생성
pnpm db:push          # 스키마 DB 반영
pnpm db:seed          # 시드 데이터 (dotenv -e .env)
```

## 상세 분석 문서

- `docs/codebase-analysis/tech-stack.md` - 기술 스택 상세
- `docs/codebase-analysis/architecture.md` - 아키텍처 분석
- `docs/codebase-analysis/structure.md` - 디렉토리 구조
- `docs/codebase-analysis/code-quality.md` - 코드 품질 분석
- `docs/codebase-analysis/concerns.md` - 우려 사항 및 기술 부채
