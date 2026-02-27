# Codebase Concerns

**Analysis Date:** 2026-02-27

## Tech Debt

**Mock 데이터로 구현된 Server Actions:**
- Issue: `generateAnalysis()` 함수가 실제 LLM 연동 없이 랜덤 Mock 데이터를 반환
- Files: `src/lib/actions/student/analysis.ts` (lines 40-61)
- Impact: 학생 성격 분석(PersonalitySummary) 결과가 매번 랜덤값으로 생성되어 의미 없는 데이터가 DB에 저장됨
- Fix approach: `src/features/ai-engine` 의 `streamWithProvider()` 또는 `generateWithProvider()`를 사용하여 실제 LLM 호출로 교체. 이미 사주/손금/관상 분석에서 동일 패턴을 사용 중

**Analytics 페이지 Mock 데이터:**
- Issue: 성과 향상률 차트가 랜덤 데이터를 표시 (`Math.random()`)
- Files: `src/app/[locale]/(dashboard)/analytics/page.tsx` (lines 87-108)
- Impact: 관리자가 보는 성과 분석 대시보드가 실제 GradeHistory 데이터를 집계하지 않음
- Fix approach: `src/lib/analysis/grade-analytics.ts`의 `calculateGradeTrend()`를 활용하여 GradeHistory 테이블에서 기간별 데이터 집계 로직 구현

**학부모 리포트 발송 미구현:**
- Issue: `sendParentReportAction()`이 발송 기록만 업데이트하고 실제 발송(이메일/카카오/SMS)을 수행하지 않음
- Files: `src/lib/actions/student/parent-report.ts` (lines 57-79)
- Impact: 사용자가 리포트 발송 버튼을 누르면 성공 처리되지만 실제로 보호자에게 전달되지 않음
- Fix approach: `resend` 패키지(이미 의존성 포함)로 이메일 발송 구현, 카카오 알림톡/SMS는 외부 API 연동 필요

**Test Reset 엔드포인트 미완성:**
- Issue: `/api/test/reset` 가 아무 데이터도 삭제하지 않음 (isTest 플래그 미구현)
- Files: `src/app/api/test/reset/route.ts` (lines 36-49)
- Impact: E2E 테스트 데이터 초기화가 불가능하여 테스트 간 데이터 격리 불가
- Fix approach: Student/Teacher 모델에 `isTest` 플래그 추가 또는 테스트 데이터 prefix 규칙 도입

**AI Engine Compatibility Layer:**
- Issue: `compat.ts`가 레거시 타입에서 새 타입으로의 브릿지 역할을 하는 임시 레이어
- Files: `src/features/ai-engine/compat.ts`
- Impact: `@deprecated` 표시된 `ProviderNameString`, `FeatureTypeString` 타입이 여전히 사용 중. 코드 가독성 저하
- Fix approach: 레거시 타입 사용처를 새 타입(`string`)으로 점진적 마이그레이션 후 compat.ts 제거

**eslint-disable 주석 다수:**
- Issue: `react-hooks/exhaustive-deps` 비활성화가 10개 이상 파일에 존재
- Files:
  - `src/components/counseling/reservation-calendar-view.tsx:67`
  - `src/components/counseling/wizard/scenario-step.tsx:44`
  - `src/components/counseling/reservation-calendar-month.tsx:76,99`
  - `src/components/counseling/wizard/model-select.tsx:76`
  - `src/components/counseling/wizard/parent-summary-step.tsx:48`
  - `src/components/matching/matching-history-tab.tsx:112`
  - `src/components/chat/chat-page.tsx:67`
  - `src/components/students/tabs/learning-tab.tsx:48`
- Impact: 의존성 누락으로 인한 stale closure 버그 가능성
- Fix approach: 각 `useEffect`의 의존성을 재검토하여 올바른 deps 배열 지정 또는 `useCallback`/`useRef` 패턴 적용

---

## Known Bugs

**saju-prompt-preset 리포지토리 미사용 변수:**
- Symptoms: `eslint-disable @typescript-eslint/no-unused-vars` 주석이 5곳에 존재
- Files: `src/features/analysis/repositories/saju-prompt-preset.ts` (lines 31, 41, 51, 62, 73)
- Trigger: 리포지토리 함수들이 미사용 매개변수를 받고 있음
- Workaround: eslint-disable로 경고 억제 중

