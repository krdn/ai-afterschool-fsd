import 'server-only'
import { db } from '@/lib/db/client'
import { logger } from '@/lib/logger'
import { logAuditAction } from '@/lib/dal'
import type {
  MentionItem,
  ResolvedMention,
  MentionedEntity,
  MentionResolutionResult,
  ChatSession,
} from './mention-types'

// ─── 텍스트 축약 헬퍼 ─────────────────────────────────────────────────────────

/** 텍스트를 최대 maxLen자로 축약 */
function truncate(text: string | null | undefined, maxLen = 100): string {
  if (!text) return ''
  return text.length <= maxLen ? text : text.slice(0, maxLen) + '…'
}

/** null/undefined 값을 '분석 없음'으로 대체 */
function orNone(value: string | null | undefined): string {
  return value ? value : '분석 없음'
}

// ─── 학생 요약 텍스트 생성 ────────────────────────────────────────────────────

interface StudentAnalysisData {
  student: {
    id: string
    name: string
    grade: number
    school: string
    teamId: string | null
    phone: string | null
    birthDate: Date
    bloodType: string | null
    targetUniversity: string | null
    targetMajor: string | null
    nationality: string | null
    attendanceRate: number | null
    initialGradeLevel: string | null
  }
  parents: Array<{ name: string; phone: string; relation: string; isPrimary: boolean }>
  saju: { interpretation: string | null } | null
  name: { interpretation: string | null } | null
  mbti: { mbtiType: string; interpretation: string | null } | null
  face: { result: unknown } | null
  palm: { result: unknown } | null
  vark: { varkType: string; interpretation: string | null } | null
  zodiac: { zodiacSign: string; zodiacName: string; interpretation: string | null } | null
  personalitySummary: { coreTraits: string | null } | null
  counselingSessions: Array<{ sessionDate: Date; summary: string }>
}

function buildStudentContextText(data: StudentAnalysisData): string {
  const { student, parents, saju, name, mbti, face, palm, vark, zodiac, personalitySummary, counselingSessions } = data

  const birthDateStr = student.birthDate
    ? student.birthDate.toISOString().slice(0, 10)
    : '미등록'

  const lines: string[] = [
    `이름: ${student.name} | 학년: ${student.grade}학년 | 학교: ${student.school}`,
    `생년월일: ${birthDateStr} | 전화번호: ${student.phone ?? '미등록'} | 혈액형: ${student.bloodType ?? '미등록'}`,
    `국적: ${student.nationality ?? '미등록'} | 출석률: ${student.attendanceRate != null ? `${student.attendanceRate}%` : '미등록'} | 초기학력: ${student.initialGradeLevel ?? '미등록'}`,
    `목표대학: ${student.targetUniversity ?? '미등록'} | 목표학과: ${student.targetMajor ?? '미등록'}`,
  ]

  // 보호자 정보
  if (parents.length > 0) {
    const parentLines = parents.map((p) => {
      const primary = p.isPrimary ? ' (주보호자)' : ''
      return `  ${p.relation}: ${p.name} / ${p.phone}${primary}`
    })
    lines.push(`[보호자]\n${parentLines.join('\n')}`)
  } else {
    lines.push('[보호자] 등록된 보호자 없음')
  }

  lines.push(
    `[사주분석] ${orNone(truncate(saju?.interpretation))}`,
    `[MBTI] ${mbti ? `${mbti.mbtiType} - ${orNone(truncate(mbti.interpretation))}` : '분석 없음'}`,
    `[성명학] ${orNone(truncate(name?.interpretation))}`,
    `[관상] ${face ? truncate(JSON.stringify(face.result)) : '분석 없음'}`,
    `[손금] ${palm ? truncate(JSON.stringify(palm.result)) : '분석 없음'}`,
    `[VARK] ${vark ? `${vark.varkType} - ${orNone(truncate(vark.interpretation))}` : '분석 없음'}`,
    `[별자리] ${zodiac ? `${zodiac.zodiacName}(${zodiac.zodiacSign}) - ${orNone(truncate(zodiac.interpretation))}` : '분석 없음'}`,
    `[AI종합] ${orNone(truncate(personalitySummary?.coreTraits))}`,
  )

  if (counselingSessions.length > 0) {
    const sessionLines = counselingSessions.map((s) => {
      const dateStr = s.sessionDate.toISOString().slice(0, 10)
      return `  ${dateStr}: ${truncate(s.summary)}`
    })
    lines.push(`[최근상담]\n${sessionLines.join('\n')}`)
  } else {
    lines.push('[최근상담] 없음')
  }

  return lines.join('\n')
}

