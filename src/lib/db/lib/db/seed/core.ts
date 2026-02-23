/**
 * 시드 실행 핵심 로직 (CLI + 서버 액션 공용)
 *
 * 실행 순서: 팀 → 선생님 → 학생 → 학부모 → Provider → ProviderTemplate → FeatureMapping
 * 멱등성: upsert 패턴으로 여러 번 실행해도 안전합니다.
 */

import type { Prisma, PrismaClient } from '@/lib/db'
import argon2 from "argon2"
import {
  SEED_TEAMS,
  SEED_TEACHERS,
  SEED_STUDENTS,
  SEED_PARENTS,
  SEED_PROVIDERS,
} from "./data"
import type { SeedTeacher, SeedStudent, SeedParent, SeedProvider } from "./data"
import {
  ALL_SEED_GROUPS,
  SEED_GROUP_DEPENDENCIES,
  type SeedGroup,
  type SeedOptions,
  type SeedResult,
} from "./constants"
import { executeReset } from "./reset"
import { uploadSeedImages } from "./images"

// ---------------------------------------------------------------------------
// 내부 타입
// ---------------------------------------------------------------------------

type Tx = Prisma.TransactionClient

// ---------------------------------------------------------------------------
// 메인 오케스트레이터
// ---------------------------------------------------------------------------

export async function runSeed(prisma: PrismaClient, options?: SeedOptions): Promise<SeedResult> {
  const groups = options?.groups ?? ALL_SEED_GROUPS
  const modes = options?.modes ?? {}
  const excludeTeacherId = options?.excludeTeacherId
  const dataOverride = options?.dataOverride

  // 리셋 대상 그룹 확장 (의존성 포함)
  const resetGroups = new Set(groups.filter((g) => modes[g] === 'reset'))
  for (const group of [...resetGroups]) {
    for (const dep of SEED_GROUP_DEPENDENCIES[group]) {
      resetGroups.add(dep)
    }
  }

  const txResult = await prisma.$transaction(async (tx: Tx) => {
    // 결과 객체 초기화 (7개 그룹 모두)
    const result: SeedResult = Object.fromEntries(
      ALL_SEED_GROUPS.map((g) => [g, { created: 0, updated: 0 }]),
    ) as SeedResult

    // 0. 리셋 단계
    await executeReset(tx, groups, resetGroups, excludeTeacherId)

    // 데이터 소스 결정 (dataOverride 우선)
    const teams = dataOverride?.teams ?? SEED_TEAMS
    const teachers = (dataOverride?.teachers ?? SEED_TEACHERS) as SeedTeacher[]
    const students = (dataOverride?.students ?? SEED_STUDENTS) as SeedStudent[]
    const parents = (dataOverride?.parents ?? SEED_PARENTS) as SeedParent[]
    const providers = (dataOverride?.providers ?? SEED_PROVIDERS) as SeedProvider[]

    // 1. 팀
    if (groups.includes('teams')) {
      await seedTeams(tx, teams, result)
    }
    const teamMap = await buildTeamMap(tx)

    // 2. 선생님
    if (groups.includes('teachers')) {
      await seedTeachers(tx, teachers, teamMap, result)
    }
    const teacherMap = await buildTeacherMap(tx)

    // 3. 학생
    if (groups.includes('students')) {
      await seedStudents(tx, students, teamMap, teacherMap, result)
    }
    const studentMap = await buildStudentMap(tx)

    // 4. 학부모
    if (groups.includes('parents')) {
      await seedParents(tx, parents, studentMap, result)
    }

    // 5. Provider
    if (groups.includes('providers')) {
      await seedProviders(tx, providers, result)
    }

    return result
  }, { timeout: 30000 })

  // 6. Provider Templates (트랜잭션 밖 — 외부 PrismaClient 사용)
  if (groups.includes('providerTemplates')) {
    try {
      const { seedProviderTemplates } = await import("./provider-templates")
      await seedProviderTemplates(prisma)
    } catch (err) {
      console.error("[seed] providerTemplates 시딩 실패:", err)
    }
  }

  // 7. Feature Mappings (트랜잭션 밖 — PrismaClient 타입, Task 8에서 수정 예정)
  if (groups.includes('featureMappings')) {
    try {
      const { seedFeatureMappings } = await import("./feature-mappings")
      const created = await seedFeatureMappings(prisma)
      txResult.featureMappings = { created, updated: 0 }
    } catch (err) {
      console.error("[seed] featureMappings 시딩 실패:", err)
    }
  }

  // 이미지 업로드 (트랜잭션 밖 — Cloudinary 외부 API)
  await uploadSeedImages(prisma, groups, dataOverride)

  return txResult
}

// ---------------------------------------------------------------------------
// 개별 Seeder 함수
// ---------------------------------------------------------------------------

/** 1. 팀 시딩 */
async function seedTeams(
  tx: Tx,
  teams: ReadonlyArray<{ name: string }>,
  result: SeedResult,
): Promise<void> {
  for (const team of teams) {
    const existing = await tx.team.findUnique({ where: { name: team.name } })
    if (existing) {
      result.teams.updated++
    } else {
      await tx.team.create({ data: { name: team.name } })
      result.teams.created++
    }
  }
}

