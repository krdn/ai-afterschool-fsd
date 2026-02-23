/**
 * 시드 타입 및 상수 (클라이언트/서버 공용)
 *
 * 서버 전용 의존성(argon2 등)이 없으므로 클라이언트 컴포넌트에서도 안전하게 import 가능합니다.
 */

import type { SeedTeacher, SeedStudent, SeedParent, SeedProvider } from "./data"

// ---------------------------------------------------------------------------
// 시드 그룹/모드 타입
// ---------------------------------------------------------------------------

export type SeedGroup =
  | 'teams' | 'teachers' | 'students' | 'parents' | 'providers'
  | 'providerTemplates' | 'featureMappings'

export type SeedMode = 'merge' | 'reset'

// ---------------------------------------------------------------------------
// 데이터셋 타입 (데이터 오버라이드용)
// ---------------------------------------------------------------------------

export type SeedDataSet = {
  teams: ReadonlyArray<{ name: string }>
  teachers: ReadonlyArray<SeedTeacher>
  students: ReadonlyArray<SeedStudent>
  parents: ReadonlyArray<SeedParent>
  providers: ReadonlyArray<SeedProvider>
}

// ---------------------------------------------------------------------------
// 시드 옵션
// ---------------------------------------------------------------------------

export type SeedOptions = {
  groups?: SeedGroup[]
  modes?: Partial<Record<SeedGroup, SeedMode>>
  /** 리셋 시 삭제에서 제외할 선생님 ID (현재 로그인한 사용자 보호) */
  excludeTeacherId?: string
  /** 테스트 등에서 기본 데이터 대신 사용할 데이터 */
  dataOverride?: Partial<SeedDataSet>
}

// ---------------------------------------------------------------------------
// 결과 타입
// ---------------------------------------------------------------------------

export type SeedModelResult = { created: number; updated: number }

export type SeedResult = Record<SeedGroup, SeedModelResult>

// ---------------------------------------------------------------------------
// 상수
// ---------------------------------------------------------------------------

/** 기본 시드 그룹 (기존 동작 유지) */
export const DEFAULT_SEED_GROUPS: SeedGroup[] = [
  'teams', 'teachers', 'students', 'parents', 'providers',
]

/** 모든 시드 그룹 (부가 시드 포함) */
export const ALL_SEED_GROUPS: SeedGroup[] = [
  ...DEFAULT_SEED_GROUPS, 'providerTemplates', 'featureMappings',
]

/** 그룹별 의존성 (리셋 시 함께 리셋해야 할 하위 그룹) */
export const SEED_GROUP_DEPENDENCIES: Record<SeedGroup, SeedGroup[]> = {
  teams: ['teachers', 'students', 'parents'],
  teachers: ['students', 'parents'],
  students: ['parents'],
  parents: [],
  providers: [],
  providerTemplates: [],
  featureMappings: [],
}

/** 그룹별 한글 라벨 */
export const SEED_GROUP_LABELS: Record<SeedGroup, string> = {
  teams: '팀',
  teachers: '선생님',
  students: '학생',
  parents: '학부모',
  providers: 'Provider',
  providerTemplates: 'Provider 템플릿',
  featureMappings: '기능 매핑',
}

/** 그룹별 시드 데이터 건수 */
export const SEED_GROUP_COUNTS: Record<SeedGroup, number> = {
  teams: 2,
  teachers: 8,
  students: 7,
  parents: 14,
  providers: 7,
  providerTemplates: 0,
  featureMappings: 0,
}
