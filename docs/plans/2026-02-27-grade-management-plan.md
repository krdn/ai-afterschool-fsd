# 종합 성적관리 시스템 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 기존 단순 성적 입력/조회를 OCR 입력, AI 학습 코칭, 학부모 리포트, 학습 습관 추적을 포함한 종합 학습 관리 플랫폼으로 확장한다.

**Architecture:** 4 Phase 점진적 확장. 기존 FSD 아키텍처를 따라 `features/grade-management/` 아래에 비즈니스 로직을 배치하고, `lib/actions/student/`에 Server Actions, `components/grades/`에 UI 컴포넌트를 구성한다. OCR은 기존 `router-vision.ts`의 Vision LLM 인프라를 재활용한다.

**Tech Stack:** Next.js 15 (App Router), Prisma, PostgreSQL, Vercel AI SDK, Recharts, shadcn/ui, Zod, Cloudinary, Resend

**Design doc:** `docs/plans/2026-02-27-grade-management-design.md`

---

## Phase 1: DB 스키마 확장 + OCR 엔진 + 성적 입력 강화

### Task 1: Prisma 스키마 확장 — 새 모델 및 필드 추가

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `src/features/ai-engine/providers/types.ts` (FeatureType 확장)
- Modify: `src/shared/types/enums.ts` (새 enum export)

**Step 1: GradeHistory 모델에 필드 추가**

`prisma/schema.prisma`에서 GradeHistory 모델을 찾아 (약 358행) 다음 필드를 `notes` 아래에 추가:

```prisma
model GradeHistory {
  // ... 기존 필드 유지 ...
  notes           String?
  classAverage    Float?     // 반 평균
  classStdDev     Float?     // 반 표준편차
  gradeRank       Int?       // 등급 (1~9, 내신)
  classRank       Int?       // 석차
  totalStudents   Int?       // 전체 학생 수
  category        String?    // 세부 단원/영역
  createdAt       DateTime  @default(now())
  // ... 나머지 유지 ...
}
```

**Step 2: 새 Enum 추가**

`prisma/schema.prisma` 파일 하단 enum 영역에 추가:

```prisma
enum OcrDocumentType {
  TRANSCRIPT
  MOCK_EXAM
  CUSTOM
}

enum OcrScanStatus {
  PENDING
  PROCESSING
  REVIEWED
  CONFIRMED
  FAILED
}

enum AnalysisType {
  STRENGTH_WEAKNESS
  STUDY_PLAN
  GOAL_GAP
  COACHING
}

enum StudyTaskType {
  HOMEWORK
  SELF_STUDY
  TUTORING
  REVIEW
}
```

**Step 3: MockExamResult 모델 추가**

