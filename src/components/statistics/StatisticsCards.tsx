"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, Users, AlertCircle, TrendingUp } from "lucide-react"

interface StatCardProps {
  title: string
  value: number | string
  icon: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger'
}

function StatCard({ title, value, icon, variant = 'default' }: StatCardProps) {
  const colorClass = {
    default: 'text-gray-900',
    success: 'text-green-600',
    warning: 'text-orange-600',
    danger: 'text-red-600'
  }[variant]

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-3xl font-bold ${colorClass}`}>
          {value}
        </div>
      </CardContent>
    </Card>
  )
}

interface StatisticsCardsProps {
  monthlySessionCount: number
  pendingReservationCount: number
  overdueFollowUpCount: number
  completionRate: number
  loading?: boolean
}

export function StatisticsCards({
  monthlySessionCount,
  pendingReservationCount,
  overdueFollowUpCount,
  completionRate,
  loading = false,
}: StatisticsCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-3">
              <div className="h-4 w-24 bg-gray-200 animate-pulse rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-9 w-16 bg-gray-200 animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="이번 달 상담"
        value={monthlySessionCount}
        icon={<Calendar className="w-4 h-4" />}
        variant="default"
      />
      <StatCard
        title="대기 예약"
        value={pendingReservationCount}
        icon={<Users className="w-4 h-4" />}
        variant="default"
      />
      <StatCard
        title="지연 후속조치"
        value={overdueFollowUpCount}
        icon={<AlertCircle className="w-4 h-4" />}
        variant="danger"
      />
      <StatCard
        title="완료율"
        value={`${completionRate}%`}
        icon={<TrendingUp className="w-4 h-4" />}
        variant="success"
      />
    </div>
  )
}
