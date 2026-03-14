'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { IssueStatusBadge, IssueCategoryBadge, IssuePriorityBadge } from './issue-status-badge'
import { IssueAssignSelect } from './issue-assign-select'
import { updateIssueStatus } from '@/lib/actions/common/issues'
import { toast } from 'sonner'
import { ExternalLink } from 'lucide-react'
import type { IssueStatus, IssueCategory, IssuePriority } from '@/lib/db'

const STATUS_OPTIONS: { value: IssueStatus; label: string }[] = [
  { value: 'OPEN', label: '열림' },
  { value: 'IN_PROGRESS', label: '진행 중' },
  { value: 'IN_REVIEW', label: '검토 중' },
  { value: 'CLOSED', label: '종료' },
]

interface IssueDetailProps {
  issue: {
    id: string
    title: string
    description: string | null
    status: IssueStatus
    category: string
    priority: string
    githubIssueNumber: number | null
    githubIssueUrl: string | null
    githubBranchName: string | null
    screenshotUrl: string | null
    assignedTo: string | null
    creator: { name: string }
    assignee: { name: string } | null
    createdAt: string | Date
  }
  teachers: { id: string; name: string }[]
}

export function IssueDetail({ issue, teachers }: IssueDetailProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleStatusChange(status: IssueStatus) {
    startTransition(async () => {
      const result = await updateIssueStatus(issue.id, status)
      if (result.success) {
        toast.success('상태가 변경되었어요')
        router.refresh()
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 좌측: 메인 콘텐츠 */}
      <div className="lg:col-span-2 space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <IssueStatusBadge status={issue.status} />
            {issue.githubIssueNumber && (
              <span className="text-muted-foreground text-sm">#{issue.githubIssueNumber}</span>
            )}
          </div>
          <h1 className="text-2xl font-bold">{issue.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {issue.creator.name} · {new Date(issue.createdAt).toLocaleString('ko-KR')}
          </p>
        </div>

        {issue.description && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">설명</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground whitespace-pre-wrap">{issue.description}</p>
            </CardContent>
          </Card>
        )}

        {issue.screenshotUrl && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">스크린샷</CardTitle>
            </CardHeader>
            <CardContent>
              <img
                src={issue.screenshotUrl}
                alt="이슈 스크린샷"
                className="max-w-full rounded border"
              />
            </CardContent>
          </Card>
        )}
      </div>

      {/* 우측: 사이드바 */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">상태</CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={issue.status}
              onValueChange={(v) => handleStatusChange(v as IssueStatus)}
              disabled={isPending}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">담당자</CardTitle>
          </CardHeader>
          <CardContent>
            <IssueAssignSelect
              issueId={issue.id}
              currentAssigneeId={issue.assignedTo}
              teachers={teachers}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">카테고리</span>
              <IssueCategoryBadge category={issue.category as IssueCategory} />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">우선순위</span>
              <IssuePriorityBadge priority={issue.priority as IssuePriority} />
            </div>
          </CardContent>
        </Card>

        {issue.githubIssueUrl && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">GitHub</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <a
                href={issue.githubIssueUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                Issue #{issue.githubIssueNumber}
                <ExternalLink className="w-3 h-3" />
              </a>
              {issue.githubBranchName && (
                <p className="text-xs text-muted-foreground font-mono">
                  {issue.githubBranchName}
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