```prisma
model MockExamResult {
  id             String    @id @default(cuid())
  studentId      String
  teacherId      String?
  examName       String
  examDate       DateTime
  subject        String
  rawScore       Float
  standardScore  Float?
  percentile     Float?
  gradeRank      Int?
  academicYear   Int
  notes          String?
  ocrSourceId    String?
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

**Step 4: GradeOcrScan 모델 추가**

```prisma
model GradeOcrScan {
  id              String          @id @default(cuid())
  teacherId       String
  studentId       String?
  imageUrl        String
  documentType    OcrDocumentType
  extractedData   Json
  processedData   Json?
  status          OcrScanStatus   @default(PENDING)
  confidence      Float?
  errorMessage    String?
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  teacher         Teacher   @relation(fields: [teacherId], references: [id])
  student         Student?  @relation(fields: [studentId], references: [id])
  mockExamResults MockExamResult[]

  @@index([teacherId])
  @@index([studentId])
  @@index([status])
}
```

**Step 5: LearningAnalysis 모델 추가**

```prisma
model LearningAnalysis {
  id              String       @id @default(cuid())
  studentId       String
  teacherId       String?
  analysisType    AnalysisType
  targetExamType  String?
  analysisData    Json
  recommendations Json?
  validUntil      DateTime?
  version         Int          @default(1)
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  student         Student   @relation(fields: [studentId], references: [id], onDelete: Cascade)
  teacher         Teacher?  @relation(fields: [teacherId], references: [id], onDelete: SetNull)

  @@index([studentId, analysisType])
  @@index([studentId, createdAt])
}
```

**Step 6: StudyLog 모델 추가**

```prisma
model StudyLog {
  id           String        @id @default(cuid())
  studentId    String
  teacherId    String?
  subject      String?
  studyDate    DateTime
  durationMin  Int
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

**Step 7: ParentGradeReport 모델 추가**

```prisma
model ParentGradeReport {
  id            String    @id @default(cuid())
  studentId     String
  parentId      String?
  reportPeriod  String
  reportData    Json
  pdfUrl        String?
  sentAt        DateTime?
  sentMethod    String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  student       Student   @relation(fields: [studentId], references: [id], onDelete: Cascade)
  parent        Parent?   @relation(fields: [parentId], references: [id], onDelete: SetNull)

  @@index([studentId, reportPeriod])
  @@index([parentId])
}
```

**Step 8: Student 모델에 relation 추가**

Student 모델 (약 52행)에 새 relation 필드 추가:

```prisma
model Student {
  // ... 기존 필드 ...
  mockExamResults        MockExamResult[]
  ocrScans               GradeOcrScan[]
  learningAnalyses       LearningAnalysis[]
  studyLogs              StudyLog[]
  parentGradeReports     ParentGradeReport[]
  // ... 기존 relation 유지 ...
}
```

**Step 9: Teacher 모델에 relation 추가**

```prisma
model Teacher {
  // ... 기존 필드 ...
  mockExamResults    MockExamResult[]
  ocrScans           GradeOcrScan[]
  learningAnalyses   LearningAnalysis[]
  studyLogs          StudyLog[]
  // ... 기존 relation 유지 ...
}
```

**Step 10: Parent 모델에 relation 추가**

```prisma
model Parent {
  // ... 기존 필드 ...
  gradeReports       ParentGradeReport[]
  // ... 기존 relation 유지 ...
}
```

**Step 11: FeatureType 확장**

`src/features/ai-engine/providers/types.ts`에서 FeatureType에 추가:

```typescript
export type FeatureType =
  // ... 기존 타입 유지 ...
  | 'grade_ocr'           // 성적표 OCR 분석
  | 'grade_analysis'      // 성적 분석 & 학습 전략
  | 'parent_report'       // 학부모 리포트 생성
  | 'general_chat';
```

**Step 12: 마이그레이션 실행**

Run: `pnpm prisma migrate dev --name add_grade_management_models`
Expected: Migration applied successfully

**Step 13: Prisma Client 생성 확인**

Run: `pnpm prisma generate`
Expected: Prisma Client generated

**Step 14: 커밋**

```bash
git add prisma/schema.prisma prisma/migrations/ src/features/ai-engine/providers/types.ts
git commit -m "feat: 성적관리 DB 스키마 확장 (6개 모델 + 4개 enum + FeatureType)"
```

---

### Task 2: OCR 타입 정의 및 Zod 검증 스키마

**Files:**
- Create: `src/features/grade-management/types.ts`
- Create: `src/features/grade-management/ocr/ocr-validator.ts`

**Step 1: 테스트 작성**

Create: `src/features/grade-management/ocr/__tests__/ocr-validator.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import {
  validateTranscriptResult,
  validateMockExamResult,
  calculateOverallConfidence,
} from '../ocr-validator';

describe('OCR Validator', () => {
  describe('validateTranscriptResult', () => {
    it('유효한 성적통지표 데이터를 통과시킨다', () => {
      const data = {
        documentInfo: {
          school: '서울고등학교',
          studentName: '김민수',
          grade: 2,
          academicYear: 2026,
          semester: 1,
        },
        subjects: [
          {
            name: '국어',
            rawScore: 85,
            classAverage: 72.5,
            gradeRank: 3,
            confidence: 0.95,
          },
        ],
      };
      const result = validateTranscriptResult(data);
      expect(result.success).toBe(true);
    });

    it('점수 범위를 벗어나면 실패한다', () => {
      const data = {
        documentInfo: {
          school: '서울고등학교',
          studentName: '김민수',
          grade: 2,
          academicYear: 2026,
          semester: 1,
        },
        subjects: [
          { name: '국어', rawScore: 150, confidence: 0.9 },
        ],
      };
      const result = validateTranscriptResult(data);
      expect(result.success).toBe(false);
    });
  });

  describe('validateMockExamResult', () => {
    it('유효한 모의고사 데이터를 통과시킨다', () => {
      const data = {
        examInfo: {
          examName: '2026년 3월 전국연합학력평가',
          examDate: '2026-03-15',
        },
        subjects: [
          {
            name: '국어',
            rawScore: 88,
            standardScore: 132,
            percentile: 92,
            gradeRank: 2,
            confidence: 0.93,
          },
        ],
      };
      const result = validateMockExamResult(data);
      expect(result.success).toBe(true);
    });
  });

  describe('calculateOverallConfidence', () => {
    it('필드별 신뢰도의 가중 평균을 계산한다', () => {
      const subjects = [
        { name: '국어', rawScore: 85, confidence: 0.95 },
        { name: '수학', rawScore: 90, confidence: 0.85 },
      ];
      const confidence = calculateOverallConfidence(subjects);
      expect(confidence).toBe(0.9);
    });

    it('빈 배열이면 0을 반환한다', () => {
      const confidence = calculateOverallConfidence([]);
      expect(confidence).toBe(0);
    });
  });
});
```

**Step 2: 테스트 실행하여 실패 확인**

Run: `pnpm vitest run src/features/grade-management/ocr/__tests__/ocr-validator.test.ts`
Expected: FAIL (모듈 없음)

**Step 3: 공통 타입 파일 작성**

Create: `src/features/grade-management/types.ts`

```typescript
// 성적통지표 OCR 추출 결과
export interface TranscriptOcrResult {
  documentInfo: {
    school: string;
    studentName: string;
    grade: number;
    academicYear: number;
    semester: number;
  };
  subjects: TranscriptSubject[];
}

export interface TranscriptSubject {
  name: string;
  rawScore: number;
  classAverage?: number;
  standardDev?: number;
  gradeRank?: number;
  classRank?: number;
  totalStudents?: number;
  category?: string;
  confidence: number;
}

// 모의고사 OCR 추출 결과
export interface MockExamOcrResult {
  examInfo: {
    examName: string;
    examDate: string;
    studentName?: string;
  };
  subjects: MockExamSubject[];
}

export interface MockExamSubject {
  name: string;
  rawScore: number;
  standardScore?: number;
  percentile?: number;
  gradeRank?: number;
  confidence: number;
}

// AI 분석 결과 타입
export interface StrengthWeaknessResult {
  overall: {
    averageScore: number;
    trend: 'UP' | 'STABLE' | 'DOWN';
    improvementRate: number;
  };
  subjects: {
    name: string;
    avgScore: number;
    trend: 'UP' | 'STABLE' | 'DOWN';
    strength: boolean;
    weakCategories: string[];
    strongCategories: string[];
  }[];
  aiInsights: string;
}

export interface StudyPlanResult {
  period: string;
  weeklyPlans: {
    week: number;
    focusSubjects: string[];
    dailyTasks: {
      day: string;
      subject: string;
      taskDescription: string;
      durationMin: number;
      priority: 'HIGH' | 'MID' | 'LOW';
    }[];
    weeklyGoal: string;
  }[];
  studyTips: string[];
}

export interface GoalGapResult {
  target: {
    university: string;
    major: string;
    requiredGrades: {
      subject: string;
      requiredRank: number;
      currentRank: number;
      gap: number;
      achievable: boolean;
    }[];
  };
  overallReadiness: number;
  criticalSubjects: string[];
  timeline: string;
  aiRecommendation: string;
}

export interface PeerComparison {
  subject: string;
  myScore: number;
  peerStats: {
    average: number;
    median: number;
    percentile: number;
    distribution: {
      range: string;
      count: number;
      isMyRange: boolean;
    }[];
  };
}

export interface StudyHabitCorrelation {
  student: {
    totalStudyHours: number;
    completionRate: number;
    averageSessionLength: number;
    consistencyScore: number;
    attendanceRate: number;
  };
  correlation: {
    studyHours_vs_score: number;
    completion_vs_score: number;
    consistency_vs_score: number;
    topFactors: string[];
  };
  aiInsight: string;
}

export interface TeacherAlert {
  type: 'GRADE_DROP' | 'GOAL_AT_RISK' | 'STUDY_HABIT_CHANGE' | 'MILESTONE_REACHED';
  studentId: string;
  message: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
}
```

**Step 4: OCR 검증기 구현**

Create: `src/features/grade-management/ocr/ocr-validator.ts`

```typescript
import { z } from 'zod';

// 성적통지표 검증 스키마
const TranscriptSubjectSchema = z.object({
  name: z.string().min(1),
  rawScore: z.number().min(0).max(100),
  classAverage: z.number().min(0).max(100).optional(),
  standardDev: z.number().min(0).optional(),
  gradeRank: z.number().int().min(1).max(9).optional(),
  classRank: z.number().int().min(1).optional(),
  totalStudents: z.number().int().min(1).optional(),
  category: z.string().optional(),
  confidence: z.number().min(0).max(1),
});

const TranscriptResultSchema = z.object({
  documentInfo: z.object({
    school: z.string().min(1),
    studentName: z.string().min(1),
    grade: z.number().int().min(1).max(3),
    academicYear: z.number().int().min(2000).max(2100),
    semester: z.number().int().min(1).max(2),
  }),
  subjects: z.array(TranscriptSubjectSchema).min(1),
});

// 모의고사 검증 스키마
const MockExamSubjectSchema = z.object({
  name: z.string().min(1),
  rawScore: z.number().min(0).max(100),
  standardScore: z.number().min(0).optional(),
  percentile: z.number().min(0).max(100).optional(),
  gradeRank: z.number().int().min(1).max(9).optional(),
  confidence: z.number().min(0).max(1),
});

const MockExamResultSchema = z.object({
  examInfo: z.object({
    examName: z.string().min(1),
    examDate: z.string().min(1),
    studentName: z.string().optional(),
  }),
  subjects: z.array(MockExamSubjectSchema).min(1),
});

export function validateTranscriptResult(data: unknown) {
  return TranscriptResultSchema.safeParse(data);
}

export function validateMockExamResult(data: unknown) {
  return MockExamResultSchema.safeParse(data);
}

export function calculateOverallConfidence(
  subjects: { confidence: number }[]
): number {
  if (subjects.length === 0) return 0;
  const total = subjects.reduce((sum, s) => sum + s.confidence, 0);
  return Math.round((total / subjects.length) * 100) / 100;
}
```

**Step 5: 테스트 실행하여 통과 확인**

Run: `pnpm vitest run src/features/grade-management/ocr/__tests__/ocr-validator.test.ts`
Expected: PASS (3 tests)

**Step 6: 커밋**

```bash
git add src/features/grade-management/
git commit -m "feat: OCR 타입 정의 및 Zod 검증 스키마 구현"
```

---

### Task 3: OCR 프롬프트 및 프로세서

**Files:**
- Create: `src/features/grade-management/ocr/ocr-prompts.ts`
- Create: `src/features/grade-management/ocr/ocr-processor.ts`

**Step 1: 테스트 작성**

Create: `src/features/grade-management/ocr/__tests__/ocr-prompts.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { getOcrPrompt } from '../ocr-prompts';

describe('OCR Prompts', () => {
  it('TRANSCRIPT 문서 유형에 대한 프롬프트를 반환한다', () => {
    const prompt = getOcrPrompt('TRANSCRIPT');
    expect(prompt).toContain('성적통지표');
    expect(prompt).toContain('JSON');
  });

  it('MOCK_EXAM 문서 유형에 대한 프롬프트를 반환한다', () => {
    const prompt = getOcrPrompt('MOCK_EXAM');
    expect(prompt).toContain('모의고사');
    expect(prompt).toContain('표준점수');
  });

  it('CUSTOM 문서 유형에 대한 프롬프트를 반환한다', () => {
    const prompt = getOcrPrompt('CUSTOM');
    expect(prompt).toContain('자유 형식');
  });
});
```

**Step 2: 테스트 실행하여 실패 확인**

Run: `pnpm vitest run src/features/grade-management/ocr/__tests__/ocr-prompts.test.ts`
Expected: FAIL

**Step 3: OCR 프롬프트 구현**

Create: `src/features/grade-management/ocr/ocr-prompts.ts`

```typescript
import type { OcrDocumentType } from '@/lib/db';

const TRANSCRIPT_PROMPT = `이 이미지는 한국 고등학교 성적통지표입니다.
이미지에서 다음 정보를 추출하여 정확한 JSON 형식으로 반환해주세요.

반환 형식:
{
  "documentInfo": {
    "school": "학교명",
    "studentName": "학생 이름",
    "grade": 학년(숫자),
    "academicYear": 학년도(숫자),
    "semester": 학기(1 또는 2)
  },
  "subjects": [
    {
      "name": "과목명",
      "rawScore": 원점수(숫자),
      "classAverage": 과목평균(숫자, 없으면 null),
      "standardDev": 표준편차(숫자, 없으면 null),
      "gradeRank": 등급(1~9, 없으면 null),
      "classRank": 석차(숫자, 없으면 null),
      "totalStudents": 전체인원(숫자, 없으면 null),
      "category": "세부영역(있는 경우, 없으면 null)",
      "confidence": 해당_필드_추출_신뢰도(0~1)
    }
  ]
}

규칙:
- 숫자 필드는 반드시 숫자 타입으로 변환
- 읽기 어렵거나 불확실한 값은 confidence를 0.5 이하로 설정
- 완전히 읽을 수 없는 필드는 null로 설정하고 confidence를 0.1로 설정
- JSON만 반환하고 다른 텍스트는 포함하지 않기`;

const MOCK_EXAM_PROMPT = `이 이미지는 한국 수능/모의고사 성적표입니다.
이미지에서 다음 정보를 추출하여 정확한 JSON 형식으로 반환해주세요.

반환 형식:
{
  "examInfo": {
    "examName": "시험명 (예: 2026년 3월 전국연합학력평가)",
    "examDate": "YYYY-MM-DD",
    "studentName": "학생 이름(있는 경우, 없으면 null)"
  },
  "subjects": [
    {
      "name": "과목명",
      "rawScore": 원점수(숫자),
      "standardScore": 표준점수(숫자, 없으면 null),
      "percentile": 백분위(숫자, 없으면 null),
      "gradeRank": 등급(1~9, 없으면 null),
      "confidence": 해당_필드_추출_신뢰도(0~1)
    }
  ]
}

규칙:
- 숫자 필드는 반드시 숫자 타입으로 변환
- 표준점수는 보통 100~200 범위
- 백분위는 0~100 범위
- 읽기 어렵거나 불확실한 값은 confidence를 0.5 이하로 설정
- JSON만 반환하고 다른 텍스트는 포함하지 않기`;

const CUSTOM_PROMPT = `이 이미지는 자유 형식의 성적/시험 관련 문서입니다.
이미지에서 과목명과 점수 정보를 최대한 추출하여 JSON 형식으로 반환해주세요.

문서가 성적통지표에 가까우면 다음 형식을 사용:
{
  "type": "transcript",
  "documentInfo": { "school": "", "studentName": "", "grade": 0, "academicYear": 0, "semester": 0 },
  "subjects": [{ "name": "", "rawScore": 0, "confidence": 0.0 }]
}

문서가 모의고사 성적표에 가까우면 다음 형식을 사용:
{
  "type": "mock_exam",
  "examInfo": { "examName": "", "examDate": "" },
  "subjects": [{ "name": "", "rawScore": 0, "confidence": 0.0 }]
}

어떤 형식에도 해당하지 않으면:
{
  "type": "unknown",
  "subjects": [{ "name": "과목명", "rawScore": 점수, "confidence": 신뢰도 }]
}

규칙:
- 이미지에서 읽을 수 있는 모든 과목/점수 정보를 추출
- 불확실한 값은 낮은 confidence(0.1~0.5)로 표시
- JSON만 반환하고 다른 텍스트는 포함하지 않기`;

const PROMPTS: Record<string, string> = {
  TRANSCRIPT: TRANSCRIPT_PROMPT,
  MOCK_EXAM: MOCK_EXAM_PROMPT,
  CUSTOM: CUSTOM_PROMPT,
};

export function getOcrPrompt(documentType: OcrDocumentType | string): string {
  return PROMPTS[documentType] ?? CUSTOM_PROMPT;
}
```

**Step 4: 테스트 실행하여 통과 확인**

Run: `pnpm vitest run src/features/grade-management/ocr/__tests__/ocr-prompts.test.ts`
Expected: PASS

**Step 5: OCR 프로세서 구현**

Create: `src/features/grade-management/ocr/ocr-processor.ts`

```typescript
import { generateWithVision } from '@/features/ai-engine/router-vision';
import { logger } from '@/lib/logger';
import { getOcrPrompt } from './ocr-prompts';
import {
  validateTranscriptResult,
  validateMockExamResult,
  calculateOverallConfidence,
} from './ocr-validator';
import type { OcrDocumentType } from '@/lib/db';
import type { TranscriptOcrResult, MockExamOcrResult } from '../types';
import { extractJsonFromText } from '@/shared/utils/extract-json';

export interface OcrProcessResult {
  extractedData: TranscriptOcrResult | MockExamOcrResult | Record<string, unknown>;
  confidence: number;
  isValid: boolean;
  errors?: string[];
  provider?: string;
  model?: string;
}

/**
 * 성적표 이미지를 Vision LLM으로 분석하여 구조화된 데이터를 추출한다.
 */
export async function processGradeImage(
  imageBase64: string,
  mimeType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
  documentType: OcrDocumentType | string,
  teacherId?: string
): Promise<OcrProcessResult> {
  const prompt = getOcrPrompt(documentType);

  try {
    const result = await generateWithVision({
      featureType: 'grade_ocr',
      teacherId,
      imageBase64,
      mimeType,
      prompt,
      system: '당신은 한국 교육 문서 OCR 전문가입니다. 이미지에서 정확한 정보를 추출하여 JSON으로 반환합니다.',
      maxOutputTokens: 4096,
      temperature: 0.1,
    });

    // LLM 응답에서 JSON 추출
    const parsed = extractJsonFromText(result.text);
    if (!parsed) {
      return {
        extractedData: {},
        confidence: 0,
        isValid: false,
        errors: ['LLM 응답에서 JSON을 추출할 수 없습니다.'],
        provider: result.provider,
        model: result.model,
      };
    }

    // 문서 유형별 검증
    let isValid = false;
    let confidence = 0;
    const errors: string[] = [];

    if (documentType === 'TRANSCRIPT') {
      const validation = validateTranscriptResult(parsed);
      isValid = validation.success;
      if (validation.success) {
        confidence = calculateOverallConfidence(validation.data.subjects);
      } else {
        errors.push(...validation.error.errors.map(e => e.message));
      }
    } else if (documentType === 'MOCK_EXAM') {
      const validation = validateMockExamResult(parsed);
      isValid = validation.success;
      if (validation.success) {
        confidence = calculateOverallConfidence(validation.data.subjects);
      } else {
        errors.push(...validation.error.errors.map(e => e.message));
      }
    } else {
      // CUSTOM: 기본 구조만 체크
      isValid = parsed && typeof parsed === 'object' && 'subjects' in parsed;
      if (isValid && Array.isArray((parsed as { subjects: unknown[] }).subjects)) {
        confidence = calculateOverallConfidence(
          (parsed as { subjects: { confidence: number }[] }).subjects
        );
      }
    }

    return {
      extractedData: parsed as TranscriptOcrResult | MockExamOcrResult,
      confidence,
      isValid,
      errors: errors.length > 0 ? errors : undefined,
      provider: result.provider,
      model: result.model,
    };
  } catch (error) {
    logger.error({ err: error, documentType }, 'OCR 처리 실패');
    return {
      extractedData: {},
      confidence: 0,
      isValid: false,
      errors: [error instanceof Error ? error.message : 'OCR 처리 중 알 수 없는 오류'],
    };
  }
}
```

**Step 6: 커밋**

```bash
git add src/features/grade-management/
git commit -m "feat: OCR 프롬프트 및 Vision LLM 프로세서 구현"
```

---

### Task 4: OCR Server Actions

**Files:**
- Create: `src/lib/actions/student/grade-ocr.ts`

**Step 1: Server Action 구현**

Create: `src/lib/actions/student/grade-ocr.ts`

```typescript
'use server';

import { db as prisma } from '@/lib/db/client';
import { getCurrentTeacher } from '@/lib/dal';
import { revalidatePath } from 'next/cache';
import { logger } from '@/lib/logger';
import { processGradeImage } from '@/features/grade-management/ocr/ocr-processor';
import type { OcrDocumentType, GradeType } from '@/lib/db';
import type { TranscriptOcrResult, MockExamOcrResult } from '@/features/grade-management/types';

/**
 * 성적표 이미지를 업로드하고 OCR 분석을 시작한다.
 */
export async function uploadAndProcessGradeImage(formData: FormData) {
  try {
    const teacher = await getCurrentTeacher();
    const studentId = formData.get('studentId') as string | null;
    const documentType = (formData.get('documentType') as OcrDocumentType) || 'CUSTOM';
    const imageBase64 = formData.get('imageBase64') as string;
    const mimeType = (formData.get('mimeType') as 'image/jpeg' | 'image/png') || 'image/jpeg';
    const imageUrl = formData.get('imageUrl') as string || '';

    if (!imageBase64) {
      return { success: false, message: '이미지 데이터가 없습니다.' };
    }

    // OCR 스캔 레코드 생성 (PROCESSING 상태)
    const scan = await prisma.gradeOcrScan.create({
      data: {
        teacherId: teacher.id,
        studentId,
        imageUrl,
        documentType,
        extractedData: {},
        status: 'PROCESSING',
      },
    });

    // Vision LLM으로 OCR 처리
    const result = await processGradeImage(imageBase64, mimeType, documentType, teacher.id);

    // 결과 저장
    await prisma.gradeOcrScan.update({
      where: { id: scan.id },
      data: {
        extractedData: result.extractedData as object,
        confidence: result.confidence,
        status: result.isValid ? 'REVIEWED' : 'FAILED',
        errorMessage: result.errors?.join('; ') || null,
      },
    });

    if (studentId) {
      revalidatePath(`/grades/${studentId}`);
    }

    return {
      success: result.isValid,
      scanId: scan.id,
      extractedData: result.extractedData,
      confidence: result.confidence,
      errors: result.errors,
      message: result.isValid
        ? 'OCR 분석이 완료되었습니다. 결과를 확인해주세요.'
        : 'OCR 분석에 실패했습니다. 수동으로 입력해주세요.',
    };
  } catch (error) {
    logger.error({ err: error }, 'OCR 업로드 처리 실패');
    return { success: false, message: 'OCR 처리 중 오류가 발생했습니다.' };
  }
}

/**
 * OCR 분석 결과를 교사가 검토 후 확정하여 성적 DB에 저장한다.
 */
export async function confirmOcrResult(
  scanId: string,
  confirmedData: TranscriptOcrResult | MockExamOcrResult,
  studentId: string
) {
  try {
    const teacher = await getCurrentTeacher();

    const scan = await prisma.gradeOcrScan.findUnique({ where: { id: scanId } });
    if (!scan) {
      return { success: false, message: 'OCR 스캔을 찾을 수 없습니다.' };
    }

    if (scan.documentType === 'TRANSCRIPT' || scan.documentType === 'CUSTOM') {
      const data = confirmedData as TranscriptOcrResult;

      // GradeHistory에 일괄 저장
      const grades = data.subjects.map((subject) => ({
        studentId,
        teacherId: teacher.id,
        subject: subject.name,
        gradeType: 'MIDTERM' as GradeType, // 기본값, 교사가 수정 가능
        score: subject.rawScore,
        maxScore: 100,
        normalizedScore: subject.rawScore,
        testDate: new Date(),
        academicYear: data.documentInfo.academicYear,
        semester: data.documentInfo.semester,
        classAverage: subject.classAverage ?? null,
        classStdDev: subject.standardDev ?? null,
        gradeRank: subject.gradeRank ?? null,
        classRank: subject.classRank ?? null,
        totalStudents: subject.totalStudents ?? null,
        category: subject.category ?? null,
      }));

      await prisma.gradeHistory.createMany({ data: grades });
    } else if (scan.documentType === 'MOCK_EXAM') {
      const data = confirmedData as MockExamOcrResult;

      // MockExamResult에 일괄 저장
      const results = data.subjects.map((subject) => ({
        studentId,
        teacherId: teacher.id,
        examName: data.examInfo.examName,
        examDate: new Date(data.examInfo.examDate),
        subject: subject.name,
        rawScore: subject.rawScore,
        standardScore: subject.standardScore ?? null,
        percentile: subject.percentile ?? null,
        gradeRank: subject.gradeRank ?? null,
        academicYear: new Date().getFullYear(),
        ocrSourceId: scanId,
      }));

      await prisma.mockExamResult.createMany({ data: results });
    }

    // 스캔 상태를 CONFIRMED로 업데이트
    await prisma.gradeOcrScan.update({
      where: { id: scanId },
      data: {
        status: 'CONFIRMED',
        processedData: confirmedData as object,
        studentId,
      },
    });

    revalidatePath(`/grades/${studentId}`);
    return { success: true, message: '성적이 저장되었습니다.' };
  } catch (error) {
    logger.error({ err: error }, 'OCR 결과 확정 실패');
    return { success: false, message: '성적 저장 중 오류가 발생했습니다.' };
  }
}

/**
 * OCR 스캔 이력 조회
 */
export async function getOcrScans(studentId?: string) {
  try {
    const teacher = await getCurrentTeacher();

    const scans = await prisma.gradeOcrScan.findMany({
      where: {
        teacherId: teacher.id,
        ...(studentId && { studentId }),
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return scans;
  } catch (error) {
    logger.error({ err: error }, 'OCR 스캔 이력 조회 실패');
    return [];
  }
}
```

**Step 2: 커밋**

```bash
git add src/lib/actions/student/grade-ocr.ts
git commit -m "feat: OCR Server Actions 구현 (업로드, 확정, 이력 조회)"
```

---

### Task 5: 성적 입력 강화 — 모의고사 Server Actions

**Files:**
- Create: `src/lib/actions/student/mock-exam.ts`
- Modify: `src/lib/actions/student/grade.ts` (새 필드 지원)

**Step 1: 모의고사 Server Actions 구현**

Create: `src/lib/actions/student/mock-exam.ts`

```typescript
'use server';

import { db as prisma } from '@/lib/db/client';
import { getCurrentTeacher } from '@/lib/dal';
import { revalidatePath } from 'next/cache';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const MockExamSchema = z.object({
  studentId: z.string(),
  examName: z.string().min(1, '시험명을 입력해주세요.'),
  examDate: z.coerce.date(),
  subject: z.string().min(1, '과목명을 입력해주세요.'),
  rawScore: z.coerce.number().min(0).max(100),
  standardScore: z.coerce.number().optional(),
  percentile: z.coerce.number().min(0).max(100).optional(),
  gradeRank: z.coerce.number().int().min(1).max(9).optional(),
  academicYear: z.coerce.number().int().default(new Date().getFullYear()),
  notes: z.string().optional(),
});

/**
 * 모의고사 성적 추가
 */
export async function addMockExamResult(prevState: unknown, formData: FormData) {
  try {
    const teacher = await getCurrentTeacher();

    const rawData = {
      studentId: formData.get('studentId'),
      examName: formData.get('examName'),
      examDate: formData.get('examDate'),
      subject: formData.get('subject'),
      rawScore: formData.get('rawScore'),
      standardScore: formData.get('standardScore') || undefined,
      percentile: formData.get('percentile') || undefined,
      gradeRank: formData.get('gradeRank') || undefined,
      academicYear: formData.get('academicYear') || new Date().getFullYear(),
      notes: formData.get('notes') || undefined,
    };

    const validated = MockExamSchema.parse(rawData);

    await prisma.mockExamResult.create({
      data: {
        ...validated,
        teacherId: teacher.id,
      },
    });

    revalidatePath(`/grades/${validated.studentId}`);
    return { success: true, message: '모의고사 성적이 등록되었습니다.' };
  } catch (error) {
    logger.error({ err: error }, '모의고사 성적 추가 실패');
    return { success: false, message: '모의고사 성적 등록 중 오류가 발생했습니다.' };
  }
}

/**
 * 모의고사 성적 조회
 */
export async function getMockExamResults(studentId: string) {
  try {
    return await prisma.mockExamResult.findMany({
      where: { studentId },
      orderBy: { examDate: 'desc' },
    });
  } catch (error) {
    logger.error({ err: error }, '모의고사 성적 조회 실패');
    return [];
  }
}

/**
 * 모의고사 성적 삭제
 */
export async function deleteMockExamResult(id: string, studentId: string) {
  try {
    await prisma.mockExamResult.delete({ where: { id } });
    revalidatePath(`/grades/${studentId}`);
    return { success: true };
  } catch {
    return { success: false, message: '삭제 실패' };
  }
}
```

**Step 2: 기존 grade.ts의 GradeSchema 확장**

`src/lib/actions/student/grade.ts`에서 GradeSchema에 새 필드 추가:

```typescript
const GradeSchema = z.object({
  studentId: z.string(),
  subject: z.string().min(1, "과목명을 입력해주세요."),
  score: z.coerce.number().min(0).max(100, "0~100 사이의 점수를 입력해주세요."),
  gradeType: z.nativeEnum(GradeType),
  testDate: z.coerce.date(),
  academicYear: z.coerce.number().int().min(2000).default(new Date().getFullYear()),
  semester: z.coerce.number().int().min(1).max(2).default(1),
  notes: z.string().optional(),
  // 새 필드
  classAverage: z.coerce.number().min(0).max(100).optional(),
  classStdDev: z.coerce.number().min(0).optional(),
  gradeRank: z.coerce.number().int().min(1).max(9).optional(),
  classRank: z.coerce.number().int().min(1).optional(),
  totalStudents: z.coerce.number().int().min(1).optional(),
  category: z.string().optional(),
});
```

`addGrade` 함수의 `rawData`에도 새 필드를 추가하고, `prisma.gradeHistory.create`의 data에 포함.

**Step 3: 커밋**

```bash
git add src/lib/actions/student/mock-exam.ts src/lib/actions/student/grade.ts
git commit -m "feat: 모의고사 Server Actions 추가 및 GradeHistory 확장 필드 지원"
```

---

### Task 6: 라우트 보호 및 페이지 구조 생성

**Files:**
- Modify: `src/middleware.ts` (`/grades` 라우트 보호 추가)
- Create: `src/app/[locale]/(dashboard)/grades/page.tsx`
- Create: `src/app/[locale]/(dashboard)/grades/[studentId]/page.tsx`
- Create: `src/app/[locale]/(dashboard)/grades/ocr/page.tsx`
- Create: `src/app/[locale]/(dashboard)/grades/reports/page.tsx`
- Create: `src/app/[locale]/(dashboard)/grades/analytics/page.tsx`

**Step 1: middleware.ts에 /grades 추가**

```typescript
const protectedRoutes = ['/students', '/dashboard', '/teachers', '/matching', '/analytics', '/counseling', '/teams', '/satisfaction', '/issues', '/chat', '/grades']
```

**Step 2: 대시보드 페이지 생성**

Create: `src/app/[locale]/(dashboard)/grades/page.tsx`

```typescript
import { getCurrentTeacher } from '@/lib/dal';
import { db } from '@/lib/db/client';
import { redirect } from 'next/navigation';
import GradeDashboard from '@/components/grades/grade-dashboard';

export default async function GradesPage() {
  const teacher = await getCurrentTeacher();

  // 담당 학생 목록 (권한에 따라 필터링)
  const students = await db.student.findMany({
    where: teacher.role === 'DIRECTOR'
      ? {}
      : teacher.role === 'TEAM_LEADER' || teacher.role === 'MANAGER'
        ? { teamId: teacher.teamId }
        : { teacherId: teacher.id },
    select: {
      id: true,
      name: true,
      school: true,
      grade: true,
      _count: { select: { gradeHistory: true, mockExamResults: true } },
    },
    orderBy: { name: 'asc' },
  });

  return <GradeDashboard students={students} teacherRole={teacher.role} />;
}
```

Create: `src/app/[locale]/(dashboard)/grades/[studentId]/page.tsx`

```typescript
import { getCurrentTeacher } from '@/lib/dal';
import { db } from '@/lib/db/client';
import { notFound } from 'next/navigation';
import GradeDetailTabs from '@/components/grades/grade-detail-tabs';

export default async function GradeDetailPage(props: {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const teacher = await getCurrentTeacher();
  const currentTab = searchParams.tab || 'history';

  const student = await db.student.findUnique({
    where: { id: params.studentId },
    include: {
      gradeHistory: { orderBy: { testDate: 'desc' } },
      mockExamResults: { orderBy: { examDate: 'desc' } },
      teacher: { select: { id: true, name: true } },
      varkAnalysis: true,
      personalitySummary: true,
    },
  });

  if (!student) notFound();

  return (
    <GradeDetailTabs
      student={student}
      currentTab={currentTab}
      teacherId={teacher.id}
    />
  );
}
```

Create: `src/app/[locale]/(dashboard)/grades/ocr/page.tsx`

```typescript
import { getCurrentTeacher } from '@/lib/dal';
import OcrUploadPage from '@/components/grades/ocr-upload-page';

export default async function GradeOcrPage() {
  const teacher = await getCurrentTeacher();
  return <OcrUploadPage teacherId={teacher.id} />;
}
```

Create: `src/app/[locale]/(dashboard)/grades/reports/page.tsx` (placeholder)

```typescript
export default function GradeReportsPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">학부모 리포트 관리</h1>
      <p className="text-gray-500">Phase 4에서 구현 예정입니다.</p>
    </div>
  );
}
```

Create: `src/app/[locale]/(dashboard)/grades/analytics/page.tsx` (placeholder)

```typescript
export default function GradeAnalyticsPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">성적 통계</h1>
      <p className="text-gray-500">Phase 2에서 구현 예정입니다.</p>
    </div>
  );
}
```

**Step 3: 커밋**

```bash
git add src/middleware.ts src/app/\[locale\]/\(dashboard\)/grades/
git commit -m "feat: 성적 관리 라우트 및 페이지 구조 생성"
```

---

### Task 7: 성적 대시보드 UI 컴포넌트

**Files:**
- Create: `src/components/grades/grade-dashboard.tsx`

**Step 1: 대시보드 컴포넌트 구현**

Create: `src/components/grades/grade-dashboard.tsx`

```typescript
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { BarChart3, Camera, Users, TrendingUp, Search } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

interface StudentSummary {
  id: string;
  name: string;
  school: string;
  grade: number;
  _count: { gradeHistory: number; mockExamResults: number };
}

export default function GradeDashboard({
  students,
  teacherRole,
}: {
  students: StudentSummary[];
  teacherRole: string;
}) {
  const [search, setSearch] = useState('');

  const filtered = students.filter(
    (s) => s.name.includes(search) || s.school.includes(search)
  );

  const totalGrades = students.reduce((sum, s) => sum + s._count.gradeHistory, 0);
  const totalMockExams = students.reduce((sum, s) => sum + s._count.mockExamResults, 0);

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">성적 관리</h1>
        <div className="flex gap-2">
          <Link href="/grades/ocr">
            <Button variant="outline">
              <Camera className="w-4 h-4 mr-2" />
              OCR 입력
            </Button>
          </Link>
        </div>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">전체 학생</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              <span className="text-2xl font-bold">{students.length}</span>
              <span className="text-gray-400 text-sm">명</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">내신 성적</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-green-600" />
              <span className="text-2xl font-bold">{totalGrades}</span>
              <span className="text-gray-400 text-sm">건</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">모의고사</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              <span className="text-2xl font-bold">{totalMockExams}</span>
              <span className="text-gray-400 text-sm">건</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">데이터 보유율</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">
                {students.length > 0
                  ? Math.round(
                      (students.filter((s) => s._count.gradeHistory > 0).length /
                        students.length) *
                        100
                    )
                  : 0}
              </span>
              <span className="text-gray-400 text-sm">%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 검색 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="학생 이름 또는 학교로 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* 학생 목록 */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>학생명</TableHead>
                <TableHead>학교</TableHead>
                <TableHead>학년</TableHead>
                <TableHead>내신</TableHead>
                <TableHead>모의고사</TableHead>
                <TableHead className="text-right">관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-400">
                    검색 결과가 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">{student.name}</TableCell>
                    <TableCell>{student.school}</TableCell>
                    <TableCell>{student.grade}학년</TableCell>
                    <TableCell>
                      <Badge variant={student._count.gradeHistory > 0 ? 'default' : 'secondary'}>
                        {student._count.gradeHistory}건
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={student._count.mockExamResults > 0 ? 'default' : 'secondary'}>
                        {student._count.mockExamResults}건
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/grades/${student.id}`}>
                        <Button variant="outline" size="sm">
                          상세
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 2: 커밋**

