import Link from 'next/link'
import { verifySession } from '@/lib/dal'
import { getTeachers } from '@/lib/actions/teacher/crud'
import { Button } from '@/components/ui/button'
import { TeacherTable } from '@/components/teachers/teacher-table'
import { EmptyState } from '@/components/students/empty-state'
import { AccessDeniedPage } from '@/components/errors/access-denied-page'
import { Users } from 'lucide-react'

export default async function TeachersPage() {
  const session = await verifySession()

  // 권한 검증: 원장 또는 팀장만 선생님 목록 접근 가능
  if (session.role === 'MANAGER' || session.role === 'TEACHER') {
    return <AccessDeniedPage resource="선생님 관리" action="접근" />
  }

  const teachers = await getTeachers()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">선생님 관리</h1>
          <p className="text-gray-500">
            {teachers.length > 0
              ? `총 ${teachers.length}명의 선생님이 등록되어 있어요`
              : '선생님을 등록해보세요'}
          </p>
        </div>
        {session.role === 'DIRECTOR' && teachers.length > 0 && (
          <Button asChild>
            <Link href="/teachers/new">선생님 등록</Link>
          </Button>
        )}
      </div>

      {teachers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="아직 등록된 선생님이 없어요"
          description="선생님을 등록하고 팀을 구성해보세요. 선생님 정보와 성향 분석 결과를 한눈에 확인할 수 있어요."
          actionLabel="첫 선생님 등록하기"
          actionHref="/teachers/new"
          tips={[
            '이름, 이메일, 비밀번호로 계정을 생성해요',
            '역할(선생님, 매니저, 팀장)을 지정할 수 있어요',
            '팀을 배정하면 팀 단위로 학생을 관리할 수 있어요',
          ]}
        />
      ) : (
        <TeacherTable
          data={teachers}
          currentUserId={session.userId}
          currentRole={session.role}
        />
      )}
    </div>
  )
}
