# Technology Stack & External Integrations

**Analysis Date:** 2026-02-27

---

## 1. Languages

**Primary:**
- TypeScript 5.5+ - 전체 프론트엔드/백엔드 코드 (`src/**/*.ts`, `src/**/*.tsx`)
- SQL (PostgreSQL) - 데이터베이스 스키마 (`prisma/schema.prisma`, `prisma/migrations/`)

**Secondary:**
- YAML - CI/CD 워크플로우 (`.github/workflows/`)
- Dockerfile - 컨테이너 빌드 (`Dockerfile`)

## 2. Runtime & Package Manager

**Runtime:**
- Node.js v24 (Dockerfile `node:24-alpine`, CI `node-version: "24"`)

**Package Manager:**
- pnpm (corepack으로 활성화)
- Lockfile: `pnpm-lock.yaml` (lockfileVersion 9.0)
- ESM (`"type": "module"` in `package.json`)

## 3. Frameworks

### Core

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `next` | ^15.5.10 | App Router 기반 풀스택 프레임워크. `output: "standalone"` 모드로 Docker 배포 |
| `react` / `react-dom` | ^19 | UI 렌더링 |
| `tailwindcss` | ^4 | CSS 유틸리티 프레임워크. PostCSS 플러그인(`@tailwindcss/postcss`)으로 통합 |
| `prisma` / `@prisma/client` | ^7.4.1 | ORM. `@prisma/adapter-pg` + `pg` Pool 어댑터로 PostgreSQL 연결 |
| `next-intl` | ^4.8.2 | i18n (한국어/영어). `src/i18n/routing.ts`에서 locale 정의 |

### AI SDK (Vercel AI SDK)

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `ai` | ^6.0.101 | Vercel AI SDK 코어. `generateText`, `streamText` 등 통합 인터페이스 |
| `@ai-sdk/openai` | ^3.0.34 | OpenAI (GPT-4o 기본) |
| `@ai-sdk/anthropic` | ^3.0.44 | Anthropic (Claude Sonnet 4.5 기본) |
| `@ai-sdk/google` | ^3.0.18 | Google (Gemini 2.5 Flash 기본) |
| `@ai-sdk/deepseek` | ^2.0.18 | DeepSeek (deepseek-chat 기본) |
| `@ai-sdk/mistral` | ^3.0.19 | Mistral (mistral-large-latest 기본) |
| `@ai-sdk/cohere` | ^3.0.19 | Cohere (command-r-plus 기본) |
| `@ai-sdk/xai` | ^3.0.50 | xAI (Grok-3 기본) |
| `@ai-sdk/openai-compatible` | ^2.0.30 | OpenAI-호환 API용 (Moonshot, OpenRouter) |
| `zhipu-ai-provider` | ^0.2.2 | Zhipu AI (GLM-4V-Plus 기본) |
| `ollama-ai-provider-v2` | ^3.0.3 | Ollama 로컬 LLM (llama3.2:3b 기본) |
| `@anthropic-ai/sdk` | ^0.71.2 | Anthropic 직접 SDK (AI SDK와 별도, `src/features/ai-engine/claude.ts`) |

### Testing

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `vitest` | ^4 | 단위 테스트 러너 |
| `@playwright/test` | ^1.58.2 | E2E 테스트 (Chromium만 설정) |

### Build & Dev Tools

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `typescript` | ^5.5.0 | 타입 체크 (`tsc --noEmit`) |
| `eslint` | ^10.0.0 | 린트 (flat config, `eslint.config.mjs`) |
| `typescript-eslint` | ^8.56.0 | TypeScript ESLint 파서 + 규칙 |
| `eslint-plugin-boundaries` | ^5.4.0 | FSD 레이어 경계 규칙 강제 |
| `prettier` | ^3 | 코드 포맷팅 (`.prettierrc` 파일 없음, 기본 설정 사용) |
| `turbo` | ^2 | Turbopack (dev 서버: `next dev --turbo`) |
| `@next/bundle-analyzer` | ^16.1.6 | 번들 크기 분석 (`ANALYZE=true`로 활성화) |
| `syncpack` | ^14.0.0 | 의존성 버전 동기화 |
| `tsx` | ^4 | TypeScript 실행 (Prisma seed 등) |
| `tsup` | ^8 | TypeScript 번들러 |
| `dotenv-cli` | ^8.0.0 | seed 스크립트 환경 변수 주입 (`dotenv -e .env --`) |

