# 종합 성적관리 시스템 설계

> 작성일: 2026-02-27
> 상태: 승인됨

## 1. 개요

### 목적
기존의 단순 성적 입력/조회 기능을 **종합 학습 관리 플랫폼**으로 확장한다.
OCR 기반 성적표 입력, AI 학습 코칭, 학부모 리포트, 학습 습관 추적 등을 포함한다.

### 범위
- **종합 학습 관리**: 내신 + 모의고사 + 자체 테스트/퀴즈/과제
- **OCR 성적 입력**: 학교 성적통지표 + 모의고사 성적표 + 자유 형식 문서
- **AI 종합 학습 코칭**: 강점/약점 분석, 학습 플랜, 목표 대학 역산, 종합 코칭
- **추가 기능**: 취약 단원 분석, 학부모 리포트, 동료 비교, 학습 습관 추적

### 접근 방식
**점진적 확장** (4 Phase):
1. DB 스키마 확장 + OCR 엔진 + 기본 성적 입력 강화
2. AI 분석 엔진 (통계 + LLM 학습 전략)
3. 학습 코칭 (목표 역산, 플랜 생성, 취약 단원)
4. 학부모 리포트 + 동료 비교 + 학습 습관

---

## 2. 데이터 모델

### 2.1 기존 GradeHistory 확장

```prisma
model GradeHistory {
  // 기존 필드 유지
  id              String    @id @default(cuid())
  studentId       String
  teacherId       String?
  subject         String
  gradeType       GradeType
  score           Float
  maxScore        Float     @default(100)
  normalizedScore Float
  testDate        DateTime
  academicYear    Int
  semester        Int
  notes           String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  // 새 필드
  classAverage     Float?     // 반 평균
  classStdDev      Float?     // 반 표준편차
  gradeRank        Int?       // 등급 (1~9, 내신)
  classRank        Int?       // 석차
  totalStudents    Int?       // 전체 학생 수
  category         String?    // 세부 단원/영역

  student         Student   @relation(fields: [studentId], references: [id], onDelete: Cascade)
  teacher         Teacher?  @relation(fields: [teacherId], references: [id], onDelete: SetNull)

  @@index([studentId, subject, testDate])
  @@index([studentId, academicYear, semester])
  @@index([teacherId])
}
```

### 2.2 모의고사 성적 (새 모델)

```prisma
model MockExamResult {
  id             String   @id @default(cuid())
  studentId      String
  teacherId      String?
  examName       String       // "2026년 3월 전국연합"
  examDate       DateTime
  subject        String
  rawScore       Float        // 원점수
  standardScore  Float?       // 표준점수
  percentile     Float?       // 백분위
  gradeRank      Int?         // 등급 (1~9)
  academicYear   Int
  notes          String?
  ocrSourceId    String?      // OCR로 입력된 경우 원본 참조
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  student        Student   @relation(fields: [studentId], references: [id], onDelete: Cascade)
  teacher        Teacher?  @relation(fields: [teacherId], references: [id], onDelete: SetNull)
  ocrSource      GradeOcrScan? @relation(fields: [ocrSourceId], references: [id])

  @@index([studentId, subject, examDate])
  @@index([studentId, academicYear])
  @@index([teacherId])
}
```

### 2.3 OCR 스캔 기록

```prisma
model GradeOcrScan {
  id             String          @id @default(cuid())
  teacherId      String
  studentId      String?
  imageUrl       String
  documentType   OcrDocumentType
  extractedData  Json            // AI가 추출한 원시 데이터
  processedData  Json?           // 검증 후 정제된 데이터
  status         OcrScanStatus
  confidence     Float?          // AI 신뢰도 (0~1)
  errorMessage   String?
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt

  teacher        Teacher   @relation(fields: [teacherId], references: [id])
  student        Student?  @relation(fields: [studentId], references: [id])
  mockExamResults MockExamResult[]

  @@index([teacherId])
  @@index([studentId])
  @@index([status])
}
```

### 2.4 AI 학습 분석 결과

```prisma
model LearningAnalysis {
  id              String       @id @default(cuid())
  studentId       String
  teacherId       String?
  analysisType    AnalysisType
  targetExamType  String?      // "수능", "내신" 등
  analysisData    Json         // AI 분석 결과
  recommendations Json?        // 추천 학습 전략
  validUntil      DateTime?    // 분석 유효기간
  version         Int          @default(1)
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  student         Student   @relation(fields: [studentId], references: [id], onDelete: Cascade)
  teacher         Teacher?  @relation(fields: [teacherId], references: [id], onDelete: SetNull)

  @@index([studentId, analysisType])
  @@index([studentId, createdAt])
}
```

