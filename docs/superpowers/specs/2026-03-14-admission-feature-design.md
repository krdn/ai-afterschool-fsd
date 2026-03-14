# Admission Feature 설계 — 대학 입시 정보 관리

## 1. 개요

### 목적
교사가 학생의 목표 대학/학과 정보를 관리하고, AI가 웹에서 최신 입시 데이터(커트라인, 경쟁률, 준비사항)를 자동 수집하여, 학생 성적 대비 합격 가능성 분석과 맞춤 학습 전략을 제공하는 기능.

### 사용자
- **교사 전용** — 기존 인증 체계(`getCurrentTeacher()`) 활용
- 대학 마스터 데이터는 **전체 교사 공유** (등록자 기록만 보존)

### 핵심 가치
1. AI 웹 검색으로 최신 입시 정보 자동 수집 (교사 승인 후 저장)
2. 학생 성적 + 목표 대학 커트라인 → 합격 가능성 분석
3. 연도별 커트라인 추세 분석
4. 학과별 준비 가이드 (필수 과목, 비교과 활동)
5. 상세 도움말 + 설정 변경 기능

---

## 2. DB 모델

> 모든 새 모델은 `@@map("snake_case")` 컨벤션을 따름 (최근 추가 모델 패턴과 일치).

### 2-1. University (대학 마스터 — 전체 교사 공유)

```prisma
model University {
  id         String         @id @default(cuid())
  name       String         // 대학명 (예: "서울대학교")
  nameShort  String?        // 약칭 (예: "서울대")
  type       UniversityType // FOUR_YEAR, COLLEGE, CYBER 등
  region     String         // 지역 (예: "서울", "경기")
  ranking    Int?           // 대략적 순위/티어
  website    String?        // 입학처 URL
  isActive   Boolean        @default(true)
  dataSource String?        // 데이터 출처

  majors    UniversityMajor[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  createdBy   String   // 최초 등록 교사 (소유권 아님, 이력용)
  createdByTeacher Teacher @relation("UniversityCreator", fields: [createdBy], references: [id])

  @@unique([name])
  @@map("universities")
}

enum UniversityType {
  FOUR_YEAR    // 4년제
  COLLEGE      // 전문대
  CYBER        // 사이버대학
  EDUCATION    // 교육대학
}
```

### 2-2. UniversityMajor (학과 정보)

```prisma
model UniversityMajor {
  id              String   @id @default(cuid())
  universityId    String
  university      University @relation(fields: [universityId], references: [id], onDelete: Cascade)

  majorName       String   // 학과명 (예: "컴퓨터공학부")
  department      String?  // 계열 (인문, 자연, 공학, 예체능 등)
  requiredSubjects String[] // 필수 과목 (예: ["수학", "과학"])
  preparationGuide String? // AI가 생성한 준비 가이드 (마크다운)
  notes           String?

  cutoffs         AdmissionCutoff[]
  studentTargets  StudentTarget[]
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([universityId, majorName])
  @@index([universityId])
  @@map("university_majors")
}
```

### 2-3. AdmissionCutoff (연도별 합격 커트라인)

```prisma
model AdmissionCutoff {
  id                  String   @id @default(cuid())
  universityMajorId   String
  universityMajor     UniversityMajor @relation(fields: [universityMajorId], references: [id], onDelete: Cascade)

  academicYear        Int      // 학년도 (예: 2025, 2026)
  admissionType       String   // "수시_학생부교과", "수시_학생부종합", "정시_가군" 등
  cutoffGrade         Float?   // 내신 등급컷 (예: 1.5)
  cutoffScore         Float?   // 수능 점수컷 (예: 290)
  cutoffPercentile    Float?   // 백분위컷 (예: 97.5)
  competitionRate     Float?   // 경쟁률 (예: 5.2)
  enrollmentCount     Int?     // 모집인원
  applicantCount      Int?     // 지원자수
  additionalInfo      String?  // 추가 정보 (면접, 실기 등)

  dataSource          String?  // 출처 URL
  isVerified          Boolean  @default(false) // 교사 검증 여부

  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  @@unique([universityMajorId, academicYear, admissionType])
  @@index([universityMajorId])
  @@map("admission_cutoffs")
}
```