**teams-tab 삭제 핸들러 미구현:**
- Symptoms: TODO(human) 주석으로 표시된 `handleDelete` 함수가 구현되지 않음
- Files: `src/components/admin/tabs/teams-tab.tsx:132`
- Trigger: 관리자 화면에서 팀 삭제 시도 시 동작하지 않음
- Workaround: UI에서 `_count.teachers > 0 || _count.students > 0` 조건으로 삭제 버튼 비활성화

---

## Security Considerations

**Server Actions 인증 누락:**
- Risk: `generateAnalysis()`와 `getAnalysis()` Server Actions에 인증 확인(`verifySession()`)이 없음
- Files: `src/lib/actions/student/analysis.ts` (lines 25, 107)
- Current mitigation: Next.js Server Actions는 POST 요청으로만 호출 가능하지만, 인증되지 않은 사용자가 `studentId`를 알면 분석 생성/조회 가능
- Recommendations: 모든 Server Action 함수 시작부에 `await verifySession()` 호출 추가. 참고로 동일 디렉토리의 `personality-integration.ts`, `calculation-analysis.ts`는 올바르게 인증 확인 중

**API Route 미들웨어 바이패스:**
- Risk: 미들웨어의 `matcher` 설정이 `/api` 경로를 제외하여 API 라우트에 미들웨어 보호가 적용되지 않음
- Files: `src/middleware.ts` (line 81) - `'/((?!api|_next/static|...)*)'`
- Current mitigation: 각 API 라우트에서 개별적으로 `verifySession()` 또는 `getSession()` 호출
- Recommendations: API 라우트에서의 인증 확인이 누락되지 않도록 공통 미들웨어 래퍼 함수 생성 검토

**Provider API Key 저장 시 암호화 불일치:**
- Risk: `POST /api/providers` 라우트에서 API Key를 `apiKeyEncrypted` 필드에 평문으로 직접 저장하는 경로 존재
- Files: `src/app/api/providers/route.ts` (line 144) - `apiKeyEncrypted: finalConfig.apiKey || null`
- Current mitigation: `src/features/ai-engine/provider-registry.ts`의 `register()` 함수는 `encryptApiKey()`를 사용하여 정상적으로 암호화
- Recommendations: API 라우트에서 직접 Provider를 생성하는 경로를 `ProviderRegistry.register()`로 통일하여 암호화 보장

**PATCH Provider 라우트 입력 검증 부재:**
- Risk: `PATCH /api/providers/[id]`가 Zod 스키마 검증 없이 `request.json()`을 직접 사용
- Files: `src/app/api/providers/[id]/route.ts` (lines 103-115)
- Current mitigation: DIRECTOR 역할 검증은 수행 중
- Recommendations: `UpdateProviderSchema`를 생성하여 `safeParse()` 적용

**Health Check 엔드포인트 정보 노출:**
- Risk: `/api/health`가 인증 없이 DB 연결 상태, 연결 풀 메트릭, 저장소 경로, 백업 상태를 반환
- Files: `src/app/api/health/route.ts`
- Current mitigation: Docker 컨테이너에서 `127.0.0.1:3001`로만 포트 바인딩
- Recommendations: 상세 정보는 인증된 관리자에게만 반환하고, 로드밸런서용 `HEAD /api/health`만 공개 유지

**RLS 세션 컨텍스트 트랜잭션 격리 미보장:**
- Risk: `SET LOCAL rls.*` 명령이 `$transaction` 블록 외부에서 호출되어 현재 트랜잭션 내에서만 유효한 `SET LOCAL`이 효과가 없을 수 있음
- Files: `src/lib/db/common/rbac.ts` (lines 39-51), `src/lib/dal.ts` (lines 40-44)
- Current mitigation: `createTeamFilteredPrisma()`가 앱 레이어에서 추가적인 `where` 필터링 제공
- Recommendations: RLS 세션 변수 설정을 `$transaction` 블록 내부에서 실제 쿼리와 함께 실행하도록 리팩토링

---

## Performance Bottlenecks

**Analytics 페이지 N+1 쿼리:**
- Problem: 전체 교사 목록을 조회한 후 `for...of` 루프에서 각 교사별로 `getTeacherStudentMetrics()` Server Action을 순차 호출
- Files: `src/app/[locale]/(dashboard)/analytics/page.tsx` (lines 34-51)
- Cause: 교사 10명이면 DB 쿼리가 최소 11회 이상 발생 (1회 교사 목록 + 교사별 다수 쿼리)
- Improvement path: `Promise.all()`로 병렬 실행하거나, 집계 쿼리를 하나의 Server Action으로 통합

