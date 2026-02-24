'use server';

import { verifySession } from '@/lib/dal';
import { checkAllBudgetThresholds, getBudgetSummary, type BudgetAlert } from '@/features/ai-engine';
import { ok, fail, type ActionResult } from '@/lib/errors/action-result';

// =============================================================================
// Types
// =============================================================================

export interface Notification {
  id: string;
  type: 'budget_alert' | 'system' | 'info';
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
  read: boolean;
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

export interface BudgetNotification extends Notification {
  type: 'budget_alert';
  metadata: {
    period: string;
    threshold: number;
    currentCost: number;
    budget: number;
    percentUsed: number;
  };
}

// =============================================================================
// Auth helpers
// =============================================================================

async function requireDirector() {
  const session = await verifySession();
  if (!session || session.role !== 'DIRECTOR') {
    throw new Error('Unauthorized: DIRECTOR role required');
  }
  return session;
}

// =============================================================================
// Budget Alert Notifications
// =============================================================================

/**
 * 예산 알림 생성 및 조회
 * - 80% 또는 100% 임계값 도달 시 알림 생성
 */
export async function getBudgetAlerts(): Promise<ActionResult<BudgetNotification[]>> {
  try {
    await requireDirector();

    const alerts = await checkAllBudgetThresholds();
    const summary = await getBudgetSummary();

    const notifications: BudgetNotification[] = [];

    // 임계값 알림 변환
    for (const alert of alerts) {
      notifications.push({
        id: `budget-${alert.period}-${alert.threshold}`,
        type: 'budget_alert',
        title: getBudgetAlertTitle(alert),
        message: getBudgetAlertMessage(alert),
        severity: alert.threshold >= 100 ? 'error' : 'warning',
        read: false,
        createdAt: new Date(),
        metadata: {
          period: alert.period,
          threshold: alert.threshold,
          currentCost: alert.currentCost,
          budget: alert.budget,
          percentUsed: alert.percentUsed,
        },
      });
    }

    // 예산 초과 상태 확인 (임계값 알림 없어도 초과 상태일 수 있음)
    for (const budget of summary) {
      if (budget.isOverBudget && !alerts.some(a => a.period === budget.period)) {
        notifications.push({
          id: `budget-over-${budget.period}`,
          type: 'budget_alert',
          title: `${getPeriodLabel(budget.period)} 예산 초과`,
          message: `현재 $${budget.currentCost.toFixed(2)} 사용 중 (예산: $${budget.budget.toFixed(2)})`,
          severity: 'error',
          read: false,
          createdAt: new Date(),
          metadata: {
            period: budget.period,
            threshold: 100,
            currentCost: budget.currentCost,
            budget: budget.budget,
            percentUsed: budget.percentUsed,
          },
        });
      }
    }

    return ok(notifications);
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * 모든 알림 조회 (예산 알림 + 시스템 알림)
 */
export async function getAllNotifications(): Promise<ActionResult<Notification[]>> {
  try {
    await requireDirector();

    const notifications: Notification[] = [];

    // 예산 알림 추가
    const budgetResult = await getBudgetAlerts();
    if (budgetResult.success) {
      notifications.push(...budgetResult.data);
    }

    // 정렬: 최신 순, 심각도 순
    notifications.sort((a, b) => {
      // 먼저 심각도로 정렬
      const severityOrder = { error: 0, warning: 1, info: 2 };
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;

      // 같은 심각도면 최신 순
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    return ok(notifications);
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * 읽지 않은 알림 수 조회
 */
export async function getUnreadNotificationCount(): Promise<ActionResult<number>> {
  try {
    await requireDirector();

    const result = await getAllNotifications();
    if (!result.success) {
      return result;
    }

    const unreadCount = result.data.filter(n => !n.read).length;
    return ok(unreadCount);
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * 예산 상태 요약 조회
 */
export async function getBudgetStatusSummary(): Promise<ActionResult<{
  period: string;
  budget: number;
  currentCost: number;
  percentUsed: number;
  isOverBudget: boolean;
  remaining: number;
}[]>> {
  try {
    await requireDirector();

    const summary = await getBudgetSummary();
    return ok(summary);
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Unknown error');
  }
}

// =============================================================================
// Helper functions
// =============================================================================

function getPeriodLabel(period: string): string {
  switch (period) {
    case 'daily':
      return '일별';
    case 'weekly':
      return '주별';
    case 'monthly':
      return '월별';
    default:
      return period;
  }
}

function getBudgetAlertTitle(alert: BudgetAlert): string {
  const periodLabel = getPeriodLabel(alert.period);
  if (alert.threshold >= 100) {
    return `${periodLabel} 예산 100% 도달`;
  }
  return `${periodLabel} 예산 ${alert.threshold}% 도달`;
}

function getBudgetAlertMessage(alert: BudgetAlert): string {
  const periodLabel = getPeriodLabel(alert.period);
  const currentFormatted = alert.currentCost.toFixed(2);
  const budgetFormatted = alert.budget.toFixed(2);
  const percentFormatted = alert.percentUsed.toFixed(1);

  if (alert.threshold >= 100) {
    return `${periodLabel} 예산을 초과했습니다. 현재 $${currentFormatted} / $${budgetFormatted} (${percentFormatted}%)`;
  }
  return `${periodLabel} 예산의 ${alert.threshold}%에 도달했습니다. 현재 $${currentFormatted} / $${budgetFormatted}`;
}