```bash
git add src/components/grades/grade-dashboard.tsx
git commit -m "feat: 성적 관리 대시보드 UI 구현"
```

---

### Task 8: OCR 업로드 UI

**Files:**
- Create: `src/components/grades/ocr-upload-page.tsx`
- Create: `src/components/grades/ocr-review-panel.tsx`

**Step 1: OCR 업로드 페이지 구현**

Create: `src/components/grades/ocr-upload-page.tsx`

```typescript
'use client';

import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Camera, Upload, FileText, Loader2 } from 'lucide-react';
import { uploadAndProcessGradeImage } from '@/lib/actions/student/grade-ocr';
import { toast } from 'sonner';
import OcrReviewPanel from './ocr-review-panel';
import type { TranscriptOcrResult, MockExamOcrResult } from '@/features/grade-management/types';

export default function OcrUploadPage({ teacherId }: { teacherId: string }) {
  const [documentType, setDocumentType] = useState<string>('TRANSCRIPT');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [ocrResult, setOcrResult] = useState<{
    scanId: string;
    data: TranscriptOcrResult | MockExamOcrResult;
    confidence: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setImagePreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleProcess = async () => {
    if (!imagePreview) return;

    setProcessing(true);
    try {
      // base64 데이터 추출 (data:image/...;base64, 부분 제거)
      const base64 = imagePreview.split(',')[1];
      const mimeType = imagePreview.split(';')[0].split(':')[1] as 'image/jpeg' | 'image/png';

      const formData = new FormData();
      formData.set('imageBase64', base64);
      formData.set('mimeType', mimeType);
      formData.set('documentType', documentType);
      formData.set('imageUrl', ''); // Cloudinary 업로드는 별도 처리

      const result = await uploadAndProcessGradeImage(formData);

      if (result.success && result.extractedData) {
        setOcrResult({
          scanId: result.scanId!,
          data: result.extractedData as TranscriptOcrResult | MockExamOcrResult,
          confidence: result.confidence!,
        });
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error('처리 중 오류가 발생했습니다.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <h1 className="text-2xl font-bold">OCR 성적 입력</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 업로드 영역 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              성적표 업로드
            </CardTitle>
            <CardDescription>
              성적표 사진을 촬영하거나 파일을 업로드하세요.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={documentType} onValueChange={setDocumentType}>
              <SelectTrigger>
                <SelectValue placeholder="문서 유형 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TRANSCRIPT">학교 성적통지표</SelectItem>
                <SelectItem value="MOCK_EXAM">모의고사 성적표</SelectItem>
                <SelectItem value="CUSTOM">자유 형식</SelectItem>
              </SelectContent>
            </Select>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
            />

            {imagePreview ? (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="업로드된 성적표"
                  className="w-full rounded-lg border"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => {
                    setImagePreview(null);
                    setOcrResult(null);
                  }}
                >
                  다시 선택
                </Button>
              </div>
            ) : (
              <div
                className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:border-blue-400 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500 mb-2">클릭하여 파일 선택</p>
                <p className="text-gray-400 text-sm">또는 카메라로 촬영</p>
              </div>
            )}

            {imagePreview && !ocrResult && (
              <Button
                onClick={handleProcess}
                disabled={processing}
                className="w-full"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    AI 분석 중...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 mr-2" />
                    OCR 분석 시작
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* 결과 검토 영역 */}
        {ocrResult && (
          <OcrReviewPanel
            scanId={ocrResult.scanId}
            data={ocrResult.data}
            confidence={ocrResult.confidence}
            documentType={documentType}
            onConfirmed={() => {
              setOcrResult(null);
              setImagePreview(null);
              toast.success('성적이 저장되었습니다.');
            }}
          />
        )}
      </div>
    </div>
  );
}
```