### 2-4. StudentTarget (학생별 목표 대학)

```prisma
model StudentTarget {
  id                  String   @id @default(cuid())
  studentId           String
  student             Student  @relation(fields: [studentId], references: [id], onDelete: Cascade)
  universityMajorId   String
  universityMajor     UniversityMajor @relation(fields: [universityMajorId], references: [id], onDelete: Cascade)

  priority            Int      // 지망 순위 (1, 2, 3...)
  admissionType       String?  // 지원 전형
  motivation          String?  // 지원 동기
  status              TargetStatus @default(INTERESTED)

  // AI 분석 결과 캐시
  gapAnalysis         Json?    // AdmissionAnalysisResult JSON
  admissionProbability Float?  // 합격 가능성 (0~100)
  analysisUpdatedAt   DateTime? // 분석 갱신 시각

  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  @@unique([studentId, universityMajorId])
  @@index([studentId])
  @@index([universityMajorId])
  @@map("student_targets")
}

enum TargetStatus {
  INTERESTED   // 관심
  TARGET       // 목표
  APPLIED      // 지원 완료
  ACCEPTED     // 합격
  REJECTED     // 불합격
  WITHDRAWN    // 철회
}
```

### 2-5. AdmissionDataSync (데이터 동기화 이력)

```prisma
model AdmissionDataSync {
  id              String     @id @default(cuid())
  syncType        SyncType   // AI_RESEARCH, MANUAL
  targetQuery     String     // 검색 쿼리 (예: "서울대 컴퓨터공학부 2026")
  source          String?    // 출처 URL들
  recordsFound    Int        @default(0)
  recordsSaved    Int        @default(0)
  status          SyncStatus @default(PENDING)
  resultData      Json?      // AI 수집 원본 결과
  errorLog        String?

  teacherId       String
  teacher         Teacher    @relation("AdmissionSyncTeacher", fields: [teacherId], references: [id])

  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt

  @@map("admission_data_syncs")
}

enum SyncType {
  AI_RESEARCH  // AI 웹 검색
  MANUAL       // 수동 입력
}

enum SyncStatus {
  PENDING      // 수집 중
  REVIEW       // 교사 검토 대기
  APPROVED     // 승인 완료
  REJECTED     // 거부
  FAILED       // 실패
}
```

### 2-6. 기존 모델 변경

#### Student 모델
```prisma
model Student {
  // ... 기존 필드 유지
  targetUniversity String?  // 레거시 (하위 호환)
  targetMajor      String?  // 레거시 (하위 호환)

  // 새로 추가
  targets          StudentTarget[]
}
```

#### Teacher 모델
```prisma
model Teacher {
  // ... 기존 필드 유지
  preferences      Json?    @default("{}") // 교사별 설정 (AdmissionSettings 등)

  // 새로 추가
  createdUniversities University[]       @relation("UniversityCreator")
  admissionSyncs      AdmissionDataSync[] @relation("AdmissionSyncTeacher")
}
```

---

## 3. Feature 구조

```
src/features/admission/
├── types.ts                       # 타입 정의
├── repositories/
│   ├── university.ts              # University CRUD
│   ├── university-major.ts        # UniversityMajor CRUD
│   ├── cutoff.ts                  # AdmissionCutoff CRUD
│   ├── student-target.ts          # StudentTarget CRUD
│   └── data-sync.ts               # AdmissionDataSync 이력 관리
├── services/
│   ├── ai-researcher.ts           # AI 웹 검색으로 입시 데이터 수집
│   ├── admission-analyzer.ts      # 합격 가능성 분석 (성적 vs 커트라인)
│   └── trend-analyzer.ts          # 연도별 커트라인 추세 분석
├── prompts/
│   ├── research.ts                # 입시 정보 수집 프롬프트
│   └── analysis.ts                # 합격 가능성 분석 프롬프트
└── __tests__/
    ├── admission-analyzer.test.ts
    └── trend-analyzer.test.ts
```

