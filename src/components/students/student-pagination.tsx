"use client"

import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

type StudentPaginationProps = {
  page: number
  totalPages: number
  total: number
  pageSize: number
}

export function StudentPagination({
  page,
  totalPages,
  total,
  pageSize,
}: StudentPaginationProps) {
  const t = useTranslations("Student")
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const goToPage = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString())
    if (newPage <= 1) {
      params.delete("page")
    } else {
      params.set("page", String(newPage))
    }
    router.replace(`${pathname}?${params.toString()}`)
  }

  if (totalPages <= 1) return null

  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)

  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground">
        {t("paginationInfo", { start, end, total })}
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => goToPage(page - 1)}
          disabled={page <= 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* 페이지 번호 */}
        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter((p) => {
            // 현재 페이지 전후 2페이지 + 처음/끝
            return p === 1 || p === totalPages || Math.abs(p - page) <= 1
          })
          .reduce<(number | "...")[]>((acc, p, i, arr) => {
            if (i > 0 && p - (arr[i - 1] ?? 0) > 1) acc.push("...")
            acc.push(p)
            return acc
          }, [])
          .map((item, i) =>
            item === "..." ? (
              <span key={`dots-${i}`} className="px-1 text-muted-foreground text-sm">
                ...
              </span>
            ) : (
              <Button
                key={item}
                variant={item === page ? "default" : "outline"}
                size="icon"
                className="h-8 w-8 text-xs"
                onClick={() => goToPage(item)}
              >
                {item}
              </Button>
            )
          )}

        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => goToPage(page + 1)}
          disabled={page >= totalPages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