// ─── 선생님 요약 텍스트 생성 ──────────────────────────────────────────────────

interface TeacherAnalysisData {
  teacher: {
    id: string
    name: string
    role: string
    teamId: string | null
    team: { name: string } | null
  }
  saju: { interpretation: string | null } | null
  name: { interpretation: string | null } | null
  mbti: { mbtiType: string; interpretation: string | null } | null
  face: { result: unknown } | null
  palm: { result: unknown } | null
  students: Array<{ name: string }>
  counselingSessions: Array<{ sessionDate: Date; summary: string }>
}

function buildTeacherContextText(data: TeacherAnalysisData): string {
  const { teacher, saju, name, mbti, face, palm, students, counselingSessions } = data

  const teamName = teacher.team?.name ?? '미배정'
  const studentNames = students.length > 0
    ? students.map((s) => s.name).join(', ')
    : '없음'

  const lines: string[] = [
    `이름: ${teacher.name} | 역할: ${teacher.role} | 팀: ${teamName}`,
    `[담당학생] ${studentNames}`,
    `[사주분석] ${orNone(truncate(saju?.interpretation))}`,
    `[MBTI] ${mbti ? `${mbti.mbtiType} - ${orNone(truncate(mbti.interpretation))}` : '분석 없음'}`,
    `[성명학] ${orNone(truncate(name?.interpretation))}`,
    `[관상] ${face ? truncate(JSON.stringify(face.result)) : '분석 없음'}`,
    `[손금] ${palm ? truncate(JSON.stringify(palm.result)) : '분석 없음'}`,
  ]

  if (counselingSessions.length > 0) {
    const sessionLines = counselingSessions.map((s) => {
      const dateStr = s.sessionDate.toISOString().slice(0, 10)
      return `  ${dateStr}: ${truncate(s.summary)}`
    })
    lines.push(`[최근상담]\n${sessionLines.join('\n')}`)
  } else {
    lines.push('[최근상담] 없음')
  }

  return lines.join('\n')
}

// ─── 팀 요약 텍스트 생성 ──────────────────────────────────────────────────────

interface TeamData {
  team: { id: string; name: string }
  teachers: Array<{ name: string }>
  students: Array<{ name: string; grade: number }>
}

function buildTeamContextText(data: TeamData): string {
  const { team, teachers, students } = data

  const teacherNames = teachers.length > 0
    ? teachers.map((t) => t.name).join(', ')
    : '없음'
  const studentNames = students.length > 0
    ? students.map((s) => s.name).join(', ')
    : '없음'

  const avgGrade = students.length > 0
    ? (students.reduce((sum, s) => sum + s.grade, 0) / students.length).toFixed(1)
    : 'N/A'

  const lines: string[] = [
    `팀명: ${team.name}`,
    `[교사] ${teachers.length}명: ${teacherNames}`,
    `[학생] ${students.length}명 (평균 학년: ${avgGrade}): ${studentNames}`,
  ]

  return lines.join('\n')
}

// ─── RBAC 실패 처리 ───────────────────────────────────────────────────────────

async function handleAccessDenied(params: {
  entityType: 'student' | 'teacher' | 'team'
  entityId: string
  displayName: string
  teacherId: string
  reason: string
}): Promise<{ resolved: ResolvedMention; metadata: MentionedEntity; message: string }> {
  // 감사 로그 기록
  try {
    await logAuditAction({
      action: 'MENTION_ACCESS_DENIED',
      entityType: params.entityType,
      entityId: params.entityId,
      changes: {
        reason: params.reason,
        teacherId: params.teacherId,
      },
    })
  } catch {
    // 감사 로그 실패는 무시 (주 흐름 방해 안 함)
    logger.warn({ entityId: params.entityId }, '[mention-resolver] 감사 로그 기록 실패')
  }

  const message = `${params.displayName}님은 접근 권한이 없어 제외되었습니다`

  const resolved: ResolvedMention = {
    item: { type: params.entityType, id: params.entityId },
    displayName: params.displayName,
    contextData: '',
    accessDenied: true,
    deniedReason: params.reason,
  }

  const metadata: MentionedEntity = {
    id: params.entityId,
    type: params.entityType,
    displayName: params.displayName,
    accessDenied: true,
  }

  return { resolved, metadata, message }
}