## 4. Key Dependencies (UI / Utilities)

### UI 컴포넌트

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `radix-ui` | ^1.4.3 | Headless UI 프리미티브 (Select, Label, Slot 등) |
| `class-variance-authority` | ^0.7.1 | 컴포넌트 variant 스타일링 |
| `clsx` / `tailwind-merge` | ^2.1.1 / ^3.4.0 | 조건부 클래스 조합 |
| `lucide-react` | ^0.563.0 | 아이콘 |
| `sonner` | ^2.0.7 | 토스트 알림 |
| `cmdk` | ^1.1.1 | Command Palette |
| `tw-animate-css` | ^1.4.0 | CSS 애니메이션 |
| `next-themes` | ^0.4 | 다크/라이트 테마 전환 |

### 데이터 & 폼

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `react-hook-form` | ^7 | 폼 상태 관리 (13개 폼 컴포넌트에서 사용) |
| `@hookform/resolvers` | ^5.2.2 | Zod 스키마와 react-hook-form 통합 |
| `zod` | ^4.3.6 | 스키마 기반 유효성 검증 (15개+ 파일에서 사용) |
| `@tanstack/react-table` | ^8.21.3 | 데이터 테이블 (`src/components/students/columns.tsx`, `src/components/teachers/columns.tsx`) |
| `recharts` | ^3.7.0 | 차트 (7개 차트 컴포넌트: 성적 추이, MBTI 분포, 상담 유형 등) |
| `react-day-picker` | ^9.13.0 | 날짜 선택 |

### 콘텐츠 & 마크다운

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `react-markdown` | ^10.1.0 | 마크다운 렌더링 |
| `remark-gfm` | ^4.0.1 | GitHub Flavored Markdown |
| `remark-breaks` | ^4.0.0 | 줄바꿈 처리 |
| `rehype-highlight` | ^7.0.2 | 코드 구문 강조 |
| `rehype-raw` | ^7.0.0 | 원시 HTML 렌더링 |
| `highlight.js` | ^11.11.1 | 코드 하이라이팅 |

### 기타 유틸리티

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `date-fns` | ^4.1.0 | 날짜 처리 |
| `uuid` | ^13.0.0 | UUID 생성 |
| `use-debounce` | ^10.1.0 | 디바운스 훅 |
| `sharp` | ^0.34.5 | 이미지 최적화 (Next.js Image) |
| `react-resizable-panels` | ^4.6.5 | 리사이즈 가능 패널 레이아웃 |
| `react-mentions-ts` | 5.4.7 | 멘션 입력 |
| `modern-screenshot` | ^4.6.8 | DOM 스크린샷 캡처 |

## 5. Database

### PostgreSQL + Prisma

**ORM:** Prisma v7.4.1
- Config: `prisma.config.ts` (dotenv로 `.env.local` 로드)
- Schema: `prisma/schema.prisma`
- Migrations: `prisma/migrations/`
- Seed: `prisma/seed.ts` → `tsx` 실행
- Client: `src/lib/db/client.ts` (싱글톤 패턴, `@prisma/adapter-pg` 사용)

**Connection:** `pg` Pool (`max: 10`, `idleTimeoutMillis: 30000`, `connectionTimeoutMillis: 2000`)

**환경 변수:** `DATABASE_URL`

### Prisma 모델 목록 (37개 모델, 17개 enum)

