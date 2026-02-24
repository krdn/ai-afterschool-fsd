import { notFound } from "next/navigation"
import { analyzeTeamComposition } from "@/lib/analysis/team-composition"
import { getTeamById } from "@/lib/actions/common/teams"
import { TeamCompositionPanel } from "@/components/analytics/team-composition-panel"
import { Card, CardContent } from "@/components/ui/card"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function TeamCompositionPage({ params }: PageProps) {
  const { id } = await params

  const team = await getTeamById(id)
  if (!team) {
    notFound()
  }

  const analysis = await analyzeTeamComposition(id)

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-blue-600 mb-2">
              {analysis.diversityScore.overall}
            </h1>
            <p className="text-xl text-gray-600 mb-4">
              팀 다양성 점수
            </p>
            <p className="text-sm text-gray-500">
              총 선생님: {analysis.composition.teacherCount}명
            </p>
          </div>
        </CardContent>
      </Card>

      <TeamCompositionPanel teamId={id} />
    </div>
  )
}
