import 'server-only'
import { CATEGORY_BRANCH_PREFIX, RATE_LIMIT_THRESHOLD } from './constants'
import { getOctokit, getRepoConfig } from './client'
import { logSystemAction } from '@/lib/dal'
import type { IssueCategory } from '@/lib/db'

/**
 * 제목을 URL-safe slug로 변환
 * 한글을 유지하고 특수문자를 제거한다.
 *
 * @example generateSlug("학생 등록 시 이름 오류") → "학생-등록-시-이름-오류"
 * @example generateSlug("Fix: login bug!!!") → "fix-login-bug"
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, '')  // 영문, 숫자, 한글, 공백, 하이픈만 유지
    .trim()
    .replace(/\s+/g, '-')                // 공백 → 하이픈
    .replace(/-+/g, '-')                 // 중복 하이픈 제거
    .replace(/^-+|-+$/g, '')             // 앞뒤 하이픈 제거
    .substring(0, 50)                    // 최대 50자
}

/**
 * 이슈 번호와 제목으로 Git 브랜치명 생성
 *
 * @example generateBranchName(42, "학생 등록 오류", "BUG") → "fix/issue-42-학생-등록-오류"
 * @example generateBranchName(15, "새 대시보드", "FEATURE") → "feat/issue-15-새-대시보드"
 */
export function generateBranchName(
  issueNumber: number,
  title: string,
  category: IssueCategory
): string {
  const prefix = CATEGORY_BRANCH_PREFIX[category]
  const slug = generateSlug(title)
  return `${prefix}/issue-${issueNumber}-${slug}`
}

/**
 * GitHub API rate limit을 확인하고 임계값 이하이면 SystemLog에 경고 기록
 *
 * @returns 현재 rate limit 정보 { limit, remaining, reset }
 */
export async function checkRateLimit(): Promise<{
  limit: number
  remaining: number
  reset: Date
  isLow: boolean
}> {
  const octokit = getOctokit()
  const { data } = await octokit.rest.rateLimit.get()

  const { limit, remaining, reset } = data.resources.core
  const resetDate = new Date(reset * 1000)
  const isLow = remaining < RATE_LIMIT_THRESHOLD

  if (isLow) {
    await logSystemAction({
      level: 'WARN',
      message: `GitHub API rate limit 경고: ${remaining}/${limit} (임계값: ${RATE_LIMIT_THRESHOLD})`,
      context: {
        remaining,
        limit,
        threshold: RATE_LIMIT_THRESHOLD,
        resetAt: resetDate.toISOString(),
      },
    })
  }

  return { limit, remaining, reset: resetDate, isLow }
}

/**
 * API 응답 헤더에서 rate limit 정보를 추출하고 경고 기록
 * GitHub API 호출 후 응답 객체에서 사용
 */
export async function checkRateLimitFromHeaders(headers: Record<string, string | undefined>): Promise<void> {
  const remaining = parseInt(headers['x-ratelimit-remaining'] || '5000', 10)
  const limit = parseInt(headers['x-ratelimit-limit'] || '5000', 10)

  if (remaining < RATE_LIMIT_THRESHOLD) {
    const reset = parseInt(headers['x-ratelimit-reset'] || '0', 10)
    await logSystemAction({
      level: 'WARN',
      message: `GitHub API rate limit 경고: ${remaining}/${limit}`,
      context: {
        remaining,
        limit,
        threshold: RATE_LIMIT_THRESHOLD,
        resetAt: new Date(reset * 1000).toISOString(),
      },
    })
  }
}
