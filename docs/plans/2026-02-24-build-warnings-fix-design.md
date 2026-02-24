# Build Warnings Fix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Antigravity 코드 분석 보고서에서 발견된 3가지 빌드 경고/설정 문제를 해소한다.

**Architecture:** ESLint flat config에 Next.js 플러그인 추가, Sentry SDK 초기화 파일 3개 + instrumentation hook 생성, health route의 동적 import를 정적 fs 읽기로 교체.

**Tech Stack:** Next.js 15, @sentry/nextjs ^10.38.0, @next/eslint-plugin-next, TypeScript

---

## Task 1: @next/eslint-plugin-next 추가

**Files:**
- Modify: `eslint.config.mjs`
- Modify: `package.json` (pnpm add로 자동)

**Step 1: 패키지 설치**

Run: `pnpm add -D @next/eslint-plugin-next`
Expected: devDependencies에 `@next/eslint-plugin-next` 추가

**Step 2: eslint.config.mjs에 플러그인 추가**

`eslint.config.mjs` 상단에 import 추가:
```js
import nextPlugin from "@next/eslint-plugin-next";
```

기존 `react-hooks` 설정 블록 바로 아래에 새 설정 블록 추가:
```js
  // Next.js 전용 규칙
  {
    plugins: {
      "@next/next": nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
    },
  },
```

**Step 3: lint 실행으로 검증**

Run: `pnpm lint`
Expected: `@next/eslint-plugin-next was not detected` 경고 사라짐, 에러 0

**Step 4: 커밋**

```bash
git add eslint.config.mjs package.json pnpm-lock.yaml
git commit -m "fix(lint): @next/eslint-plugin-next 추가로 빌드 경고 해소"
```

---

## Task 2: Sentry SDK 초기화 파일 생성

**Files:**
- Create: `sentry.client.config.ts` (프로젝트 루트)
- Create: `sentry.server.config.ts` (프로젝트 루트)
- Create: `sentry.edge.config.ts` (프로젝트 루트)
- Create: `src/instrumentation.ts`

**Step 1: sentry.client.config.ts 생성**

```ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  sendDefaultPii: true,
  tracesSampleRate: 1.0,
  integrations: [
    Sentry.replayIntegration(),
  ],
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
```

**Step 2: sentry.server.config.ts 생성**

```ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  sendDefaultPii: true,
  tracesSampleRate: 1.0,
});
```

**Step 3: sentry.edge.config.ts 생성**

```ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  sendDefaultPii: true,
  tracesSampleRate: 1.0,
});
```

**Step 4: src/instrumentation.ts 생성**

```ts
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
```

**Step 5: .env.example에 SENTRY_DSN 변수 존재 확인**

`.env.example`에 `SENTRY_DSN`과 `NEXT_PUBLIC_SENTRY_DSN` 항목이 없으면 추가:
```
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=
```

**Step 6: 빌드로 검증**

Run: `pnpm build 2>&1 | grep -i "sentry\|instrumentation"`
Expected: `Could not find a Next.js instrumentation file` 경고 사라짐

**Step 7: 커밋**

```bash
git add sentry.client.config.ts sentry.server.config.ts sentry.edge.config.ts src/instrumentation.ts
git commit -m "feat(sentry): SDK 초기화 파일 및 instrumentation hook 생성"
```

---

## Task 3: health/route.ts 동적 import 수정

**Files:**
- Modify: `src/app/api/health/route.ts:3,57-63`

**Step 1: fs import에 readFileSync 추가**

`src/app/api/health/route.ts` 3번째 줄 수정:
```ts
// Before
import { existsSync, readdirSync, statSync } from 'fs'
// After
import { existsSync, readFileSync, readdirSync, statSync } from 'fs'
```

**Step 2: 동적 import를 readFileSync로 교체**

57~63번째 줄 수정:
```ts
// Before
  try {
    const packagePath = process.cwd() + '/package.json'
    const pkg = await import(packagePath)
    results.version = pkg.version
  } catch {
    // Version is optional
  }

// After
  try {
    const packagePath = process.cwd() + '/package.json'
    const pkg = JSON.parse(readFileSync(packagePath, 'utf-8'))
    results.version = pkg.version
  } catch {
    // Version is optional
  }
```

**Step 3: 빌드로 검증**

Run: `pnpm build 2>&1 | grep -i "critical dependency"`
Expected: Critical Dependency 경고 사라짐

**Step 4: 커밋**

```bash
git add src/app/api/health/route.ts
git commit -m "fix(health): 동적 import를 readFileSync로 교체하여 빌드 경고 해소"
```

---

## Task 4: 전체 빌드 검증

**Step 1: 전체 빌드 실행**

Run: `pnpm build`
Expected: 3가지 경고 모두 사라짐, 빌드 성공

**Step 2: 기존 테스트 통과 확인**

Run: `pnpm test`
Expected: 모든 테스트 PASS

**Step 3: (선택) docs/plans 파일 정리**

설계 문서가 더 이상 필요 없으면 삭제하거나 보관.
