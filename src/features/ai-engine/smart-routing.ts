/**
 * Smart Routing - 비용 기반 라우팅 및 예산 관리
 *
 * Ollama(무료)를 우선 사용하여 비용을 절감하고,
 * 예산 임계값 도달 시 알림을 발생시켜 비용 폭발을 방지합니다.
 */

import { db } from '@/lib/db/client';
import {
  COST_PER_MILLION_TOKENS,
  type ProviderName,
  type FeatureType,
} from './providers';
import { getCurrentPeriodCost } from './usage-tracker';

// 예산 기간 타입
export type BudgetPeriod = 'daily' | 'weekly' | 'monthly';

// 예산 알림 정보
export interface BudgetAlert {
  period: BudgetPeriod;
  threshold: number; // 80 or 100
  currentCost: number;
  budget: number;
  percentUsed: number;
}

// 라우팅 결과
export interface RoutingResult {
  orderedProviders: ProviderName[];
  reason: string;
  budgetWarning?: BudgetAlert;
}

/**
 * 비용 기반으로 제공자 순서를 최적화합니다.
 * Ollama(무료) > Google(저렴) > OpenAI(중간) > Anthropic(고가) 순서로 정렬
 *
 * @param enabledProviders 활성화된 제공자 목록
 * @param featureType 기능 유형 (비전 필요 시 필터링)
 * @returns 비용 순으로 정렬된 제공자 목록
 */
export function optimizeProviderOrder(
  enabledProviders: ProviderName[],
  featureType: FeatureType
): ProviderName[] {
  // 비전 기능은 비전 지원 제공자만 허용
  const VISION_FEATURES: FeatureType[] = ['face_analysis', 'palm_analysis'];
  const VISION_PROVIDERS: ProviderName[] = ['anthropic', 'openai', 'google', 'xai', 'zhipu'];

  let filteredProviders = enabledProviders;

  if (VISION_FEATURES.includes(featureType)) {
    filteredProviders = enabledProviders.filter((p) =>
      VISION_PROVIDERS.includes(p)
    );
  }

  // 비용 기준 정렬 (총 비용 = input + output)
  // 평균적으로 input:output = 1:2 비율 가정
  const getCostScore = (provider: ProviderName): number => {
    const costs = COST_PER_MILLION_TOKENS[provider];
    return costs.input + costs.output * 2; // output이 보통 더 많으므로 가중치 부여
  };

  return [...filteredProviders].sort((a, b) => getCostScore(a) - getCostScore(b));
}

/**
 * 예산 임계값을 체크하고 알림이 필요한지 확인합니다.
 *
 * @param period 예산 기간 (daily, weekly, monthly)
 * @returns 예산 알림 정보 (알림 필요 시) 또는 null
 */
export async function checkBudgetThreshold(
  period: BudgetPeriod
): Promise<BudgetAlert | null> {
  const budget = await db.lLMBudget.findUnique({
    where: { period },
  });

  if (!budget) {
    return null;
  }

  const currentCost = await getCurrentPeriodCost(period);
  const percentUsed = (currentCost / budget.budgetUsd) * 100;

  // 100% 임계값 체크
  if (percentUsed >= 100 && budget.alertAt100) {
    // 이미 100% 알림을 보냈는지 확인
    if (budget.lastAlertThreshold !== 100) {
      await updateAlertStatus(period, 100);
      return {
        period,
        threshold: 100,
        currentCost,
        budget: budget.budgetUsd,
        percentUsed,
      };
    }
  }

  // 80% 임계값 체크
  if (percentUsed >= 80 && percentUsed < 100 && budget.alertAt80) {
    // 이미 80% 알림을 보냈는지 확인
    if (budget.lastAlertThreshold !== 80 && budget.lastAlertThreshold !== 100) {
      await updateAlertStatus(period, 80);
      return {
        period,
        threshold: 80,
        currentCost,
        budget: budget.budgetUsd,
        percentUsed,
      };
    }
  }

  return null;
}

/**
 * 모든 예산 기간의 임계값을 체크합니다.
 *
 * @returns 알림이 필요한 예산 정보 배열
 */
export async function checkAllBudgetThresholds(): Promise<BudgetAlert[]> {
  const periods: BudgetPeriod[] = ['daily', 'weekly', 'monthly'];
  const alerts: BudgetAlert[] = [];

  for (const period of periods) {
    const alert = await checkBudgetThreshold(period);
    if (alert) {
      alerts.push(alert);
    }
  }

  return alerts;
}

/**
 * 알림 상태를 업데이트합니다.
 */
async function updateAlertStatus(period: BudgetPeriod, threshold: number) {
  await db.lLMBudget.update({
    where: { period },
    data: {
      lastAlertAt: new Date(),
      lastAlertThreshold: threshold,
    },
  });
}

/**
 * 예산 사용량 요약을 가져옵니다.
 */
