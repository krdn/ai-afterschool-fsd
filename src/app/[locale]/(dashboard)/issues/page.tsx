import { redirect } from 'next/navigation'
import { verifySession } from '@/lib/dal'
import { getIssues } from '@/lib/actions/common/issues'
import { IssueTable } from '@/components/issues/issue-table'
import { IssueFilters } from '@/components/issues/issue-filters'
import type { IssueStatus, IssueCategory } from '@/lib/db'

export const metadata = {
  title: '이슈 관리 | AI AfterSchool',
  description: '이슈 목록 및 관리',
}

export default async function IssuesPage(props: {
  searchParams?: Promise<{
    status?: string
    category?: string
    page?: string
  }>
}) {
  const session = await verifySession()
  if (session.role !== 'DIRECTOR') {
    redirect('/dashboard')
  }

  const searchParams = await props.searchParams
  const status = searchParams?.status as IssueStatus | undefined
  const category = searchParams?.category as IssueCategory | undefined
  const page = parseInt(searchParams?.page || '1', 10)

  const { issues, total } = await getIssues({ status, category, page, pageSize: 20 })
  const totalPages = Math.ceil(total / 20)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">이슈 관리</h1>
        <p className="text-muted-foreground mt-1">총 {total}건의 이슈</p>
      </div>

      <IssueFilters />

      <div className="bg-card rounded-lg border">
        <IssueTable issues={issues} />
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {page > 1 && (
            <a
              href={`/issues?${new URLSearchParams({
                ...(status && { status }),
                ...(category && { category }),
                page: String(page - 1),
              }).toString()}`}
              className="px-4 py-2 border rounded hover:bg-muted"
            >
              이전
            </a>
          )}
          <span className="px-4 py-2 text-muted-foreground">
            {page} / {totalPages}
          </span>
          {page < totalPages && (
            <a
              href={`/issues?${new URLSearchParams({
                ...(status && { status }),
                ...(category && { category }),
                page: String(page + 1),
              }).toString()}`}
              className="px-4 py-2 border rounded hover:bg-muted"
            >
              다음
            </a>
          )}
        </div>
      )}
    </div>
  )
}
