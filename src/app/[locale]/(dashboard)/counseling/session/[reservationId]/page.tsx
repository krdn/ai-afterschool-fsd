import { redirect } from 'next/navigation'
import { verifySession } from '@/lib/dal'
import { getSessionWithNotesAction } from '@/lib/actions/counseling/session-live'
import { SessionLivePage } from '@/components/counseling/session-live/session-live-page'

type PageProps = {
  params: Promise<{ reservationId: string }>
}

export default async function SessionPage({ params }: PageProps) {
  // 인증 확인 — 실패 시 verifySession 내부에서 redirect('/auth/login')
  await verifySession()

  const { reservationId } = await params
  const result = await getSessionWithNotesAction(reservationId)

  // 조회 실패 또는 상태가 IN_PROGRESS가 아니면 상담 목록으로 이동
  if (!result.success || result.data.status !== 'IN_PROGRESS') {
    redirect('/counseling')
  }

  return <SessionLivePage reservation={result.data} />
}
