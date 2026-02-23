import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { getCurrentTeacher } from "@/lib/dal"
import { NotificationBell } from "@/components/layout/notification-bell"
import { UserMenu } from "@/components/layout/user-menu"
import { DevUserSwitcher } from "@/components/dev/dev-user-switcher"
import { IssueReportButton } from "@/components/issues/issue-report-button"
import { LocaleSwitcher } from "@/components/layout/locale-switcher"
import { NotificationProvider } from "@/components/common/notification-provider"
import { LLMQueryBar } from "@/components/layout/llm-query-bar"

const isDev = process.env.NODE_ENV === "development"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const teacher = await getCurrentTeacher()
  const t = await getTranslations("Navigation")

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
                  href="/chat"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  {t("aiChat")}
                </Link>
                {(teacher.role === "DIRECTOR" || teacher.role === "TEAM_LEADER") && (
                  <>
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
                  </>
                )}
                {teacher.role === "DIRECTOR" && (
                  <Link
                    href="/issues"
                    className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    {t("issues")}
                  </Link>
                )}
                {(teacher.role === "DIRECTOR" || teacher.role === "TEAM_LEADER") && (
                  <Link
                    href="/admin"
                    className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    {t("admin")}
                  </Link>
                )}
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              {teacher.role === "DIRECTOR" && (
                <>
                  <IssueReportButton userRole={teacher.role} />
                  <NotificationBell />
                </>
              )}
              <LocaleSwitcher />
              <UserMenu name={teacher.name} role={teacher.role} />
            </div>
          </div>
        </div>
      </header>

      <LLMQueryBar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {isDev && <DevUserSwitcher currentUserId={teacher.id} />}
      <NotificationProvider />
    </div>
  )
}
