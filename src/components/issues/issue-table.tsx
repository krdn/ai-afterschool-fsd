'use client'

import Link from 'next/link'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { IssueStatusBadge, IssueCategoryBadge, IssuePriorityBadge } from './issue-status-badge'
import type { IssueStatus, IssueCategory, IssuePriority } from '@/lib/db'

interface IssueRow {
  id: string
  title: string
  status: IssueStatus
  category: IssueCategory
  priority: IssuePriority
  githubIssueNumber: number | null
  creator: { name: string }
  assignee: { name: string } | null
  createdAt: string | Date
}

function formatRelativeTime(date: string | Date): string {
  const now = new Date()
  const target = new Date(date)
  const diffMs = now.getTime() - target.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMs / 3600000)
  const diffDay = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return '방금 전'
  if (diffMin < 60) return `${diffMin}분 전`
  if (diffHour < 24) return `${diffHour}시간 전`
  if (diffDay < 30) return `${diffDay}일 전`
  return target.toLocaleDateString('ko-KR')
}

export function IssueTable({ issues }: { issues: IssueRow[] }) {
  if (issues.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        등록된 이슈가 없습니다.
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>상태</TableHead>
          <TableHead>제목</TableHead>
          <TableHead>카테고리</TableHead>
          <TableHead>우선순위</TableHead>
          <TableHead>생성자</TableHead>
          <TableHead>담당자</TableHead>
          <TableHead>생성일</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {issues.map((issue) => (
          <TableRow key={issue.id}>
            <TableCell>
              <IssueStatusBadge status={issue.status} />
            </TableCell>
            <TableCell>
              <Link
                href={`/issues/${issue.id}`}
                className="text-primary hover:underline font-medium"
              >
                {issue.githubIssueNumber && (
                  <span className="text-muted-foreground mr-1">#{issue.githubIssueNumber}</span>
                )}
                {issue.title}
              </Link>
            </TableCell>
            <TableCell>
              <IssueCategoryBadge category={issue.category} />
            </TableCell>
            <TableCell>
              <IssuePriorityBadge priority={issue.priority} />
            </TableCell>
            <TableCell className="text-muted-foreground">{issue.creator.name}</TableCell>
            <TableCell className="text-muted-foreground">
              {issue.assignee?.name || <span className="text-muted-foreground">미할당</span>}
            </TableCell>
            <TableCell className="text-muted-foreground text-sm">
              {formatRelativeTime(issue.createdAt)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
