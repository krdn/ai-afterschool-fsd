"use client"

import { useTranslations } from "next-intl"
import { Sparkles, BookOpen, Users, TrendingUp } from "lucide-react"

type ChatEmptyStateProps = {
  onSuggestionClick: (text: string) => void
}

const suggestions = [
  {
    icon: BookOpen,
    titleKey: "suggestion1Title" as const,
    promptKey: "suggestion1Prompt" as const,
  },
  {
    icon: Users,
    titleKey: "suggestion2Title" as const,
    promptKey: "suggestion2Prompt" as const,
  },
  {
    icon: TrendingUp,
    titleKey: "suggestion3Title" as const,
    promptKey: "suggestion3Prompt" as const,
  },
]

export function ChatEmptyState({ onSuggestionClick }: ChatEmptyStateProps) {
  const t = useTranslations("LLMChat")

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900/40 mb-4">
          <Sparkles className="h-8 w-8 text-purple-600" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">
          {t("emptyTitle")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("emptyDescription")}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl w-full">
        {suggestions.map((s) => {
          const Icon = s.icon
          return (
            <button
              key={s.titleKey}
              onClick={() => onSuggestionClick(t(s.promptKey))}
              className="flex flex-col items-start gap-2 p-4 rounded-lg border border hover:border-purple-300 hover:bg-purple-50 dark:bg-purple-950/30/50 transition-colors text-left"
            >
              <Icon className="h-5 w-5 text-purple-500" />
              <span className="text-sm font-medium text-foreground">
                {t(s.titleKey)}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
