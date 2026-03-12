import { describe, it, expect, vi } from 'vitest'

// server-only 모듈 모킹 (테스트 환경에서 사용 불가)
vi.mock('server-only', () => ({}))

// DB 모듈 모킹 (실제 DB 연결 불필요)
vi.mock('@/lib/db/client', () => ({
  db: {},
}))

describe('chat tools', () => {
  it('chatTools 객체에 8개 도구가 정의되어 있다', async () => {
    const { createChatTools } = await import('../tools')
    const mockSession = { userId: 'test', role: 'DIRECTOR' as const, teamId: null }
    const tools = createChatTools(mockSession)
    expect(Object.keys(tools)).toHaveLength(8)
  })

  it('각 도구에 description과 inputSchema가 있다', async () => {
    const { createChatTools } = await import('../tools')
    const mockSession = { userId: 'test', role: 'DIRECTOR' as const, teamId: null }
    const tools = createChatTools(mockSession)
    for (const [name, t] of Object.entries(tools)) {
      expect((t as any).description, `${name} has description`).toBeTruthy()
      expect((t as any).inputSchema, `${name} has inputSchema`).toBeTruthy()
    }
  })
})
