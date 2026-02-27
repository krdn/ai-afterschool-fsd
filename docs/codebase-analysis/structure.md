# Codebase Structure

**Analysis Date:** 2026-02-27

## Directory Layout

```
ai-afterschool-fsd/
├── src/
│   ├── app/                        # Next.js App Router (pages, layouts, API routes)
│   │   ├── layout.tsx              # Root layout (pass-through)
│   │   ├── page.tsx                # Root redirect
│   │   ├── [locale]/               # i18n 동적 세그먼트 (ko, en)
│   │   │   ├── layout.tsx          # Locale layout (font, i18n provider)
│   │   │   ├── page.tsx            # → /auth/login redirect
│   │   │   ├── (dashboard)/        # 인증 필요 라우트 그룹
│   │   │   │   ├── layout.tsx      # 헤더, 네비게이션, 역할별 메뉴
│   │   │   │   ├── students/       # 학생 관리
│   │   │   │   ├── teachers/       # 교사 관리
│   │   │   │   ├── grades/         # 성적 관리
│   │   │   │   ├── counseling/     # 상담 관리
│   │   │   │   ├── matching/       # 매칭
│   │   │   │   ├── chat/           # AI 챗
│   │   │   │   ├── analytics/      # 통계
│   │   │   │   ├── teams/          # 팀 관리
│   │   │   │   ├── satisfaction/   # 만족도
│   │   │   │   ├── issues/         # 이슈 관리
│   │   │   │   └── admin/          # 관리자 (DB, 프롬프트, LLM 사용량, 팀)
│   │   │   ├── auth/               # 인증 (login, register, reset-password)
│   │   │   ├── admin/              # LLM 프로바이더/기능 관리 (별도 레이아웃)
│   │   │   └── debug-markdown/     # 디버그 페이지
│   │   └── api/                    # API 라우트 (locale 밖)
│   │       ├── chat/               # AI 채팅 스트리밍 + 멘션
│   │       ├── health/             # 헬스체크
│   │       ├── providers/          # LLM 프로바이더 CRUD
│   │       ├── feature-mappings/   # 기능-모델 매핑
│   │       ├── students/           # 학생 API + 리포트
│   │       ├── compatibility/      # 궁합 계산
│   │       ├── upload/             # 파일 업로드
│   │       ├── cloudinary/         # Cloudinary 서명
│   │       ├── cron/               # 배치 작업
│   │       ├── internal/           # 이슈 트래킹
│   │       ├── events/             # SSE 이벤트
│   │       ├── llm/                # LLM 테스트
│   │       └── teams/              # 팀 API
│   ├── components/                 # UI 컴포넌트
│   │   ├── ui/                     # shadcn/ui 원자 컴포넌트 (26종)
│   │   ├── common/                 # 공통 (NotificationProvider + 테스트)
│   │   ├── layout/                 # 레이아웃 (notification-bell, user-menu 등)
│   │   ├── auth/                   # 인증 폼
│   │   ├── students/               # 학생 관련 (tabs/ 하위)
│   │   ├── teachers/               # 교사 관련
│   │   ├── grades/                 # 성적관리 (14 컴포넌트)
│   │   ├── counseling/             # 상담 (session-live/, wizard/)
│   │   ├── chat/                   # AI 채팅
│   │   ├── matching/               # 매칭
│   │   ├── mbti/                   # MBTI 설문
│   │   ├── vark/                   # VARK 설문
│   │   ├── compatibility/          # 궁합
│   │   ├── analytics/              # 분석 차트
│   │   ├── statistics/             # 통계
│   │   ├── satisfaction/           # 만족도
│   │   ├── issues/                 # 이슈
│   │   ├── admin/                  # 관리자 패널
│   │   ├── assignment/             # 배정 제안
│   │   ├── help/                   # 도움말
│   │   ├── dev/                    # 개발 전용 (DevUserSwitcher)
│   │   └── errors/                 # 에러 바운더리
│   ├── features/                   # 비즈니스 도메인 로직 (6 slices)
│   │   ├── ai-engine/              # LLM 통합 허브
│   │   ├── analysis/               # 성격/적성 분석
│   │   ├── counseling/             # 상담 도메인
│   │   ├── grade-management/       # 성적 관리
│   │   ├── matching/               # 교사-학생 매칭
│   │   └── report/                 # PDF 리포트 생성
│   ├── lib/                        # 인프라/서비스 레이어
│   │   ├── actions/                # Server Actions (도메인별 하위)
│   │   ├── db/                     # Prisma 클라이언트, RBAC
│   │   ├── errors/                 # ActionResult 패턴
│   │   ├── validations/            # Zod 스키마
│   │   ├── analysis/               # 성적 통계 유틸
│   │   ├── chat/                   # 챗 멘션, 컨텍스트 빌더
│   │   ├── events/                 # SSE 이벤트
│   │   ├── github/                 # GitHub 이슈 연동
│   │   ├── hooks/                  # 서버 사이드 훅
│   │   ├── logger/                 # pino 로거
│   │   ├── optimization/           # 성능 최적화
│   │   ├── screenshot/             # 스크린샷
│   │   ├── storage/                # 파일 스토리지 (local/S3)
│   │   ├── help/                   # 도움말 데이터
│   │   ├── utils/                  # 유틸리티
│   │   ├── cloudinary.ts           # Cloudinary 클라이언트
│   │   ├── dal.ts                  # Data Access Layer (인증, RBAC)
│   │   ├── session.ts              # JWT 세션 관리
│   │   ├── rate-limit.ts           # Rate limiting
│   │   └── utils.ts                # cn() 유틸 (clsx + tailwind-merge)
│   ├── shared/                     # 공용 코드 (최하위 레이어)
│   │   ├── constants/              # 전역 상수
│   │   ├── errors/                 # 에러 타입
│   │   ├── types/                  # 공용 타입 (enums, common)
│   │   ├── utils/                  # 유틸 (extract-json, format-date, pagination 등)
│   │   ├── validations/            # Zod 스키마 (12개)
│   │   └── index.ts                # 배럴 export
│   ├── hooks/                      # 클라이언트 훅
│   │   ├── use-chat-stream.ts      # 채팅 스트리밍 훅
│   │   └── use-mention.ts          # 멘션 입력 훅
│   ├── types/                      # 전역 타입 선언
│   │   ├── counseling.ts
│   │   ├── follow-up.ts
│   │   ├── llm-usage.ts
│   │   ├── statistics.ts
│   │   └── resend.d.ts
│   ├── data/                       # 정적 데이터
│   │   ├── mbti/                   # MBTI 설문 문항
│   │   └── vark/                   # VARK 설문 문항
│   ├── i18n/                       # 국제화 설정
│   │   ├── routing.ts              # 로케일 정의 (ko, en)
│   │   ├── request.ts              # 서버 요청 핸들러
│   │   └── navigation.ts           # 네비게이션 유틸
│   ├── messages/                   # 번역 파일
│   │   ├── ko.json
│   │   └── en.json
│   ├── middleware.ts               # Edge 미들웨어 (auth + i18n)
│   └── instrumentation.ts         # 서버 초기화 (Sentry)
├── prisma/
│   ├── schema.prisma               # 데이터베이스 스키마 (42+ 모델)
│   ├── seed.ts                     # 시드 데이터
│   └── migrations/                 # 마이그레이션 파일
├── public/                         # 정적 파일
├── scripts/                        # 빌드/배포 스크립트
├── docs/                           # 프로젝트 문서
├── .github/                        # GitHub Actions CI/CD
├── prisma.config.ts                # Prisma 설정
├── next.config.ts                  # Next.js 설정 (Sentry, i18n, Bundle Analyzer)
├── eslint.config.mjs               # ESLint + FSD Boundaries 규칙
├── tailwind.config.ts              # Tailwind 설정
├── tsconfig.json                   # TypeScript 설정
├── vitest.config.ts                # Vitest 테스트 설정
├── playwright.config.ts            # Playwright E2E 설정
├── package.json                    # 의존성 (pnpm)
├── docker-compose.yml              # Docker Compose (프로덕션)
├── docker-compose.test.yml         # Docker Compose (테스트)
├── Dockerfile                      # 컨테이너 빌드
├── sentry.server.config.ts         # Sentry 서버 설정
├── sentry.edge.config.ts           # Sentry Edge 설정
└── instrumentation-client.ts       # Sentry 클라이언트 초기화
```

