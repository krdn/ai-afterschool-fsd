import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { getCurrentTeacher } from "@/lib/dal"
import { NotificationBell } from "@/components/layout/notification-bell"
import { UserMenu } from "@/components/layout/user-menu"
import { DevUserSwitcher } from "@/components/dev/dev-user-switcher"
import { IssueReportButton } from "@/components/issues/issue-report-button"
import { redirect } from "next/navigation"

const isDev = process.env.NODE_ENV === "development"

/**
 * Admin 전용 레이아웃
 *
 * (dashboard) 레이아웃과 동일한 헤더/네비게이션을 제공합니다.
 * /admin 경로가 (dashboard) route group 밖에 있으므로
 * 별도의 레이아웃이 필요합니다.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const teacher = await getCurrentTeacher()
  const t = await getTranslations("Navigation")

  // 관리자 권한 확인
  if (teacher.role !== "DIRECTOR" && teacher.role !== "TEAM_LEADER") {
    redirect("/students")
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <Link href="/students" className="text-xl font-bold">
                AI AfterSchool
              </Link>
              <nav className="hidden md:flex space-x-4">
                <Link
                  href="/students"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  {t("students")}
                </Link>
                <Link
                  href="/counseling"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  {t("counseling")}
                </Link>
                <Link
                  href="/teachers"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  {t("teachers")}
                </Link>
                <Link
                  href="/matching"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  {t("matching")}
                </Link>
                <Link
                  href="/analytics"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  {t("analytics")}
                </Link>
                <Link
                  href="/admin"
                  className="text-gray-900 bg-gray-100 px-3 py-2 rounded-md text-sm font-medium"
                >
                  {t("admin")}
                </Link>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              {teacher.role === "DIRECTOR" && (
                <>
                  <IssueReportButton userRole={teacher.role} />
                  <NotificationBell />
                </>
              )}
              <UserMenu name={teacher.name} role={teacher.role} />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {isDev && <DevUserSwitcher currentUserId={teacher.id} />}
    </div>
  )
}