**Step 2: OCR 리뷰 패널 구현**

Create: `src/components/grades/ocr-review-panel.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { confirmOcrResult } from '@/lib/actions/student/grade-ocr';
import type { TranscriptOcrResult, MockExamOcrResult } from '@/features/grade-management/types';

interface OcrReviewPanelProps {
  scanId: string;
  data: TranscriptOcrResult | MockExamOcrResult;
  confidence: number;
  documentType: string;
  onConfirmed: () => void;
}

export default function OcrReviewPanel({
  scanId,
  data,
  confidence,
  documentType,
  onConfirmed,
}: OcrReviewPanelProps) {
  const [editableData, setEditableData] = useState(data);
  const [studentId, setStudentId] = useState('');
  const [confirming, setConfirming] = useState(false);

  const subjects = 'subjects' in editableData ? editableData.subjects : [];

  const handleConfirm = async () => {
    if (!studentId) return;
    setConfirming(true);
    try {
      const result = await confirmOcrResult(scanId, editableData, studentId);
      if (result.success) {
        onConfirmed();
      }
    } finally {
      setConfirming(false);
    }
  };

  const confidenceColor = confidence >= 0.8 ? 'text-green-600' : confidence >= 0.5 ? 'text-yellow-600' : 'text-red-600';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            추출 결과 검토
          </span>
          <Badge className={confidenceColor}>
            신뢰도: {Math.round(confidence * 100)}%
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 학생 선택 (ID 입력 — 추후 검색 드롭다운으로 개선) */}
        <div>
          <label className="text-sm font-medium">학생 ID</label>
          <Input
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            placeholder="저장할 학생의 ID를 입력하세요"
          />
        </div>

        {/* 추출된 과목 목록 */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>과목</TableHead>
              <TableHead>원점수</TableHead>
              {documentType === 'MOCK_EXAM' && (
                <>
                  <TableHead>표준점수</TableHead>
                  <TableHead>백분위</TableHead>
                </>
              )}
              {documentType === 'TRANSCRIPT' && (
                <>
                  <TableHead>평균</TableHead>
                  <TableHead>등급</TableHead>
                </>
              )}
              <TableHead>신뢰도</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subjects.map((subject, idx) => (
              <TableRow key={idx}>
                <TableCell className="font-medium">{subject.name}</TableCell>
                <TableCell>{subject.rawScore}</TableCell>
                {documentType === 'MOCK_EXAM' && 'standardScore' in subject && (
                  <>
                    <TableCell>{(subject as { standardScore?: number }).standardScore ?? '-'}</TableCell>
                    <TableCell>{(subject as { percentile?: number }).percentile ?? '-'}</TableCell>
                  </>
                )}
                {documentType === 'TRANSCRIPT' && 'classAverage' in subject && (
                  <>
                    <TableCell>{(subject as { classAverage?: number }).classAverage ?? '-'}</TableCell>
                    <TableCell>{(subject as { gradeRank?: number }).gradeRank ?? '-'}</TableCell>
                  </>
                )}
                <TableCell>
                  {subject.confidence >= 0.8 ? (
                    <Badge variant="default" className="bg-green-100 text-green-700">
                      {Math.round(subject.confidence * 100)}%
                    </Badge>
                  ) : subject.confidence >= 0.5 ? (
                    <Badge variant="default" className="bg-yellow-100 text-yellow-700">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      {Math.round(subject.confidence * 100)}%
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      {Math.round(subject.confidence * 100)}%
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Button
          onClick={handleConfirm}
          disabled={!studentId || confirming}
          className="w-full"
        >
          {confirming ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              저장 중...
            </>
          ) : (
            '확정 및 저장'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
```

