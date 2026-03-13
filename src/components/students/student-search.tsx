"use client"

import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useRef, useCallback, useTransition } from "react"
import { useTranslations } from "next-intl"
import { Search, X, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export function StudentSearch({ defaultQuery }: { defaultQuery: string }) {
  const t = useTranslations("Student")
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null)

  const updateSearch = useCallback(
    (value: string) => {
      if (timerRef.current) clearTimeout(timerRef.current)

      timerRef.current = setTimeout(() => {
        const params = new URLSearchParams(searchParams.toString())

        if (value) {
          params.set("query", value)
        } else {
          params.delete("query")
        }
        // 검색 시 페이지를 1로 리셋
        params.delete("page")

        startTransition(() => {
          router.replace(`${pathname}?${params.toString()}`)
        })
      }, 300)
    },
    [router, pathname, searchParams]
  )

  const clearSearch = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete("query")
    params.delete("page")

    const input = document.querySelector<HTMLInputElement>(
      '[data-testid="student-search-input"]'
    )
    if (input) input.value = ""

    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`)
    })
  }, [router, pathname, searchParams])

  return (
    <div className="relative max-w-sm">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="text"
        defaultValue={defaultQuery}
        onChange={(e) => updateSearch(e.target.value)}
        placeholder={t("searchPlaceholder")}
        className="pl-9 pr-9"
        data-testid="student-search-input"
      />
      {isPending && (
        <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
      )}
      {!isPending && defaultQuery && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2"
          onClick={clearSearch}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  )
}
