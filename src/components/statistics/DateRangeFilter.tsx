"use client"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DatePreset } from "@/types/statistics"
import { ExtendedDatePreset, PRESET_LABELS, DEFAULT_PRESETS } from "@/shared"

interface DateRangeFilterProps {
  value: string
  onChange: (preset: string) => void
  variant?: 'buttons' | 'dropdown'
  showCustom?: boolean
  presets?: string[]
  labels?: Record<string, string>
}

/**
 * 기간 필터 컴포넌트
 *
 * 두 가지 UI 스타일 제공:
 * - buttons: 프리셋 버튼 그룹 (기본값)
 * - dropdown: Select 드롭다운
 *
 * 커스텀 프리셋과 라벨을 지원합니다.
 */
export function DateRangeFilter({
  value,
  onChange,
  variant = 'buttons',
  showCustom = false,
  presets = DEFAULT_PRESETS,
  labels
}: DateRangeFilterProps) {
  // 커스텀 라벨 병합 (기본 라벨 우선, 커스텀 라벨로 덮어쓰기)
  const mergedLabels = { ...PRESET_LABELS, ...labels }

  if (variant === 'dropdown') {
    return (
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-[150px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {presets.map((preset) => (
            <SelectItem key={preset} value={preset}>
              {mergedLabels[preset as ExtendedDatePreset] || preset}
            </SelectItem>
          ))}
          {showCustom && <SelectItem value="custom">사용자 지정</SelectItem>}
        </SelectContent>
      </Select>
    )
  }

  // 버튼 그룹 스타일
  return (
    <div className="flex flex-wrap gap-2">
      {presets.map((preset) => (
        <Button
          key={preset}
          variant={value === preset ? 'default' : 'secondary'}
          size="sm"
          onClick={() => onChange(preset)}
          className="whitespace-nowrap"
          data-testid={`date-preset-${preset.toLowerCase()}`}
        >
          {mergedLabels[preset as ExtendedDatePreset] || preset}
        </Button>
      ))}
      {showCustom && (
        <Button
          variant={value === 'custom' ? 'default' : 'secondary'}
          size="sm"
          onClick={() => onChange('custom')}
        >
          사용자 지정
        </Button>
      )}
    </div>
  )
}

// 타입 재내보내기
export type { ExtendedDatePreset } from '@/shared'
