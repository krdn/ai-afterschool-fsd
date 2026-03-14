import { verifySession } from "@/lib/dal"
import { db } from "@/lib/db/client"
import { listAssignmentProposals } from '@/features/matching'
import { getAssignmentResults } from "@/lib/actions/matching/assignment-results"
import { AutoAssignmentSuggestion } from "@/components/assignment/auto-assignment-suggestion"
import { AssignmentResultCard } from "@/components/matching/assignment-result-card"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { HelpCircle } from "lucide-react"
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav"

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date))
}

export default async function AutoAssignPage() {
  const session = await verifySession()

  // RBAC: DIRECTOR, TEAM_LEADER만 접근 가능
  if (session.role !== "DIRECTOR" && session.role !== "TEAM_LEADER") {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">AI 자동 배정 제안</h1>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">
              이 기능은 원장님과 팀장님만 사용할 수 있습니다.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 모든 학생 목록 조회 (선생님 ID 포함)
  const allStudents = await db.student.findMany({
    select: {
      id: true,
      name: true,
      school: true,
      grade: true,
      teacherId: true,
    },
    orderBy: { name: "asc" },
  })

  // 선생님 목록 조회 (배정 결과에서 이름 표시용)
  const allTeachers = await db.teacher.findMany({
    select: {
      id: true,
      name: true,
    },
    orderBy: { name: "asc" },
  })

  // 대기 중인 제안 목록 조회
  const pendingProposals = await listAssignmentProposals({ status: "pending" })

  // 적용 완료된 제안 목록 조회 (최근 1개)
  const appliedProposals = await listAssignmentProposals({ status: "applied", limit: 1 })

  // 적용 완료된 제안의 결과 데이터 조회
  let latestResults = null
  if (appliedProposals.length > 0) {
    const result = await getAssignmentResults(appliedProposals[0].id)
    if (result.success) {
      latestResults = result.data
    }
  }

  return (
    <div className="space-y-6">
      <BreadcrumbNav items={[
        { label: "배정 관리", href: "/matching" },
        { label: "AI 자동 배정" },
      ]} />
      <div>
        <h1 className="text-2xl font-bold">AI 자동 배정 제안</h1>
        <p className="text-muted-foreground">
          AI가 궁합 점수를 분석하여 최적의 학생-선생님 배정을 제안합니다.
        </p>
      </div>

      {/* 자동 배정 제안 컴포넌트 */}
      <AutoAssignmentSuggestion allStudents={allStudents} allTeachers={allTeachers} />

      {/* 궁합 점수 계산 기준 도움말 */}
      <Card>
        <details className="group">
          <summary className="cursor-pointer list-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <HelpCircle className="h-5 w-5 text-muted-foreground" />
                궁합 점수 계산 기준
                <span className="ml-auto text-sm font-normal text-muted-foreground group-open:hidden">
                  펼치기
                </span>
                <span className="ml-auto text-sm font-normal text-muted-foreground hidden group-open:inline">
                  접기
                </span>
              </CardTitle>
              <CardDescription>
                AI 배정의 근거가 되는 점수 체계와 알고리즘을 설명합니다.
              </CardDescription>
            </CardHeader>
          </summary>
          <CardContent className="space-y-6 pt-0">
            {/* 총점 구성 */}
            <div>
              <h4 className="font-semibold mb-3">총점 구성 (100점 만점)</h4>
              <p className="text-sm text-muted-foreground mb-4">
                5개 항목의 가중 평균으로 계산됩니다. 각 항목은 선생님-학생 간의 다양한 호환성을 측정합니다.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h5 className="font-medium text-sm">MBTI 호환도</h5>
                    <span className="text-xs font-semibold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-full">25%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    E/I, S/N, T/F, J/P 4가지 차원의 유사도를 계산합니다.
                    선생님과 학생의 MBTI 성향이 비슷할수록 소통 방식이 잘 맞아 높은 점수를 받습니다.
                  </p>
                </div>
                <div className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h5 className="font-medium text-sm">학습 스타일 호환도</h5>
                    <span className="text-xs font-semibold bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full">25%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    MBTI에서 VARK 학습 스타일(시각/청각/읽기쓰기/체험)을 유도하여 코사인 유사도를 계산합니다.
                    교수법과 학습법이 맞을수록 높은 점수를 받습니다.
                  </p>
                </div>
                <div className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h5 className="font-medium text-sm">사주 호환도</h5>
                    <span className="text-xs font-semibold bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400 px-2 py-0.5 rounded-full">20%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    오행(목, 화, 토, 금, 수) 에너지 분포를 벡터로 변환하여 코사인 유사도를 측정합니다.
                    사주 기반으로 에너지 균형이 맞는 조합일수록 높은 점수를 받습니다.
                  </p>
                </div>
                <div className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h5 className="font-medium text-sm">성명학 호환도</h5>
                    <span className="text-xs font-semibold bg-orange-100 dark:bg-orange-900/40 text-orange-700 px-2 py-0.5 rounded-full">15%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    4격(원형, 형격, 이격, 정격)의 획수 차이를 비교합니다.
                    이름의 수리적 특성이 유사할수록 높은 점수를 받습니다.
                  </p>
                </div>
                <div className="border rounded-lg p-4 space-y-2 md:col-span-2">
                  <div className="flex items-center justify-between">
                    <h5 className="font-medium text-sm">부하 분산</h5>
                    <span className="text-xs font-semibold bg-muted text-foreground px-2 py-0.5 rounded-full">15%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    선생님별 담당 학생 수의 균형을 고려합니다.
                    담당 학생이 10명 이하이면 만점, 20명 이하이면 10점, 30명 이하이면 5점, 초과 시 0점입니다.
                    특정 선생님에게 학생이 몰리는 것을 방지합니다.
                  </p>
                </div>
              </div>
            </div>

            {/* 공정성 메트릭 */}
            <div>
              <h4 className="font-semibold mb-3">공정성 메트릭</h4>
              <p className="text-sm text-muted-foreground mb-3">
                배정 결과가 공정한지 3가지 관점에서 검증합니다.
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex gap-3 items-start">
                  <span className="font-medium text-nowrap min-w-[140px]">Disparity Index</span>
                  <span className="text-muted-foreground">
                    학교별 평균 궁합 점수 차이를 측정합니다. 0%에 가까울수록 학교 간 공정한 배정입니다. 20% 초과 시 경고합니다.
                  </span>
                </div>
                <div className="flex gap-3 items-start">
                  <span className="font-medium text-nowrap min-w-[140px]">ABROCA</span>
                  <span className="text-muted-foreground">
                    궁합 점수 분포의 균등성을 측정합니다. 0%에 가까울수록 점수가 고르게 분포합니다. 30% 초과 시 경고합니다.
                  </span>
                </div>
                <div className="flex gap-3 items-start">
                  <span className="font-medium text-nowrap min-w-[140px]">Distribution Balance</span>
                  <span className="text-muted-foreground">
                    선생님별 배정 학생 수의 균형을 측정합니다. 100%에 가까울수록 균등합니다. 70% 미만 시 경고합니다.
                  </span>
                </div>
              </div>
            </div>

            {/* 알고리즘 */}
            <div>
              <h4 className="font-semibold mb-3">배정 알고리즘</h4>
              <div className="text-sm text-muted-foreground space-y-2">
                <p>
                  Greedy(탐욕) 알고리즘을 사용합니다. 각 학생에 대해 궁합 점수가 가장 높은 선생님을 순차적으로 배정합니다.
                </p>
                <p>
                  선생님별 최대 담당 학생 수(평균의 120%)를 초과하면 다음 순위 선생님에게 배정되어 자연스럽게 부하가 분산됩니다.
                </p>
                <p>
                  분석 데이터(MBTI, 사주, 성명학)가 없는 학생이나 선생님은 해당 항목에서 기본값(50%)이 적용되므로,
                  분석 데이터가 많을수록 더 정확한 배정이 가능합니다.
                </p>
              </div>
            </div>
          </CardContent>
        </details>
      </Card>

      {/* 대기 중인 제안 목록 */}
      {pendingProposals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>대기 중인 제안</CardTitle>
            <CardDescription>
              이전에 생성했지만 아직 적용하지 않은 배정 제안입니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingProposals.map((proposal) => {
                const summary = proposal.summary as {
                  totalStudents: number
                  assignedStudents: number
                  averageScore: number
                }
                return (
                  <div
                    key={proposal.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted"
                  >
                    <div>
                      <p className="font-medium">{proposal.name}</p>
                      <p className="text-sm text-muted-foreground">
                        생성: {formatDate(proposal.createdAt)} | 제안자:{" "}
                        {proposal.proposer.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        학생 {summary?.assignedStudents || 0}명 | 평균 점수:{" "}
                        {Math.round(summary?.averageScore || 0)}점
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <a
                        href={`/matching/proposals/${proposal.id}`}
                        className="text-primary hover:underline text-sm"
                      >
                        상세 보기
                      </a>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 최근 배정 결과 */}
      {latestResults && (
        <AssignmentResultCard
          totalStudents={latestResults.totalStudents}
          assignedCount={latestResults.assignedCount}
          excludedCount={latestResults.excludedCount}
          successCount={latestResults.successCount}
          failureCount={latestResults.failureCount}
          averageScore={latestResults.averageScore}
          createdAt={latestResults.createdAt}
          status={latestResults.status}
        />
      )}
    </div>
  )
}
