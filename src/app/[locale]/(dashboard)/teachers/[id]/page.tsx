import { notFound } from "next/navigation"
import { verifySession } from "@/lib/dal"
import { db } from "@/lib/db/client"
import { TeacherDetail } from "@/components/teachers/teacher-detail"

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function TeacherDetailPage({ params }: PageProps) {
  const session = await verifySession()
  if (!session) {
    return <div>Unauthorized</div>
  }

  const { id } = await params

  const teacher = await db.teacher.findUnique({
    where: { id },
    include: {
      team: true,
      _count: {
        select: { students: true },
      },
    },
  })

  if (!teacher) {
    notFound()
  }

  return (
    <TeacherDetail teacher={teacher} />
  )
}
