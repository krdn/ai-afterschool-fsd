"use client"

import { useTranslations } from "next-intl"
import {
  Users,
  UserCheck,
  UserX,
  MessageSquare,
  AlertCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { DashboardStats } from "@/lib/actions/dashboard/stats"

type StatCardProps = {
  label: string
  value: number
  icon: React.ReactNode
  accent?: string
  description?: string
}

function StatCard({ label, value, icon, accent, description }: StatCardProps) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div className={cn("rounded-lg p-2", accent ?? "bg-muted")}>
          {icon}
        </div>
      </div>
      <div className="mt-2">
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        {description && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  )
}

export function DashboardStatCards({ stats }: { stats: DashboardStats }) {
  const t = useTranslations("Dashboard")

  const cards: StatCardProps[] = [
    {
      label: t("totalStudents"),
      value: stats.totalStudents,
      icon: <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />,
      accent: "bg-blue-100 dark:bg-blue-950",
    },
    {
      label: t("totalTeachers"),
      value: stats.totalTeachers,
      icon: <UserCheck className="h-4 w-4 text-green-600 dark:text-green-400" />,
      accent: "bg-green-100 dark:bg-green-950",
    },
    {
      label: t("unassignedStudents"),
      value: stats.unassignedStudents,
      icon: <UserX className="h-4 w-4 text-amber-600 dark:text-amber-400" />,
      accent: "bg-amber-100 dark:bg-amber-950",
      description: stats.unassignedStudents > 0 ? t("unassignedWarning") : undefined,
    },
    {
      label: t("weeklyCounseling"),
      value: stats.weeklyCounselingSessions,
      icon: <MessageSquare className="h-4 w-4 text-purple-600 dark:text-purple-400" />,
      accent: "bg-purple-100 dark:bg-purple-950",
    },
    {
      label: t("openIssues"),
      value: stats.recentIssuesCount,
      icon: <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />,
      accent: "bg-red-100 dark:bg-red-950",
      description: stats.recentIssuesCount > 0 ? t("issuesWarning") : undefined,
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {cards.map((card) => (
        <StatCard key={card.label} {...card} />
      ))}
    </div>
  )
}