## Directory Purposes

### `src/app/`
- **Purpose:** Next.js App Router 진입점
- **Contains:** `page.tsx` (Server Components), `layout.tsx`, `loading.tsx`, `route.ts` (API)
- **Key files:**
  - `src/app/[locale]/(dashboard)/layout.tsx` - 대시보드 공통 레이아웃
  - `src/middleware.ts` - 인증 + i18n 미들웨어

### `src/components/`
- **Purpose:** React UI 컴포넌트 (도메인별 하위 디렉토리)
- **Contains:** Client Components (`.tsx`), 각 도메인에 매핑되는 하위 폴더
- **Key files:**
  - `src/components/ui/` - shadcn/ui 원자 컴포넌트
  - `src/components/grades/` - 성적관리 14개 컴포넌트

### `src/features/`
- **Purpose:** 비즈니스 도메인 핵심 로직 (순수 서버 코드)
- **Contains:** 서비스 함수, 알고리즘, 리포지토리, 타입, 테스트
- **Key files:**
  - `src/features/ai-engine/universal-router.ts` - LLM 라우팅 핵심
  - `src/features/grade-management/ocr/ocr-processor.ts` - OCR 핵심
  - `src/features/analysis/index.ts` - 분석 통합 export

### `src/lib/`
- **Purpose:** 인프라 서비스 (DB, 인증, Server Actions, 유틸)
- **Contains:** Server Actions, DB 클라이언트, 세션, 검증, 로거
- **Key files:**
  - `src/lib/dal.ts` - 인증 + RBAC 통합 레이어
  - `src/lib/session.ts` - JWT 세션 관리
  - `src/lib/db/client.ts` - Prisma 싱글톤
  - `src/lib/errors/action-result.ts` - Server Action 반환 타입

