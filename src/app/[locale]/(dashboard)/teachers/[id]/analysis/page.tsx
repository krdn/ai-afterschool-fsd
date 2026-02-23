import { notFound } from "next/navigation"
import { verifySession } from "@/lib/dal"
import { db } from "@/lib/db/client"
import TeacherAnalysisTab from "@/components/teachers/teacher-analysis-tab"

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function TeacherAnalysisPage({ params }: PageProps) {
  const session = await verifySession()
  if (!session) {
    return <div>Unauthorized</div>
  }

  const { id } = await params

  const teacher = await db.teacher.findUnique({
    where: { id },
    select: { id: true },
  })

  if (!teacher) {
    notFound()
  }

  return <TeacherAnalysisTab teacherId={teacher.id} />
}
