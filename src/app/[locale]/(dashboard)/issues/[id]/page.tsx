import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { verifySession } from '@/lib/dal'
import { getIssueById } from '@/lib/actions/common/issues'
import { db } from '@/lib/db/client'
import { IssueDetail } from '@/components/issues/issue-detail'
import { IssueTimeline } from '@/components/issues/issue-timeline'
import { ArrowLeft } from 'lucide-react'

export const metadata = {
  title: '이슈 상세 | AI AfterSchool',
}

export default async function IssueDetailPage(props: {
  params: Promise<{ id: string }>
}) {
  const session = await verifySession()
  if (session.role !== 'DIRECTOR') {
    redirect('/dashboard')
  }

  const params = await props.params
  const issue = await getIssueById(params.id)

  if (!issue) {
    notFound()
  }

  // 담당자 할당을 위한 선생님 목록 조회
  const teachers = await db.teacher.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  return (
    <div className="space-y-6">
      <Link
        href="/issues"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="w-4 h-4" />
        이슈 목록으로
      </Link>

      <IssueDetail issue={issue} teachers={teachers} />

      <div className="lg:w-2/3">
        <IssueTimeline events={issue.events} />
      </div>
    </div>
  )
}