### 2.5 학습 습관 추적

```prisma
model StudyLog {
  id           String        @id @default(cuid())
  studentId    String
  teacherId    String?
  subject      String?
  studyDate    DateTime
  durationMin  Int           // 공부 시간 (분)
  taskType     StudyTaskType
  completed    Boolean       @default(false)
  notes        String?
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt

  student      Student   @relation(fields: [studentId], references: [id], onDelete: Cascade)
  teacher      Teacher?  @relation(fields: [teacherId], references: [id], onDelete: SetNull)

  @@index([studentId, studyDate])
  @@index([studentId, subject])
  @@index([teacherId])
}
```

### 2.6 학부모 성적 리포트

```prisma
model ParentGradeReport {
  id            String    @id @default(cuid())
  studentId     String
  parentId      String?
  reportPeriod  String       // "2026-1학기" 등
  reportData    Json         // 성적 요약 + AI 분석 + 추천
  pdfUrl        String?
  sentAt        DateTime?
  sentMethod    String?      // EMAIL / PDF_DOWNLOAD
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt

  student       Student   @relation(fields: [studentId], references: [id], onDelete: Cascade)
  parent        Parent?   @relation(fields: [parentId], references: [id], onDelete: SetNull)

  @@index([studentId, reportPeriod])
  @@index([parentId])
}
```

### 2.7 새 Enum

```prisma
enum OcrDocumentType {
  TRANSCRIPT    // 학교 성적통지표
  MOCK_EXAM     // 모의고사 성적표
  CUSTOM        // 자유 형식
}

enum OcrScanStatus {
  PENDING       // 업로드됨, 처리 대기
  PROCESSING    // AI 분석 중
  REVIEWED      // 교사 검토 완료
  CONFIRMED     // 확정 (DB 반영됨)
  FAILED        // 처리 실패
}

enum AnalysisType {
  STRENGTH_WEAKNESS  // 강점/약점 분석
  STUDY_PLAN         // 학습 플랜
  GOAL_GAP           // 목표-현재 격차 분석
  COACHING           // 종합 코칭 리포트
}

enum StudyTaskType {
  HOMEWORK      // 숙제
  SELF_STUDY    // 자습
  TUTORING      // 과외 수업
  REVIEW        // 복습
}
```

### 2.8 FeatureType 확장

```typescript
// ai-engine/providers/types.ts에 추가
| 'grade_ocr'           // 성적표 OCR 분석
| 'grade_analysis'      // 성적 분석 & 학습 전략
| 'parent_report'       // 학부모 리포트 생성
```

---

## 3. OCR 엔진 아키텍처

### 3.1 처리 플로우

```
교사: 성적표 사진 촬영/업로드
  → 이미지 전처리 (클라이언트: 리사이즈, 회전 보정, 품질 체크)
  → Vision LLM 호출 (서버: router-vision.ts 활용)
  → 추출 데이터 검증 (Zod 스키마 + 신뢰도 계산)
  → 교사 검토 UI (원본 이미지 + 추출 결과 나란히 표시)
  → 확정 & DB 저장 (GradeHistory / MockExamResult + GradeOcrScan)
```

### 3.2 문서 유형별 추출 전략

| 문서 유형 | 추출 대상 | 프롬프트 전략 |
|-----------|----------|-------------|
| TRANSCRIPT | 과목, 원점수, 평균, 등급, 석차, 학기 | 정형 테이블 → JSON 배열 |
| MOCK_EXAM | 과목, 원점수, 표준점수, 백분위, 등급 | 모의고사 전용 포맷 |
| CUSTOM | AI 자동 판단 | 유연한 추출 + 낮은 신뢰도 표시 |

### 3.3 추출 결과 타입

```typescript
// 성적통지표
interface TranscriptOcrResult {
  documentInfo: {
    school: string;
    studentName: string;
    grade: number;
    academicYear: number;
    semester: number;
  };
  subjects: {
    name: string;
    rawScore: number;
    classAverage?: number;
    standardDev?: number;
    gradeRank?: number;
    classRank?: number;
    totalStudents?: number;
    category?: string;
    confidence: number;
  }[];
}

// 모의고사
interface MockExamOcrResult {
  examInfo: {
    examName: string;
    examDate: string;
    studentName?: string;
  };
  subjects: {
    name: string;
    rawScore: number;
    standardScore?: number;
    percentile?: number;
    gradeRank?: number;
    confidence: number;
  }[];
}
```

