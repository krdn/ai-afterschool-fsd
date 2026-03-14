import { Card, CardContent } from "@/components/ui/card"

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className ?? ""}`} />
}

export default function IssuesLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-4 w-32" />
      </div>

      {/* 필터 */}
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-20 rounded-md" />
        ))}
      </div>

      {/* 테이블 */}
      <Card>
        <CardContent className="p-0">
          <div className="p-4 space-y-3">
            <div className="flex gap-4 pb-2 border-b">
              {["w-16", "w-48", "w-20", "w-16", "w-16", "w-16", "w-20"].map((w, i) => (
                <Skeleton key={i} className={`h-4 ${w}`} />
              ))}
            </div>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex gap-4 py-2">
                {["w-16", "w-48", "w-20", "w-16", "w-16", "w-16", "w-20"].map((w, j) => (
                  <Skeleton key={j} className={`h-4 ${w}`} />
                ))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