// ─── 학생 멘션 해결 ───────────────────────────────────────────────────────────

async function resolveStudents(
  studentIds: string[],
  session: ChatSession
): Promise<{
  resolved: ResolvedMention[]
  metadata: MentionedEntity[]
  accessDeniedMessages: string[]
}> {
  if (studentIds.length === 0) {
    return { resolved: [], metadata: [], accessDeniedMessages: [] }
  }

  // 배치 조회 (기본 정보 + 보호자)
  const students = await db.student.findMany({
    where: { id: { in: studentIds } },
    select: {
      id: true,
      name: true,
      grade: true,
      school: true,
      teamId: true,
      phone: true,
      birthDate: true,
      bloodType: true,
      targetUniversity: true,
      targetMajor: true,
      nationality: true,
      attendanceRate: true,
      initialGradeLevel: true,
      parents: {
        select: { name: true, phone: true, relation: true, isPrimary: true },
        orderBy: { isPrimary: 'desc' },
      },
    },
  })

  // 배치 분석 데이터 조회 (N+1 방지)
  const [
    sajuList,
    nameList,
    mbtiList,
    faceList,
    palmList,
    varkList,
    zodiacList,
    personalitySummaryList,
    counselingSessionList,
  ] = await Promise.all([
    db.sajuAnalysis.findMany({
      where: { subjectType: 'STUDENT', subjectId: { in: studentIds } },
      select: { subjectId: true, interpretation: true },
    }),
    db.nameAnalysis.findMany({
      where: { subjectType: 'STUDENT', subjectId: { in: studentIds } },
      select: { subjectId: true, interpretation: true },
    }),
    db.mbtiAnalysis.findMany({
      where: { subjectType: 'STUDENT', subjectId: { in: studentIds } },
      select: { subjectId: true, mbtiType: true, interpretation: true },
    }),
    db.faceAnalysis.findMany({
      where: { subjectType: 'STUDENT', subjectId: { in: studentIds } },
      select: { subjectId: true, result: true },
    }),
    db.palmAnalysis.findMany({
      where: { subjectType: 'STUDENT', subjectId: { in: studentIds } },
      select: { subjectId: true, result: true },
    }),
    db.varkAnalysis.findMany({
      where: { studentId: { in: studentIds } },
      select: { studentId: true, varkType: true, interpretation: true },
    }),
    db.zodiacAnalysis.findMany({
      where: { studentId: { in: studentIds } },
      select: { studentId: true, zodiacSign: true, zodiacName: true, interpretation: true },
    }),
    db.personalitySummary.findMany({
      where: { studentId: { in: studentIds } },
      select: { studentId: true, coreTraits: true },
    }),
    db.counselingSession.findMany({
      where: { studentId: { in: studentIds } },
      orderBy: { sessionDate: 'desc' },
      select: { studentId: true, sessionDate: true, summary: true },
    }),
  ])

  // 인덱스 맵 생성
  const sajuMap = new Map(sajuList.map((s) => [s.subjectId, s]))
  const nameMap = new Map(nameList.map((s) => [s.subjectId, s]))
  const mbtiMap = new Map(mbtiList.map((s) => [s.subjectId, s]))
  const faceMap = new Map(faceList.map((s) => [s.subjectId, s]))
  const palmMap = new Map(palmList.map((s) => [s.subjectId, s]))
  const varkMap = new Map(varkList.map((s) => [s.studentId, s]))
  const zodiacMap = new Map(zodiacList.map((s) => [s.studentId, s]))
  const personalityMap = new Map(personalitySummaryList.map((s) => [s.studentId, s]))

  // 학생별 최근 상담 세션 3건 맵
  const counselingMap = new Map<string, Array<{ sessionDate: Date; summary: string }>>()
  for (const cs of counselingSessionList) {
    const list = counselingMap.get(cs.studentId) ?? []
    if (list.length < 3) {
      list.push({ sessionDate: cs.sessionDate, summary: cs.summary })
      counselingMap.set(cs.studentId, list)
    }
  }

  const resolved: ResolvedMention[] = []
  const metadata: MentionedEntity[] = []
  const accessDeniedMessages: string[] = []

  // 요청된 순서대로 studentIds 처리
  for (const id of studentIds) {
    const student = students.find((s) => s.id === id)

    // 존재하지 않는 학생
    if (!student) {
      resolved.push({
        item: { type: 'student', id },
        displayName: '(알 수 없음)',
        contextData: '',
        accessDenied: true,
        deniedReason: '학생을 찾을 수 없습니다',
      })
      metadata.push({ id, type: 'student', displayName: '(알 수 없음)', accessDenied: true })
      continue
    }

    // RBAC 체크: DIRECTOR가 아니면 팀 비교
    if (session.role !== 'DIRECTOR' && student.teamId !== session.teamId) {
      const denied = await handleAccessDenied({
        entityType: 'student',
        entityId: id,
        displayName: student.name,
        teacherId: session.userId,
        reason: `팀 외부 학생 접근 시도 (요청 팀: ${session.teamId}, 학생 팀: ${student.teamId})`,
      })
      resolved.push(denied.resolved)
      metadata.push(denied.metadata)
      accessDeniedMessages.push(denied.message)
      continue
    }

    // 데이터 수집 및 요약 텍스트 생성
    const contextData = buildStudentContextText({
      student,
      parents: student.parents,
      saju: sajuMap.get(id) ?? null,
      name: nameMap.get(id) ?? null,
      mbti: mbtiMap.get(id) ?? null,
      face: faceMap.get(id) ?? null,
      palm: palmMap.get(id) ?? null,
      vark: varkMap.get(id) ?? null,
      zodiac: zodiacMap.get(id) ?? null,
      personalitySummary: personalityMap.get(id) ?? null,
      counselingSessions: counselingMap.get(id) ?? [],
    })

    resolved.push({
      item: { type: 'student', id },
      displayName: student.name,
      contextData,
      accessDenied: false,
    })
    metadata.push({ id, type: 'student', displayName: student.name })
  }

  return { resolved, metadata, accessDeniedMessages }
}

