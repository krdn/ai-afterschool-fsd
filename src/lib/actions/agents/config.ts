'use server';

import { db } from '@/lib/db/client';
import { verifySession } from '@/lib/dal';
import { ok, fail, type ActionResult } from '@/lib/errors/action-result';
import { agentRegistry } from '@/features/agents/core/registry';
import { logger } from '@/lib/logger';
import type { AgentType, AgentConfig } from '@prisma/client';

export async function getAgentConfigs(): Promise<ActionResult<AgentConfig[]>> {
  try {
    const session = await verifySession();
    if (!['DIRECTOR', 'TEAM_LEADER'].includes(session.role)) {
      return fail('권한이 없습니다.');
    }
    const configs = await db.agentConfig.findMany({ orderBy: { type: 'asc' } });
    return ok(configs);
  } catch (error) {
    logger.error({ err: error }, 'Failed to get agent configs');
    return fail('에이전트 설정을 불러오는 데 실패했습니다.');
  }
}

export async function toggleAgent(agentType: AgentType, enabled: boolean): Promise<ActionResult<AgentConfig>> {
  try {
    const session = await verifySession();
    if (session.role !== 'DIRECTOR') {
      return fail('DIRECTOR 권한이 필요합니다.');
    }
    const config = await db.agentConfig.update({
      where: { type: agentType },
      data: { enabled },
    });
    await agentRegistry.reload();
    return ok(config);
  } catch (error) {
    logger.error({ err: error }, 'Failed to toggle agent');
    return fail('에이전트 상태 변경에 실패했습니다.');
  }
}

export async function updateAgentNodeConfig(
  agentType: AgentType,
  nodeId: string,
  nodeConfig: Record<string, unknown>
): Promise<ActionResult<AgentConfig>> {
  try {
    const session = await verifySession();
    if (!['DIRECTOR', 'TEAM_LEADER'].includes(session.role)) {
      return fail('권한이 없습니다.');
    }
    const config = await db.agentConfig.findUnique({ where: { type: agentType } });
    if (!config) return fail('에이전트를 찾을 수 없습니다.');

    const workflow = config.workflow as { nodes: { id: string; data: { config: Record<string, unknown> } }[]; edges: unknown[] };
    const node = workflow.nodes.find(n => n.id === nodeId);
    if (!node) return fail('노드를 찾을 수 없습니다.');

    node.data.config = { ...node.data.config, ...nodeConfig };

    const updated = await db.agentConfig.update({
      where: { type: agentType },
      data: { workflow: workflow as object },
    });

    if (updated.enabled) {
      await agentRegistry.reload();
    }

    return ok(updated);
  } catch (error) {
    logger.error({ err: error }, 'Failed to update node config');
    return fail('노드 설정 변경에 실패했습니다.');
  }
}
