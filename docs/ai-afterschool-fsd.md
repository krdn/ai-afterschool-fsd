> **소스**: 현재 프로젝트 디렉토리 (`/home/gon/projects/ai/ai-afterschool-fsd`)
> **작성일**: 2026-03-03

# AI Afterschool FSD — 프로젝트 구조 정리

## 목차

1. [프로젝트 개요](#프로젝트-개요)
2. [기술 스택](#기술-스택)
3. [아키텍처 — FSD 레이어 구조](#아키텍처--fsd-레이어-구조)
4. [Feature Slices (6개)](#feature-slices-6개)
5. [핵심 데이터 흐름](#핵심-데이터-흐름)
6. [디렉토리 구조](#디렉토리-구조)
7. [핵심 인프라 파일](#핵심-인프라-파일)
8. [개발 워크플로우](#개발-워크플로우)
9. [알려진 이슈 및 기술 부채](#알려진-이슈-및-기술-부채)

---

## 프로젝트 개요

AI 기반 방과후학교(After School) 종합 관리 시스템.
교사, 학생, 학부모를 위한 스마트 교육 플랫폼으로 다음 기능을 제공합니다.

| 도메인 | 기능 |
|--------|------|
| 학생/교사 관리 | 프로필, 팀 배정, 매칭 |
| 성격 분석 | 사주(四柱), MBTI, VARK, 이름 분석 |
| 성적 관리 | OCR 기반 성적 추출, AI 분석, 학부모 리포트 |
| 상담 | 예약, 세션 관리, AI 보고서 생성 |
| 자동 매칭 | 교사-학생 자동배정, 공정성 메트릭 |
| 리포트 | PDF 생성 |

---

## 기술 스택

### 프론트엔드

| 항목 | 버전/도구 |
|------|-----------|
| 프레임워크 | Next.js 15 (App Router, standalone) |
| UI 라이브러리 | React 19 |
| 언어 | TypeScript 5.5+ |
| 스타일링 | Tailwind CSS 4 + shadcn/ui (CVA) + Radix UI |
| 국제화(i18n) | next-intl (ko/en) |
| 폼 관리 | react-hook-form v7 + @hookform/resolvers |
| 날짜 | date-fns v4, react-day-picker v9 |
| 차트 | recharts v3 |
| 테이블 | @tanstack/react-table v8 |

### 백엔드 / 인프라

| 항목 | 버전/도구 |
|------|-----------|
| DB | PostgreSQL + Prisma 7 (42+ 모델) |
| Prisma 어댑터 | @prisma/adapter-pg |
| 인증 | 커스텀 JWT (jose, HS256) + argon2 |
| 로깅 | pino + pino-pretty |
| 파일 스토리지 | Cloudinary + AWS S3 |
| 이메일 | Resend |
| 에러 추적 | Sentry |
| PDF 생성 | @react-pdf/renderer |

### AI / LLM

| 항목 | 도구 |
|------|------|
| AI SDK | Vercel AI SDK v6 |
| LLM 제공자(11개) | OpenAI, Anthropic, Google, Mistral, Cohere, DeepSeek, xAI, Ollama, ZhipuAI 등 |
| 라우팅 패턴 | Universal Router (페일오버 포함) |
| 비전 LLM | OCR 기능 (성적표 스캔) |

### 개발/배포

| 항목 | 도구 |
|------|------|
| 패키지 매니저 | pnpm |
| 번들러 | Turbopack (개발), Next.js (프로덕션) |
| 린터 | ESLint + eslint-plugin-boundaries |
| 포맷터 | Prettier |
| 단위 테스트 | Vitest 4 |
| E2E 테스트 | Playwright |
| 배포 | Docker (multi-stage) + GitHub Actions (self-hosted runner) |

---

## 아키텍처 — FSD 레이어 구조

FSD(Feature-Sliced Design)를 채택하며, 레이어 간 **단방향 의존성**을 강제합니다.

```
┌─────────────────────────────────────────────────────────┐
│  app         pages, layouts, API routes                  │
│              ↓ 모든 레이어 import 가능                    │
├─────────────────────────────────────────────────────────┤
│  components  도메인별 UI 컴포넌트                         │
│              ↓ features, lib, shared만 import            │
├─────────────────────────────────────────────────────────┤
│  lib         Server Actions, DAL, 유틸리티               │
│              ↓ features, shared import (★ FSD 변형)      │
├─────────────────────────────────────────────────────────┤
│  features    비즈니스 로직, 서비스, 리포지토리             │
│              ↓ lib, shared만 import                      │
├─────────────────────────────────────────────────────────┤
│  shared      공통 타입, 상수, 검증 스키마                  │
│              ↓ 의존성 없음 (최하위)                       │
└─────────────────────────────────────────────────────────┘
```

**강제 도구**: `eslint-plugin-boundaries` (현재 warn 레벨)

---

## Feature Slices (6개)

| Feature | 경로 | 책임 |
|---------|------|------|
| `ai-engine` | `src/features/ai-engine/` | LLM 라우팅, 페일오버, 사용량 추적, 프롬프트 |
| `analysis` | `src/features/analysis/` | 사주, 이름, MBTI, VARK, 띠, 궁합 분석 |
| `counseling` | `src/features/counseling/` | 상담 예약/세션 관리 |
| `grade-management` | `src/features/grade-management/` | OCR 성적 추출, AI 분석, 동료비교, 학부모 리포트 |
| `matching` | `src/features/matching/` | 교사-학생 자동배정, 공정성 메트릭 |
| `report` | `src/features/report/` | PDF 리포트 생성 |

### ai-engine 내부 구조

```
src/features/ai-engine/
├── universal-router.ts     # LLM 라우팅/페일오버 핵심
├── providers/              # 11개 LLM 제공자
├── router/                 # 라우팅 로직
├── prompts/                # 프롬프트 관리
├── usage-tracker.ts        # 사용량 추적
├── failover.ts             # 페일오버 처리
└── types.ts                # 타입 정의
```

### analysis 내부 구조

```
src/features/analysis/
├── saju/                   # 사주(四柱) 분석
├── mbti/                   # MBTI 분석
├── vark/                   # VARK 학습 유형 분석
├── name/                   # 이름 분석
├── zodiac/                 # 띠 분석
├── compatibility/          # 궁합 분석
├── integration/            # 통합 분석
└── repositories/           # DB 레이어
```

---

## 핵심 데이터 흐름

### 1. Server Component 조회 흐름

```
page.tsx (Server Component)
  └─→ getCurrentTeacher()          # 인증 + 세션 확인
      └─→ db.xxx.findMany()        # Prisma 쿼리
          └─→ <ClientComponent data={...} />  # 데이터 전달
```

### 2. Server Action 변경 흐름

```
Client Component
  └─→ Server Action (lib/actions/)
      ├─→ getCurrentTeacher() / verifySession()   # [1] 인증
      ├─→ Zod safeParse()                         # [2] 검증
      ├─→ Feature Service (features/)             # [3] 비즈니스 로직
      ├─→ revalidatePath()                        # [4] 캐시 무효화
      └─→ return ok(data) / fail(message)         # [5] 결과 반환
```

### 3. AI 분석 파이프라인

```
이미지 업로드
  └─→ Vision LLM (OCR)
      └─→ extractJsonFromLLM()
          └─→ Zod 검증
              └─→ DB 저장
                  └─→ 분석 서비스
                      └─→ generateWithProvider()
                          └─→ LearningAnalysis 캐시 저장 (24h TTL)
```

### 4. ActionResult 패턴

```typescript
// 성공
return ok(data);          // { ok: true, data }

// 실패
return fail(message);     // { ok: false, error: message }

// 필드 검증 실패
return fieldError(fields); // { ok: false, fieldErrors: {...} }
```

---

## 디렉토리 구조

```
src/
├── app/                    # Next.js App Router
│   ├── [locale]/
│   │   ├── (dashboard)/    # 주요 페이지 라우트
│   │   │   ├── admin/
│   │   │   ├── analytics/
│   │   │   ├── chat/
│   │   │   ├── counseling/
│   │   │   ├── dashboard/
│   │   │   ├── grades/
│   │   │   ├── matching/
│   │   │   ├── satisfaction/
│   │   │   ├── students/
│   │   │   ├── teachers/
│   │   │   └── teams/
│   │   └── auth/
│   └── api/
│
├── components/             # 도메인별 UI 컴포넌트
│   ├── admin/
│   ├── counseling/
│   ├── grades/
│   ├── matching/
│   ├── students/
│   ├── teachers/
│   ├── ui/                 # shadcn/ui 기반 공통 컴포넌트
│   └── ...
│
├── features/               # 비즈니스 로직 (FSD Feature Slices)
│   ├── ai-engine/          # LLM 라우팅, 페일오버
│   ├── analysis/           # 성격/학습 분석
│   ├── counseling/         # 상담 관리
│   ├── grade-management/   # 성적 관리
│   ├── matching/           # 매칭 시스템
│   └── report/             # PDF 리포트
│
├── lib/                    # 서버 인프라
│   ├── actions/            # Server Actions
│   │   ├── auth/
│   │   ├── counseling/
│   │   ├── matching/
│   │   ├── student/
│   │   └── teacher/
│   ├── dal.ts              # 인증 + RBAC + RLS
│   ├── session.ts          # JWT 세션 관리
│   ├── db/                 # Prisma 클라이언트
│   ├── errors/             # ActionResult 패턴
│   ├── validations/        # Zod 스키마
│   └── logger/             # pino 로거
│
├── shared/                 # 공통 유틸리티 (최하위 레이어)
│   ├── constants/
│   ├── errors/
│   ├── types/
│   ├── utils/
│   └── validations/        # lib/validations의 re-export
│
├── hooks/                  # Custom React Hooks
├── types/                  # 전역 타입 정의
└── middleware.ts            # Edge 미들웨어 (인증 + i18n + Request ID)
```

---

## 핵심 인프라 파일

| 파일 | 역할 |
|------|------|
| `src/lib/dal.ts` | 인증(verifySession) + RBAC + RLS 컨텍스트 설정 |
| `src/lib/session.ts` | JWT 세션 생성/검증/삭제 (7일 만료, HS256) |
| `src/lib/db/client.ts` | Prisma 싱글톤 (pg Pool, max:10 연결) |
| `src/lib/errors/action-result.ts` | ActionResult 패턴 (ok/fail/fieldError) |
| `src/middleware.ts` | Edge 미들웨어: 인증 + i18n 라우팅 + Request ID 주입 |
| `src/features/ai-engine/universal-router.ts` | LLM 라우팅/페일오버 핵심 로직 |

---

## 개발 워크플로우

### 새 기능 추가 순서

```
1. Feature 생성
   src/features/<name>/
   (서비스, 타입, 리포지토리, 테스트)
        ↓
2. Server Action 작성
   src/lib/actions/<domain>/
   ("use server" + 인증 + ok/fail)
        ↓
3. Component 구현
   src/components/<domain>/
   (Client Component)
        ↓
4. Page 연결
   src/app/[locale]/(dashboard)/<route>/page.tsx
   (Server Component)
        ↓
5. Validation 추가
   src/lib/validations/ 또는 src/shared/validations/
```

### LLM 기능 추가 방법

```
1. src/features/ai-engine/providers/types.ts 에 FeatureType 추가
2. DB FeatureMapping 에 매핑 생성 (Admin UI)
3. generateWithProvider({ featureType: 'new_feature', prompt, systemPrompt }) 호출
```

### 주요 명령어

```bash
pnpm dev              # 개발 서버 실행 (Turbopack)
pnpm build            # 프로덕션 빌드
pnpm lint             # ESLint 검사
pnpm typecheck        # TypeScript 타입 체크
pnpm test             # Vitest 단위 테스트
pnpm test:e2e         # Playwright E2E 테스트
pnpm format           # Prettier 포맷팅
pnpm db:generate      # Prisma 클라이언트 생성
pnpm db:push          # 스키마 DB 반영
pnpm db:seed          # 시드 데이터 실행
```

### 코딩 컨벤션

| 항목 | 규칙 |
|------|------|
| 파일명 | kebab-case (예: `grade-dashboard.tsx`) |
| 타입 | `type` 키워드 사용 (interface 지양) |
| Zod 파싱 | `safeParse()` 사용 (`parse()` 금지) |
| Import 경로 | `@/` 별칭 필수 |
| 인증 | 모든 Server Action 첫 줄에 `verifySession()` 또는 `getCurrentTeacher()` |
| 로깅 | `logger.error({ err: error }, '영문 메시지')` |
| 사용자 에러 메시지 | 한국어 |
| 테스트 | `__tests__/` 디렉토리, `describe` 한국어 |

---

## 알려진 이슈 및 기술 부채

| 이슈 | 상세 |
|------|------|
| Server Action 패턴 혼재 | FormState(useActionState, 폼 전용) vs ActionResult(데이터 조회) — 양립 의도적 |
| FSD feature 간 import | `grade-management → ai-engine` 등 하향식 단방향만 허용 (순환 없음) |
| 테스트 커버리지 부족 | **2.8%** (19/688 파일). Server Actions/API Routes 테스트 전무 |
| Validation 위치 이중화 | canonical: `src/lib/validations/`, `src/shared/validations/`는 re-export만 |