### `src/shared/`
- **Purpose:** 모든 레이어 공통 코드 (타입, 유틸, 상수, 검증)
- **Contains:** Enum 타입, 유틸 함수, Zod 스키마, 상수
- **Key files:**
  - `src/shared/types/enums.ts` - 역할, 성적 타입 등 전역 enum
  - `src/shared/utils/extract-json.ts` - LLM JSON 추출
  - `src/shared/validations/` - 12개 Zod 스키마

## Key File Locations

### Entry Points
- `src/app/layout.tsx` - Root layout
- `src/app/[locale]/layout.tsx` - Locale layout (폰트, i18n, Toaster)
- `src/app/[locale]/(dashboard)/layout.tsx` - Dashboard layout (네비, 인증)
- `src/middleware.ts` - Edge 미들웨어

### Configuration
- `next.config.ts` - Next.js + Sentry + i18n + Bundle Analyzer
- `eslint.config.mjs` - ESLint + FSD Boundaries (레이어 규칙)
- `tsconfig.json` - TypeScript (`@/*` = `./src/*`)
- `prisma/schema.prisma` - 42+ 모델 DB 스키마
- `vitest.config.ts` - 유닛 테스트
- `playwright.config.ts` - E2E 테스트

### Core Logic
- `src/features/ai-engine/universal-router.ts` - LLM 생성/스트리밍
- `src/features/ai-engine/feature-resolver.ts` - featureType → 모델 매핑
- `src/features/grade-management/ocr/ocr-processor.ts` - Vision OCR
- `src/features/grade-management/analysis/strength-weakness.ts` - AI 강점/약점 분석
- `src/features/matching/auto-assignment.ts` - 자동 배정 알고리즘
- `src/features/report/generator.ts` - PDF 생성

### Infrastructure
- `src/lib/dal.ts` - Data Access Layer (인증, RBAC)
- `src/lib/session.ts` - JWT 세션 (jose)
- `src/lib/db/client.ts` - Prisma + pg Pool
- `src/lib/db/common/rbac.ts` - RLS + 팀 필터링
- `src/lib/errors/action-result.ts` - 표준 반환 타입
- `src/lib/logger/index.ts` - pino 로거

### Testing
- `src/features/ai-engine/__tests__/` - AI 엔진 테스트
- `src/features/analysis/*/__tests__/` - 분석 테스트
- `src/features/grade-management/*/__tests__/` - 성적관리 테스트
- `src/features/matching/__tests__/` - 매칭 테스트
- `src/shared/utils/__tests__/` - 유틸 테스트
- `src/lib/errors/__tests__/` - 에러 처리 테스트
- `src/components/common/__tests__/` - 공통 컴포넌트 테스트

## Naming Conventions

### Files
- **Components:** `kebab-case.tsx` (예: `grade-dashboard.tsx`, `ocr-upload-page.tsx`)
- **Server Actions:** `kebab-case.ts` (예: `grade-ocr.ts`, `grade-analysis.ts`)
- **Services/Utils:** `kebab-case.ts` (예: `ocr-processor.ts`, `strength-weakness.ts`)
- **Types:** `types.ts` (각 모듈 루트에 1개) 또는 도메인별 `kebab-case.ts`
- **Tests:** `__tests__/kebab-case.test.ts`
- **Index/barrel:** `index.ts` (각 모듈 루트에 re-export)

### Directories
- **Feature slices:** `kebab-case` (예: `ai-engine`, `grade-management`)
- **Sub-modules:** `kebab-case` (예: `peer-comparison`, `session-live`)
- **Test directories:** `__tests__/`

## Where to Add New Code