**학생 분석 이력 조회 switch-case 구조:**
- Problem: `getAnalysisHistory()` 함수가 type 파라미터에 따라 7개 테이블을 개별 쿼리
- Files: `src/lib/actions/student/analysis.ts` (lines 120-271)
- Cause: 각 분석 타입(saju, face, palm, mbti, vark, name, zodiac)이 별도 테이블에 저장
- Improvement path: 분석 이력 통합 테이블 도입 또는 병렬 조회 후 집계

**학생 목록 조회 시 페이지네이션 미적용 경로:**
- Problem: `getStudents()` 함수에서 `pagination` 파라미터 없이 호출하면 전체 학생을 `findMany()`로 조회
- Files: `src/lib/actions/student/crud.ts` (lines 560-565)
- Cause: 초기 구현에서 페이지네이션이 선택적으로 도입됨
- Improvement path: 호출부에서 항상 페이지네이션 파라미터를 전달하도록 강제하고, 기본값 적용

---

## Fragile Areas

**Server Action 인증 패턴 불일치:**
- Files:
  - `src/lib/actions/student/analysis.ts` - 인증 없음
  - `src/lib/actions/student/crud.ts` - `verifySession()` 사용
  - `src/lib/actions/student/parent-report.ts` - `getCurrentTeacher()` 사용
  - `src/lib/actions/common/performance.ts` - `verifySession()` 사용
- Why fragile: 76개 Server Action 파일에서 3가지 다른 인증 패턴(`verifySession`, `getSession`, `getCurrentTeacher`)이 혼재. 새 Server Action 추가 시 인증 패턴 누락 위험
- Safe modification: 새 Server Action 작성 시 반드시 함수 첫 줄에 `const session = await verifySession()`를 호출. 교사 정보가 필요하면 `getCurrentTeacher()` 사용
- Test coverage: Server Action에 대한 통합 테스트 부재. 인증 우회를 검증하는 테스트 없음

**이벤트 버스 (SSE) 메모리 관리:**
- Files: `src/app/api/events/route.ts`, `src/lib/events/event-bus.ts`
- Why fragile: SSE 연결이 끊어질 때 이벤트 구독 해제가 `abort` 이벤트에 의존. 비정상 연결 종료 시 메모리 누수 가능
- Safe modification: 이벤트 리스너 추가/변경 시 반드시 `request.signal.addEventListener('abort', ...)` 에서 cleanup 보장
- Test coverage: SSE 연결/해제에 대한 테스트 없음

**Prisma 스키마 마이그레이션 이력:**
- Files: `prisma/migrations/` (30개 이상 마이그레이션)
- Why fragile: 마이그레이션 파일이 30개 이상 축적. 특히 LLM 관련 테이블 스키마가 여러 차례 변경됨 (add -> rename -> remove -> universal hub)
- Safe modification: 새 마이그레이션 생성 시 `prisma migrate dev --name descriptive_name` 사용. 롤백 시 마이그레이션 파일 수동 삭제 필요
- Test coverage: 마이그레이션 무결성 자동 검증 없음

---

## Scaling Limits

**Connection Pool 설정:**
- Current capacity: `max: 10` 연결 (하드코딩)
- Limit: 동시 DB 쿼리 10개 초과 시 연결 대기 (timeout: 2000ms)
- Files: `src/lib/db/client.ts` (line 20)
- Scaling path: 환경 변수로 풀 사이즈 설정 가능하도록 변경. `DATABASE_URL`의 `connection_limit` 파라미터와 동기화 필요

**In-Memory Rate Limiter:**
- Current capacity: 단일 프로세스 메모리 기반
- Limit: 멀티 인스턴스 배포 시 rate limit이 인스턴스별로 독립 작동하여 의도한 제한 미적용
- Files: `src/lib/rate-limit.ts`
- Scaling path: Redis 기반 rate limiter로 교체 (현재는 단일 인스턴스 Docker 배포이므로 당장 문제 없음)

**SSE 이벤트 버스:**
- Current capacity: 단일 프로세스 메모리 기반 이벤트 버스
- Limit: 멀티 인스턴스 배포 시 이벤트가 동일 인스턴스에 연결된 클라이언트에게만 전달
- Files: `src/lib/events/event-bus.ts`
- Scaling path: Redis Pub/Sub 또는 별도 이벤트 스트리밍 서비스 도입

---

## Dependencies at Risk

