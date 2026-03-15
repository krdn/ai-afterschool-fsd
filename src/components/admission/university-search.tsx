'use client'

import { useCallback, useRef, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Search, Loader2, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export function UniversitySearch({ defaultQuery }: { defaultQuery: string }) {
  const t = useTranslations('Admission')
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null)

  const updateSearch = useCallback(
    (value: string) => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        startTransition(() => {
          const params = new URLSearchParams(searchParams.toString())
          if (value) {
            params.set('query', value)
            params.delete('page')
          } else {
            params.delete('query')
          }
          router.replace(`${pathname}?${params.toString()}`)
        })
      }, 300)
    },
    [pathname, router, searchParams, startTransition],
  )

  const clearSearch = useCallback(() => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString())
      params.delete('query')
      router.replace(`${pathname}?${params.toString()}`)
    })
  }, [pathname, router, searchParams, startTransition])

  return (
    <div className="relative max-w-sm">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="text"
        defaultValue={defaultQuery}
        onChange={(e) => updateSearch(e.target.value)}
        placeholder={t('searchPlaceholder')}
        className="pl-9 pr-9"
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
