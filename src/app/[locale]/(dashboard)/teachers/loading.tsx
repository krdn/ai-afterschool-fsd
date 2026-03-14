import { Card, CardContent, CardHeader } from "@/components/ui/card"

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className ?? ""}`} />
}

export default function TeachersLoading() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-10 w-28" />
      </div>

      {/* 테이블 */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-24" />
        </CardHeader>
        <CardContent className="space-y-3">
          {/* 헤더 행 */}
          <div className="flex gap-4 pb-2 border-b">
            {["w-24", "w-32", "w-16", "w-20", "w-16"].map((w, i) => (
              <Skeleton key={i} className={`h-4 ${w}`} />
            ))}
          </div>
          {/* 데이터 행 */}
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex gap-4 py-3">
              {["w-24", "w-32", "w-16", "w-20", "w-16"].map((w, j) => (
                <Skeleton key={j} className={`h-4 ${w}`} />
              ))}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
