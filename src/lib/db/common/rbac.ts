import 'server-only'
import { PrismaClient } from '@/lib/db'
import { db } from '@/lib/db/client'

export type TeacherRole = 'DIRECTOR' | 'TEAM_LEADER' | 'MANAGER' | 'TEACHER'

export interface RLSSessionContext {
  teacherId: string
  role: TeacherRole
  teamId: string | null
}

/**
 * PostgreSQL RLS 세션 변수 설정
 * 모든 DB 쿼리 전에 호출해야 함
 */
export async function setRLSSessionContext({
  teacherId,
  role,
  teamId,
}: RLSSessionContext): Promise<void> {
  // PostgreSQL SET LOCAL은 현재 트랜잭션 내에서만 유효
  // 호출 시 $transaction 블록 내에서 실제 쿼리와 함께 실행해야 RLS가 적용됨
  // 입력값 검증: role은 열거형, ID들은 영숫자와 하이픈만 허용
  const validRoles = ['DIRECTOR', 'TEAM_LEADER', 'MANAGER', 'TEACHER']
  if (!validRoles.includes(role)) {
    throw new Error(`Invalid role: ${role}`)
  }

  // SQL 인젝션 방지: 영숫자, 하이픈, 밑줄만 허용
  const idRegex = /^[a-zA-Z0-9_-]+$/
  if (!teacherId || !idRegex.test(teacherId)) {
    throw new Error(`Invalid teacherId format: ${teacherId}`)
  }

  // 값 내의 작은따옴표 이스케이프
  const safeTeacherId = teacherId.replace(/'/g, "''")
  const safeRole = role.replace(/'/g, "''")

  await db.$executeRawUnsafe(`SET LOCAL rls.teacher_id = '${safeTeacherId}'`)
  await db.$executeRawUnsafe(`SET LOCAL rls.teacher_role = '${safeRole}'`)

  // teamId 처리: null, undefined, 빈 문자열인 경우 빈 문자열로 설정
  const hasValidTeamId = teamId != null && String(teamId).trim() !== '' && idRegex.test(String(teamId))

  if (hasValidTeamId) {
    const safeTeamId = String(teamId).replace(/'/g, "''")
    await db.$executeRawUnsafe(`SET LOCAL rls.team_id = '${safeTeamId}'`)
  } else {
    // PostgreSQL SET은 문자열만 허용하므로 빈 문자열로 초기화
    await db.$executeRawUnsafe("SET LOCAL rls.team_id = ''")
  }
}

/**
 * 팀 필터링이 적용된 Prisma Client Extensions 생성
 * 애플리케이션 레이어에서 추가 보안 계층 제공
 */
export function createTeamFilteredPrisma(
  teamId: string | null,
  role: TeacherRole
) {
  // 원장은 필터링 없이 전체 Prisma Client 반환
  if (role === 'DIRECTOR') {
    return db
  }

  // 팀장/매니저/선생님은 자신의 팀 데이터만 접근 가능
  return db.$extends({
    query: {
      $allOperations({ model, args, query }) {
        // Student와 Teacher 모델에 teamId 필터 적용
        if ((model === 'Teacher' || model === 'Student') && teamId) {
          args.where = {
            ...args.where,
            teamId,
          }
        }
        return query(args)
      },
    },
  })
}

/**
 * 현재 세션의 RBAC 컨텍스트로 Prisma Client 생성
 * 세션 정보가 없으면 기본 db 반환
 */
export function getRBACPrisma(session: {
  userId: string
  role?: TeacherRole
  teamId?: string | null
}) {
  const role = session.role || 'TEACHER'
  const teamId = session.teamId || null

  return createTeamFilteredPrisma(teamId, role)
}
