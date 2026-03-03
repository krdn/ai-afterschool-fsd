# AI Afterschool FSD

AI 기반 방과후학교 관리 시스템. 교사-학생 관계를 중심으로 성격 분석, 성적 관리, 상담, 매칭 기능을 제공합니다.

## 주요 기능

- **학생/교사 관리** - 프로필, 팀 구성, 역할 기반 접근 제어 (RBAC)
- **AI 성격 분석** - 사주, 이름풀이, MBTI, VARK 학습스타일, 궁합
- **성적 관리** - OCR 성적표 인식, AI 강점/약점 분석, 동료 비교, 학부모 리포트
- **상담 관리** - 예약, 실시간 세션, AI 시나리오 생성, 후속 관리
- **교사-학생 매칭** - 자동 배정 알고리즘, 공정성 메트릭
- **AI 채팅** - 학생 데이터 기반 컨텍스트 채팅 (멘션 기능)
- **PDF 리포트** - 종합 상담 리포트 생성/다운로드
- **다국어 지원** - 한국어/영어 (next-intl)

## 기술 스택

| 영역 | 기술 |
|------|------|
| 프레임워크 | Next.js 15 (App Router) + React 19 |
| 언어 | TypeScript 5.5+ |
| 스타일링 | Tailwind CSS 4 + shadcn/ui |
| DB | PostgreSQL + Prisma 7 |
| AI | Vercel AI SDK v6 (11개 LLM provider) |
| 인증 | 커스텀 JWT (jose + argon2) |
| 테스트 | Vitest + Playwright |
| 배포 | Docker + GitHub Actions |
| 패키지 매니저 | pnpm |

## 시작하기

### 사전 요구사항

- Node.js 24+
- pnpm
- PostgreSQL

### 설치

```bash
# 의존성 설치
pnpm install

# 환경 변수 설정
cp .env.example .env.local
# .env.local 파일을 편집하여 필수 환경 변수 설정

# DB 스키마 반영 및 클라이언트 생성
pnpm db:push
pnpm db:generate

# 시드 데이터 (선택)
pnpm db:seed

# 개발 서버 시작
pnpm dev
```

### 필수 환경 변수

| 변수 | 용도 |
|------|------|
| `DATABASE_URL` | PostgreSQL 연결 문자열 |
| `SESSION_SECRET` | JWT 세션 서명 키 |
| `NEXT_PUBLIC_APP_URL` | 앱 공개 URL |

AI 기능 사용 시 LLM provider API 키가 필요합니다 (관리자 UI에서 설정 가능).

## 프로젝트 구조

FSD (Feature-Sliced Design) 아키텍처를 적용합니다.

```
src/
├── app/                  # Next.js App Router (pages, layouts, API routes)
│   ├── [locale]/         # i18n 동적 세그먼트 (ko, en)
│   │   ├── (dashboard)/  # 인증 필요 라우트
│   │   └── auth/         # 인증 (login, register)
│   └── api/              # API 라우트
├── components/           # UI 컴포넌트 (도메인별 하위 디렉토리)
│   ├── ui/               # shadcn/ui 기본 컴포넌트 (26종)
│   └── <domain>/         # 도메인별 Client Components
├── features/             # 비즈니스 도메인 로직 (6개 slice)
│   ├── ai-engine/        # LLM 통합 허브 (라우팅, 페일오버)
│   ├── analysis/         # 성격/적성 분석
│   ├── counseling/       # 상담 도메인
│   ├── grade-management/ # 성적 관리 (OCR, AI 분석)
│   ├── matching/         # 교사-학생 매칭
│   └── report/           # PDF 리포트 생성
├── lib/                  # 인프라/서비스 (Server Actions, DB, 세션, 로거)
├── shared/               # 공용 코드 (타입, 유틸, 상수, 검증)
├── hooks/                # 클라이언트 훅
├── i18n/                 # 국제화 설정
└── messages/             # 번역 파일 (ko.json, en.json)
```

### 레이어 의존 규칙

```
app → components → features → lib → shared
(위에서 아래 방향으로만 import 가능)
```

## 명령어

```bash
pnpm dev              # 개발 서버 (Turbopack)
pnpm build            # 프로덕션 빌드
pnpm lint             # ESLint
pnpm typecheck        # TypeScript 타입 체크
pnpm test             # 단위 테스트
pnpm test:e2e         # E2E 테스트
pnpm db:generate      # Prisma 클라이언트 생성
pnpm db:push          # 스키마 DB 반영
pnpm db:seed          # 시드 데이터
```

## 배포

Docker 기반으로 배포합니다.

```bash
# 프로덕션 빌드 및 실행
docker compose up -d --build

# 헬스체크
curl http://localhost:3001/api/health
```

GitHub Actions를 통한 자동 배포가 구성되어 있습니다:
- **CI**: PR → main 시 lint, typecheck, build, test 실행
- **Deploy**: main push 시 Docker 빌드 + 배포 + 헬스체크

## 문서

- `CLAUDE.md` - AI 어시스턴트/개발자 가이드 (아키텍처, 컨벤션, 코드 추가 방법)
- `docs/codebase-analysis/` - 코드베이스 자동 분석 결과
- `docs/plans/` - 기능 설계/계획 문서
