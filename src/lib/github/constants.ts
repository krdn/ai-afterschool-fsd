import type { IssueCategory } from '@/lib/db'

/** IssueCategory → GitHub label 이름 매핑 */
export const CATEGORY_LABEL_MAP: Record<IssueCategory, string> = {
  BUG: 'bug',
  FEATURE: 'feature',
  IMPROVEMENT: 'improvement',
  UI_UX: 'ui-ux',
  DOCUMENTATION: 'documentation',
  PERFORMANCE: 'performance',
  SECURITY: 'security',
}

/** GitHub label 색상 (# 없이 6자리 hex) */
export const LABEL_COLORS: Record<string, string> = {
  bug: 'd73a4a',
  feature: '0075ca',
  improvement: '2ea44f',
  'ui-ux': 'a371f7',
  documentation: '0969da',
  performance: 'e4e669',
  security: 'b60205',
  // Phase 31에서 추가될 자동 생성 라벨
  sentry: 'f9826c',
  'auto-created': 'bfdadc',
}

/** GitHub label 설명 */
export const LABEL_DESCRIPTIONS: Record<string, string> = {
  bug: '버그 리포트',
  feature: '새 기능 요청',
  improvement: '기존 기능 개선',
  'ui-ux': 'UI/UX 개선',
  documentation: '문서 수정',
  performance: '성능 개선',
  security: '보안 이슈',
  sentry: 'Sentry에서 자동 수집된 에러',
  'auto-created': '자동 생성된 이슈',
}

/** IssueCategory → 브랜치 접두사 매핑 */
export const CATEGORY_BRANCH_PREFIX: Record<IssueCategory, string> = {
  BUG: 'fix',
  FEATURE: 'feat',
  IMPROVEMENT: 'chore',
  UI_UX: 'chore',
  DOCUMENTATION: 'docs',
  PERFORMANCE: 'perf',
  SECURITY: 'fix',
}

/** Rate limit 경고 임계값 (환경변수에서 읽거나 기본값 100) */
export const RATE_LIMIT_THRESHOLD = parseInt(
  process.env.GITHUB_RATE_LIMIT_THRESHOLD || '100',
  10
)
