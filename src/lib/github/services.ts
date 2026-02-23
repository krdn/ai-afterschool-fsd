import 'server-only'
import { getOctokit, getRepoConfig, isGitHubConfigured } from './client'
import { checkRateLimitFromHeaders } from './utils'
import { CATEGORY_LABEL_MAP, LABEL_COLORS, LABEL_DESCRIPTIONS } from './constants'
import { logSystemAction } from '@/lib/dal'
import { generateBranchName } from './utils'
import type { IssueCategory } from '@/lib/db'

/**
 * GitHub Issue 생성
 *
 * @param params - Issue 생성 파라미터
 * @returns GitHub Issue 정보 (number, htmlUrl) 또는 null (실패 시)
 *
 * 실패 시 null을 반환하므로 DB 이슈는 GitHub 실패와 무관하게 생성됨
 */
export async function createGitHubIssue(params: {
  title: string
  body: string
  labels: string[]
}): Promise<{ number: number; htmlUrl: string } | null> {
  // GitHub 설정 확인
  if (!isGitHubConfigured()) {
    await logSystemAction({
      level: 'WARN',
      message: 'GitHub API가 설정되지 않아 Issue를 생성할 수 없어요',
      context: { reason: 'GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO 미설정' },
    })
    return null
  }

  try {
    const octokit = getOctokit()
    const { owner, repo } = getRepoConfig()

    const response = await octokit.rest.issues.create({
      owner,
      repo,
      title: params.title,
      body: params.body,
      labels: params.labels,
    })

    // Rate limit 체크
    if (response.headers) {
      await checkRateLimitFromHeaders(response.headers as Record<string, string | undefined>)
    }

    const { number, html_url: htmlUrl } = response.data

    await logSystemAction({
      level: 'INFO',
      message: `GitHub Issue 생성 성공: #${number}`,
      context: { issueNumber: number, htmlUrl, title: params.title },
    })

    return { number, htmlUrl }
  } catch (error) {
    await logSystemAction({
      level: 'ERROR',
      message: 'GitHub Issue 생성 실패',
      context: {
        error: error instanceof Error ? error.message : String(error),
        title: params.title,
      },
    })
    return null
  }
}

/**
 * 라벨이 저장소에 존재하는지 확인하고, 없으면 생성
 *
 * @param labelName - 라벨 이름
 * @returns 성공 여부
 *
 * 이미 존재하면 아무것도 하지 않음 (idempotent)
 * 실패 시 경고 로그만 기록 (critical이 아님)
 */
export async function ensureLabel(labelName: string): Promise<boolean> {
  // GitHub 설정 확인
  if (!isGitHubConfigured()) {
    return false
  }

  try {
    const octokit = getOctokit()
    const { owner, repo } = getRepoConfig()

    // 라벨이 이미 존재하는지 확인
    try {
      await octokit.rest.issues.getLabel({
        owner,
        repo,
        name: labelName,
      })
      // 이미 존재하면 성공 반환
      return true
    } catch (getError) {
      // 404 에러가 아니면 다시 throw
      if (getError instanceof Error && !('status' in getError)) {
        throw getError
      }
      const status = (getError as { status?: number })?.status
      if (status !== 404) {
        throw getError
      }
    }

    // 라벨이 없으면 생성
    const color = LABEL_COLORS[labelName] || 'ededed'
    const description = LABEL_DESCRIPTIONS[labelName] || ''

    const response = await octokit.rest.issues.createLabel({
      owner,
      repo,
      name: labelName,
      color,
      description,
    })

    // Rate limit 체크
    if (response.headers) {
      await checkRateLimitFromHeaders(response.headers as Record<string, string | undefined>)
    }

    await logSystemAction({
      level: 'INFO',
      message: `GitHub 라벨 생성 성공: ${labelName}`,
      context: { labelName, color },
    })

    return true
  } catch (error) {
    await logSystemAction({
      level: 'WARN',
      message: `GitHub 라벨 생성 실패 (무시하고 진행): ${labelName}`,
      context: {
        error: error instanceof Error ? error.message : String(error),
        labelName,
      },
    })
    return false
  }
}

/**
 * 이슈용 브랜치 생성
 *
 * @param params - 브랜치 생성 파라미터
 * @returns 브랜치 이름 또는 null (실패 시)
 *
 * 이미 존재하는 브랜치면 에러를 무시하고 기존 브랜치명 반환
 */
