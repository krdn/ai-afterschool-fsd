import { getCurrentTeacher } from "@/lib/dal"
import { NotificationBell } from "@/components/layout/notification-bell"
import { UserMenu } from "@/components/layout/user-menu"
import { DevUserSwitcher } from "@/components/dev/dev-user-switcher"
import { IssueReportButton } from "@/components/issues/issue-report-button"
import { LocaleSwitcher } from "@/components/layout/locale-switcher"
import { NotificationProvider } from "@/components/common/notification-provider"
import { LLMQueryBar } from "@/components/layout/llm-query-bar"
import { AppSidebar } from "@/components/layout/app-sidebar"

const isDev = process.env.NODE_ENV === "development"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const teacher = await getCurrentTeacher()

  return (
    <div className="flex h-screen bg-background">
      {/* 사이드바 */}
      <AppSidebar role={teacher.role} name={teacher.name} />

      {/* 메인 영역 */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* 슬림 헤더 */}
        <header className="flex h-14 items-center justify-between border-b bg-background px-4 lg:px-6">
          {/* 좌측: 모바일에서 햄버거 메뉴 공간 확보 */}
          <div className="lg:hidden w-10" />

          {/* 중앙: 빈 공간 (LLMQueryBar가 아래에 별도 배치) */}
          <div className="flex-1" />

          {/* 우측: 도구 모음 */}
          <div className="flex items-center gap-2">
            {teacher.role === "DIRECTOR" && (
              <>
                <IssueReportButton userRole={teacher.role} />
                <NotificationBell />
              </>
            )}
            <LocaleSwitcher />
            <UserMenu name={teacher.name} role={teacher.role} />
          </div>
        </header>

        {/* LLM 쿼리바 */}
        <LLMQueryBar />

        {/* 메인 콘텐츠 */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>

      {isDev && <DevUserSwitcher currentUserId={teacher.id} />}
      <NotificationProvider />
    </div>
  )
}
