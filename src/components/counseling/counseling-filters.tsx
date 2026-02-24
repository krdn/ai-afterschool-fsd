'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { CounselingType } from '@/lib/db'

interface CounselingFiltersProps {
  canViewTeam: boolean
  teachers?: Array<{ id: string; name: string }>
}

interface Filters {
  type?: string
  startDate?: string
  endDate?: string
  teacherId?: string
  followUpRequired?: string
}

/**
 * 다중 필터 컴포넌트
 * - 상담 유형, 날짜 범위, 선생님, 후속 조치 필터 제공
 * - URL 상태 관리: 각 필터 변경 시 URLSearchParams로 URL 업데이트
 * - 필터 초기화 버튼: 모든 필터 제거
 */
export function CounselingFilters({
  canViewTeam,
  teachers = [],
}: CounselingFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())

    if (value && value !== 'all') {
      params.set(key, value)
    } else {
      params.delete(key)
    }

    router.push(`/counseling?${params.toString()}`)
  }

  const handleReset = () => {
    router.push('/counseling')
  }

  // 초기값 추출
  const initialFilters: Filters = {
    type: searchParams.get('type') || 'all',
    startDate: searchParams.get('startDate') || '',
    endDate: searchParams.get('endDate') || '',
    teacherId: searchParams.get('teacherId') || 'all',
    followUpRequired: searchParams.get('followUpRequired') || 'all',
  }

  return (
    <div className="space-y-4">
      {/* 상담 유형 필터 */}
      <div className="space-y-2">
        <Label htmlFor="type">상담 유형</Label>
        <Select
          value={initialFilters.type}
          onValueChange={(value) => updateFilter('type', value)}
        >
          <SelectTrigger id="type" data-testid="filter-type">
            <SelectValue placeholder="전체" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="ACADEMIC">학업</SelectItem>
            <SelectItem value="CAREER">진로</SelectItem>
            <SelectItem value="PSYCHOLOGICAL">심리</SelectItem>
            <SelectItem value="BEHAVIORAL">행동</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 시작일 필터 */}
      <div className="space-y-2">
        <Label htmlFor="startDate">시작일</Label>
        <Input
          id="startDate"
          type="date"
          value={initialFilters.startDate}
          onChange={(e) => updateFilter('startDate', e.target.value)}
          data-testid="filter-start-date"
        />
      </div>

      {/* 종료일 필터 */}
      <div className="space-y-2">
        <Label htmlFor="endDate">종료일</Label>
        <Input
          id="endDate"
          type="date"
          value={initialFilters.endDate}
          onChange={(e) => updateFilter('endDate', e.target.value)}
          data-testid="filter-end-date"
        />
      </div>

      {/* 선생님 필터 (권한에 따라 표시) */}
      {canViewTeam && teachers.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="teacherId">선생님</Label>
          <Select
            value={initialFilters.teacherId}
            onValueChange={(value) => updateFilter('teacherId', value)}
          >
            <SelectTrigger id="teacherId" data-testid="filter-teacher">
              <SelectValue placeholder="전체" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              {teachers.map((teacher) => (
                <SelectItem key={teacher.id} value={teacher.id}>
                  {teacher.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* 후속 조치 필터 */}
      <div className="space-y-2">
        <Label htmlFor="followUpRequired">후속 조치</Label>
        <Select
          value={initialFilters.followUpRequired}
          onValueChange={(value) => updateFilter('followUpRequired', value)}
        >
          <SelectTrigger id="followUpRequired" data-testid="filter-followup">
            <SelectValue placeholder="전체" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="true">필요함</SelectItem>
            <SelectItem value="false">필요하지 않음</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 필터 초기화 버튼 */}
      <div className="pt-2">
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleReset}
          data-testid="reset-filters-button"
        >
          필터 초기화
        </Button>
      </div>
    </div>
  )
}