export async function createIssueBranch(params: {
  issueNumber: number
  title: string
  category: IssueCategory
}): Promise<string | null> {
  // GitHub 설정 확인
  if (!isGitHubConfigured()) {
    await logSystemAction({
      level: 'WARN',
      message: 'GitHub API가 설정되지 않아 브랜치를 생성할 수 없어요',
      context: { reason: 'GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO 미설정' },
    })
    return null
  }

  try {
    const octokit = getOctokit()
    const { owner, repo } = getRepoConfig()

    // 브랜치명 생성
    const branchName = generateBranchName(
      params.issueNumber,
      params.title,
      params.category
    )

    // main 브랜치의 최신 커밋 SHA 가져오기
    const mainRefResponse = await octokit.rest.git.getRef({
      owner,
      repo,
      ref: 'heads/main',
    })

    const mainSha = mainRefResponse.data.object.sha

    // 새 브랜치 생성
    try {
      const response = await octokit.rest.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${branchName}`,
        sha: mainSha,
      })

      // Rate limit 체크
      if (response.headers) {
        await checkRateLimitFromHeaders(response.headers as Record<string, string | undefined>)
      }

      await logSystemAction({
        level: 'INFO',
        message: `GitHub 브랜치 생성 성공: ${branchName}`,
        context: { branchName, issueNumber: params.issueNumber },
      })

      return branchName
    } catch (createError) {
      // 이미 존재하는 브랜치면 에러를 무시하고 브랜치명 반환
      if (createError instanceof Error) {
        const status = (createError as { status?: number })?.status
        if (status === 422) {
          await logSystemAction({
            level: 'INFO',
            message: `브랜치가 이미 존재함: ${branchName}`,
            context: { branchName },
          })
          return branchName
        }
      }
      throw createError
    }
  } catch (error) {
    await logSystemAction({
      level: 'ERROR',
      message: 'GitHub 브랜치 생성 실패',
      context: {
        error: error instanceof Error ? error.message : String(error),
        issueNumber: params.issueNumber,
        title: params.title,
        category: params.category,
      },
    })
    return null
  }
}

/**
 * 이슈 본문(body) 템플릿 생성
 *
 * @param params - 이슈 정보
 * @returns 마크다운 형식의 이슈 본문
 */
export function generateIssueBody(params: {
  title: string
  description?: string
  category: IssueCategory
  priority: string
  creatorName: string
  screenshotUrl?: string
  userContext?: {
    role: string
    url: string
    timestamp: string
  }
}): string {
  const { title, description, category, priority, creatorName, screenshotUrl, userContext } = params

  let body = `## ${title}

${description || '설명 없음'}
`

  // 스크린샷이 있으면 추가
  if (screenshotUrl) {
    body += `
---

**스크린샷:**
![스크린샷](${screenshotUrl})
`
  }

  // 사용자 컨텍스트가 있으면 추가
  if (userContext) {
    body += `
---

**사용자 정보:**
- 역할: ${userContext.role}
- 페이지: ${userContext.url}
- 발생 시각: ${new Date(userContext.timestamp).toLocaleString('ko-KR')}
`
  }

  // 기본 이슈 정보 추가
  body += `
---

**이슈 정보:**
- 카테고리: ${category}
- 우선순위: ${priority}
- 생성자: ${creatorName}
- 앱에서 생성됨
`

  return body
}

/**
 * 이슈 자동 수정 파이프라인 트리거
 *
 * repository_dispatch 이벤트를 발행하여 auto-fix.yml 워크플로우를 시작한다.
 * GitHub 미설정이거나 실패 시 false 반환 (파이프라인 트리거는 optional).
 */
export async function dispatchAutoFix(params: {
  issueNumber: number
  branchName: string
  category: IssueCategory
  title: string
  description?: string
  screenshotUrl?: string
  issueId: string
}): Promise<boolean> {
  if (!isGitHubConfigured()) {
    return false
  }

  try {
    const octokit = getOctokit()
    const { owner, repo } = getRepoConfig()

    await octokit.rest.repos.createDispatchEvent({
      owner,
      repo,
      event_type: 'auto-fix-issue',
      client_payload: {
        issue_number: params.issueNumber,
        branch_name: params.branchName,
        category: params.category,
        title: params.title,
        description: params.description || '',
        screenshot_url: params.screenshotUrl || '',
        issue_id: params.issueId,
      },
    })

    await logSystemAction({
      level: 'INFO',
      message: `자동 수정 파이프라인 트리거: Issue #${params.issueNumber}`,
      context: { issueNumber: params.issueNumber, branchName: params.branchName },
    })

    return true
  } catch (error) {
    await logSystemAction({
      level: 'WARN',
      message: '자동 수정 파이프라인 트리거 실패 (무시하고 진행)',
      context: {
        error: error instanceof Error ? error.message : String(error),
        issueNumber: params.issueNumber,
      },
    })
    return false
  }
}
