// GitHub Integration Module
// Phase 29: Database & GitHub API Foundation

export { getOctokit, isGitHubConfigured, getRepoConfig } from './client'
export { generateSlug, generateBranchName, checkRateLimit, checkRateLimitFromHeaders } from './utils'
export { CATEGORY_LABEL_MAP, LABEL_COLORS, LABEL_DESCRIPTIONS, CATEGORY_BRANCH_PREFIX, RATE_LIMIT_THRESHOLD } from './constants'
export { createGitHubIssue, ensureLabel, createIssueBranch, generateIssueBody } from './services'
