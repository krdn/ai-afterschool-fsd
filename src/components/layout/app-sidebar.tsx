"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  BookOpen,
  MessageCircle,
  UserCheck,
  GitBranch,
  BarChart3,
  Users2,
  AlertCircle,
  Settings,
  PanelLeftClose,
  PanelLeft,
  Menu,
  ChevronDown,
  type LucideIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"

// --- 메뉴 정의 타입 ---

type MenuItem = {
  key: string
  href: string
  icon: LucideIcon
}

type MenuGroup = {
  labelKey: string
  items: MenuItem[]
  collapsible?: boolean
}

// --- 메뉴 구성 ---

const mainMenuItems: MenuItem[] = [
  { key: "dashboard", href: "/dashboard", icon: LayoutDashboard },
  { key: "students", href: "/students", icon: Users },
  { key: "counseling", href: "/counseling", icon: MessageSquare },
  { key: "grades", href: "/grades", icon: BookOpen },
  { key: "aiChat", href: "/chat", icon: MessageCircle },
]

const managementMenuItems: MenuItem[] = [
  { key: "teachers", href: "/teachers", icon: UserCheck },
  { key: "matching", href: "/matching", icon: GitBranch },
  { key: "analytics", href: "/analytics", icon: BarChart3 },
  { key: "teams", href: "/teams", icon: Users2 },
]

const systemMenuItems: MenuItem[] = [
  { key: "issues", href: "/issues", icon: AlertCircle },
  { key: "admin", href: "/admin", icon: Settings },
]

function getMenuGroups(role: string): MenuGroup[] {
  const groups: MenuGroup[] = [
    { labelKey: "groupMain", items: mainMenuItems },
  ]

  if (role === "DIRECTOR" || role === "TEAM_LEADER") {
    groups.push({
      labelKey: "groupManagement",
      items: managementMenuItems,
    })
  }

  if (role === "DIRECTOR") {
    groups.push({
      labelKey: "groupSystem",
      items: systemMenuItems,
      collapsible: true,
    })
  }

  return groups
}

// --- 개별 메뉴 아이템 ---

function NavItem({
  item,
  isActive,
  collapsed,
  onClick,
}: {
  item: MenuItem
  isActive: boolean
  collapsed: boolean
  onClick?: () => void
}) {
  const t = useTranslations("Navigation")
  const Icon = item.icon
  const label = t(item.key)

  return (
    <Link
      href={item.href}
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
        "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        isActive
          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
          : "text-sidebar-foreground/70",
        collapsed && "justify-center px-2"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  )
}

// --- 사이드바 내부 콘텐츠 ---

function SidebarContent({
  role,
  collapsed,
  onItemClick,
}: {
  role: string
  collapsed: boolean
  onItemClick?: () => void
}) {
  const t = useTranslations("Navigation")
  const pathname = usePathname()
  const groups = getMenuGroups(role)

  // 활성 상태 판단: pathname이 href로 시작하는지 체크
  // /dashboard는 정확 매치, 나머지는 prefix 매치
  const isActive = (href: string) => {
    // locale prefix 제거 (/ko/students → /students)
    const cleanPath = pathname.replace(/^\/(ko|en)/, "")
    if (href === "/dashboard") {
      return cleanPath === "/dashboard" || cleanPath === "/dashboard/statistics"
    }
    return cleanPath === href || cleanPath.startsWith(href + "/")
  }

  return (
    <nav className="flex flex-col gap-1 px-2">
      {groups.map((group) => {
        const content = (
          <div className="flex flex-col gap-0.5">
            {group.items.map((item) => (
              <NavItem
                key={item.key}
                item={item}
                isActive={isActive(item.href)}
                collapsed={collapsed}
                onClick={onItemClick}
              />
            ))}
          </div>
        )

        if (group.collapsible && !collapsed) {
          return (
            <Collapsible key={group.labelKey} defaultOpen>
              <div className="mt-4">
                <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50 hover:text-sidebar-foreground/70">
                  {t(group.labelKey)}
                  <ChevronDown className="h-3 w-3 transition-transform group-data-[state=open]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent>{content}</CollapsibleContent>
              </div>
            </Collapsible>
          )
        }

        return (
          <div key={group.labelKey} className="mt-4 first:mt-0">
            {!collapsed && (
              <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                {t(group.labelKey)}
              </div>
            )}
            {collapsed && groups.indexOf(group) > 0 && (
              <div className="mx-2 my-2 border-t border-sidebar-border" />
            )}
            {content}
          </div>
        )
      })}
    </nav>
  )
}