**핵심 엔티티:**

| 모델 | 설명 | 주요 관계 |
|------|------|-----------|
| `Teacher` | 교사 | → Student[], Team?, CounselingSession[], ChatSession[], Issue[] |
| `Student` | 학생 | → Teacher?, Team?, Parent[], GradeHistory[], MockExamResult[] |
| `Team` | 팀 | → Teacher[], Student[] |
| `Parent` | 학부모 | → Student, ParentCounselingReservation[] |

**분석 모델 (AI 기반):**

| 모델 | 설명 | 관계 |
|------|------|------|
| `SajuAnalysis` | 사주 분석 (polymorphic: SubjectType) | @@unique([subjectType, subjectId]) |
| `SajuAnalysisHistory` | 학생 사주 분석 이력 | → Student |
| `TeacherSajuAnalysisHistory` | 교사 사주 분석 이력 | → Teacher |
| `NameAnalysis` | 이름 분석 (polymorphic) | @@unique([subjectType, subjectId]) |
| `MbtiAnalysis` | MBTI 분석 (polymorphic) | @@unique([subjectType, subjectId]) |
| `MbtiSurveyDraft` | MBTI 설문 임시저장 | → Student (1:1) |
| `VarkAnalysis` | VARK 학습 유형 분석 | → Student (1:1) |
| `VarkSurveyDraft` | VARK 설문 임시저장 | → Student (1:1) |
| `ZodiacAnalysis` | 별자리 분석 | → Student (1:1) |
| `FaceAnalysis` | 관상 분석 (polymorphic) | @@unique([subjectType, subjectId]) |
| `PalmAnalysis` | 손금 분석 (polymorphic) | @@unique([subjectType, subjectId]) |
| `CompatibilityResult` | 교사-학생 궁합 | → Teacher, Student |
| `PersonalitySummary` | 성격 종합 요약 | → Student (1:1) |
| `PersonalitySummaryHistory` | 성격 요약 이력 | studentId index |

**성적 관리:**

| 모델 | 설명 | 관계 |
|------|------|------|
| `GradeHistory` | 성적 이력 (내신) | → Student, Teacher? |
| `MockExamResult` | 모의고사 결과 | → Student, Teacher?, GradeOcrScan? |
| `GradeOcrScan` | OCR 성적표 스캔 | → Teacher, Student?, MockExamResult[] |
| `LearningAnalysis` | AI 학습 분석 | → Student, Teacher? |
| `StudyLog` | 학습 일지 | → Student, Teacher? |
| `ParentGradeReport` | 학부모 성적 리포트 | → Student, Parent? |

**상담:**

| 모델 | 설명 | 관계 |
|------|------|------|
| `CounselingSession` | 상담 세션 | → Student, Teacher, CounselingNote[] |
| `CounselingNote` | 상담 메모 | → CounselingSession |
| `ParentCounselingReservation` | 학부모 상담 예약 | → Student, Teacher, Parent, CounselingSession? |
| `StudentSatisfaction` | 학생 만족도 | → Student, Teacher |

**LLM 관리 (Universal Hub):**

| 모델 | 설명 |
|------|------|
| `Provider` | LLM 제공자 (DB 관리) |
| `Model` | LLM 모델 (Provider별) |
| `FeatureMapping` | 기능별 모델 매핑 |
| `ProviderTemplate` | 제공자 등록 템플릿 |
| `LLMFeatureConfig` | 기능별 LLM 설정 (레거시) |
| `LLMUsage` | LLM 사용량 로그 |
| `LLMUsageMonthly` | 월별 사용량 집계 |
| `LLMBudget` | LLM 예산 관리 |
| `AnalysisPromptPreset` | 분석 프롬프트 프리셋 |

**시스템:**

