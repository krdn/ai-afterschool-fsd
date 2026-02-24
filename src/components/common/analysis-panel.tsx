"use client"

import { useState, type ReactNode } from "react"
import { AlertCircle, Sparkles, type LucideIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import type { ProviderName } from "@/features/ai-engine"
import { ProviderSelector } from "@/components/students/provider-selector"
import { PromptSelector } from "@/components/students/prompt-selector"
import type { GenericPromptMeta } from "@/components/students/prompt-selector"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"

// --- 에러 배너 ---
export function AnalysisErrorBanner({
  message,
  onDismiss,
  testId,
}: {
  message: string
  onDismiss: () => void
  testId?: string
}) {
  const t = useTranslations("Common")

  return (
    <div data-testid={testId} className="bg-red-50 border-l-4 border-red-400 p-4">
      <div className="flex">
        <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
        <div className="ml-3">
          <p className="text-sm text-red-800">{message}</p>
          <Button
            onClick={onDismiss}
            variant="outline"
            size="sm"
            className="mt-2"
          >
            {t("close")}
          </Button>
        </div>
      </div>
    </div>
  )
}

// --- AI 해석 설정 영역 ---
export type AIInterpretationControlsProps = {
  enabledProviders: ProviderName[]
  promptOptions: GenericPromptMeta[]
  isGenerating: boolean
  onGenerate: (provider: string, promptId: string) => Promise<void>
  providerSelectorProps?: {
    requiresVision?: boolean
    showBuiltIn?: boolean
  }
}

export function AIInterpretationControls({
  enabledProviders,
  promptOptions,
  isGenerating,
  onGenerate,
  providerSelectorProps,
}: AIInterpretationControlsProps) {
  const t = useTranslations("Common")
  const [selectedProvider, setSelectedProvider] = useState("auto")
  const [selectedPromptId, setSelectedPromptId] = useState("default")

  return (
    <div className="rounded-md border border-gray-200 p-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">
        <ProviderSelector
          selectedProvider={selectedProvider}
          onProviderChange={setSelectedProvider}
          availableProviders={enabledProviders}
          disabled={isGenerating}
          {...providerSelectorProps}
        />
        {promptOptions.length > 0 && (
          <PromptSelector
            selectedPromptId={selectedPromptId}
            onPromptChange={setSelectedPromptId}
            promptOptions={promptOptions}
            disabled={isGenerating}
          />
        )}
        <Button
          onClick={() => onGenerate(selectedProvider, selectedPromptId)}
          disabled={isGenerating}
          className="w-full sm:w-auto"
        >
          <Sparkles className="w-4 h-4 mr-1" />
          {isGenerating ? t("aiInterpreting") : t("aiInterpret")}
        </Button>
      </div>
    </div>
  )
}

// --- 빈 상태 ---
export function AnalysisEmptyState({
  icon: Icon,
  message,
  actionLabel,
  onAction,
  isLoading,
  children,
}: {
  icon: LucideIcon
  message: string
  actionLabel?: string
  onAction?: () => void
  isLoading?: boolean
  children?: ReactNode
}) {
  const t = useTranslations("Common")

  return (
    <div className="text-center py-8">
      <Icon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
      <p className="text-gray-500 mb-4">{message}</p>
      {children}
      {actionLabel && onAction && (
        <Button onClick={onAction} disabled={isLoading}>
          {isLoading ? t("analyzing") : actionLabel}
        </Button>
      )}
    </div>
  )
}

// --- 로딩 상태 ---
export function AnalysisLoadingState({
  message,
  subMessage,
  color = "blue",
}: {
  message?: string
  subMessage?: string
  color?: string
}) {
  const t = useTranslations("Common")
  const displayMessage = message ?? t("aiAnalyzing")
  const displaySubMessage = subMessage ?? t("aiAnalyzingSubMessage")

  return (
    <div className="text-center py-8">
      <div
        className={`animate-spin w-12 h-12 border-4 border-${color}-600 border-t-transparent rounded-full mx-auto mb-4`}
      />
      <p className="text-gray-600">{displayMessage}</p>
      <p className="text-sm text-gray-500 mt-2">{displaySubMessage}</p>
    </div>
  )
}

// --- 패널 헤더 (Card 기반) ---
export function AnalysisPanelHeader({
  icon: Icon,
  iconBgColor,
  iconColor,
  title,
  headerRight,
}: {
  icon: LucideIcon
  iconBgColor: string
  iconColor: string
  title: string
  headerRight?: ReactNode
}) {
  return (
    <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className={`p-2 ${iconBgColor} rounded-lg`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <CardTitle>{title}</CardTitle>
      </div>
      {headerRight}
    </CardHeader>
  )
}

// --- 패널 래퍼 (Card 기반) ---
export function AnalysisPanelCard({
  children,
  testId,
}: {
  children: ReactNode
  testId?: string
}) {
  return (
    <Card data-testid={testId}>
      {children}
    </Card>
  )
}

// --- 해석 결과 없음 ---
export function AnalysisNoResult({ label }: { label?: string }) {
  const t = useTranslations("Common")
  const displayLabel = label ?? "해석"

  return (
    <div className="rounded-md bg-gray-50 p-4 text-sm text-gray-500">
      {t("noInterpretation", { label: displayLabel })}
    </div>
  )
}
