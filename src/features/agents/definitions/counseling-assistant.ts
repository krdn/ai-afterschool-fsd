import { BaseAgent } from '../core/base-agent';
import type { NodeHandler } from '../core/types';
import type { AgentEventName } from '@/lib/events/types';

export class CounselingAssistantAgent extends BaseAgent {
  type = 'COUNSELING_ASSISTANT' as const;
  subscribedEvents: AgentEventName[] = ['counseling.scheduled', 'counseling.completed'];

  nodeHandlers: Record<string, NodeHandler> = {
    generatePersonalitySummary: async (config, _context) => {
      if (config.enabled === false) return { skipped: true, reason: 'Disabled' };
      return { generated: true, type: 'personality_summary' };
    },

    generateScenario: async (config, _context) => {
      if (config.enabled === false) return { skipped: true, reason: 'Disabled' };
      return { generated: true, type: 'scenario' };
    },

    generateCounselingSummary: async (config, _context) => {
      if (config.enabled === false) return { skipped: true, reason: 'Disabled' };
      return { generated: true, type: 'counseling_summary' };
    },

    checkNthSession: async (config, context) => {
      const { reservationId } = context.triggerData;
      const { db } = await import('@/lib/db/client');
      const reservation = await db.parentCounselingReservation.findUnique({
        where: { id: reservationId as string },
        select: { studentId: true },
      });
      if (!reservation) return false;

      const completedCount = await db.counselingSession.count({
        where: { studentId: reservation.studentId },
      });
      const nthSession = (config.nthSession as number) ?? 3;
      return completedCount > 0 && completedCount % nthSession === 0;
    },

    generateComprehensiveReport: async (_config, _context) => {
      return { generated: true, type: 'comprehensive_report' };
    },

    generatePdf: async (_config, _context) => {
      return { generated: true, type: 'pdf' };
    },

    notifyTeacher: async (config, context) => {
      const { eventBus } = await import('@/lib/events/event-bus');
      eventBus.emit('agent.execution.completed', {
        agentType: context.agentType,
        executionId: context.executionId,
        status: 'COMPLETED',
      });
      return { notified: true, message: config.message };
    },
  };
}
