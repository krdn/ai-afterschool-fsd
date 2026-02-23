'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { IssueReportModal } from './issue-report-modal'
import { useState } from 'react'
import { Flag } from 'lucide-react'

const STATUS_OPTIONS = [
  { value: 'ALL', label: '전체 상태' },
  { value: 'OPEN', label: '열림' },
  { value: 'IN_PROGRESS', label: '진행 중' },
  { value: 'IN_REVIEW', label: '검토 중' },
  { value: 'CLOSED', label: '종료' },
]

const CATEGORY_OPTIONS = [
  { value: 'ALL', label: '전체 카테고리' },
  { value: 'BUG', label: '버그' },
  { value: 'FEATURE', label: '기능' },
  { value: 'IMPROVEMENT', label: '개선' },
  { value: 'UI_UX', label: 'UI/UX' },
  { value: 'DOCUMENTATION', label: '문서' },
  { value: 'PERFORMANCE', label: '성능' },
  { value: 'SECURITY', label: '보안' },
]

export function IssueFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isModalOpen, setIsModalOpen] = useState(false)

  const currentStatus = searchParams.get('status') || 'ALL'
  const currentCategory = searchParams.get('category') || 'ALL'

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'ALL') {
      params.delete(key)
    } else {
      params.set(key, value)
    }
    params.delete('page') // 필터 변경 시 첫 페이지로
    router.push(`/issues?${params.toString()}`)
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <Select value={currentStatus} onValueChange={(v) => updateFilter('status', v)}>
        <SelectTrigger className="w-[140px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={currentCategory} onValueChange={(v) => updateFilter('category', v)}>
        <SelectTrigger className="w-[160px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CATEGORY_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="ml-auto">
        <Button onClick={() => setIsModalOpen(true)} size="sm">
          <Flag className="h-4 w-4 mr-2" />
          이슈 보고
        </Button>
      </div>

      <IssueReportModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        userRole="DIRECTOR"
      />
    </div>
  )
}
