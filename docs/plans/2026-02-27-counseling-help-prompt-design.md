# 상담 관리 도움말 + AI 프롬프트 커스터마이징 설계

## 목표

1. **상담 관리 도움말**: 상담 기능 전체에 대한 상세 가이드 제공
2. **AI 프롬프트 커스터마이징**: 상담 시나리오/분석/학부모 메시지 생성 프롬프트를 관리자가 수정 가능하도록

## 설계 결정

| 항목 | 결정 |
|------|------|
| 도움말 범위 | 상담 관리 중심, 확장 가능 구조 |
| 도움말 방식 | 기존 `help-content.ts` 확장 (counseling 카테고리 추가) |
| 프롬프트 수정 권한 | TEAM_LEADER 이상 (Admin 페이지) |
| 프롬프트 수정 위치 | Admin 페이지 "상담 프롬프트" 탭 |
| 프롬프트 저장 | DB `CounselingPromptPreset` 모델 |
| 기존 패턴 | `AnalysisPromptPreset` + `AnalysisPromptsTab` 패턴 재사용 |

---

## Part 1: 상담 관리 도움말

### 1.1 HelpCategory 확장

```typescript
// src/lib/help/help-content.ts
export type HelpCategory =
  | 'getting-started'
  | 'providers'
  | 'features'
  | 'troubleshooting'
  | 'counseling';       // 새로 추가
```

### 1.2 도움말 토픽 목록

| ID | 제목 | 요약 |
|----|------|------|
| `counseling-overview` | 상담 관리 소개 | 상담 관리 시스템의 전체 구조와 주요 기능 |
| `counseling-history` | 상담 기록 관리 | 상담 기록 조회, 필터링, 통계 확인 |
| `counseling-reservation` | 예약 등록 가이드 | 4단계 마법사를 통한 상담 예약 등록 과정 |
| `counseling-ai-pipeline` | AI 분석 파이프라인 | AI가 분석 보고서→시나리오→학부모 메시지를 생성하는 과정 |
| `counseling-ai-prompts` | AI 프롬프트 구조 | 각 단계별 프롬프트 구성, 입력 데이터, 출력 형식 상세 |
| `counseling-prompt-customization` | 프롬프트 커스터마이징 | 관리자가 AI 프롬프트를 수정하는 방법 |
| `counseling-session-live` | 상담 세션 진행 | 실시간 상담 진행, 체크리스트, AI 자료 참조 |
| `counseling-calendar` | 예약 캘린더 | 월/주별 캘린더로 예약 관리 |
| `counseling-troubleshooting` | 상담 관리 문제 해결 | AI 생성 실패, 예약 충돌 등 일반 문제 해결 |

### 1.3 InlineHelp 배치 위치

| 페이지/컴포넌트 | helpId | 위치 |
|----------------|--------|------|
| 상담 관리 헤더 | `counseling-overview` | 제목 옆 (?) 아이콘 |
| 상담 기록 탭 | `counseling-history` | 탭 내 설명 텍스트 옆 |
| 예약 관리 탭 | `counseling-reservation` | "새 예약 등록" 버튼 옆 |
| 마법사 Step 2 | `counseling-ai-pipeline` | "학생 분석 보고서" 제목 옆 |
| 마법사 Step 3 | `counseling-ai-prompts` | "상담 시나리오" 제목 옆 |
| 세션 라이브 | `counseling-session-live` | 헤더 영역 |
| 예약 캘린더 탭 | `counseling-calendar` | 탭 내 설명 텍스트 옆 |

---

## Part 2: AI 프롬프트 커스터마이징

### 2.1 DB 스키마

```prisma
model CounselingPromptPreset {
  id               String   @id @default(cuid())
  promptType       String   // 'analysis_report' | 'scenario' | 'parent_summary' | 'counseling_summary' | 'personality_summary'
  name             String   // 프리셋 이름 (예: "기본 분석 보고서")
  description      String   // 프리셋 설명
  promptTemplate   String   // 프롬프트 템플릿 본문
  systemPrompt     String?  // 시스템 프롬프트 (선택)
  maxOutputTokens  Int      @default(1000)
  temperature      Float    @default(0.3)
  isBuiltIn        Boolean  @default(false)  // 기본 내장 프롬프트
  isActive         Boolean  @default(true)
  sortOrder        Int      @default(0)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  @@unique([promptType, name])
  @@index([promptType, isActive])
}
```

### 2.2 promptType 정의

| promptType | 현재 프롬프트 빌더 | 용도 |
|------------|-------------------|------|
| `analysis_report` | `buildAnalysisReportPrompt()` | 학생 분석 보고서 (Step 2) |
| `scenario` | `buildScenarioPrompt()` | 30분 상담 시나리오 (Step 3) |
| `parent_summary` | `buildParentSummaryPrompt()` | 학부모 공유용 메시지 (Step 4) |
| `counseling_summary` | `buildCounselingSummaryPrompt()` | 상담 요약 (세션 완료 시) |
| `personality_summary` | `buildPersonalitySummaryPrompt()` | 성향 통합 요약 |

