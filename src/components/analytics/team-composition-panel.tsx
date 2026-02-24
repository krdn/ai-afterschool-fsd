import { analyzeTeamComposition } from "@/lib/analysis/team-composition"
import { getTeamById } from "@/lib/actions/common/teams"
import { PersonalityDiversityChart } from "./personality-diversity-chart"
import { MBTIDistributionChart } from "./mbti-distribution-chart"
import { ExpertiseCoverageChart } from "./expertise-coverage-chart"
import { TeamRecommendationCard } from "./team-recommendation-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface TeamCompositionPanelProps {
  teamId: string
}

async function TeamCompositionPanel({ teamId }: TeamCompositionPanelProps) {
  const team = await getTeamById(teamId)
  if (!team) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-500">팀을 찾을 수 없습니다</p>
      </div>
    )
  }

  const analysis = await analyzeTeamComposition(teamId)
  const { composition, diversityScore, recommendations } = analysis

  const getDiversityLabel = (score: number): string => {
    if (score >= 70) return "균형 잡힌 팀"
    if (score >= 50) return "보통"
    if (score >= 30) return "개선 필요"
    return "심각한 불균형"
  }

  const getDiversityColor = (score: number): string => {
    if (score >= 70) return "bg-green-100 text-green-800"
    if (score >= 50) return "bg-blue-100 text-blue-800"
    if (score >= 30) return "bg-yellow-100 text-yellow-800"
    return "bg-red-100 text-red-800"
  }

  const diversityLabel = getDiversityLabel(diversityScore.overall)
  const diversityColor = getDiversityColor(diversityScore.overall)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{team.name}</h1>
          <p className="text-gray-600">구성 분석</p>
        </div>
        <div className={`px-6 py-4 rounded-lg border-2 ${diversityColor}`}>
          <p className="text-sm font-medium">종합 다양성 점수</p>
          <p className="text-4xl font-bold">{diversityScore.overall}</p>
          <p className="text-sm font-semibold">{diversityLabel}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>성향 다양성</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <PersonalityDiversityChart
              data={[
                { axis: "mbti", score: diversityScore.mbtiDiversity, ideal: 80 },
                { axis: "varK", score: diversityScore.learningStyleDiversity, ideal: 80 },
                { axis: "saJu", score: diversityScore.sajuElementsDiversity, ideal: 80 },
                { axis: "subject", score: diversityScore.subjectDiversity, ideal: 80 },
                { axis: "experience", score: diversityScore.gradeDiversity, ideal: 80 },
              ]}
              title="성향 다양성 레이더 차트"
              showIdeal
            />

            <div>
              <h3 className="font-semibold mb-4">MBTI 분포</h3>
              <MBTIDistributionChart distribution={composition.mbtiDistribution} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">학습 스타일 (VARK)</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Visual</span>
                    <span className="font-semibold">{composition.learningStyleDistribution.visual}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Auditory</span>
                    <span className="font-semibold">{composition.learningStyleDistribution.auditory}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Reading</span>
                    <span className="font-semibold">{composition.learningStyleDistribution.reading}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Kinesthetic</span>
                    <span className="font-semibold">{composition.learningStyleDistribution.kinesthetic}%</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-2">
                    우세 스타일: {composition.learningStyleDistribution.dominant}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">사주 오행</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>목(木)</span>
                    <span className="font-semibold">{composition.sajuElementsDistribution.wood}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>화(火)</span>
                    <span className="font-semibold">{composition.sajuElementsDistribution.fire}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>토(土)</span>
                    <span className="font-semibold">{composition.sajuElementsDistribution.earth}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>금(金)</span>
                    <span className="font-semibold">{composition.sajuElementsDistribution.metal}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>수(水)</span>
                    <span className="font-semibold">{composition.sajuElementsDistribution.water}%</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-2">
                    우세 오행: {composition.sajuElementsDistribution.dominant}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>팀 균형</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-sm">MBTI 다양성</span>
                <span className={`font-bold ${
                  diversityScore.mbtiDiversity >= 70 ? 'text-green-700' :
                  diversityScore.mbtiDiversity >= 50 ? 'text-blue-700' :
                  diversityScore.mbtiDiversity >= 30 ? 'text-yellow-700' :
                  'text-red-700'
                }`}>
                  {diversityScore.mbtiDiversity}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-sm">학습 스타일</span>
                <span className={`font-bold ${
                  diversityScore.learningStyleDiversity >= 70 ? 'text-green-700' :
                  diversityScore.learningStyleDiversity >= 50 ? 'text-blue-700' :
                  diversityScore.learningStyleDiversity >= 30 ? 'text-yellow-700' :
                  'text-red-700'
                }`}>
                  {diversityScore.learningStyleDiversity}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-sm">오행 균형</span>
                <span className={`font-bold ${
                  diversityScore.sajuElementsDiversity >= 70 ? 'text-green-700' :
                  diversityScore.sajuElementsDiversity >= 50 ? 'text-blue-700' :
                  diversityScore.sajuElementsDiversity >= 30 ? 'text-yellow-700' :
                  'text-red-700'
                }`}>
                  {diversityScore.sajuElementsDiversity}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-sm">과목 커버리지</span>
                <span className={`font-bold ${
                  diversityScore.subjectDiversity >= 70 ? 'text-green-700' :
                  diversityScore.subjectDiversity >= 50 ? 'text-blue-700' :
                  diversityScore.subjectDiversity >= 30 ? 'text-yellow-700' :
                  'text-red-700'
                }`}>
                  {diversityScore.subjectDiversity}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-sm">학년 커버리지</span>
                <span className={`font-bold ${
                  diversityScore.gradeDiversity >= 70 ? 'text-green-700' :
                  diversityScore.gradeDiversity >= 50 ? 'text-blue-700' :
                  diversityScore.gradeDiversity >= 30 ? 'text-yellow-700' :
                  'text-red-700'
                }`}>
                  {diversityScore.gradeDiversity}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>전문성 커버리지</CardTitle>
        </CardHeader>
        <CardContent>
          <ExpertiseCoverageChart coverage={composition.expertiseCoverage} />
        </CardContent>
      </Card>

      <div>
        <h2 className="text-2xl font-bold mb-6">개선 제안</h2>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {recommendations.map(recommendation => (
            <TeamRecommendationCard
              key={recommendation.id}
              recommendation={recommendation}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export { TeamCompositionPanel }