// ─── 선생님 멘션 해결 ─────────────────────────────────────────────────────────

async function resolveTeachers(
  teacherIds: string[],
  session: ChatSession
): Promise<{
  resolved: ResolvedMention[]
  metadata: MentionedEntity[]
  accessDeniedMessages: string[]
}> {
  if (teacherIds.length === 0) {
    return { resolved: [], metadata: [], accessDeniedMessages: [] }
  }

  // 배치 조회 (기본 정보)
  const teachers = await db.teacher.findMany({
    where: { id: { in: teacherIds } },
    select: {
      id: true,
      name: true,
      role: true,
      teamId: true,
      team: { select: { name: true } },
    },
  })

  // 배치 분석 데이터 조회
  const [
    sajuList,
    nameList,
    mbtiList,
    faceList,
    palmList,
    counselingSessionList,
    studentList,
  ] = await Promise.all([
    db.sajuAnalysis.findMany({
      where: { subjectType: 'TEACHER', subjectId: { in: teacherIds } },
      select: { subjectId: true, interpretation: true },
    }),
    db.nameAnalysis.findMany({
      where: { subjectType: 'TEACHER', subjectId: { in: teacherIds } },
      select: { subjectId: true, interpretation: true },
    }),
    db.mbtiAnalysis.findMany({
      where: { subjectType: 'TEACHER', subjectId: { in: teacherIds } },
      select: { subjectId: true, mbtiType: true, interpretation: true },
    }),
    db.faceAnalysis.findMany({
      where: { subjectType: 'TEACHER', subjectId: { in: teacherIds } },
      select: { subjectId: true, result: true },
    }),
    db.palmAnalysis.findMany({
      where: { subjectType: 'TEACHER', subjectId: { in: teacherIds } },
      select: { subjectId: true, result: true },
    }),
    db.counselingSession.findMany({
      where: { teacherId: { in: teacherIds } },
      orderBy: { sessionDate: 'desc' },
      select: { teacherId: true, sessionDate: true, summary: true },
    }),
    db.student.findMany({
      where: { teacherId: { in: teacherIds } },
      select: { teacherId: true, name: true },
    }),
  ])

  // 인덱스 맵 생성
  const sajuMap = new Map(sajuList.map((s) => [s.subjectId, s]))
  const nameMap = new Map(nameList.map((s) => [s.subjectId, s]))
  const mbtiMap = new Map(mbtiList.map((s) => [s.subjectId, s]))
  const faceMap = new Map(faceList.map((s) => [s.subjectId, s]))
  const palmMap = new Map(palmList.map((s) => [s.subjectId, s]))

  // 선생님별 최근 상담 세션 3건 맵
  const counselingMap = new Map<string, Array<{ sessionDate: Date; summary: string }>>()
  for (const cs of counselingSessionList) {
    const list = counselingMap.get(cs.teacherId) ?? []
    if (list.length < 3) {
      list.push({ sessionDate: cs.sessionDate, summary: cs.summary })
      counselingMap.set(cs.teacherId, list)
    }
  }

  // 선생님별 담당 학생 맵
  const studentsMap = new Map<string, Array<{ name: string }>>()
  for (const s of studentList) {
    if (!s.teacherId) continue
    const list = studentsMap.get(s.teacherId) ?? []
    list.push({ name: s.name })
    studentsMap.set(s.teacherId, list)
  }

  const resolved: ResolvedMention[] = []
  const metadata: MentionedEntity[] = []
  const accessDeniedMessages: string[] = []

  for (const id of teacherIds) {
    const teacher = teachers.find((t) => t.id === id)

    if (!teacher) {
      resolved.push({
        item: { type: 'teacher', id },
        displayName: '(알 수 없음)',
        contextData: '',
        accessDenied: true,
        deniedReason: '선생님을 찾을 수 없습니다',
      })
      metadata.push({ id, type: 'teacher', displayName: '(알 수 없음)', accessDenied: true })
      continue
    }

    // RBAC 체크
    if (session.role !== 'DIRECTOR' && teacher.teamId !== session.teamId) {
      const denied = await handleAccessDenied({
        entityType: 'teacher',
        entityId: id,
        displayName: teacher.name,
        teacherId: session.userId,
        reason: `팀 외부 선생님 접근 시도 (요청 팀: ${session.teamId}, 선생님 팀: ${teacher.teamId})`,
      })
      resolved.push(denied.resolved)
      metadata.push(denied.metadata)
      accessDeniedMessages.push(denied.message)
      continue
    }

    const contextData = buildTeacherContextText({
      teacher,
      saju: sajuMap.get(id) ?? null,
      name: nameMap.get(id) ?? null,
      mbti: mbtiMap.get(id) ?? null,
      face: faceMap.get(id) ?? null,
      palm: palmMap.get(id) ?? null,
      students: studentsMap.get(id) ?? [],
      counselingSessions: counselingMap.get(id) ?? [],
    })

    resolved.push({
      item: { type: 'teacher', id },
      displayName: teacher.name,
      contextData,
      accessDenied: false,
    })
    metadata.push({ id, type: 'teacher', displayName: teacher.name })
  }

  return { resolved, metadata, accessDeniedMessages }
}

