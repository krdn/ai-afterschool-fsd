'use server';

import { verifySession } from '@/lib/dal';
import { getBudgetSummary } from '@/features/ai-engine';
import type { ProviderName } from '@/features/ai-engine';
import { ok, type ActionResult } from "@/lib/errors/action-result";

async function requireDirector() {
  const session = await verifySession();
  if (!session || session.role !== 'DIRECTOR') {
    throw new Error('Unauthorized: DIRECTOR role required');
  }
  return session;
}

export async function getBudgetSummaryAction(): Promise<unknown> {
  await requireDirector();
  return getBudgetSummary();
}

export async function setDefaultProviderAction(provider: ProviderName): Promise<ActionResult<{ provider: ProviderName }>> {
  await requireDirector();

  const { db: _db } = await import('@/lib/db/client');
  // ... 생략 (이후 admin/providers로 대체 예정)
  return ok({ provider });
}
