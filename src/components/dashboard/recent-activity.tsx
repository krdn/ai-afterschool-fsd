import { formatDistanceToNow } from "date-fns"
import { ko } from "date-fns/locale"
import { MessageSquare, BookOpen } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { ActivityItem } from "@/lib/actions/dashboard/recent-activity"

type RecentActivityProps = {
  activities: ActivityItem[]
}

export function RecentActivity({ activities }: RecentActivityProps) {
  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">최근 활동</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-6">
            아직 기록된 활동이 없습니다
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold">최근 활동</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {activities.map((item) => (
          <div
            key={`${item.type}-${item.id}`}
            className="flex items-start gap-3 py-2 border-b last:border-b-0"
          >
            <div className="flex-shrink-0 mt-0.5">
              {item.type === "counseling" ? (
                <div className="rounded-full bg-blue-100 dark:bg-blue-950/40 p-1.5">
                  <MessageSquare className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                </div>
              ) : (
                <div className="rounded-full bg-green-100 dark:bg-green-950/40 p-1.5">
                  <BookOpen className="h-3 w-3 text-green-600 dark:text-green-400" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm">
                <span className="font-medium">{item.studentName}</span>
                <span className="text-muted-foreground"> · {item.description}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatDistanceToNow(new Date(item.date), {
                  addSuffix: true,
                  locale: ko,
                })}
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
