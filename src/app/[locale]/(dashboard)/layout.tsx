import { getCurrentTeacher } from "@/lib/dal"
import { NotificationBell } from "@/components/layout/notification-bell"
import { UserMenu } from "@/components/layout/user-menu"
import { DevUserSwitcher } from "@/components/dev/dev-user-switcher"
import { IssueReportButton } from "@/components/issues/issue-report-button"
import { LocaleSwitcher } from "@/components/layout/locale-switcher"
import { NotificationProvider } from "@/components/common/notification-provider"
import { LLMQueryBar } from "@/components/layout/llm-query-bar"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { SidebarProvider } from "@/components/layout/sidebar-context"
import { MobileMenuButton } from "@/components/layout/mobile-menu-button"
import { CommandMenu } from "@/components/layout/command-menu"

const isDev = process.env.NODE_ENV === "development"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const teacher = await getCurrentTeacher()

  return (
    <SidebarProvider>
      <div className="flex h-screen bg-background">
        {/* 사이드바 */}
        <AppSidebar role={teacher.role} name={teacher.name} />

        {/* 메인 영역 */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* 슬림 헤더 */}
          <header className="flex h-14 items-center justify-between border-b bg-background px-4 lg:px-6">
            {/* 좌측: 모바일 메뉴 버튼 */}
            <MobileMenuButton />

            {/* 중앙: 검색 힌트 */}
            <div className="hidden sm:flex flex-1 justify-center">
              <div className="inline-flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground">
                <span>검색...</span>
                <kbd className="hidden md:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </div>
            </div>

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
        <CommandMenu role={teacher.role} />
      </div>
    </SidebarProvider>
  )
}