> **YAGNI**: `preparation-guide.ts`, `recommendation.ts` 서비스와 해당 프롬프트는 Phase 5에서 필요 시 추가. MVP에서는 제외.

---

## 4. AI 리서치 서비스 (핵심 흐름)

### 4-1. AI 웹 검색 구현 방식

기존 `universal-router.ts`의 `generateWithProvider()`는 순수 LLM 호출만 지원하므로, **실시간 웹 검색**을 위해 다음 방식을 사용:

**방식: Perplexity API를 새 provider로 추가**

Perplexity는 웹 검색이 내장된 LLM 서비스로, 응답에 출처 URL(citations)을 자동 포함합니다.
OpenAI SDK 호환 API이므로 `@ai-sdk/openai`의 `createOpenAI()`에 커스텀 `baseURL`을 설정하여 구현합니다 (기존 OpenRouter 패턴과 동일).

**등록 필요 파일 (4곳):**

```typescript
// 1. src/features/ai-engine/types.ts — ProviderType에 추가
type ProviderType = ... | 'perplexity'

// 2. src/features/ai-engine/adapters/perplexity.ts (신규)
//    - createOpenAI({ baseURL: 'https://api.perplexity.ai', apiKey }) 패턴
//    - 모델: "sonar" (웹 검색 최적화)

// 3. src/features/ai-engine/adapters/index.ts — AdapterFactory에 등록
//    registerDefaultAdapters() 내 perplexity adapter 추가

// 4. src/features/ai-engine/providers/types.ts — 설정 추가
//    PROVIDER_CONFIGS, COST_PER_MILLION_TOKENS, DEFAULT_MODELS에 perplexity 항목 추가
```

**npm 패키지**: 별도 패키지 불필요 — 기존 `@ai-sdk/openai`를 커스텀 baseURL로 재사용.

**대안 (Perplexity 사용 불가 시):**
- Google Gemini의 grounding 기능 (google adapter에서 `googleSearchRetrieval` tool 활용)
- Vercel AI SDK의 tool use로 외부 검색 API(Google Custom Search) 연결

**대학명 중복 방지**: AI 수집 시 기존 DB에서 대학명 검색(LIKE 매칭) → 유사 이름 발견 시 기존 데이터 업데이트 제안. 정규화 규칙: "대학교" 접미사 통일 (예: "서울대" → "서울대학교").

### 4-2. 수집 플로우

```
교사가 "서울대 컴퓨터공학부" 검색 요청
  ↓
AdmissionDataSync 레코드 생성 (status: PENDING)
  ↓
Perplexity API 호출 (featureType: 'admission_research')
  - 프롬프트: 대학명, 학과명, 최근 3년 커트라인/경쟁률/모집인원/
    필수과목/준비사항을 구조화된 JSON으로 요청
  - 출처 URL은 Perplexity citations에서 자동 추출
  ↓
AI 응답 → Zod 스키마로 파싱/검증
  ↓
AdmissionDataSync.status → REVIEW, resultData에 저장
  ↓
교사에게 미리보기 표시 (카드 형태)
  ↓
교사 승인 → University + UniversityMajor + AdmissionCutoff DB 저장
  OR 교사 수정 → 수정 후 저장
  OR 교사 거부 → AdmissionDataSync.status → REJECTED
```

### 4-3. 최신 정보 업데이트 플로우

```
교사가 특정 대학/학과의 "최신 정보 업데이트" 버튼 클릭
  ↓
기존 DB 데이터 + 새 AI 검색 결과 비교
  ↓
변경된 항목 하이라이트 표시 (diff 형태)
  ↓
교사 승인 → 기존 데이터 업데이트 + isVerified: true
```

### 4-4. AI FeatureType 추가 (MVP: 2개만)

