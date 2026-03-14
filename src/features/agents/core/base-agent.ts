import type { AgentType } from '@prisma/client';
import { db } from '@/lib/db/client';
import { logger } from '@/lib/logger';
import { topologicalSort, getSkippedNodeIds } from './workflow-engine';
import type {
  WorkflowDefinition,
  WorkflowNode,
  ExecutionContext,
  ExecutionResult,
  NodeHandler,
  AgentEvent,
} from './types';
import type { AgentEventName } from '@/lib/events/types';

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export abstract class BaseAgent {
  abstract type: AgentType;
  abstract subscribedEvents: AgentEventName[];
  abstract nodeHandlers: Record<string, NodeHandler>;

  async execute(event: AgentEvent, workflow: WorkflowDefinition): Promise<ExecutionResult> {
    const startTime = Date.now();

    const existing = await db.agentExecution.findFirst({
      where: {
        agentType: this.type,
        triggerEvent: event.type,
        triggerData: { equals: event.data as object },
        status: 'RUNNING',
      },
    });
    if (existing) {
      return { executionId: existing.id, status: 'COMPLETED', skipped: true, reason: 'duplicate', nodeResults: {}, durationMs: 0 };
    }

    const config = await db.agentConfig.findUnique({ where: { type: this.type } });
    if (!config) throw new Error(`AgentConfig not found for ${this.type}`);

    const execution = await db.agentExecution.create({
      data: {
        agentType: this.type,
        agentId: config.id,
        status: 'RUNNING',
        triggerEvent: event.type,
        triggerData: event.data as object,
        startedAt: new Date(),
      },
    });

    const context: ExecutionContext = {
      executionId: execution.id,
      agentType: this.type,
      triggerEvent: event.type,
      triggerData: event.data as Record<string, unknown>,
      nodeResults: new Map(),
    };

    const skippedNodeIds = new Set<string>();

    try {
      const sortedNodes = topologicalSort(workflow);

      for (const node of sortedNodes) {
        if (skippedNodeIds.has(node.id)) {
          await db.agentNodeLog.upsert({
            where: { executionId_nodeId: { executionId: execution.id, nodeId: node.id } },
            create: { executionId: execution.id, nodeId: node.id, nodeName: node.data.label, status: 'SKIPPED' },
            update: { status: 'SKIPPED' },
          });
          continue;
        }

        if (node.type === 'trigger') {
          await db.agentNodeLog.upsert({
            where: { executionId_nodeId: { executionId: execution.id, nodeId: node.id } },
            create: { executionId: execution.id, nodeId: node.id, nodeName: node.data.label, status: 'COMPLETED', startedAt: new Date(), completedAt: new Date(), durationMs: 0 },
            update: { status: 'COMPLETED' },
          });
          continue;
        }

        if (node.type === 'condition') {
          const result = await this.executeNodeWithRetry(node, context);
          const conditionResult = Boolean(result);
          context.nodeResults.set(node.id, conditionResult);
          const toSkip = getSkippedNodeIds(node.id, conditionResult, workflow);
          toSkip.forEach(id => skippedNodeIds.add(id));
          continue;
        }

        const result = await this.executeNodeWithRetry(node, context);
        context.nodeResults.set(node.id, result);
      }

      const durationMs = Date.now() - startTime;
      await db.agentExecution.update({
        where: { id: execution.id },
        data: { status: 'COMPLETED', completedAt: new Date(), result: JSON.parse(JSON.stringify(Object.fromEntries(context.nodeResults))) },
      });

      return {
        executionId: execution.id,
        status: 'COMPLETED',
        nodeResults: Object.fromEntries(context.nodeResults),
        durationMs,
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      await db.agentExecution.update({
        where: { id: execution.id },
        data: { status: 'FAILED', completedAt: new Date(), error: errorMessage },
      });
      logger.error({ err: error, agentType: this.type, executionId: execution.id }, 'Agent execution failed');
      return { executionId: execution.id, status: 'FAILED', nodeResults: {}, error: errorMessage, durationMs };
    }
  }

  private async executeNodeWithRetry(node: WorkflowNode, context: ExecutionContext): Promise<unknown> {
    const maxRetries = (node.data.config?.retries as number) ?? 3;
    const timeoutMs = ((node.data.config?.timeout as number) ?? 30) * 1000;
    const nodeStart = Date.now();

    await db.agentNodeLog.upsert({
      where: { executionId_nodeId: { executionId: context.executionId, nodeId: node.id } },
      create: { executionId: context.executionId, nodeId: node.id, nodeName: node.data.label, status: 'RUNNING', startedAt: new Date(), input: JSON.parse(JSON.stringify(node.data.config)) },
      update: { status: 'RUNNING', startedAt: new Date() },
    });

    const handlerKey = node.data.action;
    if (!handlerKey) throw new Error(`Node ${node.id} has no action defined`);

    const handler = this.nodeHandlers[handlerKey];
    if (!handler) throw new Error(`Unknown handler: ${handlerKey} for node ${node.id}`);

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await Promise.race([
          handler(node.data.config, context),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Node timeout')), timeoutMs)),
        ]);

        const durationMs = Date.now() - nodeStart;
        await db.agentNodeLog.update({
          where: { executionId_nodeId: { executionId: context.executionId, nodeId: node.id } },
          data: { status: 'COMPLETED', output: result as object ?? null, completedAt: new Date(), durationMs },
        });

        return result;
      } catch (error) {
        if (attempt === maxRetries) {
          const durationMs = Date.now() - nodeStart;
          const errorMessage = error instanceof Error ? error.message : String(error);
          await db.agentNodeLog.update({
            where: { executionId_nodeId: { executionId: context.executionId, nodeId: node.id } },
            data: { status: 'FAILED', error: errorMessage, completedAt: new Date(), durationMs },
          });
          throw error;
        }
        await sleep(1000 * Math.pow(2, attempt));
      }
    }
  }
}
