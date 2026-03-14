'use server';

import { db } from '@/lib/db/client';
import { verifySession } from '@/lib/dal';
import { ok, fail, type ActionResult } from '@/lib/errors/action-result';
import { agentRegistry } from '@/features/agents/core/registry';
import { logger } from '@/lib/logger';
import type { AgentType } from '@prisma/client';
import type { WorkflowDefinition, AgentEvent } from '@/features/agents/core/types';

export async function manualTriggerAgent(
  agentType: AgentType,
  eventData: Record<string, unknown>
): Promise<ActionResult<{ executionId: string }>> {
  try {
    const session = await verifySession();
    if (session.role !== 'DIRECTOR') {
      return fail('DIRECTOR 권한이 필요합니다.');
    }
    const config = await db.agentConfig.findUnique({ where: { type: agentType } });
    if (!config) return fail('에이전트를 찾을 수 없습니다.');

    const agent = agentRegistry.getAgent(agentType);
    if (!agent) return fail('에이전트가 등록되지 않았습니다.');

    const triggerEvent = agent.subscribedEvents[0];
    const result = await agent.execute(
      { type: triggerEvent, data: eventData } as AgentEvent,
      config.workflow as WorkflowDefinition
    );

    return ok({ executionId: result.executionId });
  } catch (error) {
    logger.error({ err: error }, 'Failed to manually trigger agent');
    return fail('수동 실행에 실패했습니다.');
  }
}
