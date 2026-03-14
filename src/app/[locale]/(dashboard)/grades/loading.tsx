import { Card, CardContent, CardHeader } from "@/components/ui/card"

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className ?? ""}`} />
}

export default function GradesLoading() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-4 rounded" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-7 w-16" />
              <Skeleton className="h-3 w-24 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 검색 */}
      <Skeleton className="h-10 w-full" />

      {/* 테이블 */}
      <Card>
        <CardContent className="p-0">
          <div className="p-4 space-y-3">
            {/* 헤더 행 */}
            <div className="flex gap-4 pb-2 border-b">
              {["w-20", "w-24", "w-12", "w-12", "w-16", "w-12"].map((w, i) => (
                <Skeleton key={i} className={`h-4 ${w}`} />
              ))}
            </div>
            {/* 데이터 행 */}
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex gap-4 py-2">
                {["w-20", "w-24", "w-12", "w-12", "w-16", "w-12"].map((w, j) => (
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