**다수의 AI SDK 의존성:**
- Risk: 8개 이상의 AI 제공자 SDK를 직접 의존 (`@ai-sdk/anthropic`, `@ai-sdk/openai`, `@ai-sdk/google`, `@ai-sdk/deepseek`, `@ai-sdk/mistral`, `@ai-sdk/cohere`, `@ai-sdk/xai`, `zhipu-ai-provider`, `ollama-ai-provider-v2`)
- Impact: 번들 크기 증가, 의존성 충돌 가능성, 각 SDK의 breaking changes에 취약
- Files: `package.json` (dependencies 섹션)
- Migration plan: 어댑터 패턴(`src/features/ai-engine/adapters/`)으로 이미 추상화되어 있으므로, 사용하지 않는 제공자의 SDK는 devDependencies로 이동하거나 동적 import 적용

**jsonwebtoken과 jose 이중 사용:**
- Risk: JWT 라이브러리가 2개 설치됨 (`jose`와 `jsonwebtoken`)
- Impact: 번들 크기 불필요한 증가, 어느 라이브러리를 사용해야 하는지 혼란
- Files: `package.json` - `jose: ^6.1.3`, `jsonwebtoken: ^9.0.3`
- Migration plan: `src/lib/session.ts`에서 `jose`를 사용 중. `jsonwebtoken` 사용처를 확인 후 `jose`로 통일하여 `jsonwebtoken` 제거

---

## Missing Critical Features

**API 라우트 요청 크기 제한 미설정:**
- Problem: 파일 업로드 API(`/api/upload/screenshot`)에 서버 사이드 파일 크기 제한이 없음
- Files: `src/app/api/upload/screenshot/route.ts`
- Blocks: 악의적인 대용량 파일 업로드로 서버 메모리 고갈 가능
- Recommendations: Next.js `route.ts`에서 `export const runtime = 'nodejs'`와 함께 body size limit 설정, 또는 FormData 파싱 시 크기 검증 추가

**세션 갱신 비활성화:**
- Problem: `updateSession()` 함수가 비활성화되어 있어 7일 만료 후 강제 로그아웃됨
- Files: `src/lib/session.ts` (lines 76-85)
- Blocks: 사용자가 활발히 사용 중에도 7일 후 세션 만료. 미들웨어에서만 갱신 가능하다는 Next.js 15 제약 때문
- Recommendations: 미들웨어에서 만료 임박 세션(예: 남은 시간 < 1일)을 자동 갱신하는 로직 추가

---

## Test Coverage Gaps

**Server Actions 통합 테스트 전무:**
- What's not tested: 76개 Server Action 파일 중 어떤 것도 통합 테스트가 없음
- Files: `src/lib/actions/` 전체 디렉토리
- Risk: 인증 우회, RBAC 위반, 잘못된 데이터 조작이 발견되지 않을 수 있음
- Priority: High

**API Route 테스트 부재:**
- What's not tested: 27개 API Route Handler 중 어떤 것도 테스트가 없음
- Files: `src/app/api/` 전체 디렉토리
- Risk: 인증/권한 검증, 입력 유효성 검사, 에러 처리 로직 검증 불가
- Priority: High

**기존 테스트 범위:**
- What's tested: 19개 테스트 파일이 features 레이어의 순수 로직과 유틸리티 함수를 검증
  - `src/features/ai-engine/__tests__/failover.test.ts`
  - `src/features/analysis/*/__tests__/*.test.ts` (compatibility, mbti, name, vark)
  - `src/features/grade-management/*/__tests__/*.test.ts` (stat-analyzer, ocr)
  - `src/features/matching/__tests__/auto-assignment.test.ts`
  - `src/lib/validations/__tests__/*.test.ts` (counseling, reservations, session-notes)
  - `src/shared/utils/__tests__/*.test.ts` (date-range, extract-json, pagination)
  - `src/lib/chat/__tests__/parse-mention-chips.test.ts`
  - `src/lib/errors/__tests__/action-result.test.ts`
- Risk: UI 컴포넌트, 페이지 렌더링, 데이터 흐름 전체 경로에 대한 테스트 없음
- Priority: Medium

**E2E 테스트:**
- What's not tested: Playwright 설정은 존재하지만 (`@playwright/test` devDependency) `e2e/` 디렉토리에 실제 테스트 파일이 없음
- Files: `playwright-report/`, `.playwright-cli/`, `.playwright-mcp/` 디렉토리는 존재하나 테스트 스크립트 없음
- Risk: 사용자 워크플로우 전체 경로(로그인 -> 학생 등록 -> 분석 -> 리포트) 검증 불가
- Priority: Medium