/** 2. 선생님 시딩 */
async function seedTeachers(
  tx: Tx,
  teachers: SeedTeacher[],
  teamMap: Map<string, string>,
  result: SeedResult,
): Promise<void> {
  for (const teacher of teachers) {
    const existing = await tx.teacher.findUnique({ where: { email: teacher.email } })
    const teamId = teacher.teamName ? teamMap.get(teacher.teamName) ?? null : null

    if (existing) {
      // 비밀번호는 변경하지 않음 (운영 설정 보존)
      await tx.teacher.update({
        where: { email: teacher.email },
        data: {
          name: teacher.name,
          phone: teacher.phone,
          role: teacher.role,
          teamId,
          birthDate: teacher.birthDate ? new Date(teacher.birthDate) : null,
          birthTimeHour: teacher.birthTimeHour,
          birthTimeMinute: teacher.birthTimeMinute,
          nameHanja: teacher.nameHanja ?? undefined,
        },
      })
      result.teachers.updated++
    } else {
      const hashedPassword = await argon2.hash(teacher.password)
      await tx.teacher.create({
        data: {
          email: teacher.email,
          password: hashedPassword,
          name: teacher.name,
          phone: teacher.phone,
          role: teacher.role,
          teamId,
          birthDate: teacher.birthDate ? new Date(teacher.birthDate) : null,
          birthTimeHour: teacher.birthTimeHour,
          birthTimeMinute: teacher.birthTimeMinute,
          nameHanja: teacher.nameHanja ?? undefined,
        },
      })
      result.teachers.created++
    }
  }
}

/** 3. 학생 시딩 */
async function seedStudents(
  tx: Tx,
  students: SeedStudent[],
  teamMap: Map<string, string>,
  teacherMap: Map<string, string>,
  result: SeedResult,
): Promise<void> {
  for (const student of students) {
    const teacherId = teacherMap.get(student.teacherEmail) ?? null
    const teamId = teamMap.get(student.teamName) ?? null
    const birthDate = new Date(student.birthDate)

    // unique 키가 없으므로 name + birthDate로 식별
    const existing = await tx.student.findFirst({
      where: { name: student.name, birthDate },
    })

    if (existing) {
      await tx.student.update({
        where: { id: existing.id },
        data: {
          school: student.school,
          grade: student.grade,
          birthTimeHour: student.birthTimeHour,
          birthTimeMinute: student.birthTimeMinute,
          nameHanja: student.nameHanja ?? undefined,
          phone: student.phone,
          ...(teacherId && { teacherId }),
          ...(teamId && { teamId }),
        },
      })
      result.students.updated++
    } else {
      // 시드 데이터의 학생은 항상 담당 선생님이 지정됨
      if (!teacherId) continue
      await tx.student.create({
        data: {
          name: student.name,
          school: student.school,
          grade: student.grade,
          birthDate,
          birthTimeHour: student.birthTimeHour,
          birthTimeMinute: student.birthTimeMinute,
          nameHanja: student.nameHanja ?? undefined,
          phone: student.phone,
          teacherId,
          teamId,
        },
      })
      result.students.created++
    }
  }
}

/** 4. 학부모 시딩 */
async function seedParents(
  tx: Tx,
  parents: SeedParent[],
  studentMap: Map<string, string>,
  result: SeedResult,
): Promise<void> {
  for (const parent of parents) {
    const studentId = studentMap.get(parent.studentName)
    if (!studentId) continue

    const existing = await tx.parent.findFirst({
      where: { studentId, name: parent.name },
    })

    if (existing) {
      await tx.parent.update({
        where: { id: existing.id },
        data: {
          name: parent.name,
          phone: parent.phone,
          relation: parent.relation,
        },
      })
      result.parents.updated++
    } else {
      await tx.parent.create({
        data: {
          name: parent.name,
          phone: parent.phone,
          relation: parent.relation,
          student: { connect: { id: studentId } },
        },
      })
      result.parents.created++
    }
  }
}

/** 5. Provider 시딩 */
async function seedProviders(
  tx: Tx,
  providers: SeedProvider[],
  result: SeedResult,
): Promise<void> {
  for (const provider of providers) {
    const existing = await tx.provider.findFirst({
      where: { providerType: provider.providerType, name: provider.name },
    })

    if (existing) {
      // isEnabled, isValidated, apiKeyEncrypted 보존
      await tx.provider.update({
        where: { id: existing.id },
        data: {
          baseUrl: provider.baseUrl,
          authType: provider.authType,
          capabilities: provider.capabilities,
          costTier: provider.costTier,
          qualityTier: provider.qualityTier,
        },
      })
      result.providers.updated++
    } else {
      await tx.provider.create({
        data: {
          name: provider.name,
          providerType: provider.providerType,
          baseUrl: provider.baseUrl,
          authType: provider.authType,
          capabilities: provider.capabilities,
          costTier: provider.costTier,
          qualityTier: provider.qualityTier,
        },
      })
      result.providers.created++
    }
  }
}

// ---------------------------------------------------------------------------
// 맵 구축 헬퍼 (다른 그룹이 참조할 수 있으므로 항상 수행)
// ---------------------------------------------------------------------------

/** 팀 이름 → ID 맵 */
async function buildTeamMap(tx: Tx): Promise<Map<string, string>> {
  const allTeams = await tx.team.findMany()
  return new Map(allTeams.map((t) => [t.name, t.id]))
}

/** 선생님 email → ID 맵 */
async function buildTeacherMap(tx: Tx): Promise<Map<string, string>> {
  const allTeachers = await tx.teacher.findMany({ select: { id: true, email: true } })
  return new Map(allTeachers.map((t) => [t.email, t.id]))
}

/** 학생 이름 → ID 맵 (학부모 연결용) */
async function buildStudentMap(tx: Tx): Promise<Map<string, string>> {
  const allStudents = await tx.student.findMany({ select: { id: true, name: true } })
  return new Map(allStudents.map((s) => [s.name, s.id]))
}
