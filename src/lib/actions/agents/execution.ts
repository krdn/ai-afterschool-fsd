'use server';

import { db } from '@/lib/db/client';
import { verifySession } from '@/lib/dal';
import { ok, fail, type ActionResult } from '@/lib/errors/action-result';
import { logger } from '@/lib/logger';
import type { AgentType, AgentExecution, AgentNodeLog } from '@prisma/client';

type ExecutionWithLogs = AgentExecution & { nodeLogs: AgentNodeLog[] };

export async function getAgentExecutions(
  agentType: AgentType,
  limit = 10
): Promise<ActionResult<ExecutionWithLogs[]>> {
  try {
    const session = await verifySession();
    if (!['DIRECTOR', 'TEAM_LEADER'].includes(session.role)) {
      return fail('권한이 없습니다.');
    }
    const executions = await db.agentExecution.findMany({
      where: { agentType },
      include: { nodeLogs: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return ok(executions);
  } catch (error) {
    logger.error({ err: error }, 'Failed to get agent executions');
    return fail('실행 이력을 불러오는 데 실패했습니다.');
  }
}

export async function getRecentExecutions(limit = 20): Promise<ActionResult<AgentExecution[]>> {
  try {
    const session = await verifySession();
    if (!['DIRECTOR', 'TEAM_LEADER'].includes(session.role)) {
      return fail('권한이 없습니다.');
    }
    const executions = await db.agentExecution.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return ok(executions);
  } catch (error) {
    logger.error({ err: error }, 'Failed to get recent executions');
    return fail('최근 실행 이력을 불러오는 데 실패했습니다.');
  }
}

export async function getAgentStats(agentType: AgentType): Promise<ActionResult<{ total: number; completed: number; failed: number }>> {
  try {
    const session = await verifySession();
    if (!['DIRECTOR', 'TEAM_LEADER'].includes(session.role)) {
      return fail('권한이 없습니다.');
    }
    const [total, completed, failed] = await Promise.all([
      db.agentExecution.count({ where: { agentType } }),
      db.agentExecution.count({ where: { agentType, status: 'COMPLETED' } }),
      db.agentExecution.count({ where: { agentType, status: 'FAILED' } }),
    ]);
    return ok({ total, completed, failed });
  } catch (error) {
    logger.error({ err: error }, 'Failed to get agent stats');
    return fail('통계를 불러오는 데 실패했습니다.');
  }
}