// ─── 팀 멘션 해결 ─────────────────────────────────────────────────────────────

async function resolveTeams(
  teamIds: string[],
  session: ChatSession
): Promise<{
  resolved: ResolvedMention[]
  metadata: MentionedEntity[]
  accessDeniedMessages: string[]
}> {
  if (teamIds.length === 0) {
    return { resolved: [], metadata: [], accessDeniedMessages: [] }
  }

  // 배치 조회
  const teams = await db.team.findMany({
    where: { id: { in: teamIds } },
    select: { id: true, name: true },
  })

  // 팀별 교사/학생 배치 조회
  const [teacherList, studentList] = await Promise.all([
    db.teacher.findMany({
      where: { teamId: { in: teamIds } },
      select: { teamId: true, name: true },
    }),
    db.student.findMany({
      where: { teamId: { in: teamIds } },
      select: { teamId: true, name: true, grade: true },
    }),
  ])

  // 팀별 맵
  const teachersMap = new Map<string, Array<{ name: string }>>()
  for (const t of teacherList) {
    if (!t.teamId) continue
    const list = teachersMap.get(t.teamId) ?? []
    list.push({ name: t.name })
    teachersMap.set(t.teamId, list)
  }

  const studentsMap = new Map<string, Array<{ name: string; grade: number }>>()
  for (const s of studentList) {
    if (!s.teamId) continue
    const list = studentsMap.get(s.teamId) ?? []
    list.push({ name: s.name, grade: s.grade })
    studentsMap.set(s.teamId, list)
  }

  const resolved: ResolvedMention[] = []
  const metadata: MentionedEntity[] = []
  const accessDeniedMessages: string[] = []

  for (const id of teamIds) {
    const team = teams.find((t) => t.id === id)

    if (!team) {
      resolved.push({
        item: { type: 'team', id },
        displayName: '(알 수 없음)',
        contextData: '',
        accessDenied: true,
        deniedReason: '팀을 찾을 수 없습니다',
      })
      metadata.push({ id, type: 'team', displayName: '(알 수 없음)', accessDenied: true })
      continue
    }

    // RBAC 체크: DIRECTOR가 아니면 자신의 팀만 접근 가능
    if (session.role !== 'DIRECTOR' && id !== session.teamId) {
      const denied = await handleAccessDenied({
        entityType: 'team',
        entityId: id,
        displayName: team.name,
        teacherId: session.userId,
        reason: `타 팀 접근 시도 (요청 팀: ${session.teamId}, 대상 팀: ${id})`,
      })
      resolved.push(denied.resolved)
      metadata.push(denied.metadata)
      accessDeniedMessages.push(denied.message)
      continue
    }

    const contextData = buildTeamContextText({
      team,
      teachers: teachersMap.get(id) ?? [],
      students: studentsMap.get(id) ?? [],
    })

    resolved.push({
      item: { type: 'team', id },
      displayName: team.name,
      contextData,
      accessDenied: false,
    })
    metadata.push({ id, type: 'team', displayName: team.name })
  }

  return { resolved, metadata, accessDeniedMessages }
}

