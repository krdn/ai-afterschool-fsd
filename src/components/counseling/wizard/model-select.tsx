'use client'

import { useState, useEffect } from 'react'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getEnabledProvidersForChat, type ChatProvider } from '@/lib/actions/chat/get-providers'

export interface ModelOverride {
  providerId: string
  modelId: string
}

interface ModelSelectProps {
  /** localStorage 키 구분용 featureType */
  featureType: string
  /** 선택된 모델이 변경될 때 호출 */
  onModelChange: (model: ModelOverride | undefined) => void
  /** 비활성화 여부 */
  disabled?: boolean
}

const STORAGE_KEY_PREFIX = 'preferred-model-'

function getInitialModelValue(
  providers: ChatProvider[],
  featureType: string
): string | undefined {
  const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${featureType}`)
  if (!stored) return undefined

  const [providerId, modelId] = stored.split(':')
  const isValid = providers.some(
    (p) => p.id === providerId && p.models.some((m) => m.id === modelId)
  )

  if (!isValid) {
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${featureType}`)
    return undefined
  }

  return stored
}

export function ModelSelect({ featureType, onModelChange, disabled }: ModelSelectProps) {
  const [providers, setProviders] = useState<ChatProvider[]>([])
  const [selectedValue, setSelectedValue] = useState<string>('auto')
  const [isLoading, setIsLoading] = useState(true)

  // 활성 Provider/Model 목록 로드
  useEffect(() => {
    const load = async () => {
      try {
        const data = await getEnabledProvidersForChat()
        setProviders(data)

        const initial = getInitialModelValue(data, featureType)
        if (initial) {
          setSelectedValue(initial)
          const [providerId, modelId] = initial.split(':')
          onModelChange({ providerId, modelId })
        }
      } catch {
        // 로드 실패 시 자동 선택 모드 유지
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [featureType]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleValueChange = (value: string) => {
    setSelectedValue(value)

    if (value === 'auto') {
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}${featureType}`)
      onModelChange(undefined)
    } else {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${featureType}`, value)
      const [providerId, modelId] = value.split(':')
      onModelChange({ providerId, modelId })
    }
  }

  if (isLoading) {
    return (
      <Select disabled>
        <SelectTrigger size="sm" className="w-[180px]">
          <SelectValue placeholder="모델 로딩..." />
        </SelectTrigger>
      </Select>
    )
  }

  return (
    <Select
      value={selectedValue}
      onValueChange={handleValueChange}
      disabled={disabled}
    >
      <SelectTrigger size="sm" className="w-[200px]">
        <SelectValue placeholder="모델 선택" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="auto">자동 선택</SelectItem>
        {providers.map((provider) => (
          <SelectGroup key={provider.id}>
            <SelectLabel>{provider.name}</SelectLabel>
            {provider.models.map((model) => (
              <SelectItem
                key={model.id}
                value={`${provider.id}:${model.id}`}
              >
                {model.displayName}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  )
}
