"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  MessageSquare,
  BarChart3,
  UserCog,
  Shuffle,
  Plus,
  BookOpen,
  MessageCircle,
  Settings,
} from "lucide-react"

type CommandMenuProps = {
  role: string
}

const navigationItems = [
  { label: "대시보드", href: "/dashboard", icon: LayoutDashboard, keywords: "홈 home" },
  { label: "학생 목록", href: "/students", icon: GraduationCap, keywords: "학생 student" },
  { label: "상담 관리", href: "/counseling", icon: MessageSquare, keywords: "상담 counseling" },
  { label: "성적 관리", href: "/grades", icon: BookOpen, keywords: "성적 grade score" },
  { label: "AI 채팅", href: "/chat", icon: MessageCircle, keywords: "ai chat 채팅" },
]

const managementItems = [
  { label: "선생님 관리", href: "/teachers", icon: UserCog, keywords: "선생님 teacher", roles: ["DIRECTOR", "TEAM_LEADER"] },
  { label: "배정 관리", href: "/matching", icon: Shuffle, keywords: "배정 매칭 assign", roles: ["DIRECTOR", "TEAM_LEADER", "MANAGER"] },
  { label: "성과 분석", href: "/analytics", icon: BarChart3, keywords: "분석 analytics performance", roles: ["DIRECTOR", "TEAM_LEADER", "MANAGER"] },
  { label: "팀 관리", href: "/teams", icon: Users, keywords: "팀 team", roles: ["DIRECTOR", "TEAM_LEADER"] },
  { label: "관리자 설정", href: "/admin", icon: Settings, keywords: "관리자 admin 설정", roles: ["DIRECTOR"] },
]

const quickActions = [
  { label: "새 학생 등록", href: "/students?action=new", icon: Plus, keywords: "등록 register new" },
  { label: "새 상담 기록", href: "/counseling/new", icon: Plus, keywords: "상담 기록 new counseling" },
  { label: "OCR 성적 입력", href: "/grades/ocr", icon: Plus, keywords: "ocr 성적 입력 scan" },
]

export function CommandMenu({ role }: CommandMenuProps) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const runCommand = useCallback(
    (href: string) => {
      setOpen(false)
      router.push(href)
    },
    [router]
  )

  const filteredManagement = managementItems.filter(
    (item) => item.roles.includes(role)
  )

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="페이지 또는 기능 검색..." />
      <CommandList>
        <CommandEmpty>검색 결과가 없습니다</CommandEmpty>

        <CommandGroup heading="페이지 이동">
          {navigationItems.map((item) => (
            <CommandItem
              key={item.href}
              value={`${item.label} ${item.keywords}`}
              onSelect={() => runCommand(item.href)}
            >
              <item.icon className="mr-2 h-4 w-4" />
              {item.label}
            </CommandItem>
          ))}
        </CommandGroup>

        {filteredManagement.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="관리">
              {filteredManagement.map((item) => (
                <CommandItem
                  key={item.href}
                  value={`${item.label} ${item.keywords}`}
                  onSelect={() => runCommand(item.href)}
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        <CommandSeparator />
        <CommandGroup heading="빠른 실행">
          {quickActions.map((item) => (
            <CommandItem
              key={item.href}
              value={`${item.label} ${item.keywords}`}
              onSelect={() => runCommand(item.href)}
            >
              <item.icon className="mr-2 h-4 w-4" />
              {item.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
