"use client"

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export type LlmProviderOption = {
  id: string
  name: string
  providerType: string
  defaultModel: string
}

// rule-based 또는 llm:<providerId> 형식
export type MatchingModel = string

interface MatchingModelSelectorProps {
  value: MatchingModel
  onChange: (model: MatchingModel) => void
  disabled?: boolean
  llmProviders?: LlmProviderOption[]
}

export function MatchingModelSelector({
  value,
  onChange,
  disabled = false,
  llmProviders = [],
}: MatchingModelSelectorProps) {
  return (
    <Select
      value={value}
      onValueChange={onChange}
      disabled={disabled}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="계산 모델 선택" />
      </SelectTrigger>
      <SelectContent position="popper" sideOffset={4}>
        <SelectGroup>
          <SelectLabel>규칙 기반</SelectLabel>
          <SelectItem value="rule-based">
            기본 점수 모델 (MBTI·사주·성명·학습스타일)
          </SelectItem>
        </SelectGroup>
        {llmProviders.length > 0 && (
          <SelectGroup>
            <SelectLabel>LLM 기반 분석</SelectLabel>
            {llmProviders.map((provider) => (
              <SelectItem key={provider.id} value={`llm:${provider.id}`}>
                {provider.name} ({provider.defaultModel})
              </SelectItem>
            ))}
          </SelectGroup>
        )}
        {llmProviders.length === 0 && (
          <SelectGroup>
            <SelectLabel>LLM 기반 분석</SelectLabel>
            <SelectItem value="llm-based" disabled>
              활성화된 LLM 제공자 없음
            </SelectItem>
          </SelectGroup>
        )}
      </SelectContent>
    </Select>
  )
}