// --- localStorage key ---
const SIDEBAR_COLLAPSED_KEY = "sidebar-collapsed"

// --- 메인 사이드바 컴포넌트 ---

type AppSidebarProps = {
  role: string
  name: string
}

export function AppSidebar({ role, name }: AppSidebarProps) {
  const t = useTranslations("Navigation")
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  // localStorage에서 초기 상태 복원
  useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
    if (stored === "true") {
      setCollapsed(true)
    }
  }, [])

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next))
      return next
    })
  }, [])

  return (
    <>
      {/* 모바일 햄버거 버튼 — 헤더에서 사용 */}
      {/* 데스크톱 사이드바 */}
      <aside
        className={cn(
          "hidden lg:flex flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 ease-in-out",
          collapsed ? "w-[60px]" : "w-[240px]"
        )}
      >
        {/* 로고 영역 */}
        <div
          className={cn(
            "flex h-14 items-center border-b border-sidebar-border px-3",
            collapsed ? "justify-center" : "gap-2"
          )}
        >
          <Link
            href="/dashboard"
            className={cn(
              "flex items-center gap-2 font-bold text-sidebar-foreground",
              collapsed && "justify-center"
            )}
          >
            <LayoutDashboard className="h-5 w-5 shrink-0 text-sidebar-primary" />
            {!collapsed && <span className="text-base">AI AfterSchool</span>}
          </Link>
        </div>

        {/* 메뉴 */}
        <div className="flex-1 overflow-y-auto py-3">
          <SidebarContent role={role} collapsed={collapsed} />
        </div>

        {/* 접기/펼치기 버튼 */}
        <div className="border-t border-sidebar-border p-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleCollapsed}
            className={cn(
              "w-full text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
              collapsed && "px-0 justify-center"
            )}
            title={collapsed ? t("expandSidebar") : t("collapseSidebar")}
          >
            {collapsed ? (
              <PanelLeft className="h-4 w-4" />
            ) : (
              <>
                <PanelLeftClose className="h-4 w-4 mr-2" />
                <span className="text-xs">{t("collapseSidebar")}</span>
              </>
            )}
          </Button>
        </div>
      </aside>

      {/* 모바일 Sheet 사이드바 */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[280px] p-0" showCloseButton={false}>
          <SheetHeader className="border-b px-4 py-3">
            <SheetTitle className="flex items-center gap-2">
              <LayoutDashboard className="h-5 w-5 text-sidebar-primary" />
              AI AfterSchool
            </SheetTitle>
            <SheetDescription className="sr-only">네비게이션 메뉴</SheetDescription>
          </SheetHeader>
          <div className="overflow-y-auto py-3">
            <SidebarContent
              role={role}
              collapsed={false}
              onItemClick={() => setMobileOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* 모바일 햄버거 버튼 (외부에서 접근할 수 있도록 export) */}
      <MobileMenuButton onClick={() => setMobileOpen(true)} />
    </>
  )
}

// 모바일 메뉴 버튼 — 헤더에 배치됨
function MobileMenuButton({ onClick }: { onClick: () => void }) {
  const t = useTranslations("Navigation")

  return (
    <Button
      variant="ghost"
      size="icon"
      className="lg:hidden absolute left-3 top-3 z-10"
      onClick={onClick}
      aria-label={t("openMenu")}
    >
      <Menu className="h-5 w-5" />
    </Button>
  )
}
