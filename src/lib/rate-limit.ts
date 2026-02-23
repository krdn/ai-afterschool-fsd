/**
 * In-memory Rate Limiter
 *
 * IP 기반 요청 제한을 위한 간단한 구현.
 * 서버 재시작 시 초기화됩니다 (서버리스 환경에서는 인스턴스별 독립).
 */

interface RateLimitConfig {
  windowMs: number // 시간 윈도우 (밀리초)
  maxRequests: number // 최대 요청 수
}

interface RateLimitEntry {
  count: number
  resetAt: number
}

// 글로벌 저장소 (모듈 레벨)
const store = new Map<string, RateLimitEntry>()

// 만료된 엔트리 정리 (5분마다)
const CLEANUP_INTERVAL = 5 * 60 * 1000
let cleanupTimer: ReturnType<typeof setInterval> | null = null

function ensureCleanup() {
  if (cleanupTimer) return
  cleanupTimer = setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of store) {
      if (now >= entry.resetAt) {
        store.delete(key)
      }
    }
  }, CLEANUP_INTERVAL)
  // Node.js에서 프로세스 종료를 차단하지 않도록
  if (cleanupTimer && typeof cleanupTimer === "object" && "unref" in cleanupTimer) {
    cleanupTimer.unref()
  }
}

/**
 * Rate limit 체크
 *
 * @param key - 제한 대상 식별자 (예: IP 주소, "login:127.0.0.1")
 * @param config - 윈도우 시간과 최대 요청 수
 * @returns success: 요청 허용 여부, remaining: 남은 요청 수
 */
export function rateLimit(
  key: string,
  config: RateLimitConfig,
): { success: boolean; remaining: number } {
  ensureCleanup()

  const now = Date.now()
  const entry = store.get(key)

  // 엔트리가 없거나 윈도우 만료 → 새 윈도우 시작
  if (!entry || now >= entry.resetAt) {
    store.set(key, {
      count: 1,
      resetAt: now + config.windowMs,
    })
    return { success: true, remaining: config.maxRequests - 1 }
  }

  // 윈도우 내 요청 수 증가
  entry.count++

  if (entry.count > config.maxRequests) {
    return { success: false, remaining: 0 }
  }

  return { success: true, remaining: config.maxRequests - entry.count }
}