---

## Hardcoded Values & Magic Numbers

**분산된 상수 정의:**
- Files:
  - `src/app/api/chat/route.ts:14` - `MAX_CONTEXT_MESSAGES = 20`
  - `src/lib/chat/context-builder.ts:12` - `MAX_ENTITIES = 10`
  - `src/lib/db/client.ts:20` - `max: 10` (connection pool)
  - `src/lib/db/client.ts:21` - `idleTimeoutMillis: 30000`
  - `src/lib/db/client.ts:22` - `connectionTimeoutMillis: 2000`
  - `src/lib/session.ts:60` - `7 * 24 * 60 * 60 * 1000` (7일 세션 만료)
  - `src/shared/utils/pagination.ts:4-5` - `DEFAULT_PAGE_SIZE = 20`, `MAX_PAGE_SIZE = 100`
  - `src/app/api/health/route.ts:79` - `pool.totalCount / 10` (하드코딩된 max pool size)
- Impact: 환경별 설정 변경이 어렵고, 동일 값이 여러 곳에 흩어져 있음
- Fix approach: `src/shared/constants/` 에 카테고리별 상수 파일 정리. DB 연결 풀 설정은 환경 변수화

---

## FSD Layer Violations

**Features 간 Cross-Import:**
- Issue: `grade-management` feature가 `ai-engine` feature를 직접 import
- Files:
  - `src/features/grade-management/ocr/ocr-processor.ts:8` - `import { generateWithVision } from '@/features/ai-engine/router-vision'`
  - `src/features/grade-management/analysis/llm-composer.ts:1` - `import { generateWithProvider } from '@/features/ai-engine/universal-router'`
  - `src/features/grade-management/report/parent-report-generator.ts:4` - `import { generateWithProvider } from '@/features/ai-engine/universal-router'`
- Impact: FSD 원칙에서 feature 간 직접 의존은 권장되지 않음 (동일 레이어 내 cross-import)
- Fix approach: `ai-engine`의 공개 API를 `src/features/ai-engine/index.ts` 배럴 파일을 통해 노출하고, 필요하면 shared 레이어로 인터페이스 추출

**Features에서 lib 레이어 의존 (허용됨):**
- Note: features가 `@/lib/db/client`, `@/lib/logger`를 import하는 것은 FSD에서 하위 레이어(shared/lib) 참조이므로 문제없음
- Files: `src/features/` 전체에서 `@/lib/` import 다수
- Status: 정상적인 레이어 의존 방향

**shared 레이어의 순수성 유지:**
- Note: `src/shared/`에서 상위 레이어(features, app, components, lib)를 import하는 경우는 발견되지 않음
- Status: 올바른 FSD 레이어 구조 유지 중

---

## Deployment Concerns

**Docker 빌드 시 DATABASE_URL 필요:**
- Issue: Prisma Client 생성(`prisma generate`)에 DATABASE_URL이 필요하지만, Dockerfile에서 빌드 시 연결 불필요
- Files: `Dockerfile` (line 17), `src/lib/db/client.ts` (lines 29-37)
- Current mitigation: `NEXT_PHASE === "phase-production-build"` 체크로 빌드 시 더미 클라이언트 반환
- Impact: CI에서도 `DATABASE_URL`을 더미 값으로 설정해야 함 (이미 적용 중: `.github/workflows/ci.yml:37`)

**docker-compose.yml에 DB 서비스 미포함:**
- Issue: `docker-compose.yml`에 PostgreSQL 서비스가 없고 외부 네트워크(`ai-afterschool-ex_internal`)에 의존
- Files: `docker-compose.yml` (line 33)
- Impact: 독립적인 배포가 불가능하며, 외부 DB 네트워크가 먼저 존재해야 함
- Recommendations: 개발/테스트용 `docker-compose.dev.yml`에 PostgreSQL 서비스 포함 검토

**console.error/warn 잔류:**
- Issue: 클라이언트 컴포넌트에서 `console.error` 30개 이상 사용 중
- Files: `src/components/` 전체에 분포 (vark, counseling, matching, statistics, chat 등)
- Impact: 프로덕션 빌드에서 콘솔 로그가 사용자 브라우저에 노출
- Fix approach: 클라이언트 에러 처리를 Sentry(`@sentry/nextjs` 이미 설치)로 통일하거나, 사용자에게 toast 알림으로 대체

---

*Concerns audit: 2026-02-27*
