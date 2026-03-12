import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/db/client', () => ({
  db: {
    student: { findMany: vi.fn() },
    teacher: { findMany: vi.fn() },
    team: { findMany: vi.fn() },
  },
}))

describe('autoDetectEntities', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.resetModules()
  })

  it('메시지에서 학생 이름을 감지한다', async () => {
    const { db } = await import('@/lib/db/client')
    vi.mocked(db.student.findMany).mockResolvedValue([
      { id: 's1', name: '정수민', teamId: 't1' },
      { id: 's2', name: '김나경', teamId: 't1' },
    ] as never)
    vi.mocked(db.teacher.findMany).mockResolvedValue([] as never)
    vi.mocked(db.team.findMany).mockResolvedValue([] as never)

    const { autoDetectEntities } = await import('../auto-detect')
    const result = await autoDetectEntities(
      '정수민 전화번호 알려줘',
      { userId: 'u1', role: 'DIRECTOR', teamId: null },
      []
    )
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'student', id: 's1' }),
      ])
    )
  })

  it('1글자 이름은 감지하지 않는다', async () => {
    const { db } = await import('@/lib/db/client')
    vi.mocked(db.student.findMany).mockResolvedValue([
      { id: 's1', name: '이', teamId: 't1' },
    ] as never)
    vi.mocked(db.teacher.findMany).mockResolvedValue([] as never)
    vi.mocked(db.team.findMany).mockResolvedValue([] as never)

    const { autoDetectEntities } = await import('../auto-detect')
    const result = await autoDetectEntities(
      '이 학생 알려줘',
      { userId: 'u1', role: 'DIRECTOR', teamId: null },
      []
    )
    expect(result).toHaveLength(0)
  })

  it('이미 멘션된 엔티티는 중복 감지하지 않는다', async () => {
    const { db } = await import('@/lib/db/client')
    vi.mocked(db.student.findMany).mockResolvedValue([
      { id: 's1', name: '정수민', teamId: 't1' },
    ] as never)
    vi.mocked(db.teacher.findMany).mockResolvedValue([] as never)
    vi.mocked(db.team.findMany).mockResolvedValue([] as never)

    const { autoDetectEntities } = await import('../auto-detect')
    const result = await autoDetectEntities(
      '정수민 전화번호',
      { userId: 'u1', role: 'DIRECTOR', teamId: null },
      [{ type: 'student', id: 's1' }]
    )
    expect(result).toHaveLength(0)
  })

  it('DIRECTOR가 아닌 교사는 자기 팀 학생만 감지된다', async () => {
    const { db } = await import('@/lib/db/client')
    vi.mocked(db.student.findMany).mockResolvedValue([
      { id: 's1', name: '정수민', teamId: 't1' },
      { id: 's2', name: '김나경', teamId: 't2' },
    ] as never)
    vi.mocked(db.teacher.findMany).mockResolvedValue([] as never)
    vi.mocked(db.team.findMany).mockResolvedValue([] as never)

    const { autoDetectEntities } = await import('../auto-detect')
    const result = await autoDetectEntities(
      '정수민 김나경 정보',
      { userId: 'u1', role: 'TEACHER', teamId: 't1' },
      []
    )
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('s1')
  })
})
