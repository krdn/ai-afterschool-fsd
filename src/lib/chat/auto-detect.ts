import 'server-only'
import { db } from '@/lib/db/client'
import type { TeacherRole } from '@/lib/db/common/rbac'
import type { MentionItem } from './mention-types'

type Session = {
  userId: string
  role: TeacherRole
  teamId: string | null
}

type EntityCacheEntry = {
  students: Array<{ id: string; name: string; teamId: string | null }>
  teachers: Array<{ id: string; name: string; teamId: string | null }>
  teams: Array<{ id: string; name: string }>
  expiry: number
}

const CACHE_TTL_MS = 5 * 60 * 1000 // 5분
// 인메모리 캐시: standalone 단일 프로세스 전제. 학생 추가/삭제는 TTL 만료 후 반영됨.
const entityCache = new Map<string, EntityCacheEntry>()

async function getEntityNames(session: Session): Promise<Omit<EntityCacheEntry, 'expiry'>> {
  const cacheKey = `entities:${session.userId}`
  const cached = entityCache.get(cacheKey)
  if (cached && cached.expiry > Date.now()) {
    return cached
  }

  const [students, teachers, teams] = await Promise.all([
    db.student.findMany({
      where: session.role === 'DIRECTOR' ? {} : { teamId: session.teamId },
      select: { id: true, name: true, teamId: true },
    }),
    db.teacher.findMany({
      where: session.role === 'DIRECTOR' ? {} : { teamId: session.teamId },
      select: { id: true, name: true, teamId: true },
    }),
    db.team.findMany({
      select: { id: true, name: true },
    }),
  ])

  const entry: EntityCacheEntry = {
    students,
    teachers,
    teams,
    expiry: Date.now() + CACHE_TTL_MS,
  }
  entityCache.set(cacheKey, entry)
  return entry
}

/**
 * 메시지에서 학생/교사/팀 이름을 자동 감지하여 MentionItem[] 반환.
 * - 2글자 이상 이름만 매칭 (오탐 방지)
 * - 이미 멘션된 엔티티는 제외
 * - RBAC: DIRECTOR는 전체, 일반 교사는 자기 팀만
 */
export async function autoDetectEntities(
  message: string,
  session: Session,
  existingMentions: MentionItem[]
): Promise<MentionItem[]> {
  const entities = await getEntityNames(session)
  const existingKeys = new Set(existingMentions.map(m => `${m.type}:${m.id}`))
  const detected: MentionItem[] = []
  const detectedKeys = new Set<string>()

  // 학생 이름 매칭
  for (const student of entities.students) {
    if (student.name.length < 2) continue
    if (!message.includes(student.name)) continue
    if (session.role !== 'DIRECTOR' && student.teamId !== session.teamId) continue
    const key = `student:${student.id}`
    if (existingKeys.has(key) || detectedKeys.has(key)) continue
    detectedKeys.add(key)
    detected.push({ type: 'student', id: student.id })
  }

  // 교사 이름 매칭
  for (const teacher of entities.teachers) {
    if (teacher.name.length < 2) continue
    if (!message.includes(teacher.name)) continue
    if (session.role !== 'DIRECTOR' && teacher.teamId !== session.teamId) continue
    const key = `teacher:${teacher.id}`
    if (existingKeys.has(key) || detectedKeys.has(key)) continue
    detectedKeys.add(key)
    detected.push({ type: 'teacher', id: teacher.id })
  }

  // 팀 이름 매칭
  for (const team of entities.teams) {
    if (team.name.length < 2) continue
    if (!message.includes(team.name)) continue
    if (session.role !== 'DIRECTOR' && team.id !== session.teamId) continue
    const key = `team:${team.id}`
    if (existingKeys.has(key) || detectedKeys.has(key)) continue
    detectedKeys.add(key)
    detected.push({ type: 'team', id: team.id })
  }

  return detected
}
