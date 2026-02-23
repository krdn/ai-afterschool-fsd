import { redirect } from 'next/navigation'
import { verifySession } from '@/lib/dal'

export const metadata = {
  title: '내 프로필 | AI AfterSchool',
  description: '본인 프로필 조회',
}

export default async function TeacherMePage() {
  const session = await verifySession()

  // 세션에서 현재 로그인한 선생님 ID를 가져와 리다이렉트
  redirect(`/teachers/${session.userId}`)
}
