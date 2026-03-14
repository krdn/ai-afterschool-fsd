'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Search, X, Loader2 } from 'lucide-react'

interface CounselingSearchBarProps {
  initialQuery?: string
}

/**
 * 통합 검색 컴포넌트 (디바운스 실시간 검색)
 * - 학생 이름, 상담 내용 통합 검색
 * - 300ms 디바운스로 타이핑 시 자동 검색
 * - URL searchParams 기반 상태 관리
 */
export function CounselingSearchBar({
  initialQuery = '',
}: CounselingSearchBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [query, setQuery] = useState(initialQuery)

  useEffect(() => {
    setQuery(initialQuery)
  }, [initialQuery])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query === initialQuery) return
      startTransition(() => {
        const params = new URLSearchParams(searchParams.toString())
        if (query.trim()) {
          params.set('query', query.trim())
        } else {
          params.delete('query')
        }
        params.delete('page')
        router.replace(`${pathname}?${params.toString()}`)
      })
    }, 300)
    return () => clearTimeout(timer)
  }, [query, initialQuery, router, pathname, searchParams, startTransition])

  const handleClear = () => {
    setQuery('')
  }

  return (
    <div className="relative">
      <Search
        className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
        data-testid="search-icon"
      />
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="학생 이름, 상담 내용 검색..."
        className="pl-10 pr-10"
        data-testid="unified-search-input"
      />
      {isPending && (
        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
      )}
      {!isPending && query && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          data-testid="clear-search-button"
          aria-label="검색어 지우기"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
