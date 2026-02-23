import 'server-only'
import { Octokit } from 'octokit'

// 싱글톤 패턴: 모듈 레벨 캐싱
let octokitInstance: Octokit | null = null

/**
 * GitHub API가 설정되어 있는지 확인
 * GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO 모두 필요
 */
export function isGitHubConfigured(): boolean {
  return !!(
    process.env.GITHUB_TOKEN &&
    process.env.GITHUB_OWNER &&
    process.env.GITHUB_REPO
  )
}

/**
 * Octokit 인스턴스를 반환 (싱글톤)
 * GITHUB_TOKEN이 설정되지 않으면 에러를 throw
 */
export function getOctokit(): Octokit {
  if (!process.env.GITHUB_TOKEN) {
    throw new Error('GITHUB_TOKEN 환경 변수가 설정되지 않았습니다')
  }

  if (!octokitInstance) {
    octokitInstance = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    })
  }

  return octokitInstance
}

/**
 * GitHub 저장소 owner/repo 정보 반환
 */
export function getRepoConfig() {
  const owner = process.env.GITHUB_OWNER
  const repo = process.env.GITHUB_REPO

  if (!owner || !repo) {
    throw new Error('GITHUB_OWNER, GITHUB_REPO 환경 변수가 설정되지 않았습니다')
  }

  return { owner, repo }
}