| 모델 | 설명 |
|------|------|
| `AuditLog` | 감사 로그 |
| `SystemLog` | 시스템 로그 |
| `Issue` | 이슈 트래커 |
| `IssueEvent` | 이슈 이벤트 |
| `PasswordResetToken` | 비밀번호 재설정 토큰 |
| `StudentImage` | 학생 이미지 (profile/face/palm) |
| `ChatSession` / `ChatMessage` | AI 채팅 |
| `ReportPDF` | PDF 리포트 상태 |
| `AssignmentProposal` | 배정 제안 |

**Enum 목록:**
`SubjectType`, `Role`, `BloodType`, `ParentRelation`, `GradeType`, `CounselingType`, `ReservationStatus`, `StudentImageType`, `IssueCategory`, `IssueStatus`, `IssuePriority`, `OcrDocumentType`, `OcrScanStatus`, `AnalysisType`, `StudyTaskType`

## 6. Authentication

**방식:** 커스텀 JWT 세션 (NextAuth.js 사용하지 않음)

| 항목 | 상세 |
|------|------|
| **JWT 라이브러리** | `jose` v6.1.3 (`SignJWT`, `jwtVerify`) |
| **알고리즘** | HS256 |
| **비밀번호 해싱** | `argon2` v0.44.0 |
| **세션 저장소** | httpOnly 쿠키 (`session`) |
| **만료** | 7일 |
| **세션 파일** | `src/lib/session.ts` |
| **미들웨어** | `src/middleware.ts` (인증 + i18n 통합) |
| **환경 변수** | `SESSION_SECRET` (HMAC 키) |

**SessionPayload 구조:**
```typescript
{
  userId: string
  role: 'DIRECTOR' | 'TEAM_LEADER' | 'MANAGER' | 'TEACHER'
  teamId: string | null
  expiresAt: Date
}
```

**라우트 보호:**
- Protected: `/students`, `/dashboard`, `/teachers`, `/matching`, `/analytics`, `/counseling`, `/teams`, `/satisfaction`, `/issues`, `/chat`, `/grades`
- Auth-only: `/auth/login`, `/auth/register`, `/auth/reset-password`
- Admin-only: `/admin` (DIRECTOR 역할 필수)

## 7. i18n (Internationalization)

**라이브러리:** `next-intl` v4.8.2

| 항목 | 상세 |
|------|------|
| **지원 언어** | `ko` (한국어, 기본), `en` (영어) |
| **라우팅 설정** | `src/i18n/routing.ts` |
| **요청 설정** | `src/i18n/request.ts` |
| **메시지 파일** | `src/messages/ko.json`, `src/messages/en.json` |
| **URL 패턴** | `/{locale}/...` (예: `/ko/students`, `/en/students`) |
| **미들웨어** | `src/middleware.ts`에서 `createIntlMiddleware(routing)` 사용 |

## 8. External Services & Integrations

### Cloudinary (이미지 관리)

| 항목 | 상세 |
|------|------|
| **서버 SDK** | `cloudinary` v2.9.0 (`src/lib/cloudinary.ts`) |
| **클라이언트 SDK** | `next-cloudinary` v6.17.5 (`CldImage`, `CldUploadWidget`) |
| **용도** | 학생 프로필/관상/손금 이미지 업로드, 리사이즈, 서명된 업로드 |
| **이미지 변환** | 512x512 정사각형 (`c_fill,g_auto`) |
| **서명 엔드포인트** | `src/app/api/cloudinary/sign/route.ts` |
| **환경 변수** | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `NEXT_PUBLIC_CLOUDINARY_API_KEY` |

### MinIO / S3 (PDF 저장소)

| 항목 | 상세 |
|------|------|
| **SDK** | `@aws-sdk/client-s3` v3.990.0, `@aws-sdk/s3-request-presigner` v3.990.0 |
| **인터페이스** | `src/lib/storage/storage-interface.ts` (`PDFStorage`) |
| **구현체** | `src/lib/storage/s3-storage.ts` (S3), `src/lib/storage/local-storage.ts` (로컬) |
| **팩토리** | `src/lib/storage/factory.ts` (`PDF_STORAGE_TYPE` 환경 변수로 선택) |
| **용도** | 학생 리포트 PDF 저장 |
| **환경 변수** | `PDF_STORAGE_TYPE`, `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET` |