export async function getBudgetSummary(): Promise<
  Array<{
    period: BudgetPeriod;
    budget: number;
    currentCost: number;
    percentUsed: number;
    remaining: number;
    isOverBudget: boolean;
    alertAt80: boolean;
    alertAt100: boolean;
  }>
> {
  const budgets = await db.lLMBudget.findMany();
  const periods: BudgetPeriod[] = ['daily', 'weekly', 'monthly'];

  const result = await Promise.all(
    periods.map(async (period) => {
      const budget = budgets.find((b) => b.period === period);
      const currentCost = await getCurrentPeriodCost(period);

      if (!budget) {
        return {
          period,
          budget: 0,
          currentCost,
          percentUsed: 0,
          remaining: 0,
          isOverBudget: false,
          alertAt80: true,
          alertAt100: true,
        };
      }

      const percentUsed = budget.budgetUsd > 0
        ? (currentCost / budget.budgetUsd) * 100
        : 0;

      return {
        period,
        budget: budget.budgetUsd,
        currentCost,
        percentUsed,
        remaining: Math.max(0, budget.budgetUsd - currentCost),
        isOverBudget: currentCost > budget.budgetUsd,
        alertAt80: budget.alertAt80,
        alertAt100: budget.alertAt100,
      };
    })
  );

  return result;
}

/**
 * 기간별 예산 알림 상태를 리셋합니다.
 * (새 기간이 시작될 때 호출)
 */
export async function resetBudgetAlertStatus(period: BudgetPeriod): Promise<void> {
  await db.lLMBudget.updateMany({
    where: { period },
    data: {
      lastAlertAt: null,
      lastAlertThreshold: null,
    },
  });
}

/**
 * 스마트 라우팅 결정을 수행합니다.
 * 비용 최적화와 예산 체크를 결합합니다.
 *
 * @param enabledProviders 활성화된 제공자 목록
 * @param featureType 기능 유형
 * @returns 라우팅 결과 (정렬된 제공자, 이유, 예산 경고)
 */
export async function getSmartRoutingDecision(
  enabledProviders: ProviderName[],
  featureType: FeatureType
): Promise<RoutingResult> {
  // 1. 비용 기반 제공자 순서 최적화
  const orderedProviders = optimizeProviderOrder(enabledProviders, featureType);

  // 2. 예산 체크 (가장 짧은 기간부터)
  const dailyAlert = await checkBudgetThreshold('daily');
  const weeklyAlert = await checkBudgetThreshold('weekly');
  const monthlyAlert = await checkBudgetThreshold('monthly');

  // 가장 긴급한 알림 선택 (짧은 기간 우선)
  const budgetWarning = dailyAlert || weeklyAlert || monthlyAlert || undefined;

  // 3. 라우팅 이유 생성
  let reason = '비용 기반 최적화: ';
  if (orderedProviders[0] === 'ollama') {
    reason += 'Ollama(무료) 우선 사용';
  } else if (orderedProviders[0] === 'google') {
    reason += 'Google(저비용) 우선 사용';
  } else {
    reason += `${orderedProviders[0]} 사용`;
  }

  if (budgetWarning) {
    reason += ` (${budgetWarning.period} 예산 ${budgetWarning.percentUsed.toFixed(1)}% 사용)`;
  }

  return {
    orderedProviders,
    reason,
    budgetWarning,
  };
}

/**
 * 예상 비용을 계산합니다.
 *
 * @param provider 제공자
 * @param estimatedInputTokens 예상 입력 토큰
 * @param estimatedOutputTokens 예상 출력 토큰
 * @returns 예상 비용 (USD)
 */
export function estimateCost(
  provider: ProviderName,
  estimatedInputTokens: number,
  estimatedOutputTokens: number
): number {
  const costs = COST_PER_MILLION_TOKENS[provider];
  const inputCost = (estimatedInputTokens / 1_000_000) * costs.input;
  const outputCost = (estimatedOutputTokens / 1_000_000) * costs.output;
  return Math.round((inputCost + outputCost) * 1000000) / 1000000;
}

/**
 * 예산 내에서 사용 가능한 제공자를 필터링합니다.
 * 예산 초과 시 무료 제공자만 반환합니다.
 *
 * @param enabledProviders 활성화된 제공자 목록
 * @returns 예산 내 사용 가능한 제공자
 */
export async function filterByBudget(
  enabledProviders: ProviderName[]
): Promise<ProviderName[]> {
  const summary = await getBudgetSummary();

  // 모든 기간이 예산 초과인지 확인
  const allOverBudget = summary.every(
    (s) => s.budget > 0 && s.isOverBudget
  );

  if (allOverBudget) {
    // 예산 초과 시 무료 제공자만 허용
    const freeProviders = enabledProviders.filter(
      (p) => COST_PER_MILLION_TOKENS[p].input === 0 && COST_PER_MILLION_TOKENS[p].output === 0
    );
    return freeProviders.length > 0 ? freeProviders : enabledProviders;
  }

  return enabledProviders;
}
