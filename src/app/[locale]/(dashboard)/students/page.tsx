import { Suspense } from "react"
import { getTranslations } from "next-intl/server"
import Link from "next/link"
import Image from "next/image"
import { UserPlus, Users } from "lucide-react"
import { getStudents } from "@/lib/actions/student/detail"
import { Button } from "@/components/ui/button"
import { StudentSearch } from "@/components/students/student-search"
import { StudentPagination } from "@/components/students/student-pagination"

const PAGE_SIZE = 12

const avatarColors = [
  "bg-blue-500", "bg-green-500", "bg-purple-500", "bg-orange-500",
  "bg-pink-500", "bg-teal-500", "bg-indigo-500", "bg-rose-500",
]

function StudentAvatar({ student }: {
  student: { name: string; images?: Array<{ type: string; resizedUrl: string }> }
}) {
  const profileImage = student.images?.find((img) => img.type === "profile")

  if (profileImage) {
    return (
      <Image
        src={profileImage.resizedUrl}
        alt={`${student.name} 프로필`}
        width={40}
        height={40}
        className="h-10 w-10 rounded-full object-cover flex-shrink-0"
      />
    )
  }

  const initial = student.name.charAt(0)
  const colorIndex = student.name.charCodeAt(0) % avatarColors.length

  return (
    <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0 ${avatarColors[colorIndex]}`}>
      {initial}
    </div>
  )
}

export default async function StudentsPage(props: {
  searchParams?: Promise<{ query?: string; page?: string }>
}) {
  const searchParams = await props.searchParams
  const query = searchParams?.query || ""
  const page = Math.max(1, Number(searchParams?.page) || 1)
  const t = await getTranslations("Student")

  const result = await getStudents(query || undefined, { page, pageSize: PAGE_SIZE })

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("totalCount", { count: result.total })}
          </p>
        </div>
        <Button asChild>
          <Link href="/students/new" data-testid="add-student-button">
            <UserPlus className="mr-2 h-4 w-4" />
            {t("addNew")}
          </Link>
        </Button>
      </div>

      {/* 검색 */}
      <Suspense>
        <StudentSearch defaultQuery={query} />
      </Suspense>

      {/* 학생 카드 그리드 */}
      {result.data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Users className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <p className="text-muted-foreground" data-testid="no-students-message">
            {query
              ? t("noSearchResults", { query })
              : t("noStudents")}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {result.data.map((student) => (
            <Link key={student.id} href={`/students/${student.id}`} className="block group">
              <div
                data-testid="student-card"
                className="rounded-xl border bg-card p-4 shadow-sm transition-all hover:shadow-md hover:border-primary/30"
              >
                <div className="flex items-center gap-3 mb-3">
                  <StudentAvatar student={student} />
                  <div className="min-w-0">
                    <h3 data-testid="student-name" className="font-semibold truncate group-hover:text-primary transition-colors">
                      {student.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      <span data-testid="student-school">{student.school}</span>
                      {" · "}
                      <span data-testid="student-grade">{t("gradeLabel", { grade: student.grade })}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{new Date(student.birthDate).toLocaleDateString("ko-KR")}</span>
                  {student.teacher && (
                    <span className="truncate ml-2">{student.teacher.name}</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* 페이지네이션 */}
      <Suspense>
        <StudentPagination
          page={result.page}
          totalPages={result.totalPages}
          total={result.total}
          pageSize={result.pageSize}
        />
      </Suspense>
    </div>
  )
}