### 3.4 이미지 저장

기존 Cloudinary 인프라를 재활용. 원본 이미지 URL을 GradeOcrScan.imageUrl에 저장.

---

## 4. AI 학습 분석 엔진

### 4.1 아키텍처

```
StatAnalyzer (순수 통계) + StudentProfiler (MBTI/VARK/사주/목표)
         ↓
  LLM Analysis Composer (프롬프트 조합 + Universal Router 호출)
         ↓
  ┌──────────┬──────────┬──────────┬──────────┐
  │ 강점약점  │ 학습플랜  │ 목표격차  │ 종합코칭  │
  └──────────┴──────────┴──────────┴──────────┘
         ↓
  LearningAnalysis (DB 캐싱)
```

### 4.2 분석 유형

#### STRENGTH_WEAKNESS (강점/약점 분석)
- 통계: 기존 grade-analytics.ts의 improvementRate, gradeTrend 활용
- AI: VARK 스타일 + 과목별 패턴으로 "왜 약한지" 추론
- 출력: 과목별 강점/약점 + 약한 단원 목록 + AI 인사이트

#### STUDY_PLAN (학습 플랜)
- 입력: 약점 과목 + VARK 스타일 + 가용 시간 + 다음 시험 일정
- 출력: 주간/일간 학습 플랜 (과목별 시간 배분 + 학습 방법)

#### GOAL_GAP (목표 격차 분석)
- Student.targetUniversity + targetMajor 활용
- 필요 등급 역산 → 현재 성적과 격차 분석
- 종합 준비도 점수 (0~100) + 집중 필요 과목

#### COACHING (종합 코칭 리포트)
- 4가지 분석 종합 최상위 리포트
- 교사 지도 포인트 알림 포함
- MBTI/VARK 기반 동기부여 메시지

### 4.3 교사 알림 시스템

자동 알림 조건:
- GRADE_DROP: 성적 급락 (전회 대비 -15% 이상)
- GOAL_AT_RISK: 목표 달성 위험
- STUDY_HABIT_CHANGE: 학습 습관 변화 (출석률 하락 등)
- MILESTONE_REACHED: 목표 달성 (등급 상승 등)

### 4.4 동료 비교 분석

- 같은 팀/학년 학생 간 익명 성적 분포 비교
- 프라이버시: 개별 이름 비노출, 최소 5명 이상일 때만 활성화
- 점수대별 인원 분포 + 내 위치(백분위) 표시

---

## 5. 학습 습관 추적

### 5.1 데이터 수집
- 교사가 수업 중/후 간단히 기록 (학생 자기보고 아님)
- 단건 입력 + 일괄 입력 지원

### 5.2 상관관계 분석
- 총 학습시간, 과제 완수율, 평균 1회 학습 시간, 학습 규칙성 점수
- 학습시간↔성적, 완수율↔성적, 규칙성↔성적 상관계수 계산
- LLM이 습관 분석 인사이트 생성

---

## 6. 학부모 성적 리포트

### 6.1 리포트 구성
1. 성적 요약 (과목별 이번달/지난달/변화)
2. 성적 변화 추이 차트
3. AI 분석 요약
4. 학습 습관 (시간, 완수율, 출석률)
5. 가정에서 도울 수 있는 방법 (행동 가능한 조언)
6. 목표 달성 현황 (준비도 게이지)

### 6.2 발송 옵션
- PDF 다운로드 (기존 report generator 활용)
- 이메일 발송 (Resend API + Parent.email)
- 월간 자동 생성 (cron: 매월 1일)

---

## 7. UI 페이지 구조

```
/grades                          ← 성적 관리 대시보드
├── /grades                     # 전체 학생 성적 개요 (교사 뷰)
├── /grades/[studentId]         # 개별 학생 성적 상세
│   ├── tab: 성적 이력          # 기존 LearningTab 강화
│   ├── tab: OCR 입력           # 성적표 촬영/업로드
│   ├── tab: AI 분석            # 강점약점 + 목표격차
│   ├── tab: 학습 플랜          # AI 생성 학습 플랜
│   ├── tab: 학습 습관          # 습관 추적 + 상관관계
│   └── tab: 동료 비교          # 익명 비교 차트
├── /grades/ocr                 # OCR 일괄 입력 페이지
├── /grades/reports             # 학부모 리포트 관리
└── /grades/analytics           # 팀/전체 성적 통계
```