```typescript
// providers/types.ts에 추가
'admission_research'      // 입시 정보 웹 검색 수집 (Perplexity)
'admission_analysis'      // 합격 가능성 분석 (일반 LLM)
```

> `admission_preparation`, `admission_recommendation`은 Phase 5에서 추가.

---

## 5. 합격 가능성 분석

### 5-1. 분석 입력

```typescript
// src/features/admission/types.ts

type AdmissionAnalysisInput = {
  student: {
    grades: { subject: string; score: number; gradeRank?: number }[]
    mockExams: { subject: string; standardScore?: number; percentile?: number; gradeRank?: number }[]
    trend: 'UP' | 'STABLE' | 'DOWN'
    varkType?: string
    mbtiType?: string
  }
  target: {
    universityName: string
    majorName: string
    admissionType: string
    cutoffs: {
      academicYear: number
      cutoffGrade?: number
      cutoffScore?: number
      cutoffPercentile?: number
      competitionRate?: number
    }[]
  }
}
```

### 5-2. 분석 출력

```typescript
type AdmissionAnalysisResult = {
  probability: number           // 합격 가능성 0~100
  grade: '안정' | '적정' | '도전' | '상향도전'
  currentVsCutoff: {
    subject: string
    current: number
    cutoff: number
    gap: number
    status: 'ABOVE' | 'AT' | 'BELOW'
  }[]
  improvementPriority: {
    subject: string
    targetImprovement: number
    strategy: string
  }[]
  overallAdvice: string
  references: string[]
}
```

### 5-3. 합격 가능성 기준 (고정값, MVP)

| 등급 | 확률 범위 |
|------|----------|
| 안정 | 80~100% |
| 적정 | 50~79% |
| 도전 | 30~49% |
| 상향도전 | 0~29% |

> 교사별 커스터마이징은 Phase 5에서 설정 탭을 통해 지원.

### 5-4. 기존 Feature 연계

- `grade-management/analysis/stat-analyzer.ts` → `analyzeSubjectStrengths()` 호출하여 과목별 현재 점수/추세 산출
- `grade-management/analysis/goal-gap-analyzer.ts` → `GoalGapResult` 타입 참조 (확장 아닌 독립 분석, 결과 형식만 참조)
- `neuroscience/services/strategy-recommender.ts` → 약점 과목에 대한 뇌과학 학습 전략 연계 (Phase 5)

---

## 6. Server Actions

```
src/lib/actions/admission/
├── university.ts          # createUniversity, searchUniversities, getUniversity, updateUniversity
├── cutoff.ts              # addCutoff, updateCutoff, deleteCutoff, getCutoffsByMajor
├── student-target.ts      # setTarget, removeTarget, getStudentTargets, updateTargetStatus
├── ai-research.ts         # requestResearch, approveResearch, rejectResearch, refreshData
├── analysis.ts            # analyzeAdmission, getAnalysisResult
└── settings.ts            # getAdmissionSettings, updateAdmissionSettings
```

모든 Server Action 패턴:
```typescript
'use server'
import { getCurrentTeacher } from '@/lib/dal'
import { ok, fail, type ActionResult } from '@/lib/errors/action-result'
```

---

## 7. 페이지 구조

```
src/app/[locale]/(dashboard)/admission/
├── page.tsx                      # 대학 검색 + 목록 + AI 수집 요청
├── [universityId]/
│   └── page.tsx                  # 대학 상세 (학과별 커트라인 추이)
├── targets/
│   └── page.tsx                  # 학생별 목표 대학 관리 + 분석
└── layout.tsx                    # 서브 내비게이션 + 도움말 버튼
```

> **YAGNI**: `research/` 별도 페이지 제거 → 메인 페이지(`page.tsx`)에 AI 수집 기능 통합.
> **YAGNI**: `analysis/` 별도 페이지 제거 → `targets/` 페이지에 분석 결과 통합 표시.

---

## 8. 컴포넌트 구조

