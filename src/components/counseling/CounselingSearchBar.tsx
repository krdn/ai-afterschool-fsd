'use client'

import { useState, FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, X } from 'lucide-react'

interface CounselingSearchBarProps {
  initialQuery?: string
}

/**
 * 통합 검색 컴포넌트
 * - 학생 이름, 학부모 이름, 상담 주제를 통합 검색
 * - 명시적 검색: Enter 키 또는 검색 버튼 클릭 시에만 검색 실행
 * - URL 상태 관리: searchParams로 검색어 유지
 */
export function CounselingSearchBar({
  initialQuery = '',
}: CounselingSearchBarProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(initialQuery)

  const handleSearch = (e: FormEvent) => {
    e.preventDefault()

    const params = new URLSearchParams(searchParams.toString())

    if (query.trim()) {
      params.set('query', query.trim())
    } else {
      params.delete('query')
    }

    // 다른 필터 유지하고 검색어만 업데이트
    router.push(`/counseling?${params.toString()}`)
  }

  const handleClear = () => {
    setQuery('')
    const params = new URLSearchParams(searchParams.toString())
    params.delete('query')
    router.push(`/counseling?${params.toString()}`)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSearch(e)
    }
  }

  return (
    <form onSubmit={handleSearch} className="flex gap-2">
      <div className="relative flex-1">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
          data-testid="search-icon"
        />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="학생 이름, 학부모 이름, 상담 주제 검색..."
          className="pl-10 pr-10"
          data-testid="unified-search-input"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            data-testid="clear-search-button"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <Button type="submit" data-testid="search-button">
        검색
      </Button>
    </form>
  )
}
