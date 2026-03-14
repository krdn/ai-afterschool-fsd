# Admission Feature Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 대학 입시 정보 관리 feature — AI 웹 검색 수집, 합격 가능성 분석, 도움말+설정 기능 구현

**Architecture:** FSD 패턴의 독립 `admission` feature. Prisma 모델 5개 + Perplexity adapter + Server Actions + 3개 페이지 + 도움말 다이얼로그. 기존 grade-management/ai-engine과 연계.

**Tech Stack:** Next.js 15, Prisma 7, Vercel AI SDK v6 (@ai-sdk/openai for Perplexity), recharts, shadcn/ui, Zod, vitest

**Spec:** `docs/superpowers/specs/2026-03-14-admission-feature-design.md`

---

## Chunk 1: DB 모델 + 타입 + Validation

### Task 1: Prisma 스키마에 enum 추가

**Files:**
- Modify: `prisma/schema.prisma` (파일 끝에 enum 추가)

- [ ] **Step 1: enum 4개 추가**

`prisma/schema.prisma` 파일 끝에 추가:

```prisma
enum UniversityType {
  FOUR_YEAR
  COLLEGE
  CYBER
  EDUCATION
}

enum TargetStatus {
  INTERESTED
  TARGET
  APPLIED
  ACCEPTED
  REJECTED
  WITHDRAWN
}

enum SyncType {
  AI_RESEARCH
  MANUAL
}

enum SyncStatus {
  PENDING
  REVIEW
  APPROVED
  REJECTED
  FAILED
}
```

- [ ] **Step 2: 타입체크 확인**

Run: `cd /home/gon/projects/ai/ai-afterschool-fsd && npx prisma validate`
Expected: valid

---

### Task 2: Teacher 모델에 preferences 필드 + relation 추가

**Files:**
- Modify: `prisma/schema.prisma` (Teacher 모델, ~줄 18-44)

- [ ] **Step 1: Teacher 모델에 필드 추가**

Teacher 모델 닫는 `}` 전에 추가:

```prisma
  preferences           Json?                @default("{}")
  createdUniversities   University[]         @relation("UniversityCreator")
  admissionSyncs        AdmissionDataSync[]  @relation("AdmissionSyncTeacher")
```

- [ ] **Step 2: Student 모델에 relation 추가**

Student 모델 닫는 `}` 전에 추가:

```prisma
  targets               StudentTarget[]
```

- [ ] **Step 3: validate**

Run: `npx prisma validate`
Expected: 아직 실패 (University 등 모델 미정의) — 이 시점에서는 skip

---

### Task 3: University + UniversityMajor 모델 추가

**Files:**
- Modify: `prisma/schema.prisma` (파일 끝, enum 전에 삽입)

- [ ] **Step 1: University 모델 추가**

```prisma
model University {
  id         String         @id @default(cuid())
  name       String
  nameShort  String?
  type       UniversityType
  region     String
  ranking    Int?
  website    String?
  isActive   Boolean        @default(true)
  dataSource String?

  majors    UniversityMajor[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  createdBy        String
  createdByTeacher Teacher @relation("UniversityCreator", fields: [createdBy], references: [id])

  @@unique([name])
  @@map("universities")
}
```

- [ ] **Step 2: UniversityMajor 모델 추가**

```prisma
model UniversityMajor {
  id               String   @id @default(cuid())
  universityId     String
  university       University @relation(fields: [universityId], references: [id], onDelete: Cascade)

  majorName        String
  department       String?
  requiredSubjects String[]
  preparationGuide String?
  notes            String?

  cutoffs        AdmissionCutoff[]
  studentTargets StudentTarget[]
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@unique([universityId, majorName])
  @@index([universityId])
  @@map("university_majors")
}
```

---

### Task 4: AdmissionCutoff + StudentTarget + AdmissionDataSync 모델 추가

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: AdmissionCutoff 모델 추가**

```prisma
model AdmissionCutoff {
  id                String   @id @default(cuid())
  universityMajorId String
  universityMajor   UniversityMajor @relation(fields: [universityMajorId], references: [id], onDelete: Cascade)

  academicYear     Int
  admissionType    String
  cutoffGrade      Float?
  cutoffScore      Float?
  cutoffPercentile Float?
  competitionRate  Float?
  enrollmentCount  Int?
  applicantCount   Int?
  additionalInfo   String?

  dataSource String?
  isVerified Boolean @default(false)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([universityMajorId, academicYear, admissionType])
  @@index([universityMajorId])
  @@map("admission_cutoffs")
}
```

- [ ] **Step 2: StudentTarget 모델 추가**

```prisma
model StudentTarget {
  id                String   @id @default(cuid())
  studentId         String
  student           Student  @relation(fields: [studentId], references: [id], onDelete: Cascade)
  universityMajorId String
  universityMajor   UniversityMajor @relation(fields: [universityMajorId], references: [id], onDelete: Cascade)

  priority             Int
  admissionType        String?
  motivation           String?
  status               TargetStatus @default(INTERESTED)

  gapAnalysis          Json?
  admissionProbability Float?
  analysisUpdatedAt    DateTime?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([studentId, universityMajorId])
  @@index([studentId])
  @@index([universityMajorId])
  @@map("student_targets")
}
```

- [ ] **Step 3: AdmissionDataSync 모델 추가**

```prisma
model AdmissionDataSync {
  id           String     @id @default(cuid())
  syncType     SyncType
  targetQuery  String
  source       String?
  recordsFound Int        @default(0)
  recordsSaved Int        @default(0)
  status       SyncStatus @default(PENDING)
  resultData   Json?
  errorLog     String?

  teacherId String
  teacher   Teacher @relation("AdmissionSyncTeacher", fields: [teacherId], references: [id])

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("admission_data_syncs")
}
```

- [ ] **Step 4: validate + generate**

Run: `npx prisma validate && npx prisma generate`
Expected: valid, client generated

- [ ] **Step 5: DB에 반영**

Run: `npx prisma db push`
Expected: schema synced

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: admission feature DB 모델 5개 추가

University, UniversityMajor, AdmissionCutoff, StudentTarget, AdmissionDataSync
Teacher.preferences 필드 및 relation 추가
Student.targets relation 추가"
```

---

### Task 5: Feature 타입 정의

**Files:**
- Create: `src/features/admission/types.ts`

- [ ] **Step 1: types.ts 작성**

```typescript
import type { Prisma } from '@prisma/client'

// === DB 모델 기반 타입 ===

export type UniversityWithMajors = Prisma.UniversityGetPayload<{
  include: { majors: true }
}>

export type UniversityMajorWithCutoffs = Prisma.UniversityMajorGetPayload<{
  include: { cutoffs: true; university: true }
}>

export type StudentTargetWithDetails = Prisma.StudentTargetGetPayload<{
  include: {
    universityMajor: {
      include: { university: true; cutoffs: true }
    }
  }
}>

// === AI 리서치 수집 결과 ===

export type AIResearchResult = {
  university: {
    name: string
    nameShort?: string
    type: 'FOUR_YEAR' | 'COLLEGE' | 'CYBER' | 'EDUCATION'
    region: string
    website?: string
  }
  majors: {
    majorName: string
    department?: string
    requiredSubjects: string[]
    preparationGuide?: string
    cutoffs: {
      academicYear: number
      admissionType: string
      cutoffGrade?: number
      cutoffScore?: number
      cutoffPercentile?: number
      competitionRate?: number
      enrollmentCount?: number
      applicantCount?: number
      additionalInfo?: string
    }[]
  }[]
  sources: string[]
}

// === 합격 가능성 분석 ===

