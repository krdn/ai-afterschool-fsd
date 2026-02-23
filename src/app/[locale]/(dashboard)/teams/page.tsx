import Link from 'next/link'
import { getTeams } from '@/lib/actions/common/teams'
import { EmptyState } from '@/components/students/empty-state'
import { Users } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * 팀 목록 페이지
 *
 * - 원장: 모든 팀 조회
 * - 팀장/매니저/선생님: 자신의 팀만 조회
 * - getTeams() Server Action에서 RBAC 필터링 적용됨
 */
export const metadata = {
  title: '팀 관리 | AI AfterSchool',
  description: '팀 목록 조회 및 관리',
}

export default async function TeamsPage() {
  // RBAC 필터링이 포함된 Server Action 호출
  const teams = await getTeams()

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">팀 관리</h1>
          <p className="text-gray-500">
            {teams.length > 0
              ? `총 ${teams.length}개의 팀이 있어요`
              : '팀을 생성해보세요'}
          </p>
        </div>
      </div>

      {/* 팀 목록 또는 빈 상태 */}
      {teams.length === 0 ? (
        <EmptyState
          icon={Users}
          title="아직 팀이 없어요"
          description="팀을 생성하고 선생님과 학생을 배정해보세요."
          actionLabel="관리자에게 문의"
          actionHref="/dashboard"
          tips={[
            '팀은 선생님과 학생을 그룹으로 관리하는 단위예요',
            '원장이 팀을 생성할 수 있어요',
            '팀 단위로 데이터 접근 권한이 제어돼요',
          ]}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <Link
              key={team.id}
              href={`/teams/${team.id}`}
              data-testid="team-card"
              className="group"
            >
              <div className="bg-white border rounded-lg p-6 hover:shadow-lg transition-all cursor-pointer group-hover:border-blue-300">
                <h3 className="text-lg font-semibold mb-2" data-testid="team-name">
                  {team.name}
                </h3>
                <div className="text-sm text-gray-500 space-y-1">
                  <p data-testid="team-teachers-count">
                    선생님 {team._count.teachers}명
                  </p>
                  <p data-testid="team-students-count">
                    학생 {team._count.students}명
                  </p>
                </div>
                {/* 팀 카드 바로가기 힌트 */}
                <div className="mt-4 text-xs text-blue-600 opacity-0 group-hover:opacity-100 transition">
                  상세보기 →
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* 페이지 푸터 정보 */}
      <div className="text-center text-sm text-gray-400 pt-4">
        팀 카드를 클릭하면 상세 정보를 확인할 수 있어요
      </div>
    </div>
  )
}