### Sentry (에러 트래킹)

| 항목 | 상세 |
|------|------|
| **SDK** | `@sentry/nextjs` v10.40.0 |
| **서버 설정** | `sentry.server.config.ts` |
| **Edge 설정** | `sentry.edge.config.ts` |
| **Next.js 통합** | `next.config.ts`에서 `withSentryConfig()` |
| **소스맵** | 프로덕션에서만 업로드, 업로드 후 삭제 |
| **터널 라우트** | `/monitoring` (광고 차단기 우회) |
| **샘플링** | 프로덕션 0.1, 개발 1.0 |
| **환경 변수** | `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` |

### Resend (이메일)

| 항목 | 상세 |
|------|------|
| **SDK** | `resend` v6.8.0 |
| **사용 위치** | `src/lib/actions/auth/login.ts` (비밀번호 재설정 이메일) |
| **환경 변수** | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` |

### GitHub (이슈 관리)

| 항목 | 상세 |
|------|------|
| **SDK** | `octokit` v5.0.5 |
| **클라이언트** | `src/lib/github/client.ts` (싱글톤 패턴) |
| **서비스** | `src/lib/github/services.ts` (이슈 생성, 브랜치 생성, 동기화) |
| **유틸리티** | `src/lib/github/utils.ts` (rate limit 확인) |
| **환경 변수** | `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO`, `GITHUB_RATE_LIMIT_THRESHOLD` |

### React PDF (리포트 생성)

| 항목 | 상세 |
|------|------|
| **라이브러리** | `@react-pdf/renderer` v4 |
| **생성기** | `src/features/report/generator.ts` (`renderToBuffer`, `renderToFile`) |
| **템플릿** | `src/features/report/templates/consultation-report.tsx` |
| **섹션** | `src/features/report/templates/sections/` (header, student-info, analysis-results, ai-recommendations, footer) |
| **스타일** | `src/features/report/styles.ts` |
| **API** | `src/app/api/students/[id]/report/route.ts` |

## 9. AI Engine Architecture

**위치:** `src/features/ai-engine/`

### Provider 레이어 (Vercel AI SDK 기반)

**등록:** `src/features/ai-engine/providers/index.ts`
- 11개 프로바이더: `anthropic`, `openai`, `google`, `ollama`, `deepseek`, `mistral`, `cohere`, `xai`, `zhipu`, `moonshot`, `openrouter`
- `createOpenAICompatible()`으로 Moonshot, OpenRouter 통합

### Adapter 레이어 (Universal Hub)

**위치:** `src/features/ai-engine/adapters/`
- Factory 패턴 (싱글톤): `src/features/ai-engine/adapters/index.ts`
- Base 클래스: `src/features/ai-engine/adapters/base.ts`
- 개별 어댑터: `openai.ts`, `anthropic.ts`, `google.ts`, `ollama.ts`, `deepseek.ts`, `mistral.ts`, `cohere.ts`, `xai.ts`, `zhipu.ts`, `moonshot.ts`, `openrouter.ts`

### 라우팅 & 페일오버

| 모듈 | 파일 | 역할 |
|------|------|------|
| Universal Router | `src/features/ai-engine/universal-router.ts` | `generateWithProvider`, `streamWithProvider`, `generateWithVision` |
| Smart Routing | `src/features/ai-engine/smart-routing.ts` | 예산 기반 라우팅, 임계값 알림 |
| Failover | `src/features/ai-engine/failover.ts`, `router/failover.ts` | 프로바이더 장애 시 자동 전환 |
| Feature Resolver | `src/features/ai-engine/feature-resolver.ts` | 기능별 최적 모델 자동 매칭 |

### API Key 암호화

- **파일:** `src/features/ai-engine/encryption.ts`
- **알고리즘:** AES-256-GCM
- **형식:** `iv:authTag:encrypted` (hex 인코딩)
- **환경 변수:** `API_KEY_ENCRYPTION_SECRET` (64자 hex = 32바이트)

### 프롬프트 관리

**위치:** `src/features/ai-engine/prompts/`
- 분석별: `saju.ts`, `name.ts`, `mbti.ts`, `vark.ts`, `zodiac.ts`, `face.ts`, `palm.ts`, `compatibility.ts`, `integration.ts`
- 상담: `counseling.ts`, `counseling-scenario.ts`
- 공통: `base.ts`, `index.ts`

### 사용량 추적

| 모듈 | 파일 | 역할 |
|------|------|------|
| Usage Tracker | `src/features/ai-engine/usage-tracker.ts` | 실시간 사용량 기록 |
| Usage Aggregation | `src/features/ai-engine/usage-aggregation.ts` | 월별 집계, 연간 트렌드 |

## 10. Logging

**라이브러리:** `pino` v10.3.0 + `pino-pretty` v13.1.3

| 항목 | 상세 |
|------|------|
| **설정 파일** | `src/lib/logger/index.ts` |
| **개발 레벨** | `debug` (pino-pretty로 포맷팅) |
| **프로덕션 레벨** | `info` (구조화 JSON) |
| **민감 정보 제거** | `password`, `token`, `apiKey`, 쿠키, Authorization 헤더 자동 redact |
| **테스트 환경** | 로깅 비활성화 |
| **환경 변수** | `LOG_LEVEL` |
| **Next.js 설정** | `serverExternalPackages: ["pino", "pino-pretty"]` (번들링 제외) |

## 11. Security Configuration

**Next.js 보안 헤더** (`next.config.ts`):
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `Content-Security-Policy`: self + Cloudinary + Sentry

**미들웨어 보안:**
- Request ID 추적 (`x-request-id` 헤더)
- 무효 세션 쿠키 자동 삭제

**API 인증:**
- Cron 엔드포인트: `CRON_SECRET` (Bearer 토큰)
- 내부 API: `INTERNAL_API_SECRET`
- Rate limiting: `DISABLE_RATE_LIMIT` 환경 변수로 개발 시 비활성화 가능

## 12. CI/CD & Deployment

### GitHub Actions (Self-hosted Runner)

**CI (`ci.yml`):** PR → main 시 실행
1. pnpm install → Prisma generate
2. Lint (`eslint`)
3. env 동기화 검사 (소스코드 NEXT_PUBLIC_* vs `.env.example`)
4. Type check (`tsc --noEmit`)
5. Build (`next build`)
6. Unit tests (Vitest, 테스트 파일 존재 시)
7. E2E tests (Playwright, `e2e/` 디렉토리 존재 시)

**Deploy (`deploy.yml`):** main push 시 실행
1. CI gate (lint + typecheck + unit test)
2. 운영 `.env` 복원 (`~/.env.ai-afterschool-fsd`)
3. 환경 변수 검증 (필수 변수 누락 시 실패)
4. 기존 이미지 백업 (`:rollback` 태그)
5. Docker Compose build & deploy
6. 헬스체크 대기 (120초, `/api/health`)
7. 실패 시 자동 롤백

**AI Code Review (`code-review.yml`):** PR 시 GLM-5 (Zhipu AI)로 자동 코드 리뷰

### Docker

| 항목 | 상세 |
|------|------|
| **Dockerfile** | Multi-stage: deps → builder → runner (node:24-alpine) |
| **docker-compose.yml** | 단일 서비스 (`web`), 포트 3001:3000 |
| **네트워크** | `ai-network` (bridge), `db-network` (external: `ai-afterschool-ex_internal`) |
| **헬스체크** | `/api/health` (wget, 30초 간격) |
| **output** | Next.js `standalone` 모드 |

### Reverse Proxy

- **Caddy** 권장 (`.env.example`에 `APP_DOMAIN`, `CADDY_EMAIL` 설정)
- Caddyfile은 레포에 미포함

## 13. Build Configuration

### TypeScript (`tsconfig.json`)
- Target: ES2017
- Module: ESNext (Bundler resolution)
- Strict: true
- Path alias: `@/*` → `./src/*`
- JSX: preserve (Next.js 처리)
- Incremental: true

### ESLint (`eslint.config.mjs`)
- Flat config (ESLint v10)
- Plugins: `typescript-eslint`, `react-hooks`, `@next/next`, `boundaries`
- FSD 경계 규칙: `shared` → `lib` → `features` → `components` → `app` (단방향)
- `@typescript-eslint/no-explicit-any`: warn
- `react-hooks/rules-of-hooks`: error

### Vitest (`vitest.config.ts`)
- 테스트 파일: `src/**/*.{test,spec}.{ts,tsx}`
- `passWithNoTests: true`
- Path alias: `@/` → `./src/`

### Playwright (`playwright.config.ts`)
- 테스트 디렉토리: `./e2e/`
- 브라우저: Chromium만
- Base URL: `http://localhost:3000`
- CI: retries 2, GitHub reporter

