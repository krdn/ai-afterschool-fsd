import {
  COST_PER_MILLION_TOKENS,
  type ProviderName,
  type FeatureType,
} from "../types"

export type BudgetPeriod = "daily" | "weekly" | "monthly"

export interface BudgetAlert {
  period: BudgetPeriod
  threshold: number
  currentCost: number
  budget: number
  percentUsed: number
}

export interface RoutingResult {
  orderedProviders: ProviderName[]
  reason: string
  budgetWarning?: BudgetAlert
}

export function optimizeProviderOrder(
  enabledProviders: ProviderName[],
  featureType: FeatureType
): ProviderName[] {
  const VISION_FEATURES: FeatureType[] = ["face_analysis", "palm_analysis"]
  const VISION_PROVIDERS: ProviderName[] = [
    "anthropic",
    "openai",
    "google",
    "xai",
    "zhipu",
  ]

  let filteredProviders = enabledProviders

  if (VISION_FEATURES.includes(featureType)) {
    filteredProviders = enabledProviders.filter((p) =>
      VISION_PROVIDERS.includes(p)
    )
  }

  const getCostScore = (provider: ProviderName): number => {
    const costs = COST_PER_MILLION_TOKENS[provider]
    return costs.input + costs.output * 2
  }

  return [...filteredProviders].sort(
    (a, b) => getCostScore(a) - getCostScore(b)
  )
}

export function estimateCost(
  provider: ProviderName,
  estimatedInputTokens: number,
  estimatedOutputTokens: number
): number {
  const costs = COST_PER_MILLION_TOKENS[provider]
  const inputCost = (estimatedInputTokens / 1_000_000) * costs.input
  const outputCost = (estimatedOutputTokens / 1_000_000) * costs.output
  return Math.round((inputCost + outputCost) * 1000000) / 1000000
}
