"use client"

import Link from "next/link"
import { useTranslations } from "next-intl"
import {
  UserPlus,
  MessageSquarePlus,
  BookOpen,
  GitBranch,
} from "lucide-react"
import { Button } from "@/components/ui/button"

type QuickAction = {
  labelKey: string
  href: string
  icon: React.ReactNode
}

const actions: QuickAction[] = [
  {
    labelKey: "addStudent",
    href: "/students?action=new",
    icon: <UserPlus className="h-4 w-4" />,
  },
  {
    labelKey: "newCounseling",
    href: "/counseling?action=new",
    icon: <MessageSquarePlus className="h-4 w-4" />,
  },
  {
    labelKey: "gradeEntry",
    href: "/grades",
    icon: <BookOpen className="h-4 w-4" />,
  },
  {
    labelKey: "matching",
    href: "/matching",
    icon: <GitBranch className="h-4 w-4" />,
  },
]

export function QuickActions({ role }: { role: string }) {
  const t = useTranslations("Dashboard")

  // TEACHER는 매칭 접근 불가
  const filtered = role === "TEACHER"
    ? actions.filter((a) => a.labelKey !== "matching")
    : actions

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        {t("quickActions")}
      </h2>
      <div className="flex flex-wrap gap-2">
        {filtered.map((action) => (
          <Button
            key={action.labelKey}
            variant="outline"
            size="sm"
            asChild
          >
            <Link href={action.href}>
              {action.icon}
              <span className="ml-1.5">{t(action.labelKey)}</span>
            </Link>
          </Button>
        ))}
      </div>
    </div>
  )
}