**Step 3: 커밋**

```bash
git add src/components/grades/ocr-upload-page.tsx src/components/grades/ocr-review-panel.tsx
git commit -m "feat: OCR 업로드 및 검토 UI 구현"
```

---

### Task 9: 학생별 성적 상세 탭 컴포넌트

**Files:**
- Create: `src/components/grades/grade-detail-tabs.tsx`

**Step 1: 탭 컨테이너 구현**

Create: `src/components/grades/grade-detail-tabs.tsx`

```typescript
'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BookOpen, Camera, Brain, Calendar, Users, BarChart3,
} from 'lucide-react';
import LearningTab from '@/components/students/tabs/learning-tab';
import { useRouter, useSearchParams } from 'next/navigation';

interface GradeDetailTabsProps {
  student: {
    id: string;
    name: string;
    school: string;
    grade: number;
    gradeHistory: unknown[];
    mockExamResults: unknown[];
  };
  currentTab: string;
  teacherId: string;
}

export default function GradeDetailTabs({
  student,
  currentTab,
  teacherId,
}: GradeDetailTabsProps) {
  const router = useRouter();

  const handleTabChange = (value: string) => {
    router.push(`/grades/${student.id}?tab=${value}`);
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{student.name}</h1>
        <p className="text-gray-500">{student.school} {student.grade}학년</p>
      </div>

      <Tabs value={currentTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="history" className="flex items-center gap-1">
            <BookOpen className="w-4 h-4" />
            <span className="hidden sm:inline">성적 이력</span>
          </TabsTrigger>
          <TabsTrigger value="ocr" className="flex items-center gap-1">
            <Camera className="w-4 h-4" />
            <span className="hidden sm:inline">OCR 입력</span>
          </TabsTrigger>
          <TabsTrigger value="analysis" className="flex items-center gap-1">
            <Brain className="w-4 h-4" />
            <span className="hidden sm:inline">AI 분석</span>
          </TabsTrigger>
          <TabsTrigger value="plan" className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            <span className="hidden sm:inline">학습 플랜</span>
          </TabsTrigger>
          <TabsTrigger value="habits" className="flex items-center gap-1">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">학습 습관</span>
          </TabsTrigger>
          <TabsTrigger value="peers" className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">동료 비교</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="history">
          <LearningTab studentId={student.id} />
        </TabsContent>

        <TabsContent value="ocr">
          <div className="text-center py-12 text-gray-400">
            OCR 입력 탭 — Phase 1에서 구현 완료 후 연결
          </div>
        </TabsContent>

        <TabsContent value="analysis">
          <div className="text-center py-12 text-gray-400">
            AI 분석 탭 — Phase 2에서 구현 예정
          </div>
        </TabsContent>

        <TabsContent value="plan">
          <div className="text-center py-12 text-gray-400">
            학습 플랜 탭 — Phase 3에서 구현 예정
          </div>
        </TabsContent>

        <TabsContent value="habits">
          <div className="text-center py-12 text-gray-400">
            학습 습관 탭 — Phase 4에서 구현 예정
          </div>
        </TabsContent>

        <TabsContent value="peers">
          <div className="text-center py-12 text-gray-400">
            동료 비교 탭 — Phase 4에서 구현 예정
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

**Step 2: 커밋**

```bash
git add src/components/grades/grade-detail-tabs.tsx
git commit -m "feat: 학생별 성적 상세 탭 컴포넌트 구현"
```

---

### Task 10: Phase 1 빌드 검증 및 통합 테스트

**Step 1: TypeScript 타입 체크**

Run: `pnpm tsc --noEmit`
Expected: No errors

**Step 2: 빌드 테스트**

Run: `pnpm build`
Expected: Build successful

**Step 3: 전체 테스트 실행**

Run: `pnpm test`
Expected: All tests pass

**Step 4: Phase 1 완료 커밋**

```bash
git add -A
git commit -m "chore: Phase 1 완료 — DB 스키마 + OCR + 성적 입력 강화"
```

---

## Phase 2: AI 분석 엔진 (통계 + LLM 학습 전략)

> Phase 1 완료 후 진행

### Task 11: 통계 분석기 확장

**Files:**
- Modify: `src/lib/analysis/grade-analytics.ts` (단원별 분석 추가)
- Create: `src/features/grade-management/analysis/stat-analyzer.ts`

**Step 1: 테스트 작성**

Create: `src/features/grade-management/analysis/__tests__/stat-analyzer.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import {
  analyzeSubjectStrengths,
  analyzeCategoryWeakness,
  calculateConsistencyScore,
} from '../stat-analyzer';

