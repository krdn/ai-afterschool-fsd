import Link from 'next/link'
import { getTeamById } from '@/lib/actions/common/teams'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, GraduationCap } from 'lucide-react'

/**
 * 팀 상세 페이지
 *
 * - 팀 기본 정보, 소속 선생님, 소속 학생 표시
 * - layout.tsx의 탭 내비게이션과 함께 표시됨
 * - getTeamById() Server Action에서 RBAC 필터링 적용됨
 */
export const metadata = {
  title: '팀 상세 | AI AfterSchool',
  description: '팀 정보 및 구성원 조회',
}

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  // RBAC 필터링이 포함된 Server Action 호출
  const team = await getTeamById(id)

  // 팀이 없거나 접근 권한이 없는 경우 404
  if (!team) {
    notFound()
  }

  return (
    <div className="space-y-6">
      {/* 팀 기본 정보 */}
      <Card data-testid="team-info-card">
        <CardHeader>
          <CardTitle>팀 정보</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div>
              <span className="text-gray-500">팀 ID:</span>{' '}
              <span className="font-mono text-sm" data-testid="team-id">{team.id}</span>
            </div>
            <div>
              <span className="text-gray-500">팀 이름:</span>{' '}
              <span data-testid="team-name">{team.name}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 소속 선생님 */}
      <Card data-testid="team-teachers-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            소속 선생님 ({team.teachers.length}명)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {team.teachers.length === 0 ? (
            <p className="text-gray-500" data-testid="no-teachers">소속 선생님이 없어요</p>
          ) : (
            <ul className="space-y-2">
              {team.teachers.map((teacher) => (
                <li key={teacher.id}>
                  <Link
                    href={`/teachers/${teacher.id}`}
                    className="text-blue-600 hover:underline"
                    data-testid="teacher-link"
                  >
                    {teacher.name} ({teacher.role})
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* 소속 학생 */}
      <Card data-testid="team-students-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5" />
            소속 학생 ({team.students.length}명)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {team.students.length === 0 ? (
            <p className="text-gray-500" data-testid="no-students">소속 학생이 없어요</p>
          ) : (
            <ul className="space-y-2">
              {team.students.map((student) => (
                <li key={student.id}>
                  <Link
                    href={`/students/${student.id}`}
                    className="text-blue-600 hover:underline"
                    data-testid="student-link"
                  >
                    {student.name} ({student.grade}학년)
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
