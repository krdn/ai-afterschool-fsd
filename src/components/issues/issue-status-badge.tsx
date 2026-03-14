import { Badge } from '@/components/ui/badge'
import type { IssueStatus, IssueCategory, IssuePriority } from '@/lib/db'

const STATUS_CONFIG: Record<IssueStatus, { label: string; className: string }> = {
  OPEN: { label: '열림', className: 'bg-blue-100 text-blue-800 dark:text-blue-300' },
  IN_PROGRESS: { label: '진행 중', className: 'bg-yellow-100 text-yellow-800 dark:text-yellow-300' },
  IN_REVIEW: { label: '검토 중', className: 'bg-purple-100 text-purple-800 dark:text-purple-300' },
  CLOSED: { label: '종료', className: 'bg-muted text-foreground' },
  ARCHIVED: { label: '보관', className: 'bg-muted text-muted-foreground' },
}

const CATEGORY_CONFIG: Record<IssueCategory, { label: string; className: string }> = {
  BUG: { label: '버그', className: 'bg-red-100 text-red-800 dark:text-red-300' },
  FEATURE: { label: '기능', className: 'bg-green-100 text-green-800 dark:text-green-300' },
  IMPROVEMENT: { label: '개선', className: 'bg-blue-100 text-blue-800 dark:text-blue-300' },
  UI_UX: { label: 'UI/UX', className: 'bg-orange-100 text-orange-800 dark:text-orange-300' },
  DOCUMENTATION: { label: '문서', className: 'bg-indigo-100 text-indigo-800' },
  PERFORMANCE: { label: '성능', className: 'bg-amber-100 text-amber-800 dark:text-amber-300' },
  SECURITY: { label: '보안', className: 'bg-red-200 text-red-900' },
}

const PRIORITY_CONFIG: Record<IssuePriority, { label: string; className: string }> = {
  LOW: { label: '낮음', className: 'bg-muted text-muted-foreground' },
  MEDIUM: { label: '보통', className: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700' },
  HIGH: { label: '높음', className: 'bg-orange-100 text-orange-800 dark:text-orange-300' },
  URGENT: { label: '긴급', className: 'bg-red-100 text-red-800 dark:text-red-300' },
}

export function IssueStatusBadge({ status }: { status: IssueStatus }) {
  const config = STATUS_CONFIG[status]
  return <Badge className={config.className}>{config.label}</Badge>
}

export function IssueCategoryBadge({ category }: { category: IssueCategory }) {
  const config = CATEGORY_CONFIG[category]
  return <Badge className={config.className}>{config.label}</Badge>
}

export function IssuePriorityBadge({ priority }: { priority: IssuePriority }) {
  const config = PRIORITY_CONFIG[priority]
  return <Badge className={config.className}>{config.label}</Badge>
}