describe('StatAnalyzer', () => {
  describe('analyzeSubjectStrengths', () => {
    it('평균 점수 기준으로 강점/약점 과목을 분류한다', () => {
      const grades = [
        { subject: '국어', normalizedScore: 90, testDate: new Date() },
        { subject: '국어', normalizedScore: 88, testDate: new Date() },
        { subject: '수학', normalizedScore: 60, testDate: new Date() },
        { subject: '수학', normalizedScore: 55, testDate: new Date() },
        { subject: '영어', normalizedScore: 75, testDate: new Date() },
      ];

      const result = analyzeSubjectStrengths(grades);
      const korean = result.find(s => s.name === '국어');
      const math = result.find(s => s.name === '수학');

      expect(korean?.strength).toBe(true);
      expect(math?.strength).toBe(false);
    });
  });

  describe('analyzeCategoryWeakness', () => {
    it('category별 평균을 계산하여 약한 단원을 식별한다', () => {
      const grades = [
        { subject: '수학', category: '미적분', normalizedScore: 90 },
        { subject: '수학', category: '확률통계', normalizedScore: 50 },
        { subject: '수학', category: '확률통계', normalizedScore: 55 },
      ];

      const result = analyzeCategoryWeakness(grades, '수학');
      expect(result.weakCategories).toContain('확률통계');
      expect(result.strongCategories).toContain('미적분');
    });
  });

  describe('calculateConsistencyScore', () => {
    it('매일 균등하게 공부하면 높은 점수를 준다', () => {
      const logs = Array.from({ length: 20 }, (_, i) => ({
        studyDate: new Date(2026, 1, i + 1),
        durationMin: 60,
      }));

      const score = calculateConsistencyScore(logs, 30);
      expect(score).toBeGreaterThan(70);
    });

    it('공부 기록이 없으면 0점이다', () => {
      const score = calculateConsistencyScore([], 30);
      expect(score).toBe(0);
    });
  });
});
```

**Step 2: 테스트 실행하여 실패 확인**

Run: `pnpm vitest run src/features/grade-management/analysis/__tests__/stat-analyzer.test.ts`
Expected: FAIL

**Step 3: 통계 분석기 구현**

Create: `src/features/grade-management/analysis/stat-analyzer.ts`

```typescript
interface GradeRecord {
  subject: string;
  normalizedScore: number;
  testDate: Date;
  category?: string | null;
}

interface SubjectAnalysis {
  name: string;
  avgScore: number;
  trend: 'UP' | 'STABLE' | 'DOWN';
  strength: boolean;
  weakCategories: string[];
  strongCategories: string[];
}

/**
 * 과목별 강점/약점을 분석한다.
 * 전체 평균 이상이면 강점, 미만이면 약점으로 분류.
 */
export function analyzeSubjectStrengths(grades: GradeRecord[]): SubjectAnalysis[] {
  const subjectMap = new Map<string, number[]>();

  grades.forEach((g) => {
    if (!subjectMap.has(g.subject)) subjectMap.set(g.subject, []);
    subjectMap.get(g.subject)!.push(g.normalizedScore);
  });

  const subjectAvgs = Array.from(subjectMap.entries()).map(([name, scores]) => ({
    name,
    avgScore: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10,
    scores,
  }));

  const overallAvg = subjectAvgs.length > 0
    ? subjectAvgs.reduce((sum, s) => sum + s.avgScore, 0) / subjectAvgs.length
    : 0;

  return subjectAvgs.map((s) => {
    // 트렌드 계산 (최근 2개 vs 이전 평균)
    const sorted = [...s.scores];
    let trend: 'UP' | 'STABLE' | 'DOWN' = 'STABLE';
    if (sorted.length >= 3) {
      const recentAvg = (sorted[sorted.length - 1] + sorted[sorted.length - 2]) / 2;
      const olderAvg = sorted.slice(0, -2).reduce((a, b) => a + b, 0) / (sorted.length - 2);
      if (recentAvg - olderAvg > 5) trend = 'UP';
      else if (olderAvg - recentAvg > 5) trend = 'DOWN';
    }

    // 단원별 분석
    const categoryGrades = grades.filter(g => g.subject === s.name && g.category);
    const { weakCategories, strongCategories } = categoryGrades.length > 0
      ? analyzeCategoryWeakness(categoryGrades, s.name)
      : { weakCategories: [], strongCategories: [] };

    return {
      name: s.name,
      avgScore: s.avgScore,
      trend,
      strength: s.avgScore >= overallAvg,
      weakCategories,
      strongCategories,
    };
  });
}

