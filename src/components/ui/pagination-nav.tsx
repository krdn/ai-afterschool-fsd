"use client"

import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

type PaginationNavProps = {
  page: number
  totalPages: number
  total: number
  pageSize: number
  /** 커스텀 info 텍스트. 미지정 시 Common.paginationInfo 사용 */
  infoText?: string
}

export function PaginationNav({
  page,
  totalPages,
  total,
  pageSize,
  infoText,
}: PaginationNavProps) {
  const t = useTranslations("Common")
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

  const displayText =
    infoText ?? t("paginationInfo", { start, end, total })

  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground">{displayText}</p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => goToPage(page - 1)}
          disabled={page <= 1}
          aria-label={t("paginationPrev")}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
          .reduce<(number | "...")[]>((acc, p, i, arr) => {
            if (i > 0 && p - (arr[i - 1] ?? 0) > 1) acc.push("...")
            acc.push(p)
            return acc
          }, [])
          .map((item, i) =>
            item === "..." ? (
              <span
                key={`dots-${i}`}
                className="px-1 text-muted-foreground text-sm"
              >
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
          aria-label={t("paginationNext")}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