```
src/components/admission/
├── university-search.tsx          # 대학 검색 (자동완성, AI 수집 연동)
├── university-card.tsx            # 대학 정보 카드
├── major-detail.tsx               # 학과 상세 (커트라인 + 준비사항)
├── cutoff-trend-chart.tsx         # 연도별 커트라인 추세 차트 (recharts)
├── cutoff-table.tsx               # 커트라인 테이블
├── student-target-manager.tsx     # 학생 목표 대학 설정 UI
├── admission-probability-card.tsx # 합격 가능성 카드 (안정/적정/도전)
├── ai-research-panel.tsx          # AI 수집 요청 + 결과 미리보기 + 승인
├── admission-help-dialog.tsx      # 도움말 다이얼로그 (5탭 + 설정)
└── columns.tsx                    # 테이블 컬럼 정의
```

> 차트 라이브러리: `recharts` (shadcn/ui charts에서 사용하는 라이브러리)

---

## 9. 도움말 다이얼로그 + 설정 변경

### 9-1. 탭 구성 (5탭)

| 탭 | 내용 |
|----|------|
| **개요** | 기능 소개, 전체 흐름 (검색→수집→목표설정→분석) 설명 |
| **AI 수집** | Perplexity 기반 웹 검색 작동 방식, 데이터 출처, 승인 프로세스 |
| **분석 가이드** | 합격 가능성 분석 방법, 안정/적정/도전/상향도전 기준, 커트라인 추세 읽는 법 |
| **활용 팁** | 학과별 준비사항 활용법, 학생 상담 시 활용 포인트 |
| **설정** | 아래 설정 항목 변경 가능 |

> 기존 `neuroscience-help-dialog` 4탭 패턴에서 1탭만 추가 (설정). 커트라인+준비 가이드를 "분석 가이드"와 "활용 팁"으로 통합.

### 9-2. 설정 탭 항목

```typescript
type AdmissionSettings = {
  defaultAcademicYear: number     // 기본 조회 학년도 (예: 2026)
  defaultAdmissionType: string    // 기본 전형 ("수시" | "정시")
  autoAnalysis: boolean           // 목표 설정 시 자동 분석 여부 (기본: true)
  analysisRefreshDays: number     // 분석 캐시 갱신 주기 (기본: 7일)
  showTrendChart: boolean         // 추세 차트 기본 표시 여부 (기본: true)
  maxTargetsPerStudent: number    // 학생당 최대 목표 대학 수 (기본: 5)
}
```

설정 저장: `Teacher.preferences` JSON 필드에 `admission` 키로 저장.

```typescript
// Teacher.preferences 구조
{
  admission: AdmissionSettings,
  // 향후 다른 feature 설정도 여기에 추가 가능
}
```

### 9-3. 도움말 내 설정 변경 UX

기존 `neuroscience-help-dialog` 패턴을 따르되, **설정 탭**에서:
- Select: 기본 학년도, 기본 전형
- Switch: 자동 분석, 추세 차트 표시
- NumberInput: 캐시 갱신 주기, 최대 목표 수
- "저장" 버튼 → Server Action (`updateAdmissionSettings`) 호출
- 토스트로 성공/실패 피드백
- "기본값으로 초기화" 버튼 제공

---

## 10. 에러 처리

| 시나리오 | 처리 |
|---------|------|
| AI 웹 검색 실패 | 재시도 버튼 표시, AdmissionDataSync.status → FAILED, errorLog 기록 |
| AI 응답 파싱 실패 | 원본 텍스트 표시 + 수동 입력 폼 전환 유도 |
| 중복 대학 등록 시도 | 기존 데이터 표시 + "업데이트" 버튼 제안 |
| 커트라인 데이터 없음 | "데이터 없음" 안내 + AI 수집 버튼 제공 |
| 학생 성적 부족 | 최소 필요 데이터 안내 (최소 1과목 1학기 성적) |
| Perplexity API 키 미설정 | 설정 안내 + 수동 입력 대안 제시 |

