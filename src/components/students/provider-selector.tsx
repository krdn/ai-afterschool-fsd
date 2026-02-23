"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PROVIDER_CONFIGS, type ProviderName } from "@/features/ai-engine/types"

type Props = {
  selectedProvider: string
  onProviderChange: (value: string) => void
  availableProviders: ProviderName[]
  /** 사주/MBTI처럼 내장 알고리즘 옵션이 필요한 경우 */
  showBuiltIn?: boolean
  /** 관상/손금처럼 Vision 필수인 경우 */
  requiresVision?: boolean
  /** DB 기반 Vision 지원 제공자 목록 (requiresVision=true 시 사용) */
  visionProviders?: ProviderName[]
  disabled?: boolean
}

export function ProviderSelector({
  selectedProvider,
  onProviderChange,
  availableProviders,
  showBuiltIn = false,
  requiresVision = false,
  visionProviders,
  disabled = false,
}: Props) {
  const filteredProviders = requiresVision
    ? (visionProviders
      ? availableProviders.filter((p) => visionProviders.includes(p))
      : availableProviders.filter((p) => PROVIDER_CONFIGS[p]?.supportsVision))
    : availableProviders

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm text-gray-600 whitespace-nowrap">분석 엔진:</label>
      <Select value={selectedProvider} onValueChange={onProviderChange} disabled={disabled}>
        <SelectTrigger className="w-[200px] h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {showBuiltIn && (
            <SelectItem value="built-in">내장 알고리즘</SelectItem>
          )}
          <SelectItem value="auto">자동 (스마트 라우팅)</SelectItem>
          {filteredProviders.map((provider) => (
            <SelectItem key={provider} value={provider}>
              {PROVIDER_CONFIGS[provider].displayName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