/**
 * 과목 내 세부 단원별 강점/약점을 분석한다.
 */
export function analyzeCategoryWeakness(
  grades: { subject?: string; category?: string | null; normalizedScore: number }[],
  subject: string
): { weakCategories: string[]; strongCategories: string[] } {
  const filtered = grades.filter(g => (!g.subject || g.subject === subject) && g.category);
  const categoryMap = new Map<string, number[]>();

  filtered.forEach((g) => {
    const cat = g.category!;
    if (!categoryMap.has(cat)) categoryMap.set(cat, []);
    categoryMap.get(cat)!.push(g.normalizedScore);
  });

  const categoryAvgs = Array.from(categoryMap.entries()).map(([name, scores]) => ({
    name,
    avg: scores.reduce((a, b) => a + b, 0) / scores.length,
  }));

  if (categoryAvgs.length === 0) return { weakCategories: [], strongCategories: [] };

  const overallAvg = categoryAvgs.reduce((sum, c) => sum + c.avg, 0) / categoryAvgs.length;

  return {
    weakCategories: categoryAvgs.filter(c => c.avg < overallAvg - 5).map(c => c.name),
    strongCategories: categoryAvgs.filter(c => c.avg >= overallAvg + 5).map(c => c.name),
  };
}

/**
 * 학습 규칙성 점수를 계산한다 (0~100).
 * 기간 내 공부한 날 수 / 전체 일 수 * 100
 */
export function calculateConsistencyScore(
  logs: { studyDate: Date; durationMin: number }[],
  periodDays: number
): number {
  if (logs.length === 0 || periodDays <= 0) return 0;

  const uniqueDays = new Set(
    logs.map((l) => new Date(l.studyDate).toISOString().split('T')[0])
  );

  return Math.round((uniqueDays.size / periodDays) * 100);
}
```

**Step 4: 테스트 실행하여 통과 확인**

Run: `pnpm vitest run src/features/grade-management/analysis/__tests__/stat-analyzer.test.ts`
Expected: PASS

**Step 5: 커밋**

```bash
git add src/features/grade-management/analysis/
git commit -m "feat: 통계 분석기 구현 (강점/약점, 단원별, 규칙성)"
```

---

### Task 12: 학생 프로필러 (개인화 데이터 수집)

**Files:**
- Create: `src/features/grade-management/analysis/student-profiler.ts`

**Step 1: 구현**

Create: `src/features/grade-management/analysis/student-profiler.ts`

```typescript
import { db } from '@/lib/db/client';

export interface StudentProfile {
  studentId: string;
  name: string;
  school: string;
  grade: number;
  targetUniversity?: string | null;
  targetMajor?: string | null;
  mbtiType?: string | null;
  varkType?: string | null;
  personalitySummary?: string | null;
  attendanceRate?: number | null;
  gradeHistory: {
    subject: string;
    score: number;
    gradeType: string;
    testDate: Date;
    category?: string | null;
    gradeRank?: number | null;
  }[];
  mockExamResults: {
    examName: string;
    subject: string;
    rawScore: number;
    standardScore?: number | null;
    percentile?: number | null;
    gradeRank?: number | null;
    examDate: Date;
  }[];
}

/**
 * 학생의 전체 개인화 프로필을 수집한다.
 * AI 분석에 필요한 모든 데이터를 한 번에 조회.
 */
export async function getStudentProfile(studentId: string): Promise<StudentProfile | null> {
  const student = await db.student.findUnique({
    where: { id: studentId },
    include: {
      gradeHistory: {
        orderBy: { testDate: 'asc' },
        select: {
          subject: true,
          score: true,
          normalizedScore: true,
          gradeType: true,
          testDate: true,
          category: true,
          gradeRank: true,
        },
      },
      mockExamResults: {
        orderBy: { examDate: 'asc' },
        select: {
          examName: true,
          subject: true,
          rawScore: true,
          standardScore: true,
          percentile: true,
          gradeRank: true,
          examDate: true,
        },
      },
      varkAnalysis: { select: { varkType: true } },
      personalitySummary: { select: { content: true } },
    },
  });

  if (!student) return null;

  // MBTI 결과 별도 조회
  const mbti = await db.mbtiAnalysis.findFirst({
    where: { subjectId: studentId, subjectType: 'STUDENT' },
    orderBy: { analyzedAt: 'desc' },
    select: { mbtiType: true },
  });

  return {
    studentId: student.id,
    name: student.name,
    school: student.school,
    grade: student.grade,
    targetUniversity: student.targetUniversity,
    targetMajor: student.targetMajor,
    mbtiType: mbti?.mbtiType ?? null,
    varkType: student.varkAnalysis?.varkType ?? null,
    personalitySummary: student.personalitySummary?.content ?? null,
    attendanceRate: student.attendanceRate,
    gradeHistory: student.gradeHistory.map((g) => ({
      subject: g.subject,
      score: g.normalizedScore,
      gradeType: g.gradeType,
      testDate: g.testDate,
      category: g.category,
      gradeRank: g.gradeRank,
    })),
    mockExamResults: student.mockExamResults,
  };
}
```

**Step 2: 커밋**

```bash
git add src/features/grade-management/analysis/student-profiler.ts
git commit -m "feat: 학생 프로필러 구현 (MBTI/VARK/성적 통합 수집)"
```

---

### Task 13: LLM 분석 컴포저 (강점약점 + 학습전략)

**Files:**
- Create: `src/features/grade-management/analysis/llm-composer.ts`
- Create: `src/features/grade-management/analysis/strength-weakness.ts`

**Step 1: LLM 컴포저 구현**

Create: `src/features/grade-management/analysis/llm-composer.ts`

```typescript
import { generateText } from '@/features/ai-engine/universal-router';
import { logger } from '@/lib/logger';
import type { StudentProfile } from './student-profiler';

/**
 * 학생 프로필을 LLM에 전달하여 분석 텍스트를 생성한다.
 */
export async function generateAnalysis(
  profile: StudentProfile,
  analysisPrompt: string,
  teacherId?: string
): Promise<string> {
  const systemPrompt = `당신은 한국 교육 전문가이자 학습 코칭 전문가입니다.
학생의 성적 데이터, 학습 스타일(MBTI, VARK), 성격 분석을 종합하여
구체적이고 실행 가능한 학습 조언을 제공합니다.
반드시 한국어로 답변하세요.`;

  const profileContext = buildProfileContext(profile);

  try {
    const result = await generateText({
      featureType: 'grade_analysis',
      teacherId,
      prompt: `${profileContext}\n\n${analysisPrompt}`,
      system: systemPrompt,
      maxOutputTokens: 2048,
      temperature: 0.3,
    });

    return result.text;
  } catch (error) {
    logger.error({ err: error }, 'LLM 분석 생성 실패');
    throw error;
  }
}

function buildProfileContext(profile: StudentProfile): string {
  const lines: string[] = [
    `## 학생 정보`,
    `- 이름: ${profile.name}`,
    `- 학교/학년: ${profile.school} ${profile.grade}학년`,
  ];

  if (profile.targetUniversity) lines.push(`- 목표 대학: ${profile.targetUniversity}`);
  if (profile.targetMajor) lines.push(`- 목표 학과: ${profile.targetMajor}`);
  if (profile.mbtiType) lines.push(`- MBTI: ${profile.mbtiType}`);
  if (profile.varkType) lines.push(`- VARK 학습스타일: ${profile.varkType}`);
  if (profile.attendanceRate != null) lines.push(`- 출석률: ${profile.attendanceRate}%`);

  // 최근 성적 요약
  if (profile.gradeHistory.length > 0) {
    lines.push('\n## 최근 내신 성적');
    const recent = profile.gradeHistory.slice(-10);
    recent.forEach((g) => {
      const rank = g.gradeRank ? ` (${g.gradeRank}등급)` : '';
      lines.push(`- ${g.subject}: ${g.score}점${rank} (${g.testDate.toISOString().split('T')[0]})`);
    });
  }

  // 모의고사 요약
  if (profile.mockExamResults.length > 0) {
    lines.push('\n## 최근 모의고사 성적');
    const recent = profile.mockExamResults.slice(-10);
    recent.forEach((m) => {
      const std = m.standardScore ? `, 표준점수 ${m.standardScore}` : '';
      const pct = m.percentile ? `, 백분위 ${m.percentile}` : '';
      lines.push(`- ${m.subject}: 원점수 ${m.rawScore}${std}${pct}`);
    });
  }

  return lines.join('\n');
}
```

**Step 2: 강점/약점 분석 서비스 구현**

Create: `src/features/grade-management/analysis/strength-weakness.ts`

```typescript
import { db } from '@/lib/db/client';
import { getStudentProfile } from './student-profiler';
import { analyzeSubjectStrengths } from './stat-analyzer';
import { generateAnalysis } from './llm-composer';
import type { StrengthWeaknessResult } from '../types';
import { calculateImprovementRate } from '@/lib/analysis/grade-analytics';
import { logger } from '@/lib/logger';

