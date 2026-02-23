/**
 * 시드 시스템 Public API
 *
 * 사용 예:
 *   import { runSeed } from "@/lib/db/seed"              // 서버용
 *   import { ALL_SEED_GROUPS } from "@/lib/db/seed"      // 클라이언트 안전
 */

// 서버용 (Prisma/argon2 의존)
export { runSeed } from "./core"

// 클라이언트 안전 (순수 타입/상수)
export {
  ALL_SEED_GROUPS,
  DEFAULT_SEED_GROUPS,
  SEED_GROUP_DEPENDENCIES,
  SEED_GROUP_LABELS,
  SEED_GROUP_COUNTS,
  type SeedGroup,
  type SeedMode,
  type SeedOptions,
  type SeedModelResult,
  type SeedResult,
  type SeedDataSet,
} from "./constants"
