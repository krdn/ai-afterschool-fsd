"use client"

import { useEffect } from "react"
import { AlertTriangle, RotateCcw, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Link } from "@/i18n/navigation"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[Dashboard Error]", error)
  }, [error])

  return (
    <div className="flex min-h-[400px] items-center justify-center px-4">
      <Card className="mx-auto max-w-md w-full">
        <CardHeader>
          <div className="flex justify-center">
            <div className="rounded-full bg-red-100 p-3 dark:bg-red-900/30">
              <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <CardTitle className="mt-4 text-center">문제가 발생했어요</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-2">
          <p className="text-muted-foreground">
            페이지를 불러오는 중 오류가 발생했습니다.
          </p>
          {error.digest && (
            <p className="text-xs text-muted-foreground font-mono">
              오류 코드: {error.digest}
            </p>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button onClick={reset} className="w-full gap-2">
            <RotateCcw className="h-4 w-4" />
            다시 시도
          </Button>
          <Button variant="outline" asChild className="w-full gap-2">
            <Link href="/dashboard">
              <Home className="h-4 w-4" />
              대시보드로 이동
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