### 2.3 프롬프트 템플릿 변수

각 promptType에서 사용 가능한 변수:

**analysis_report**:
```
{{studentName}}, {{school}}, {{grade}}, {{topic}},
{{personalitySection}}, {{previousSessionsSection}}, {{gradeHistorySection}}
```

**scenario**:
```
{{studentName}}, {{topic}}, {{approvedReport}}, {{personalitySummary}}
```

**parent_summary**:
```
{{studentName}}, {{topic}}, {{scheduledAt}}, {{approvedScenario}}
```

**counseling_summary**:
```
{{studentName}}, {{sessionDate}}, {{sessionType}},
{{personalitySection}}, {{previousSessionsSection}}, {{currentSummary}}
```

**personality_summary**:
```
{{studentName}}, {{mbtiSection}}, {{sajuSection}},
{{nameSection}}, {{faceSection}}, {{palmSection}}
```

### 2.4 프롬프트 빌더 수정 전략

기존 하드코딩 프롬프트 빌더를 다음과 같이 변경:

```typescript
// Before (하드코딩)
export function buildAnalysisReportPrompt(input) {
  return `너는 학생 상담 전문 교육 컨설턴트야...`
}

// After (DB 프리셋 우선 조회)
export async function buildAnalysisReportPrompt(input) {
  // 1. DB에서 활성 프리셋 조회
  const preset = await getActiveCounselingPreset('analysis_report')

  if (preset) {
    // 2. 템플릿 변수 치환
    return replaceTemplateVars(preset.promptTemplate, {
      studentName: input.studentName,
      school: input.school,
      ...
    })
  }

  // 3. 폴백: 기본 하드코딩 프롬프트
  return buildDefaultAnalysisReportPrompt(input)
}
```

### 2.5 Admin UI 구성

Admin 페이지에 "상담 프롬프트" 탭 추가:

```
Admin 페이지
├─ LLM Hub
├─ AI 프롬프트 (기존 - 분석)
├─ 상담 프롬프트 (★ 새로 추가)
│  ├─ 서브탭: 분석 보고서 | 상담 시나리오 | 학부모 메시지 | 상담 요약 | 성향 요약
│  └─ 각 서브탭:
│     ├─ 활성 프리셋 목록 (카드)
│     ├─ "새 프리셋 추가" 버튼
│     ├─ 프리셋 편집 폼
│     │  ├─ 이름, 설명
│     │  ├─ 프롬프트 템플릿 (Textarea, monospace)
│     │  ├─ 사용 가능 변수 가이드 ({{변수}} 목록)
│     │  ├─ maxOutputTokens (슬라이더/input)
│     │  ├─ temperature (슬라이더 0.0~1.0)
│     │  └─ 미리보기 버튼 (실제 LLM 호출 없이 변수 치환 결과만)
│     └─ 내장 프리셋: 잠금 아이콘, 삭제 불가 (비활성만)
├─ 시스템 상태
└─ ...
```

---

## 구현 순서

### Phase 1: 도움말 콘텐츠 (코드 변경 최소)
1. `help-content.ts`에 counseling 카테고리 + 9개 토픽 추가
2. HelpCenter 컴포넌트에 counseling 카테고리 지원
3. 상담 관리 페이지에 InlineHelp 컴포넌트 배치

### Phase 2: 프롬프트 커스터마이징 인프라
4. Prisma 스키마에 `CounselingPromptPreset` 모델 추가
5. `db:push`로 DB 반영
6. Repository 함수 (CRUD)
7. 검증 스키마
8. Server Actions (CRUD)

### Phase 3: 프롬프트 빌더 수정
9. 템플릿 변수 치환 유틸 함수
10. 5개 프롬프트 빌더 함수를 DB 조회 → 폴백 패턴으로 수정
11. 기본 내장 프리셋 시딩

### Phase 4: Admin UI
12. CounselingPromptsTab 컴포넌트
13. Admin 페이지에 탭 추가
14. 프리셋 편집 폼 + 변수 가이드 + 미리보기

---

## 기술적 고려사항

1. **동기→비동기 전환**: 프롬프트 빌더가 DB 조회를 위해 `async`로 변경됨. Server Action 내에서 호출하므로 문제없음.
2. **캐싱**: 프리셋이 자주 변경되지 않으므로 `unstable_cache` 또는 메모리 캐시 적용 가능.
3. **마이그레이션**: 기존 하드코딩 프롬프트를 `isBuiltIn: true`로 시딩하여 기본값 보존.
4. **변수 치환 안전성**: `{{변수}}`가 누락되면 그대로 출력 (에러 아님), 잘못된 변수명은 무시.