export type AdmissionAnalysisInput = {
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

export type AdmissionAnalysisResult = {
  probability: number
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

// === 커트라인 추세 ===

export type CutoffTrendData = {
  majorName: string
  admissionType: string
  trends: {
    academicYear: number
    cutoffGrade?: number
    cutoffScore?: number
    competitionRate?: number
    enrollmentCount?: number
  }[]
}

// === 설정 ===

export type AdmissionSettings = {
  defaultAcademicYear: number
  defaultAdmissionType: string
  autoAnalysis: boolean
  analysisRefreshDays: number
  showTrendChart: boolean
  maxTargetsPerStudent: number
}

export const DEFAULT_ADMISSION_SETTINGS: AdmissionSettings = {
  defaultAcademicYear: new Date().getFullYear() + 1,
  defaultAdmissionType: '수시',
  autoAnalysis: true,
  analysisRefreshDays: 7,
  showTrendChart: true,
  maxTargetsPerStudent: 5,
}

// === 합격 가능성 등급 기준 (MVP 고정값) ===

export const PROBABILITY_THRESHOLDS = {
  safe: 80,      // 안정
  moderate: 50,  // 적정
  challenge: 30, // 도전
  // 30 미만: 상향도전
} as const

export function getProbabilityGrade(probability: number): AdmissionAnalysisResult['grade'] {
  if (probability >= PROBABILITY_THRESHOLDS.safe) return '안정'
  if (probability >= PROBABILITY_THRESHOLDS.moderate) return '적정'
  if (probability >= PROBABILITY_THRESHOLDS.challenge) return '도전'
  return '상향도전'
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/admission/types.ts
git commit -m "feat: admission feature 타입 정의 추가"
```

---

### Task 6: Zod Validation 스키마

**Files:**
- Create: `src/lib/validations/admission.ts`

- [ ] **Step 1: validation 스키마 작성**

```typescript
import { z } from 'zod'

export const universitySchema = z.object({
  name: z.string().min(2, '대학명을 입력해주세요'),
  nameShort: z.string().optional(),
  type: z.enum(['FOUR_YEAR', 'COLLEGE', 'CYBER', 'EDUCATION']),
  region: z.string().min(1, '지역을 입력해주세요'),
  ranking: z.coerce.number().int().positive().optional(),
  website: z.string().url().optional().or(z.literal('')),
})

export const universityMajorSchema = z.object({
  universityId: z.string().cuid(),
  majorName: z.string().min(1, '학과명을 입력해주세요'),
  department: z.string().optional(),
  requiredSubjects: z.array(z.string()).default([]),
  notes: z.string().optional(),
})

export const admissionCutoffSchema = z.object({
  universityMajorId: z.string().cuid(),
  academicYear: z.coerce.number().int().min(2020).max(2030),
  admissionType: z.string().min(1, '전형을 입력해주세요'),
  cutoffGrade: z.coerce.number().min(1).max(9).optional(),
  cutoffScore: z.coerce.number().min(0).max(400).optional(),
  cutoffPercentile: z.coerce.number().min(0).max(100).optional(),
  competitionRate: z.coerce.number().min(0).optional(),
  enrollmentCount: z.coerce.number().int().min(0).optional(),
  applicantCount: z.coerce.number().int().min(0).optional(),
  additionalInfo: z.string().optional(),
  dataSource: z.string().optional(),
})

export const studentTargetSchema = z.object({
  studentId: z.string().cuid(),
  universityMajorId: z.string().cuid(),
  priority: z.coerce.number().int().min(1).max(10),
  admissionType: z.string().optional(),
  motivation: z.string().optional(),
  status: z.enum(['INTERESTED', 'TARGET', 'APPLIED', 'ACCEPTED', 'REJECTED', 'WITHDRAWN']).default('INTERESTED'),
})

export const aiResearchQuerySchema = z.object({
  universityName: z.string().min(2, '대학명을 입력해주세요'),
  majorName: z.string().optional(),
  academicYear: z.coerce.number().int().min(2020).max(2030).optional(),
})

export const admissionSettingsSchema = z.object({
  defaultAcademicYear: z.coerce.number().int().min(2020).max(2030),
  defaultAdmissionType: z.enum(['수시', '정시']),
  autoAnalysis: z.boolean(),
  analysisRefreshDays: z.coerce.number().int().min(1).max(30),
  showTrendChart: z.boolean(),
  maxTargetsPerStudent: z.coerce.number().int().min(1).max(10),
})

// AI 리서치 결과 파싱용
export const aiResearchResultSchema = z.object({
  university: z.object({
    name: z.string(),
    nameShort: z.string().optional(),
    type: z.enum(['FOUR_YEAR', 'COLLEGE', 'CYBER', 'EDUCATION']).default('FOUR_YEAR'),
    region: z.string(),
    website: z.string().optional(),
  }),
  majors: z.array(z.object({
    majorName: z.string(),
    department: z.string().optional(),
    requiredSubjects: z.array(z.string()).default([]),
    preparationGuide: z.string().optional(),
    cutoffs: z.array(z.object({
      academicYear: z.number(),
      admissionType: z.string(),
      cutoffGrade: z.number().optional(),
      cutoffScore: z.number().optional(),
      cutoffPercentile: z.number().optional(),
      competitionRate: z.number().optional(),
      enrollmentCount: z.number().optional(),
      applicantCount: z.number().optional(),
      additionalInfo: z.string().optional(),
    })).default([]),
  })),
  sources: z.array(z.string()).default([]),
})

export type UniversityInput = z.infer<typeof universitySchema>
export type UniversityMajorInput = z.infer<typeof universityMajorSchema>
export type AdmissionCutoffInput = z.infer<typeof admissionCutoffSchema>
export type StudentTargetInput = z.infer<typeof studentTargetSchema>
export type AIResearchQuery = z.infer<typeof aiResearchQuerySchema>
export type AdmissionSettingsInput = z.infer<typeof admissionSettingsSchema>
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/validations/admission.ts
git commit -m "feat: admission Zod validation 스키마 추가"
```

---

### Task 7: Repository 레이어

**Files:**
- Create: `src/features/admission/repositories/university.ts`
- Create: `src/features/admission/repositories/university-major.ts`
- Create: `src/features/admission/repositories/cutoff.ts`
- Create: `src/features/admission/repositories/student-target.ts`
- Create: `src/features/admission/repositories/data-sync.ts`

- [ ] **Step 1: university.ts**

```typescript
import { db } from '@/lib/db/client'
import type { Prisma } from '@prisma/client'

export async function createUniversity(data: Prisma.UniversityUncheckedCreateInput) {
  return db.university.create({ data, include: { majors: true } })
}

export async function findUniversityByName(name: string) {
  return db.university.findFirst({
    where: { name: { contains: name, mode: 'insensitive' } },
    include: { majors: { include: { cutoffs: true } } },
  })
}

export async function searchUniversities(query: string, limit = 20) {
  return db.university.findMany({
    where: {
      isActive: true,
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { nameShort: { contains: query, mode: 'insensitive' } },
      ],
    },
    include: { majors: true },
    take: limit,
    orderBy: { name: 'asc' },
  })
}

export async function getUniversityById(id: string) {
  return db.university.findUnique({
    where: { id },
    include: { majors: { include: { cutoffs: true } } },
  })
}

export async function updateUniversity(id: string, data: Prisma.UniversityUpdateInput) {
  return db.university.update({ where: { id }, data })
}

export async function listUniversities(page = 1, pageSize = 20) {
  const skip = (page - 1) * pageSize
  const [universities, total] = await Promise.all([
    db.university.findMany({
      where: { isActive: true },
      include: { majors: true },
      skip,
      take: pageSize,
      orderBy: { name: 'asc' },
    }),
    db.university.count({ where: { isActive: true } }),
  ])
  return { universities, total, page, pageSize }
}
```

- [ ] **Step 2: university-major.ts**

```typescript
import { db } from '@/lib/db/client'
import type { Prisma } from '@prisma/client'

export async function createMajor(data: Prisma.UniversityMajorUncheckedCreateInput) {
  return db.universityMajor.create({ data, include: { cutoffs: true, university: true } })
}

export async function getMajorById(id: string) {
  return db.universityMajor.findUnique({
    where: { id },
    include: { cutoffs: { orderBy: { academicYear: 'desc' } }, university: true },
  })
}

export async function getMajorsByUniversity(universityId: string) {
  return db.universityMajor.findMany({
    where: { universityId },
    include: { cutoffs: { orderBy: { academicYear: 'desc' } } },
    orderBy: { majorName: 'asc' },
  })
}

export async function updateMajor(id: string, data: Prisma.UniversityMajorUpdateInput) {
  return db.universityMajor.update({ where: { id }, data })
}

export async function findMajorByName(universityId: string, majorName: string) {
  return db.universityMajor.findUnique({
    where: { universityId_majorName: { universityId, majorName } },
    include: { cutoffs: true },
  })
}
```

- [ ] **Step 3: cutoff.ts**

```typescript
import { db } from '@/lib/db/client'
import type { Prisma } from '@prisma/client'

export async function upsertCutoff(data: Prisma.AdmissionCutoffUncheckedCreateInput) {
  const { universityMajorId, academicYear, admissionType, ...rest } = data
  return db.admissionCutoff.upsert({
    where: {
      universityMajorId_academicYear_admissionType: {
        universityMajorId,
        academicYear,
        admissionType,
      },
    },
    update: rest,
    create: data,
  })
}

export async function getCutoffsByMajor(universityMajorId: string) {
  return db.admissionCutoff.findMany({
    where: { universityMajorId },
    orderBy: [{ academicYear: 'desc' }, { admissionType: 'asc' }],
  })
}

export async function getCutoffTrend(universityMajorId: string, admissionType: string) {
  return db.admissionCutoff.findMany({
    where: { universityMajorId, admissionType },
    orderBy: { academicYear: 'asc' },
  })
}

export async function deleteCutoff(id: string) {
  return db.admissionCutoff.delete({ where: { id } })
}

export async function verifyCutoff(id: string) {
  return db.admissionCutoff.update({
    where: { id },
    data: { isVerified: true },
  })
}
```

- [ ] **Step 4: student-target.ts**

```typescript
import { db } from '@/lib/db/client'
import type { Prisma } from '@prisma/client'

const targetInclude = {
  universityMajor: {
    include: { university: true, cutoffs: true },
  },
} as const

export async function setTarget(data: Prisma.StudentTargetUncheckedCreateInput) {
  return db.studentTarget.upsert({
    where: {
      studentId_universityMajorId: {
        studentId: data.studentId,
        universityMajorId: data.universityMajorId,
      },
    },
    update: {
      priority: data.priority,
      admissionType: data.admissionType,
      motivation: data.motivation,
      status: data.status,
    },
    create: data,
    include: targetInclude,
  })
}

export async function getStudentTargets(studentId: string) {
  return db.studentTarget.findMany({
    where: { studentId },
    include: targetInclude,
    orderBy: { priority: 'asc' },
  })
}

export async function removeTarget(studentId: string, universityMajorId: string) {
  return db.studentTarget.delete({
    where: { studentId_universityMajorId: { studentId, universityMajorId } },
  })
}

export async function updateTargetStatus(id: string, status: string) {
  return db.studentTarget.update({
    where: { id },
    data: { status: status as never },
  })
}

export async function updateTargetAnalysis(
  id: string,
  gapAnalysis: Prisma.JsonValue,
  admissionProbability: number,
) {
  return db.studentTarget.update({
    where: { id },
    data: { gapAnalysis, admissionProbability, analysisUpdatedAt: new Date() },
  })
}
```

- [ ] **Step 5: data-sync.ts**

```typescript
import { db } from '@/lib/db/client'
import type { Prisma, SyncStatus } from '@prisma/client'

export async function createSync(data: Prisma.AdmissionDataSyncUncheckedCreateInput) {
  return db.admissionDataSync.create({ data })
}

export async function updateSyncStatus(
  id: string,
  status: SyncStatus,
  extra?: { resultData?: Prisma.JsonValue; recordsFound?: number; recordsSaved?: number; errorLog?: string; source?: string },
) {
  return db.admissionDataSync.update({
    where: { id },
    data: { status, ...extra },
  })
}

export async function getSyncHistory(teacherId: string, limit = 20) {
  return db.admissionDataSync.findMany({
    where: { teacherId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

export async function getSyncById(id: string) {
  return db.admissionDataSync.findUnique({ where: { id } })
}
```

- [ ] **Step 6: Commit**

```bash
git add src/features/admission/repositories/
git commit -m "feat: admission repository 레이어 구현

university, university-major, cutoff, student-target, data-sync CRUD"
```

---

### Task 8: Server Actions (CRUD)

**Files:**
- Create: `src/lib/actions/admission/university.ts`
- Create: `src/lib/actions/admission/cutoff.ts`
- Create: `src/lib/actions/admission/student-target.ts`
- Create: `src/lib/actions/admission/settings.ts`

- [ ] **Step 1: university.ts Server Action**

```typescript
'use server'

import { getCurrentTeacher } from '@/lib/dal'
import { ok, fail, type ActionResult } from '@/lib/errors/action-result'
import { universitySchema } from '@/lib/validations/admission'
import {
  createUniversity,
  searchUniversities,
  getUniversityById,
  updateUniversity,
  listUniversities,
} from '@/features/admission/repositories/university'
import { logger } from '@/lib/logger'

export async function createUniversityAction(
  input: unknown,
): Promise<ActionResult<Awaited<ReturnType<typeof createUniversity>>>> {
  try {
    const teacher = await getCurrentTeacher()
    const parsed = universitySchema.safeParse(input)
    if (!parsed.success) {
      return fail(parsed.error.errors[0]?.message ?? '입력이 올바르지 않습니다.')
    }
    const result = await createUniversity({
      ...parsed.data,
      createdBy: teacher.id,
    })
    return ok(result)
  } catch (error) {
    logger.error({ err: error }, 'Failed to create university')
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return fail('이미 등록된 대학입니다.')
    }
    return fail(error instanceof Error ? error.message : '대학 등록에 실패했습니다.')
  }
}

export async function searchUniversitiesAction(
  query: string,
): Promise<ActionResult<Awaited<ReturnType<typeof searchUniversities>>>> {
  try {
    await getCurrentTeacher()
    const results = await searchUniversities(query)
    return ok(results)
  } catch (error) {
    logger.error({ err: error }, 'Failed to search universities')
    return fail('대학 검색에 실패했습니다.')
  }
}

export async function getUniversityAction(
  id: string,
): Promise<ActionResult<Awaited<ReturnType<typeof getUniversityById>>>> {
  try {
    await getCurrentTeacher()
    const result = await getUniversityById(id)
    if (!result) return fail('대학을 찾을 수 없습니다.')
    return ok(result)
  } catch (error) {
    logger.error({ err: error }, 'Failed to get university')
    return fail('대학 조회에 실패했습니다.')
  }
}

export async function updateUniversityAction(
  id: string,
  input: unknown,
): Promise<ActionResult<Awaited<ReturnType<typeof updateUniversity>>>> {
  try {
    await getCurrentTeacher()
    const parsed = universitySchema.partial().safeParse(input)
    if (!parsed.success) {
      return fail(parsed.error.errors[0]?.message ?? '입력이 올바르지 않습니다.')
    }
    const result = await updateUniversity(id, parsed.data)
    return ok(result)
  } catch (error) {
    logger.error({ err: error }, 'Failed to update university')
    return fail('대학 수정에 실패했습니다.')
  }
}

export async function listUniversitiesAction(
  page = 1,
): Promise<ActionResult<Awaited<ReturnType<typeof listUniversities>>>> {
  try {
    await getCurrentTeacher()
    const result = await listUniversities(page)
    return ok(result)
  } catch (error) {
    logger.error({ err: error }, 'Failed to list universities')
    return fail('대학 목록 조회에 실패했습니다.')
  }
}
```

- [ ] **Step 2: cutoff.ts Server Action**

```typescript
'use server'

import { getCurrentTeacher } from '@/lib/dal'
import { ok, fail, okVoid, type ActionResult, type ActionVoidResult } from '@/lib/errors/action-result'
import { admissionCutoffSchema } from '@/lib/validations/admission'
import {
  upsertCutoff,
  getCutoffsByMajor,
  getCutoffTrend,
  deleteCutoff,
  verifyCutoff,
} from '@/features/admission/repositories/cutoff'
import { logger } from '@/lib/logger'

export async function addCutoffAction(
  input: unknown,
): Promise<ActionResult<Awaited<ReturnType<typeof upsertCutoff>>>> {
  try {
    await getCurrentTeacher()
    const parsed = admissionCutoffSchema.safeParse(input)
    if (!parsed.success) {
      return fail(parsed.error.errors[0]?.message ?? '입력이 올바르지 않습니다.')
    }
    const result = await upsertCutoff(parsed.data)
    return ok(result)
  } catch (error) {
    logger.error({ err: error }, 'Failed to add cutoff')
    return fail('커트라인 등록에 실패했습니다.')
  }
}

export async function getCutoffsAction(
  universityMajorId: string,
): Promise<ActionResult<Awaited<ReturnType<typeof getCutoffsByMajor>>>> {
  try {
    await getCurrentTeacher()
    const result = await getCutoffsByMajor(universityMajorId)
    return ok(result)
  } catch (error) {
    logger.error({ err: error }, 'Failed to get cutoffs')
    return fail('커트라인 조회에 실패했습니다.')
  }
}

export async function getCutoffTrendAction(
  universityMajorId: string,
  admissionType: string,
): Promise<ActionResult<Awaited<ReturnType<typeof getCutoffTrend>>>> {
  try {
    await getCurrentTeacher()
    const result = await getCutoffTrend(universityMajorId, admissionType)
    return ok(result)
  } catch (error) {
    logger.error({ err: error }, 'Failed to get cutoff trend')
    return fail('커트라인 추세 조회에 실패했습니다.')
  }
}

export async function deleteCutoffAction(id: string): Promise<ActionVoidResult> {
  try {
    await getCurrentTeacher()
    await deleteCutoff(id)
    return okVoid()
  } catch (error) {
    logger.error({ err: error }, 'Failed to delete cutoff')
    return fail('커트라인 삭제에 실패했습니다.')
  }
}

export async function verifyCutoffAction(
  id: string,
): Promise<ActionResult<Awaited<ReturnType<typeof verifyCutoff>>>> {
  try {
    await getCurrentTeacher()
    const result = await verifyCutoff(id)
    return ok(result)
  } catch (error) {
    logger.error({ err: error }, 'Failed to verify cutoff')
    return fail('커트라인 검증에 실패했습니다.')
  }
}
```

- [ ] **Step 3: student-target.ts Server Action**

```typescript
'use server'

import { getCurrentTeacher } from '@/lib/dal'
import { ok, fail, okVoid, type ActionResult, type ActionVoidResult } from '@/lib/errors/action-result'
import { studentTargetSchema } from '@/lib/validations/admission'
import {
  setTarget,
  getStudentTargets,
  removeTarget,
  updateTargetStatus,
} from '@/features/admission/repositories/student-target'
import { revalidatePath } from 'next/cache'
import { logger } from '@/lib/logger'

export async function setTargetAction(
  input: unknown,
): Promise<ActionResult<Awaited<ReturnType<typeof setTarget>>>> {
  try {
    await getCurrentTeacher()
    const parsed = studentTargetSchema.safeParse(input)
    if (!parsed.success) {
      return fail(parsed.error.errors[0]?.message ?? '입력이 올바르지 않습니다.')
    }
    const result = await setTarget(parsed.data)
    revalidatePath('/admission/targets')
    return ok(result)
  } catch (error) {
    logger.error({ err: error }, 'Failed to set target')
    return fail('목표 대학 설정에 실패했습니다.')
  }
}

export async function getStudentTargetsAction(
  studentId: string,
): Promise<ActionResult<Awaited<ReturnType<typeof getStudentTargets>>>> {
  try {
    await getCurrentTeacher()
    const result = await getStudentTargets(studentId)
    return ok(result)
  } catch (error) {
    logger.error({ err: error }, 'Failed to get student targets')
    return fail('목표 대학 조회에 실패했습니다.')
  }
}

export async function removeTargetAction(
  studentId: string,
  universityMajorId: string,
): Promise<ActionVoidResult> {
  try {
    await getCurrentTeacher()
    await removeTarget(studentId, universityMajorId)
    revalidatePath('/admission/targets')
    return okVoid()
  } catch (error) {
    logger.error({ err: error }, 'Failed to remove target')
    return fail('목표 대학 삭제에 실패했습니다.')
  }
}

export async function updateTargetStatusAction(
  id: string,
  status: string,
): Promise<ActionResult<Awaited<ReturnType<typeof updateTargetStatus>>>> {
  try {
    await getCurrentTeacher()
    const result = await updateTargetStatus(id, status)
    revalidatePath('/admission/targets')
    return ok(result)
  } catch (error) {
    logger.error({ err: error }, 'Failed to update target status')
    return fail('목표 상태 변경에 실패했습니다.')
  }
}
```

- [ ] **Step 4: settings.ts Server Action**

```typescript
'use server'

import { getCurrentTeacher } from '@/lib/dal'
import { ok, fail, type ActionResult } from '@/lib/errors/action-result'
import { admissionSettingsSchema } from '@/lib/validations/admission'
import { db } from '@/lib/db/client'
import { DEFAULT_ADMISSION_SETTINGS, type AdmissionSettings } from '@/features/admission/types'
import { logger } from '@/lib/logger'

export async function getAdmissionSettingsAction(): Promise<ActionResult<AdmissionSettings>> {
  try {
    const teacher = await getCurrentTeacher()
    const prefs = (teacher.preferences as Record<string, unknown>) ?? {}
    const settings = { ...DEFAULT_ADMISSION_SETTINGS, ...(prefs.admission as Partial<AdmissionSettings> ?? {}) }
    return ok(settings)
  } catch (error) {
    logger.error({ err: error }, 'Failed to get admission settings')
    return fail('설정 조회에 실패했습니다.')
  }
}

export async function updateAdmissionSettingsAction(
  input: unknown,
): Promise<ActionResult<AdmissionSettings>> {
  try {
    const teacher = await getCurrentTeacher()
    const parsed = admissionSettingsSchema.safeParse(input)
    if (!parsed.success) {
      return fail(parsed.error.errors[0]?.message ?? '설정 값이 올바르지 않습니다.')
    }
    const currentPrefs = (teacher.preferences as Record<string, unknown>) ?? {}
    await db.teacher.update({
      where: { id: teacher.id },
      data: {
        preferences: { ...currentPrefs, admission: parsed.data },
      },
    })
    return ok(parsed.data)
  } catch (error) {
    logger.error({ err: error }, 'Failed to update admission settings')
    return fail('설정 저장에 실패했습니다.')
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/actions/admission/
git commit -m "feat: admission Server Actions 구현

university, cutoff, student-target, settings CRUD
모두 getCurrentTeacher() 인증 + ok/fail ActionResult 패턴"
```

---

## Chunk 2: AI Engine 확장 (Perplexity + FeatureType)

### Task 9: Perplexity Adapter 구현

**Files:**
- Create: `src/features/ai-engine/adapters/perplexity.ts`
- Modify: `src/features/ai-engine/types.ts` (~줄 13)
- Modify: `src/features/ai-engine/adapters/index.ts` (~줄 46)
- Modify: `src/features/ai-engine/providers/types.ts` (~줄 3, ~줄 129, ~줄 144)

- [ ] **Step 1: types.ts에 ProviderType 추가**

`src/features/ai-engine/types.ts` 줄 25의 `| 'custom'` 뒤에 추가:

```typescript
  | 'perplexity';
```

- [ ] **Step 2: perplexity.ts adapter 작성**

기존 `openrouter.ts` 패턴을 **정확히** 따라 작성. `createOpenAICompatible`, `BaseAdapter`, `../types` 임포트:

```typescript
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { generateText, streamText, type LanguageModel } from 'ai';
import { logger } from '@/lib/logger';
import { BaseAdapter } from './base';
import type {
  ProviderConfig,
  GenerateOptions,
  GenerateResult,
  StreamResult,
  ValidationResult,
  ModelInfo,
  ModelParams,
} from '../types';

export class PerplexityAdapter extends BaseAdapter {
  readonly providerType = 'perplexity';
  readonly supportsVision = false;
  readonly supportsStreaming = true;
  readonly supportsTools = false;
  readonly supportsJsonMode = true;

  private apiKey: string = '';
  private baseUrl: string = 'https://api.perplexity.ai';

  createModel(modelId: string, config?: ProviderConfig): LanguageModel {
    const effectiveConfig = config || ({} as ProviderConfig);
    const effectiveApiKey = effectiveConfig.apiKeyEncrypted
      ? this.decryptApiKey(effectiveConfig.apiKeyEncrypted)
      : this.apiKey || process.env.PERPLEXITY_API_KEY || '';
    const effectiveBaseUrl = effectiveConfig.baseUrl || this.baseUrl;

    const perplexity = createOpenAICompatible({
      name: 'perplexity',
      baseURL: effectiveBaseUrl,
      apiKey: effectiveApiKey,
      headers: {
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'AI Afterschool',
      },
    });

    return perplexity.chatModel(modelId);
  }

  async generate(options: GenerateOptions): Promise<GenerateResult> {
    const result = await generateText({
      model: options.model,
      ...(options.messages
        ? { messages: options.messages }
        : { prompt: options.prompt || '' }),
      system: options.system,
      maxOutputTokens: options.maxTokens,
      temperature: options.temperature,
      topP: options.topP,
    });

    return {
      text: result.text,
      usage: result.usage,
    };
  }

  async stream(options: GenerateOptions): Promise<StreamResult> {
    const result = streamText({
      model: options.model,
      ...(options.messages
        ? { messages: options.messages }
        : { prompt: options.prompt || '' }),
      system: options.system,
      maxOutputTokens: options.maxTokens,
      temperature: options.temperature,
      topP: options.topP,
    });

    return {
      stream: result.textStream,
      provider: this.providerType,
      model: 'unknown',
    };
  }

  async validate(config: ProviderConfig): Promise<ValidationResult> {
    try {
      const apiKey = config.apiKeyEncrypted
        ? this.decryptApiKey(config.apiKeyEncrypted)
        : this.apiKey || process.env.PERPLEXITY_API_KEY;

      if (!apiKey) {
        return {
          isValid: false,
          error: 'PERPLEXITY_API_KEY가 설정되지 않았습니다.',
        };
      }

      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        error: this.handleError(error, 'validation').message,
      };
    }
  }

  async listModels(_config: ProviderConfig): Promise<ModelInfo[]> {
    return [
      { id: 'sonar', modelId: 'sonar', displayName: 'Sonar (웹 검색)', contextWindow: 128000, supportsVision: false, supportsTools: false },
      { id: 'sonar-pro', modelId: 'sonar-pro', displayName: 'Sonar Pro (고급 웹 검색)', contextWindow: 200000, supportsVision: false, supportsTools: false },
    ];
  }

  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  setBaseUrl(baseUrl: string): void {
    this.baseUrl = baseUrl;
  }

  normalizeParams(params?: ModelParams): Record<string, unknown> {
    return {
      temperature: params?.temperature ?? 0.3,
      max_tokens: params?.maxTokens,
      top_p: params?.topP,
    };
  }

  protected buildHeaders(config: ProviderConfig): Record<string, string> {
    const apiKey = config.apiKeyEncrypted
      ? this.decryptApiKey(config.apiKeyEncrypted)
      : this.apiKey;

    return {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  protected getDefaultBaseUrl(): string {
    return 'https://api.perplexity.ai';
  }
}
```

- [ ] **Step 3: AdapterFactory에 등록**

`src/features/ai-engine/adapters/index.ts`에:
- import 추가: `import { PerplexityAdapter } from './perplexity'`
- `registerDefaultAdapters()` 내부 마지막에: `this.adapters.set('perplexity', PerplexityAdapter)`

- [ ] **Step 4: providers/types.ts에 설정 추가 (3곳)**

FeatureType union에 추가:
```typescript
| 'admission_research'
| 'admission_analysis'
```

PROVIDER_CONFIGS에 추가:
```typescript
perplexity: {
  name: 'perplexity',
  displayName: 'Perplexity',
  requiresApiKey: true,
  supportsVision: false,
  defaultModel: 'sonar',
  models: ['sonar', 'sonar-pro'],
},
```

COST_PER_MILLION_TOKENS에 추가:
```typescript
perplexity: { input: 1, output: 1 },
```

- [ ] **Step 5: Commit**

```bash
git add src/features/ai-engine/
git commit -m "feat: Perplexity adapter + admission FeatureType 추가

- PerplexityAdapter: OpenAI SDK 호환, 웹 검색 내장
- FeatureType: admission_research, admission_analysis
- PROVIDER_CONFIGS, COST_PER_MILLION_TOKENS 등록"
```

---

### Task 10: AI 리서치 프롬프트 + 서비스

**Files:**
- Create: `src/features/admission/prompts/research.ts`
- Create: `src/features/admission/prompts/analysis.ts`
- Create: `src/features/admission/services/ai-researcher.ts`

- [ ] **Step 1: research.ts 프롬프트**

```typescript
export const ADMISSION_RESEARCH_SYSTEM_PROMPT = `당신은 한국 대학 입시 정보 전문가입니다.
사용자가 요청한 대학과 학과에 대해 최신 입시 정보를 수집하여 구조화된 JSON으로 응답해주세요.

응답 형식:
{
  "university": {
    "name": "정식 대학명 (예: 서울대학교)",
    "nameShort": "약칭 (예: 서울대)",
    "type": "FOUR_YEAR | COLLEGE | CYBER | EDUCATION",
    "region": "지역 (예: 서울)",
    "website": "입학처 URL"
  },
  "majors": [{
    "majorName": "학과명",
    "department": "계열 (인문/자연/공학/예체능/의약)",
    "requiredSubjects": ["필수 과목"],
    "preparationGuide": "지원 준비 가이드 (마크다운)",
    "cutoffs": [{
      "academicYear": 2025,
      "admissionType": "수시_학생부교과 | 수시_학생부종합 | 정시_가군 | 정시_나군 | 정시_다군",
      "cutoffGrade": 1.5,
      "cutoffScore": 290,
      "cutoffPercentile": 97.5,
      "competitionRate": 5.2,
      "enrollmentCount": 30,
      "applicantCount": 156,
      "additionalInfo": "면접, 실기 등 추가 정보"
    }]
  }],
  "sources": ["출처 URL 목록"]
}

중요:
- 최근 3년간의 데이터를 포함해주세요
- 수시(학생부교과, 학생부종합)와 정시 모두 포함
- 데이터가 없는 필드는 null로 표시
- 반드시 출처 URL을 포함해주세요
- JSON 형식만 반환 (추가 설명 없이)`

export function buildResearchPrompt(universityName: string, majorName?: string, academicYear?: number): string {
  const year = academicYear ?? new Date().getFullYear() + 1
  const majorPart = majorName ? ` ${majorName}` : ' 전체 학과'
  return `${universityName}${majorPart}의 ${year - 2}~${year}학년도 입시 정보를 JSON 형식으로 정리해주세요.

포함할 정보:
1. 대학 기본 정보 (정식명칭, 유형, 지역, 입학처 URL)
2. 학과별 입시 정보 (전형별 합격 커트라인, 경쟁률, 모집인원)
3. 필수 과목 및 지원 준비 가이드
4. 정보 출처 URL`
}
```

- [ ] **Step 2: analysis.ts 프롬프트**

```typescript
export const ADMISSION_ANALYSIS_SYSTEM_PROMPT = `당신은 한국 대학 입시 분석 전문가입니다.
학생의 현재 성적과 목표 대학의 합격 커트라인을 비교하여 합격 가능성을 분석해주세요.

응답 형식:
{
  "probability": 65,
  "currentVsCutoff": [
    { "subject": "국어", "current": 2.3, "cutoff": 1.8, "gap": -0.5, "status": "BELOW" }
  ],
  "improvementPriority": [
    { "subject": "수학", "targetImprovement": 0.5, "strategy": "개선 전략" }
  ],
  "overallAdvice": "종합 조언",
  "references": []
}

분석 기준:
- 내신 등급: 낮을수록 좋음 (1등급 최고)
- 수능 점수/백분위: 높을수록 좋음
- 성적 추세(UP/STABLE/DOWN)를 합격 가능성에 반영
- 경쟁률이 높을수록 합격 가능성 하향 조정
- 반드시 JSON 형식만 반환`

export function buildAnalysisPrompt(
  studentGrades: { subject: string; score: number; gradeRank?: number }[],
  targetCutoffs: { academicYear: number; cutoffGrade?: number; cutoffScore?: number; competitionRate?: number }[],
  trend: string,
  universityName: string,
  majorName: string,
): string {
  return `학생 현재 성적:
${studentGrades.map(g => `- ${g.subject}: ${g.gradeRank ? `${g.gradeRank}등급` : `${g.score}점`}`).join('\n')}

성적 추세: ${trend}

목표: ${universityName} ${majorName}

최근 커트라인:
${targetCutoffs.map(c => `- ${c.academicYear}학년도: 내신 ${c.cutoffGrade ?? '-'}등급, 수능 ${c.cutoffScore ?? '-'}점, 경쟁률 ${c.competitionRate ?? '-'}:1`).join('\n')}

위 정보를 바탕으로 합격 가능성을 0~100%로 분석하고, 과목별 개선 우선순위와 전략을 제시해주세요.`
}
```

- [ ] **Step 3: ai-researcher.ts 서비스**

```typescript
import { generateWithSpecificProvider } from '@/features/ai-engine/universal-router'
import { aiResearchResultSchema } from '@/lib/validations/admission'
import { createSync, updateSyncStatus } from '@/features/admission/repositories/data-sync'
import { ADMISSION_RESEARCH_SYSTEM_PROMPT, buildResearchPrompt } from '@/features/admission/prompts/research'
import { logger } from '@/lib/logger'
import type { AIResearchResult } from '@/features/admission/types'

export async function researchUniversity(
  teacherId: string,
  universityName: string,
  majorName?: string,
  academicYear?: number,
): Promise<{ syncId: string; result: AIResearchResult | null; error?: string }> {
  const query = `${universityName}${majorName ? ` ${majorName}` : ''} ${academicYear ?? ''}`

  const sync = await createSync({
    syncType: 'AI_RESEARCH',
    targetQuery: query.trim(),
    teacherId,
    status: 'PENDING',
  })

  try {
    const response = await generateWithSpecificProvider('perplexity', {
      featureType: 'admission_research',
      prompt: buildResearchPrompt(universityName, majorName, academicYear),
      systemPrompt: ADMISSION_RESEARCH_SYSTEM_PROMPT,
    })

    const text = response.text
    // JSON 추출 (마크다운 코드블록 제거)
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) ?? [null, text]
    const jsonText = jsonMatch[1]?.trim() ?? text.trim()

    const parsed = aiResearchResultSchema.safeParse(JSON.parse(jsonText))
    if (!parsed.success) {
      await updateSyncStatus(sync.id, 'REVIEW', {
        resultData: { raw: text, parseError: parsed.error.message },
        errorLog: `파싱 실패: ${parsed.error.message}`,
      })
      return { syncId: sync.id, result: null, error: `데이터 파싱 실패: ${parsed.error.message}` }
    }

    await updateSyncStatus(sync.id, 'REVIEW', {
      resultData: parsed.data as unknown as Record<string, unknown>,
      recordsFound: parsed.data.majors.length,
      source: parsed.data.sources.join(', '),
    })

    return { syncId: sync.id, result: parsed.data }
  } catch (error) {
    logger.error({ err: error }, 'AI research failed')
    const errorMsg = error instanceof Error ? error.message : '알 수 없는 오류'
    await updateSyncStatus(sync.id, 'FAILED', { errorLog: errorMsg })
    return { syncId: sync.id, result: null, error: errorMsg }
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/features/admission/prompts/ src/features/admission/services/ai-researcher.ts
git commit -m "feat: AI 리서치 서비스 + 프롬프트 구현

- Perplexity 기반 대학 입시 정보 웹 검색 수집
- 수집 결과 Zod 파싱 + AdmissionDataSync 이력 관리
- 합격 가능성 분석 프롬프트"
```

---

### Task 11: AI 리서치 Server Action + 승인 플로우

**Files:**
- Create: `src/lib/actions/admission/ai-research.ts`

- [ ] **Step 1: ai-research.ts Server Action**

```typescript
'use server'

import { getCurrentTeacher } from '@/lib/dal'
import { ok, fail, type ActionResult } from '@/lib/errors/action-result'
import { aiResearchQuerySchema } from '@/lib/validations/admission'
import { researchUniversity } from '@/features/admission/services/ai-researcher'
import { getSyncById, updateSyncStatus } from '@/features/admission/repositories/data-sync'
import { createUniversity, findUniversityByName } from '@/features/admission/repositories/university'
import { createMajor, findMajorByName } from '@/features/admission/repositories/university-major'
import { upsertCutoff } from '@/features/admission/repositories/cutoff'
import { revalidatePath } from 'next/cache'
import { logger } from '@/lib/logger'
import type { AIResearchResult } from '@/features/admission/types'

export async function requestResearchAction(
  input: unknown,
): Promise<ActionResult<{ syncId: string; result: AIResearchResult | null; error?: string }>> {
  try {
    const teacher = await getCurrentTeacher()
    const parsed = aiResearchQuerySchema.safeParse(input)
    if (!parsed.success) {
      return fail(parsed.error.errors[0]?.message ?? '검색어를 입력해주세요.')
    }
    const result = await researchUniversity(
      teacher.id,
      parsed.data.universityName,
      parsed.data.majorName,
      parsed.data.academicYear,
    )
    return ok(result)
  } catch (error) {
    logger.error({ err: error }, 'Failed to request research')
    return fail('AI 수집 요청에 실패했습니다.')
  }
}

export async function approveResearchAction(
  syncId: string,
  editedResult?: AIResearchResult,
): Promise<ActionResult<{ universityId: string }>> {
  try {
    const teacher = await getCurrentTeacher()
    const sync = await getSyncById(syncId)
    if (!sync || sync.status !== 'REVIEW') {
      return fail('검토 가능한 수집 결과가 없습니다.')
    }

    const data = (editedResult ?? sync.resultData) as unknown as AIResearchResult
    if (!data?.university) return fail('수집 데이터가 올바르지 않습니다.')

    // 기존 대학 확인 (중복 방지)
    const normalizedName = data.university.name.endsWith('대학교')
      ? data.university.name
      : `${data.university.name}대학교`

    let university = await findUniversityByName(normalizedName)
    if (!university) {
      university = await createUniversity({
        name: normalizedName,
        nameShort: data.university.nameShort,
        type: data.university.type,
        region: data.university.region,
        website: data.university.website,
        createdBy: teacher.id,
        dataSource: sync.source,
      })
    }

    let savedCount = 0
    for (const majorData of data.majors) {
      let major = await findMajorByName(university.id, majorData.majorName)
      if (!major) {
        major = await createMajor({
          universityId: university.id,
          majorName: majorData.majorName,
          department: majorData.department,
          requiredSubjects: majorData.requiredSubjects,
          preparationGuide: majorData.preparationGuide,
        })
      }

      for (const cutoff of majorData.cutoffs) {
        await upsertCutoff({
          universityMajorId: major.id,
          academicYear: cutoff.academicYear,
          admissionType: cutoff.admissionType,
          cutoffGrade: cutoff.cutoffGrade,
          cutoffScore: cutoff.cutoffScore,
          cutoffPercentile: cutoff.cutoffPercentile,
          competitionRate: cutoff.competitionRate,
          enrollmentCount: cutoff.enrollmentCount,
          applicantCount: cutoff.applicantCount,
          additionalInfo: cutoff.additionalInfo,
          dataSource: sync.source,
          isVerified: true,
        })
        savedCount++
      }
    }

    await updateSyncStatus(syncId, 'APPROVED', { recordsSaved: savedCount })
    revalidatePath('/admission')
    return ok({ universityId: university.id })
  } catch (error) {
    logger.error({ err: error }, 'Failed to approve research')
    return fail('수집 결과 승인에 실패했습니다.')
  }
}

export async function rejectResearchAction(syncId: string): Promise<ActionResult<void>> {
  try {
    await getCurrentTeacher()
    await updateSyncStatus(syncId, 'REJECTED')
    return ok(undefined as never)
  } catch (error) {
    logger.error({ err: error }, 'Failed to reject research')
    return fail('수집 결과 거부에 실패했습니다.')
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/actions/admission/ai-research.ts
git commit -m "feat: AI 리서치 Server Action (수집 요청/승인/거부)

- requestResearchAction: Perplexity 검색 요청
- approveResearchAction: 결과 검토 후 DB 저장 (중복 방지)
- rejectResearchAction: 결과 거부"
```

---

## Chunk 3: 합격 가능성 분석 서비스

### Task 12: 분석 서비스 테스트 작성

**Files:**
- Create: `src/features/admission/__tests__/admission-analyzer.test.ts`

- [ ] **Step 1: 테스트 작성**

```typescript
import { describe, it, expect } from 'vitest'
import { getProbabilityGrade, PROBABILITY_THRESHOLDS } from '../types'

describe('admission-analyzer', () => {
  describe('getProbabilityGrade', () => {
    it('80 이상이면 안정', () => {
      expect(getProbabilityGrade(80)).toBe('안정')
      expect(getProbabilityGrade(100)).toBe('안정')
    })

    it('50~79이면 적정', () => {
      expect(getProbabilityGrade(50)).toBe('적정')
      expect(getProbabilityGrade(79)).toBe('적정')
    })

    it('30~49이면 도전', () => {
      expect(getProbabilityGrade(30)).toBe('도전')
      expect(getProbabilityGrade(49)).toBe('도전')
    })

    it('30 미만이면 상향도전', () => {
      expect(getProbabilityGrade(0)).toBe('상향도전')
      expect(getProbabilityGrade(29)).toBe('상향도전')
    })
  })

  describe('PROBABILITY_THRESHOLDS', () => {
    it('올바른 기준값', () => {
      expect(PROBABILITY_THRESHOLDS.safe).toBe(80)
      expect(PROBABILITY_THRESHOLDS.moderate).toBe(50)
      expect(PROBABILITY_THRESHOLDS.challenge).toBe(30)
    })
  })
})
```

- [ ] **Step 2: 테스트 실행 확인**

Run: `pnpm test src/features/admission/__tests__/admission-analyzer.test.ts`
Expected: PASS

- [ ] **Step 3: trend-analyzer 테스트**

```typescript
// src/features/admission/__tests__/trend-analyzer.test.ts
import { describe, it, expect } from 'vitest'
import { analyzeTrend } from '../services/trend-analyzer'

describe('trend-analyzer', () => {
  it('연도별 커트라인을 추세 데이터로 변환', () => {
    const cutoffs = [
      { academicYear: 2023, admissionType: '수시_학생부교과', cutoffGrade: 2.0, cutoffScore: null, competitionRate: 4.5, enrollmentCount: 30 },
      { academicYear: 2024, admissionType: '수시_학생부교과', cutoffGrade: 1.8, cutoffScore: null, competitionRate: 5.0, enrollmentCount: 28 },
      { academicYear: 2025, admissionType: '수시_학생부교과', cutoffGrade: 1.5, cutoffScore: null, competitionRate: 5.5, enrollmentCount: 25 },
    ]
    const result = analyzeTrend(cutoffs, '수시_학생부교과')
    expect(result.trends).toHaveLength(3)
    expect(result.trends[0].academicYear).toBe(2023)
    expect(result.direction).toBe('HARDER') // 등급이 낮아짐 = 더 어려워짐
  })

  it('데이터 없으면 빈 추세', () => {
    const result = analyzeTrend([], '정시_가군')
    expect(result.trends).toHaveLength(0)
    expect(result.direction).toBe('UNKNOWN')
  })
})
```

- [ ] **Step 4: trend-analyzer 구현**

```typescript
// src/features/admission/services/trend-analyzer.ts
type CutoffRecord = {
  academicYear: number
  admissionType: string
  cutoffGrade?: number | null
  cutoffScore?: number | null
  competitionRate?: number | null
  enrollmentCount?: number | null
}

export type TrendResult = {
  admissionType: string
  trends: {
    academicYear: number
    cutoffGrade?: number | null
    cutoffScore?: number | null
    competitionRate?: number | null
    enrollmentCount?: number | null
  }[]
  direction: 'EASIER' | 'HARDER' | 'STABLE' | 'UNKNOWN'
}

export function analyzeTrend(cutoffs: CutoffRecord[], admissionType: string): TrendResult {
  const filtered = cutoffs
    .filter(c => c.admissionType === admissionType)
    .sort((a, b) => a.academicYear - b.academicYear)

  if (filtered.length < 2) {
    return {
      admissionType,
      trends: filtered.map(c => ({
        academicYear: c.academicYear,
        cutoffGrade: c.cutoffGrade,
        cutoffScore: c.cutoffScore,
        competitionRate: c.competitionRate,
        enrollmentCount: c.enrollmentCount,
      })),
      direction: 'UNKNOWN',
    }
  }

  const first = filtered[0]
  const last = filtered[filtered.length - 1]

  let direction: TrendResult['direction'] = 'STABLE'

  // 내신 등급 기준 (낮을수록 어려움)
  if (first.cutoffGrade != null && last.cutoffGrade != null) {
    const diff = last.cutoffGrade - first.cutoffGrade
    if (diff < -0.2) direction = 'HARDER'
    else if (diff > 0.2) direction = 'EASIER'
  }
  // 수능 점수 기준 (높을수록 어려움)
  else if (first.cutoffScore != null && last.cutoffScore != null) {
    const diff = last.cutoffScore - first.cutoffScore
    if (diff > 5) direction = 'HARDER'
    else if (diff < -5) direction = 'EASIER'
  }

  return {
    admissionType,
    trends: filtered.map(c => ({
      academicYear: c.academicYear,
      cutoffGrade: c.cutoffGrade,
      cutoffScore: c.cutoffScore,
      competitionRate: c.competitionRate,
      enrollmentCount: c.enrollmentCount,
    })),
    direction,
  }
}
```

- [ ] **Step 5: 테스트 실행**

Run: `pnpm test src/features/admission/__tests__/`
Expected: ALL PASS

- [ ] **Step 6: Commit**

```bash
git add src/features/admission/__tests__/ src/features/admission/services/trend-analyzer.ts
git commit -m "feat: 커트라인 추세 분석 서비스 + 테스트

- analyzeTrend: 연도별 커트라인 추세 (HARDER/EASIER/STABLE)
- getProbabilityGrade: 합격 가능성 등급 판정
- 단위 테스트 포함"
```

---

### Task 13: admission-analyzer 서비스

**Files:**
- Create: `src/features/admission/services/admission-analyzer.ts`
- Create: `src/lib/actions/admission/analysis.ts`

- [ ] **Step 1: admission-analyzer.ts**

```typescript
import { generateWithProvider } from '@/features/ai-engine/universal-router'
import { ADMISSION_ANALYSIS_SYSTEM_PROMPT, buildAnalysisPrompt } from '@/features/admission/prompts/analysis'
import { getStudentTargets } from '@/features/admission/repositories/student-target'
import { updateTargetAnalysis } from '@/features/admission/repositories/student-target'
import { getProbabilityGrade, type AdmissionAnalysisInput, type AdmissionAnalysisResult } from '@/features/admission/types'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const analysisResultSchema = z.object({
  probability: z.number().min(0).max(100),
  currentVsCutoff: z.array(z.object({
    subject: z.string(),
    current: z.number(),
    cutoff: z.number(),
    gap: z.number(),
    status: z.enum(['ABOVE', 'AT', 'BELOW']),
  })),
  improvementPriority: z.array(z.object({
    subject: z.string(),
    targetImprovement: z.number(),
    strategy: z.string(),
  })),
  overallAdvice: z.string(),
  references: z.array(z.string()).default([]),
})

export async function analyzeAdmission(
  input: AdmissionAnalysisInput,
): Promise<AdmissionAnalysisResult> {
  const prompt = buildAnalysisPrompt(
    input.student.grades,
    input.target.cutoffs,
    input.student.trend,
    input.target.universityName,
    input.target.majorName,
  )

  try {
    const response = await generateWithProvider({
      featureType: 'admission_analysis',
      prompt,
      systemPrompt: ADMISSION_ANALYSIS_SYSTEM_PROMPT,
    })

    const jsonMatch = response.text.match(/```(?:json)?\s*([\s\S]*?)```/) ?? [null, response.text]
    const jsonText = jsonMatch[1]?.trim() ?? response.text.trim()
    const parsed = analysisResultSchema.safeParse(JSON.parse(jsonText))

    if (!parsed.success) {
      logger.error({ err: parsed.error }, 'Failed to parse analysis result')
      throw new Error('분석 결과 파싱에 실패했습니다.')
    }

    return {
      ...parsed.data,
      grade: getProbabilityGrade(parsed.data.probability),
    }
  } catch (error) {
    logger.error({ err: error }, 'Admission analysis failed')
    throw error
  }
}

```

- [ ] **Step 2: analysis.ts Server Action**

```typescript
'use server'

import { getCurrentTeacher } from '@/lib/dal'
import { ok, fail, type ActionResult } from '@/lib/errors/action-result'
import { analyzeAdmission } from '@/features/admission/services/admission-analyzer'
import { getStudentTargets, updateTargetAnalysis } from '@/features/admission/repositories/student-target'
import { analyzeSubjectStrengths } from '@/features/grade-management/analysis/stat-analyzer'
import { db } from '@/lib/db/client'
import { revalidatePath } from 'next/cache'
import { logger } from '@/lib/logger'
import type { AdmissionAnalysisInput, AdmissionAnalysisResult } from '@/features/admission/types'

export async function analyzeAdmissionAction(
  studentId: string,
  targetId: string,
): Promise<ActionResult<AdmissionAnalysisResult>> {
  try {
    await getCurrentTeacher()

    // 학생 성적 조회
    const student = await db.student.findUnique({
      where: { id: studentId },
      include: {
        gradeHistory: { orderBy: { testDate: 'desc' } },
        mockExamResults: { orderBy: { examDate: 'desc' } },
      },
    })
    if (!student) return fail('학생을 찾을 수 없습니다.')

    // 목표 대학 조회
    const target = await db.studentTarget.findUnique({
      where: { id: targetId },
      include: {
        universityMajor: {
          include: { university: true, cutoffs: { orderBy: { academicYear: 'desc' } } },
        },
      },
    })
    if (!target) return fail('목표 대학을 찾을 수 없습니다.')

    // 성적 추세 분석
    const strengths = analyzeSubjectStrengths(
      student.gradeHistory.map(g => ({
        subject: g.subject,
        normalizedScore: g.normalizedScore,
        testDate: g.testDate,
        category: g.category,
      })),
    )

    const overallTrend = strengths.length > 0
      ? strengths.filter(s => s.trend === 'UP').length > strengths.length / 2
        ? 'UP' as const
        : strengths.filter(s => s.trend === 'DOWN').length > strengths.length / 2
          ? 'DOWN' as const
          : 'STABLE' as const
      : 'STABLE' as const

    const input: AdmissionAnalysisInput = {
      student: {
        grades: student.gradeHistory.map(g => ({
          subject: g.subject,
          score: g.normalizedScore,
          gradeRank: g.gradeRank ?? undefined,
        })),
        mockExams: student.mockExamResults.map(m => ({
          subject: m.subject,
          standardScore: m.standardScore ?? undefined,
          percentile: m.percentile ?? undefined,
          gradeRank: m.gradeRank ?? undefined,
        })),
        trend: overallTrend,
      },
      target: {
        universityName: target.universityMajor.university.name,
        majorName: target.universityMajor.majorName,
        admissionType: target.admissionType ?? '수시_학생부교과',
        cutoffs: target.universityMajor.cutoffs.map(c => ({
          academicYear: c.academicYear,
          cutoffGrade: c.cutoffGrade ?? undefined,
          cutoffScore: c.cutoffScore ?? undefined,
          cutoffPercentile: c.cutoffPercentile ?? undefined,
          competitionRate: c.competitionRate ?? undefined,
        })),
      },
    }

    const result = await analyzeAdmission(input)

    // 분석 결과 캐시 저장
    await updateTargetAnalysis(targetId, result as unknown as Record<string, unknown>, result.probability)
    revalidatePath('/admission/targets')

    return ok(result)
  } catch (error) {
    logger.error({ err: error }, 'Failed to analyze admission')
    return fail(error instanceof Error ? error.message : '합격 가능성 분석에 실패했습니다.')
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/features/admission/services/admission-analyzer.ts src/lib/actions/admission/analysis.ts
git commit -m "feat: 합격 가능성 분석 서비스 + Server Action

- analyzeAdmission: LLM 기반 합격 가능성 분석
- analyzeAdmissionAction: 학생 성적 + 목표 커트라인 연계
- stat-analyzer 연계로 성적 추세 반영"
```

---

## Chunk 4: UI 페이지 + 컴포넌트 + 도움말

> 이 청크는 별도 계획 파일(`2026-03-14-admission-feature-ui.md`)로 분리합니다.
> Chunk 1~3 구현 완료 후, UI 컴포넌트 코드를 정확한 기존 패턴에 맞춰 상세 작성.

### Task 14~22 (UI): 별도 계획으로 분리

구현 순서:
- Task 14: layout.tsx (서브 내비게이션)
- Task 15: university-search.tsx + university-card.tsx
- Task 16: admission 메인 페이지 (page.tsx)
- Task 17: ai-research-panel.tsx (AI 수집 + 승인 UI)
- Task 18: cutoff-table.tsx + cutoff-trend-chart.tsx (recharts)
- Task 19: 대학 상세 페이지 ([universityId]/page.tsx)
- Task 20: student-target-manager.tsx + admission-probability-card.tsx
- Task 21: targets 페이지 (targets/page.tsx)
- Task 22: admission-help-dialog.tsx (5탭 + 설정)
- Task 23: i18n 키 추가
- Task 24: 최종 통합 테스트 + Commit

---

## Execution Notes

- **이 계획의 커버리지**: Spec Phase 1~3. Phase 4 (UI 페이지, 도움말 다이얼로그, i18n)는 별도 계획(`2026-03-14-admission-feature-ui.md`)으로 작성 필요.
- **Phase 순서**: Chunk 1 → 2 → 3 → 4 (의존성 순)
- **Chunk 1~3은 독립 실행 가능**: subagent 2~3개로 병렬화 가능 (단, Task 9는 Task 1~4 완료 후)
- **Chunk 4 (UI)**: Chunk 1~3 모두 완료 후 진행
- **recharts 설치 필요**: `pnpm add recharts` (Task 18 전에)
- **DB push 필요**: Task 4에서 한 번만 실행