### Tailwind CSS (`tailwind.config.ts`)
- Tailwind CSS v4 (PostCSS plugin `@tailwindcss/postcss`)
- Plugin: `@tailwindcss/typography`
- Content: `./src/**/*.{js,ts,jsx,tsx,mdx}`

## 14. Environment Variables Summary

### 필수 (런타임)

| 변수 | 용도 |
|------|------|
| `DATABASE_URL` | PostgreSQL 연결 문자열 |
| `SESSION_SECRET` | JWT 세션 서명 키 |
| `NEXT_PUBLIC_APP_URL` | 앱 공개 URL |

### 필수 (AI 기능)

| 변수 | 용도 |
|------|------|
| `ANTHROPIC_API_KEY` | Anthropic API 키 (직접 SDK용) |
| `API_KEY_ENCRYPTION_SECRET` | DB 저장 API 키 암호화 (64자 hex) |

### 선택적 (기능별)

| 변수 | 용도 |
|------|------|
| `CLOUDINARY_*` / `NEXT_PUBLIC_CLOUDINARY_*` | 이미지 업로드 |
| `SENTRY_*` / `NEXT_PUBLIC_SENTRY_DSN` | 에러 트래킹 |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | 이메일 발송 |
| `GITHUB_TOKEN` / `GITHUB_OWNER` / `GITHUB_REPO` | 이슈 연동 |
| `OLLAMA_BASE_URL` / `OLLAMA_DIRECT_URL` | 로컬 LLM |
| `MINIO_*` | S3 PDF 저장소 |
| `CRON_SECRET` / `INTERNAL_API_SECRET` | API 인증 |
| `LOG_LEVEL` | 로그 레벨 |
| `ANALYZE` | 번들 분석 |

## 15. NPM Scripts

```bash
pnpm dev              # Next.js 개발 서버 (Turbopack)
pnpm build            # 프로덕션 빌드
pnpm start            # 프로덕션 서버 시작
pnpm lint             # ESLint 실행
pnpm typecheck        # TypeScript 타입 체크
pnpm test             # Vitest 단위 테스트 실행
pnpm test:watch       # Vitest 감시 모드
pnpm test:e2e         # Playwright E2E 테스트
pnpm db:generate      # Prisma 클라이언트 생성
pnpm db:push          # Prisma 스키마 DB 반영
pnpm db:seed          # 시드 데이터 삽입 (dotenv -e .env)
```

---

*Stack analysis: 2026-02-27*
