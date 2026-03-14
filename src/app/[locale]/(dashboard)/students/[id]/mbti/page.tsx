import { notFound } from "next/navigation"
import { verifySession } from "@/lib/dal"
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav"
import { db } from "@/lib/db/client"
import { MbtiSurveyForm } from "@/components/mbti/survey-form"

export default async function MbtiSurveyPage({
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

  const existingAnalysis = await db.mbtiAnalysis.findUnique({
    where: { subjectType_subjectId: { subjectType: 'STUDENT', subjectId: id } },
    select: { id: true }
  })

  const draft = await db.mbtiSurveyDraft.findUnique({
    where: { studentId: id },
    select: { responses: true }
  })

  const initialResponses = (draft?.responses as Record<string, number>) ||
    (existingAnalysis ? await loadAnalysisResponses(id) : {})

  return (
    <div className="max-w-3xl mx-auto">
      <BreadcrumbNav items={[
        { label: "학생 목록", href: "/students" },
        { label: student.name, href: `/students/${student.id}` },
        { label: "MBTI 검사" },
      ]} />

      <div className="bg-card rounded-lg shadow-sm p-6 mb-6">
        <h1 className="text-2xl font-bold mb-2">MBTI 성향 검사</h1>
        <p className="text-muted-foreground">
          {student.name} 학생의 MBTI 성향을 검사합니다. 60개 문항에 답변해 주세요.
        </p>
        {existingAnalysis && (
          <p className="text-sm text-amber-600 mt-2">
            기존 검사 결과가 있습니다. 제출하면 새로운 결과로 업데이트됩니다.
          </p>
        )}
      </div>

      <div className="bg-card rounded-lg shadow-sm p-6">
        <MbtiSurveyForm studentId={student.id} initialDraft={initialResponses} />
      </div>
    </div>
  )
}

async function loadAnalysisResponses(studentId: string) {
  const analysis = await db.mbtiAnalysis.findUnique({
    where: { subjectType_subjectId: { subjectType: 'STUDENT', subjectId: studentId } },
    select: { responses: true }
  })
  return (analysis?.responses as Record<string, number>) || {}
}
