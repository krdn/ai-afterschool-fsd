import { notFound } from "next/navigation"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { verifySession } from "@/lib/dal"
import { db } from "@/lib/db/client"
import { VarkSurveyForm } from "@/components/vark/survey-form"

export default async function VarkSurveyPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await verifySession()

  // DIRECTOR/TEAM_LEADER는 모든 학생 접근 가능
  const whereClause = session.role === 'DIRECTOR' || session.role === 'TEAM_LEADER'
    ? { id }
    : { id, teacherId: session.userId }

  const student = await db.student.findFirst({
    where: whereClause,
    select: {
      id: true,
      name: true,
    },
  })

  if (!student) {
    notFound()
  }

  const existingAnalysis = await db.varkAnalysis.findUnique({
    where: { studentId: id },
    select: { id: true },
  })

  const draft = await db.varkSurveyDraft.findUnique({
    where: { studentId: id },
    select: { responses: true },
  })

  const initialResponses = (draft?.responses as Record<string, number>) ||
    (existingAnalysis ? await loadAnalysisResponses(id) : {})

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <Link
          href={`/students/${student.id}`}
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          {student.name} 프로필로 돌아가기
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h1 className="text-2xl font-bold mb-2">VARK 학습유형 검사</h1>
        <p className="text-gray-600">
          {student.name} 학생의 학습 유형을 검사합니다. 28개 문항에 답변해 주세요.
        </p>
        <p className="text-sm text-gray-500 mt-1">
          각 문항에 대해 자신에게 얼마나 해당되는지 1(전혀 아님)~5(매우 그러함)로 답해주세요.
        </p>
        {existingAnalysis && (
          <p className="text-sm text-amber-600 mt-2">
            기존 검사 결과가 있습니다. 제출하면 새로운 결과로 업데이트됩니다.
          </p>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <VarkSurveyForm studentId={student.id} initialDraft={initialResponses} />
      </div>
    </div>
  )
}

async function loadAnalysisResponses(studentId: string) {
  const analysis = await db.varkAnalysis.findUnique({
    where: { studentId },
    select: { responses: true },
  })
  return (analysis?.responses as Record<string, number>) || {}
}
