import { BaseAgent } from '../core/base-agent';
import type { NodeHandler } from '../core/types';
import type { AgentEventName } from '@/lib/events/types';

export class GradeAnalysisAgent extends BaseAgent {
  type = 'GRADE_ANALYSIS' as const;
  subscribedEvents: AgentEventName[] = ['grade.uploaded', 'grade.confirmed'];

  nodeHandlers: Record<string, NodeHandler> = {
    processOcr: async (_config, context) => {
      const { scanId } = context.triggerData;
      const { db } = await import('@/lib/db/client');
      const scan = await db.gradeOcrScan.findUnique({ where: { id: scanId as string } });
      if (!scan) return { skipped: true, reason: 'Scan not found' };
      return { scanId: scan.id, confidence: scan.confidence, status: scan.status };
    },

    checkOcrConfidence: async (config, context) => {
      const ocrResult = context.nodeResults.get('process-ocr') as { confidence?: number } | undefined;
      const threshold = (config.threshold as number) ?? 95;
      return (ocrResult?.confidence ?? 0) >= threshold;
    },

    autoConfirmGrade: async (_config, context) => {
      const { studentId, scanId } = context.triggerData;
      const { eventBus } = await import('@/lib/events/event-bus');
      eventBus.emit('grade.confirmed', { studentId: studentId as string, gradeHistoryId: scanId as string });
      return { confirmed: true, auto: true };
    },

    requestTeacherReview: async (_config, context) => {
      const { eventBus } = await import('@/lib/events/event-bus');
      eventBus.emit('agent.execution.completed', { agentType: 'GRADE_ANALYSIS', executionId: context.executionId, status: 'REVIEW_NEEDED' });
      return { reviewRequested: true };
    },

    generateCoachingReport: async (config, _context) => {
      if (config.enabled === false) return { skipped: true, reason: 'Disabled' };
      return { reportGenerated: true, type: 'coaching' };
    },

    generateParentReport: async (config, _context) => {
      if (config.enabled === false) return { skipped: true, reason: 'Disabled' };
      return { reportGenerated: true, type: 'parent' };
    },

    checkAutoSend: async (config, _context) => {
      return (config.autoSend as boolean) ?? false;
    },

    sendAlimtalk: async (config, _context) => {
      const restriction = config.timeRestriction as { start: string; end: string } | undefined;
      if (restriction) {
        const hour = new Date().getHours();
        const startHour = parseInt(restriction.start.split(':')[0]);
        const endHour = parseInt(restriction.end.split(':')[0]);
        if (hour < startHour || hour >= endHour) {
          return { skipped: true, reason: 'Outside send hours' };
        }
      }
      return { sent: true };
    },

    notifyPendingSend: async (_config, _context) => {
      return { notified: true, pending: true };
    },
  };
}