---

## 11. i18n

새 페이지/컴포넌트의 번역 키는 구현 시 `messages/ko.json`, `messages/en.json`에 추가.
주요 네임스페이스: `admission.*`

---

## 12. 테스트 전략

- **단위 테스트**: `admission-analyzer`, `trend-analyzer` — 점수 계산, 등급 판정 로직
- **통합 테스트**: AI 리서치 플로우 (Perplexity 응답 mock)
- **E2E**: 추후 Playwright (미작성 예정)

---

## 13. 구현 범위 (MVP)

### Phase 1 — DB + 기본 CRUD
- Prisma 모델 5개 추가 + Teacher.preferences 필드 추가
- `@@map` 적용, 인덱스 정의
- Repository 레이어
- Server Actions (CRUD)
- Zod validation 스키마

### Phase 2 — AI 리서치 + 수집
- Perplexity adapter 추가 (ai-engine)
- FeatureType 2개 추가 (`admission_research`, `admission_analysis`)
- AI 리서치 서비스 (웹 검색 → Zod 파싱 → 교사 승인)
- 수집 결과 검토/승인 UI (ai-research-panel)

### Phase 3 — 합격 가능성 분석
- admission-analyzer 서비스
- 성적 연계 (stat-analyzer 호출)
- 분석 결과 카드 (admission-probability-card)
- 커트라인 추세 차트 (recharts)

### Phase 4 — UI 페이지 + 도움말
- 대학 검색/목록 페이지
- 학생 목표 관리 페이지
- 도움말 다이얼로그 (5탭 + 설정)
- i18n 키 추가

### Phase 5 — 고도화 (MVP 이후)
- 대학 추천 서비스 (`admission_recommendation` FeatureType 추가)
- 준비 가이드 AI 생성 (`admission_preparation` FeatureType 추가)
- 상담 연계 (위험 학생 자동 감지 → 상담 예약 제안)
- 뇌과학 학습 전략 연계
- 합격 가능성 기준 교사 커스터마이징

---

## 14. 리뷰 이슈 해결 로그

| # | 심각도 | 이슈 | 해결 |
|---|--------|------|------|
| C1 | Critical | University.teacherId 소유권 모호 | `createdBy`로 변경, 전체 교사 공유 명시 |
| C2 | Critical | Teacher.preferences 필드 부재 | `preferences Json? @default("{}")` 추가 명시 |
| C3 | Critical | AI 웹 검색 실현 방식 미정 | Perplexity API provider 추가 방식 확정 |
| M1 | Major | @@map 누락 | 모든 모델에 `@@map("snake_case")` 추가 |
| M2 | Major | Teacher relation 누락 | `createdUniversities`, `admissionSyncs` 관계 명시 |
| M3 | Major | 인덱스 미정의 | FK 필드에 `@@index` 추가 |
| M4 | Major | FeatureType YAGNI | MVP에서 2개만 추가, 나머지 Phase 5 |
| M5 | Major | confidence 근거 부재 | `confidence` 필드 제거, `isVerified` boolean만 사용 |
| m1 | Minor | admissionTypes enum 미사용 | 필드 제거 (cutoff의 admissionType으로 충분) |
| m2 | Minor | i18n 키 누락 | Section 11 추가 |
| m3 | Minor | 타입 참조 모호 | 5-1에서 인라인 타입으로 명확화 |
| m4 | Minor | 차트 라이브러리 미지정 | recharts 명시 |
| m5 | Minor | AdmissionDataSync.updatedAt 누락 | `updatedAt DateTime @updatedAt` 추가 |
| Y1 | YAGNI | Phase 5 범위 과도 | preparation, recommendation 서비스/프롬프트 MVP에서 제거 |
| Y2 | YAGNI | 6탭 과도 | 5탭으로 축소 (커트라인+준비가이드 통합) |
| Y3 | YAGNI | probabilityThresholds 커스터마이징 | MVP에서 고정값, Phase 5에서 커스터마이징 |