### New Feature (Feature Slice)
1. **Feature logic:** `src/features/<feature-name>/`
   - `index.ts` (public API barrel export)
   - `types.ts` (타입 정의)
   - 서비스 파일들 (기능별 `kebab-case.ts`)
   - `repositories/` (DB 접근 로직)
   - `__tests__/` (유닛 테스트)
2. **Server Actions:** `src/lib/actions/<domain>/`
   - `"use server"` directive
   - 인증(`getCurrentTeacher()`) → 서비스 호출 → `ok()`/`fail()` 반환
3. **UI Components:** `src/components/<domain>/`
   - Client Components (`.tsx`)
4. **Pages:** `src/app/[locale]/(dashboard)/<route>/page.tsx`
   - Server Component → data fetch → Client Component render
5. **공유 타입/검증:** `src/shared/validations/<schema>.ts`, `src/shared/types/`

### New Component (UI)
- **도메인 컴포넌트:** `src/components/<domain>/<component-name>.tsx`
- **공통 UI 원자:** `src/components/ui/<component-name>.tsx` (shadcn/ui 패턴)
- **레이아웃 컴포넌트:** `src/components/layout/<component-name>.tsx`

### New API Route
- **Location:** `src/app/api/<resource>/route.ts`
- **Pattern:**
  ```typescript
  import { verifySession } from '@/lib/dal';
  export async function POST(request: Request) {
    const session = await verifySession();
    // ... validation, business logic, response
  }
  ```

### New Server Action
- **Location:** `src/lib/actions/<domain>/<action-name>.ts`
- **Pattern:**
  ```typescript
  'use server';
  import { getCurrentTeacher } from '@/lib/dal';
  import { ok, fail, type ActionResult } from '@/lib/errors/action-result';

  export async function myAction(input: string): Promise<ActionResult<MyType>> {
    try {
      const teacher = await getCurrentTeacher();
      // feature service 호출
      return ok(result);
    } catch (error) {
      logger.error({ err: error }, 'Context');
      return fail(error instanceof Error ? error.message : 'Fallback message');
    }
  }
  ```
- **barrel export:** 해당 도메인의 `index.ts`에 `export * from "./action-name"` 추가

### Utilities
- **Shared helpers (모든 레이어):** `src/shared/utils/<helper-name>.ts`
- **Lib helpers (서버 전용):** `src/lib/utils/<helper-name>.ts`
- **Zod 검증 (공유):** `src/shared/validations/<schema-name>.ts`
- **Zod 검증 (서버 전용):** `src/lib/validations/<schema-name>.ts`

### New LLM Feature
1. `src/features/ai-engine/providers/types.ts`에 새 `FeatureType` 추가
2. DB `FeatureMapping` 테이블에 매핑 생성 (Admin UI 또는 시드)
3. 해당 feature에서 `generateWithProvider({ featureType: 'new_feature', ... })` 호출

### Database Schema Change
1. `prisma/schema.prisma` 수정
2. `pnpm db:push` (개발) 또는 마이그레이션 생성
3. `pnpm db:generate` (타입 재생성)
4. 필요 시 `prisma/seed.ts` 업데이트

## Special Directories

### `prisma/`
- **Purpose:** DB 스키마, 마이그레이션, 시드
- **Generated:** `prisma/migrations/` (마이그레이션 자동 생성)
- **Committed:** Yes

### `.next/`
- **Purpose:** Next.js 빌드 캐시
- **Generated:** Yes
- **Committed:** No (`.gitignore`)

### `node_modules/`
- **Purpose:** pnpm 패키지
- **Generated:** Yes
- **Committed:** No

### `.github/`
- **Purpose:** GitHub Actions CI/CD 워크플로우
- **Generated:** No
- **Committed:** Yes

### `.claude/`
- **Purpose:** Claude Code 프로젝트 설정
- **Generated:** No
- **Committed:** Yes

### `.todos/`
- **Purpose:** 프로젝트 TODO 백로그 (`backlog.json`)
- **Generated:** No
- **Committed:** Yes

### `.worktrees/`
- **Purpose:** Git worktree 관리
- **Generated:** Semi-auto
- **Committed:** Yes

### `public/`
- **Purpose:** 정적 파일 (이미지, 아이콘)
- **Generated:** No
- **Committed:** Yes

### `scripts/`
- **Purpose:** 빌드/배포/유틸 스크립트
- **Generated:** No
- **Committed:** Yes

## Import Path Alias

**`@/*` → `./src/*`** (tsconfig.json)

```typescript
// 사용 예시
import { db } from '@/lib/db/client';
import { analyzeStrengthWeakness } from '@/features/grade-management/analysis/strength-weakness';
import { Button } from '@/components/ui/button';
import { extractJsonFromLLM } from '@/shared/utils/extract-json';
```

---

*Structure analysis: 2026-02-27*
