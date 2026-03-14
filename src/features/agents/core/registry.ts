import { db } from '@/lib/db/client';
import { eventBus } from '@/lib/events/event-bus';
import { logger } from '@/lib/logger';
import type { BaseAgent } from './base-agent';
import type { WorkflowDefinition } from './types';
import type { AgentType } from '@prisma/client';
import type { AgentEventName, AgentEventMap } from '@/lib/events/types';

class AgentRegistry {
  private agents = new Map<AgentType, BaseAgent>();
  private cleanupFns: (() => void)[] = [];
  private initialized = false;

  register(agent: BaseAgent): void {
    this.agents.set(agent.type, agent);
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    const staleCount = await db.agentExecution.updateMany({
      where: { status: 'RUNNING' },
      data: { status: 'FAILED', error: 'Server restarted during execution', completedAt: new Date() },
    });
    if (staleCount.count > 0) {
      logger.warn({ count: staleCount.count }, 'Recovered stale agent executions');
    }

    await this.subscribe();
    this.initialized = true;
    logger.info({ agentCount: this.agents.size }, 'Agent registry initialized');
  }

  async reload(): Promise<void> {
    this.cleanupFns.forEach(fn => fn());
    this.cleanupFns = [];
    await this.subscribe();
    logger.info('Agent registry reloaded');
  }

  private async subscribe(): Promise<void> {
    let configs;
    try {
      configs = await db.agentConfig.findMany({ where: { enabled: true } });
    } catch {
      logger.warn('AgentConfig table not available yet, skipping agent initialization');
      return;
    }

    for (const config of configs) {
      const agent = this.agents.get(config.type);
      if (!agent) continue;

      const workflow = config.workflow as { nodes: unknown[]; edges: unknown[] };
      if (!workflow?.nodes || !workflow?.edges) continue;

      for (const eventName of agent.subscribedEvents) {
        const handler = async (data: AgentEventMap[typeof eventName]) => {
          try {
            await agent.execute(
              { type: eventName, data },
              config.workflow as WorkflowDefinition
            );
          } catch (error) {
            logger.error({ err: error, agentType: config.type, event: eventName }, 'Agent execution failed');
          }
        };
        eventBus.on(eventName, handler);
        this.cleanupFns.push(() => eventBus.off(eventName, handler));
      }
    }
  }

  getAgent(type: AgentType): BaseAgent | undefined {
    return this.agents.get(type);
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

const globalForRegistry = globalThis as unknown as { agentRegistry: AgentRegistry };
export const agentRegistry = globalForRegistry.agentRegistry ?? new AgentRegistry();
if (process.env.NODE_ENV !== 'production') globalForRegistry.agentRegistry = agentRegistry;