### 권한 매핑

| 역할 | 접근 범위 |
|------|----------|
| DIRECTOR | 전체 학생/교사 성적 통계, 교사 랭킹 |
| TEAM_LEADER | 팀 소속 학생 전체 + 팀 통계 |
| MANAGER | TEAM_LEADER와 동일 |
| TEACHER | 본인 담당 학생만 |

---

## 8. 파일 구조

```
src/features/grade-management/
├── ocr/
│   ├── ocr-processor.ts          # Vision LLM 호출 + 프롬프트 관리
│   ├── ocr-prompts.ts            # 문서 유형별 추출 프롬프트
│   └── ocr-validator.ts          # Zod 검증 + 신뢰도 계산
├── analysis/
│   ├── stat-analyzer.ts          # 순수 통계 분석
│   ├── student-profiler.ts       # 학생 개인화 데이터 수집
│   ├── llm-composer.ts           # LLM 프롬프트 조합 + 호출
│   ├── strength-weakness.ts      # 강점/약점 분석
│   ├── study-plan-generator.ts   # 학습 플랜 생성
│   ├── goal-gap-analyzer.ts      # 목표 격차 분석
│   ├── coaching-report.ts        # 종합 코칭
│   └── teacher-alerts.ts         # 교사 알림 조건 체크
├── study-habits/
│   ├── study-log-service.ts      # CRUD + 일괄 입력
│   ├── habit-analyzer.ts         # 상관관계 계산
│   └── consistency-scorer.ts     # 학습 규칙성 점수
├── report/
│   ├── parent-report-generator.ts
│   ├── parent-report-pdf.ts
│   ├── parent-report-email.ts
│   └── parent-report-scheduler.ts
├── peer-comparison/
│   └── peer-comparison.ts        # 동료 비교 분석
└── types.ts                      # 공통 타입

src/lib/actions/student/
├── grade.ts                      # 기존 (확장)
├── grade-ocr.ts                  # OCR Server Actions
├── grade-analysis.ts             # AI 분석 Server Actions
├── study-log.ts                  # 학습 로그 Server Actions
└── parent-report.ts              # 학부모 리포트 Server Actions

src/components/grades/
├── grade-dashboard.tsx           # 성적 대시보드
├── grade-detail-tabs.tsx         # 학생별 탭 컨테이너
├── ocr-upload-dialog.tsx         # OCR 업로드 UI
├── ocr-review-panel.tsx          # OCR 결과 검토
├── ai-analysis-panel.tsx         # AI 분석 결과 표시
├── study-plan-view.tsx           # 학습 플랜 표시
├── study-log-form.tsx            # 학습 기록 단건 입력
├── study-log-bulk-form.tsx       # 학습 기록 일괄 입력
├── study-habit-chart.tsx         # 습관 시각화
├── peer-comparison-chart.tsx     # 동료 비교 차트
├── goal-gap-dashboard.tsx        # 목표 격차 대시보드
├── parent-report-preview.tsx     # 학부모 리포트 미리보기
└── parent-report-send.tsx        # 발송 관리

src/app/[locale]/(dashboard)/grades/
├── page.tsx                      # 성적 대시보드
├── [studentId]/page.tsx          # 학생별 성적 상세
├── ocr/page.tsx                  # OCR 일괄 입력
├── reports/page.tsx              # 학부모 리포트 관리
└── analytics/page.tsx            # 통계

src/app/api/cron/
└── monthly-parent-report/route.ts
```

---

## 9. 기술적 고려사항

### 기존 인프라 재활용
- Vision LLM: `features/ai-engine/router-vision.ts`
- PDF 생성: `features/report/generator.ts`
- 이메일: Resend API (기존 설정)
- 이미지 업로드: Cloudinary (기존 설정)
- 통계 분석: `lib/analysis/grade-analytics.ts`

### 성능 최적화
- LearningAnalysis 캐싱으로 LLM 호출 최소화
- validUntil 필드로 캐시 만료 관리
- 무거운 분석은 비동기 처리 (분석 요청 → PENDING → 완료 알림)

### 보안
- 동료 비교 시 개인정보 비노출 (최소 5명 이상)
- 학부모는 자녀 데이터만 접근 가능
- 교사는 담당 학생만 접근 (기존 권한 체계 활용)