// ─── 메인 함수 ────────────────────────────────────────────────────────────────

/**
 * 멘션된 엔티티(학생/선생님/팀) 데이터를 RBAC 적용하여 DB에서 조회하고
 * AI 시스템 프롬프트에 주입할 요약 텍스트로 변환한다.
 *
 * - DIRECTOR: 모든 팀 엔티티 접근 가능
 * - 그 외 역할: 자신의 팀(teamId) 소속 엔티티만 접근 가능
 * - RBAC 실패 시: accessDenied=true, contextData='', 감사 로그 기록, 알림 메시지 생성
 */
export async function resolveMentions(
  mentions: MentionItem[],
  session: ChatSession
): Promise<MentionResolutionResult> {
  if (mentions.length === 0) {
    return { resolved: [], metadata: [], accessDeniedMessages: [] }
  }

  // 중복 제거 후 타입별 분류
  const seen = new Set<string>()
  const studentIds: string[] = []
  const teacherIds: string[] = []
  const teamIds: string[] = []

  for (const mention of mentions) {
    const key = `${mention.type}:${mention.id}`
    if (seen.has(key)) continue
    seen.add(key)

    switch (mention.type) {
      case 'student':
        studentIds.push(mention.id)
        break
      case 'teacher':
        teacherIds.push(mention.id)
        break
      case 'team':
        teamIds.push(mention.id)
        break
    }
  }

  // 타입별 병렬 해결
  const [studentResult, teacherResult, teamResult] = await Promise.all([
    resolveStudents(studentIds, session),
    resolveTeachers(teacherIds, session),
    resolveTeams(teamIds, session),
  ])

  // 원본 mentions 순서대로 결과 정렬
  const resolvedMap = new Map<string, ResolvedMention>()
  for (const r of [
    ...studentResult.resolved,
    ...teacherResult.resolved,
    ...teamResult.resolved,
  ]) {
    resolvedMap.set(`${r.item.type}:${r.item.id}`, r)
  }

  const orderedResolved: ResolvedMention[] = []
  const seenOrdered = new Set<string>()
  for (const mention of mentions) {
    const key = `${mention.type}:${mention.id}`
    if (seenOrdered.has(key)) continue
    seenOrdered.add(key)
    const r = resolvedMap.get(key)
    if (r) orderedResolved.push(r)
  }

  return {
    resolved: orderedResolved,
    metadata: [
      ...studentResult.metadata,
      ...teacherResult.metadata,
      ...teamResult.metadata,
    ],
    accessDeniedMessages: [
      ...studentResult.accessDeniedMessages,
      ...teacherResult.accessDeniedMessages,
      ...teamResult.accessDeniedMessages,
    ],
  }
}
