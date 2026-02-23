import { redirect } from "next/navigation"
import { verifySession } from "@/lib/dal"
import { listAssignmentProposals } from '@/features/matching'
import { calculateFairnessMetrics } from "@/features/matching"
import { FairnessMetricsPanel } from "@/components/compatibility/fairness-metrics-panel"

/**
 * 공정성 메트릭 대시보드 페이지
 *
 * 알고리즘적 편향을 검증하기 위한 공정성 메트릭을 시각화합니다.
 * DIRECTOR, TEAM_LEADER만 접근 가능합니다.
 */
export default async function FairnessMetricsPage() {
  // 인증 및 권한 확인
  const session = await verifySession()

  // DIRECTOR, TEAM_LEADER만 접근 가능
  if (!["DIRECTOR", "TEAM_LEADER"].includes(session.role)) {
    redirect("/dashboard")
  }

  // 최근 AssignmentProposal 목록 조회
  const proposals = await listAssignmentProposals({
    teamId: session.teamId ?? undefined,
  })

  // 제안별 공정성 메트릭 계산
  const proposalsWithMetrics = await Promise.all(
    proposals.map(async (proposal) => {
      const assignments = proposal.assignments as Array<{
        studentId: string
        teacherId: string
        score: number
      }>

      const metrics = await calculateFairnessMetrics(assignments)

      return {
        id: proposal.id,
        name: proposal.name,
        createdAt: proposal.createdAt,
        status: proposal.status,
        metrics,
      }
    })
  )

  // 최신 제안의 메트릭 (패널 표시용)
  const latestProposal = proposalsWithMetrics[0]

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900" data-testid="fairness-heading">공정성 메트릭</h1>
        <p className="mt-2 text-gray-600">
          알고리즘적 편향을 검증하기 위한 공정성 지표를 확인합니다.
        </p>
      </div>

      {/* 제안 없음 메시지 */}
      {proposals.length === 0 && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
          <p className="text-gray-600">아직 배정 제안이 없습니다.</p>
          <p className="mt-2 text-sm text-gray-500">
            자동 배정을 실행하여 제안을 생성하면 공정성 메트릭을 확인할 수
            있습니다.
          </p>
        </div>
      )}

      {/* 공정성 메트릭 패널 */}
      {latestProposal && (
        <FairnessMetricsPanel metrics={latestProposal.metrics} />
      )}

      {/* 과거 제안별 메트릭 테이블 */}
      {proposalsWithMetrics.length > 0 && (
        <div className="rounded-lg border bg-white shadow-sm">
          <div className="border-b px-6 py-4">
            <h2 className="text-lg font-semibold">제안별 공정성 메트릭</h2>
          </div>
          <div className="overflow-x-auto" data-testid="teacher-fairness-table">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                    제안명
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                    생성일
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                    상태
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">
                    Disparity Index
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">
                    ABROCA
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">
                    Distribution Balance
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {proposalsWithMetrics.map((proposal) => (
                  <tr key={proposal.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {proposal.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(proposal.createdAt).toLocaleDateString("ko-KR")}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={proposal.status} />
                    </td>
                    <td className="px-6 py-4 text-right text-sm">
                      <MetricValue
                        value={proposal.metrics.disparityIndex}
                        threshold={0.2}
                        lowerIsBetter={true}
                      />
                    </td>
                    <td className="px-6 py-4 text-right text-sm">
                      <MetricValue
                        value={proposal.metrics.abroca}
                        threshold={0.3}
                        lowerIsBetter={true}
                      />
                    </td>
                    <td className="px-6 py-4 text-right text-sm">
                      <MetricValue
                        value={proposal.metrics.distributionBalance}
                        threshold={0.7}
                        lowerIsBetter={false}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * 상태 뱃지 컴포넌트
 */
function StatusBadge({ status }: { status: string }) {
  const styles = {
    pending: "bg-yellow-100 text-yellow-700",
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
  }

  const labels = {
    pending: "대기중",
    approved: "승인됨",
    rejected: "거절됨",
  }

  return (
    <span
      className={`rounded-full px-2 py-1 text-xs font-medium ${styles[status as keyof typeof styles] || "bg-gray-100 text-gray-700"}`}
    >
      {labels[status as keyof typeof labels] || status}
    </span>
  )
}

/**
 * 메트릭 값 컴포넌트 (색상으로 상태 표시)
 */
function MetricValue({
  value,
  threshold,
  lowerIsBetter,
}: {
  value: number
  threshold: number
  lowerIsBetter: boolean
}) {
  const isGood = lowerIsBetter ? value < threshold : value > threshold
  const isWarning = lowerIsBetter
    ? value < threshold * 1.5
    : value > threshold * 0.7

  let colorClass = "text-gray-600"
  if (isGood) {
    colorClass = "text-green-600 font-medium"
  } else if (isWarning) {
    colorClass = "text-yellow-600 font-medium"
  } else {
    colorClass = "text-red-600 font-medium"
  }

  return <span className={colorClass}>{value.toFixed(3)}</span>
}