/**
 * 학생의 강점/약점 종합 분석을 수행한다.
 * 1) 통계 분석 (stat-analyzer)
 * 2) LLM 인사이트 생성
 * 3) LearningAnalysis DB에 캐싱
 */
export async function analyzeStrengthWeakness(
  studentId: string,
  teacherId?: string
): Promise<StrengthWeaknessResult> {
  // 캐시 확인 (24시간 이내)
  const cached = await db.learningAnalysis.findFirst({
    where: {
      studentId,
      analysisType: 'STRENGTH_WEAKNESS',
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (cached) {
    return cached.analysisData as unknown as StrengthWeaknessResult;
  }

  // 프로필 수집
  const profile = await getStudentProfile(studentId);
  if (!profile || profile.gradeHistory.length === 0) {
    throw new Error('분석할 성적 데이터가 없습니다.');
  }

  // 통계 분석
  const subjects = analyzeSubjectStrengths(
    profile.gradeHistory.map(g => ({
      subject: g.subject,
      normalizedScore: g.score,
      testDate: g.testDate,
      category: g.category,
    }))
  );

  // 전체 향상률
  let improvementRate = 0;
  let trend: 'UP' | 'STABLE' | 'DOWN' = 'STABLE';
  try {
    const improvement = calculateImprovementRate(
      profile.gradeHistory.map(g => ({ score: g.score, testDate: g.testDate }))
    );
    improvementRate = improvement.improvementRate;
    trend = improvement.trend;
  } catch {
    // 데이터 부족
  }

  const overallAvg = subjects.length > 0
    ? Math.round(subjects.reduce((sum, s) => sum + s.avgScore, 0) / subjects.length * 10) / 10
    : 0;

  // LLM 인사이트 생성
  const prompt = `이 학생의 과목별 성적 분석 결과를 바탕으로 종합적인 학습 인사이트를 3~5문장으로 작성해주세요.
강점 과목: ${subjects.filter(s => s.strength).map(s => s.name).join(', ') || '없음'}
약점 과목: ${subjects.filter(s => !s.strength).map(s => s.name).join(', ') || '없음'}
전체 평균: ${overallAvg}점, 향상 추세: ${trend}
약한 단원: ${subjects.flatMap(s => s.weakCategories).join(', ') || '파악 안됨'}

VARK 학습스타일이 있다면 이를 반영한 구체적 학습 방법도 제안해주세요.`;

  let aiInsights = '';
  try {
    aiInsights = await generateAnalysis(profile, prompt, teacherId);
  } catch (error) {
    logger.warn({ err: error }, 'LLM 인사이트 생성 실패, 통계 결과만 반환');
    aiInsights = 'AI 분석을 사용할 수 없습니다. 통계 데이터를 참고해주세요.';
  }

  const result: StrengthWeaknessResult = {
    overall: { averageScore: overallAvg, trend, improvementRate },
    subjects,
    aiInsights,
  };

  // DB 캐싱
  await db.learningAnalysis.create({
    data: {
      studentId,
      teacherId,
      analysisType: 'STRENGTH_WEAKNESS',
      analysisData: result as unknown as object,
      validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  return result;
}
```

**Step 3: 커밋**

```bash
git add src/features/grade-management/analysis/
git commit -m "feat: LLM 분석 컴포저 및 강점/약점 분석 서비스 구현"
```

---

### Task 14: 목표 격차 분석 + 학습 플랜 생성

**Files:**
- Create: `src/features/grade-management/analysis/goal-gap-analyzer.ts`
- Create: `src/features/grade-management/analysis/study-plan-generator.ts`

> 이 두 서비스는 Task 13의 `llm-composer.ts` + `student-profiler.ts`를 활용하여
> 각각 GOAL_GAP, STUDY_PLAN AnalysisType으로 LearningAnalysis에 캐싱합니다.
> 구조는 strength-weakness.ts와 동일한 패턴:
> 1) 캐시 확인 → 2) 프로필 수집 → 3) 통계 분석 → 4) LLM 호출 → 5) DB 저장

**Step 1: goal-gap-analyzer.ts 구현** (설계 문서의 GoalGapResult 타입 활용)

**Step 2: study-plan-generator.ts 구현** (설계 문서의 StudyPlanResult 타입 활용)

**Step 3: 커밋**

```bash
git add src/features/grade-management/analysis/
git commit -m "feat: 목표 격차 분석 및 학습 플랜 생성 서비스 구현"
```

---

### Task 15: AI 분석 Server Actions + UI

**Files:**
- Create: `src/lib/actions/student/grade-analysis.ts`
- Create: `src/components/grades/ai-analysis-panel.tsx`
- Create: `src/components/grades/goal-gap-dashboard.tsx`
- Create: `src/components/grades/study-plan-view.tsx`

> Server Actions: 각 분석 유형별 `analyze[Type](studentId)` 함수
> UI: 분석 결과를 카드/차트로 시각화

**Step 1~4: 구현 및 테스트**

**Step 5: 커밋**

```bash
git add src/lib/actions/student/grade-analysis.ts src/components/grades/
git commit -m "feat: AI 분석 Server Actions 및 UI 컴포넌트 구현"
```

---

### Task 16: Phase 2 빌드 검증

**Step 1:** `pnpm tsc --noEmit`
**Step 2:** `pnpm build`
**Step 3:** `pnpm test`
**Step 4:** Phase 2 완료 커밋

---

## Phase 3: 학습 코칭 (종합 코칭 리포트 + 교사 알림)

### Task 17: 종합 코칭 리포트 서비스

**Files:**
- Create: `src/features/grade-management/analysis/coaching-report.ts`

> 4가지 분석(강점약점 + 목표격차 + 학습플랜 + 통계)을 종합하여
> COACHING 타입의 LearningAnalysis를 생성.
> MBTI/VARK 기반 동기부여 메시지 포함.

---

### Task 18: 교사 알림 시스템

**Files:**
- Create: `src/features/grade-management/analysis/teacher-alerts.ts`

> 성적 급락(-15%), 목표 위험, 습관 변화, 마일스톤 달성 조건을 체크.
> 조건 충족 시 TeacherAlert 객체 반환.

---

### Task 19: 코칭 UI + 탭 연결

> grade-detail-tabs.tsx의 analysis/plan 탭에 실제 컴포넌트 연결.

---

### Task 20: Phase 3 빌드 검증

---

## Phase 4: 학부모 리포트 + 동료 비교 + 학습 습관

### Task 21: 학습 습관 추적 서비스

**Files:**
- Create: `src/lib/actions/student/study-log.ts`
- Create: `src/features/grade-management/study-habits/study-log-service.ts`
- Create: `src/features/grade-management/study-habits/habit-analyzer.ts`

---

### Task 22: 학습 습관 UI (입력 + 차트)

**Files:**
- Create: `src/components/grades/study-log-form.tsx`
- Create: `src/components/grades/study-log-bulk-form.tsx`
- Create: `src/components/grades/study-habit-chart.tsx`

---

### Task 23: 동료 비교 분석 서비스

**Files:**
- Create: `src/features/grade-management/peer-comparison/peer-comparison.ts`
- Create: `src/components/grades/peer-comparison-chart.tsx`

---

### Task 24: 학부모 리포트 생성 서비스

**Files:**
- Create: `src/features/grade-management/report/parent-report-generator.ts`
- Create: `src/features/grade-management/report/parent-report-pdf.ts`
- Create: `src/features/grade-management/report/parent-report-email.ts`
- Create: `src/lib/actions/student/parent-report.ts`

---

### Task 25: 학부모 리포트 UI

**Files:**
- Create: `src/components/grades/parent-report-preview.tsx`
- Create: `src/components/grades/parent-report-send.tsx`
- Create: `src/app/api/cron/monthly-parent-report/route.ts`

---

### Task 26: 모든 탭 연결 + 네비게이션 추가

> - grade-detail-tabs.tsx 플레이스홀더를 실제 컴포넌트로 교체
> - 사이드바/헤더에 '성적 관리' 메뉴 추가

---

### Task 27: Phase 4 빌드 검증

**Step 1:** `pnpm tsc --noEmit`
**Step 2:** `pnpm build`
**Step 3:** `pnpm test`
**Step 4:** 최종 커밋

---

## 에이전트 팀 구성 (병렬 실행 가능 영역)

### Phase 1 내 병렬화

| Agent | 담당 | 의존성 |
|-------|------|--------|
| **DB Architect** | Task 1 (스키마) | 없음 (최우선) |
| **OCR Engineer** | Task 2, 3 (OCR 타입/프로세서) | Task 1 완료 후 |
| **Backend Dev** | Task 4, 5 (Server Actions) | Task 1 완료 후 |
| **Frontend Dev** | Task 6, 7, 8, 9 (UI) | Task 4, 5 완료 후 |

### Phase 2 내 병렬화

| Agent | 담당 | 의존성 |
|-------|------|--------|
| **Stat Engine** | Task 11 (통계 분석) | Phase 1 완료 |
| **AI Engine** | Task 12, 13 (프로필러 + LLM) | Phase 1 완료 |
| **Frontend Dev** | Task 15 (UI) | Task 13 완료 후 |

### Phase 3~4

Phase 3, 4는 Phase 2 완료 후 순차 실행을 권장 (코칭/리포트가 분석 결과에 의존).
