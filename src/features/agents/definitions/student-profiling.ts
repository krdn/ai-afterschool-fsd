import { BaseAgent } from '../core/base-agent';
import type { NodeHandler } from '../core/types';
import type { AgentEventName } from '@/lib/events/types';

export class StudentProfilingAgent extends BaseAgent {
  type = 'STUDENT_PROFILING' as const;

  subscribedEvents: AgentEventName[] = [
    'student.created',
    'mbti.submitted',
    'vark.submitted',
  ];

  nodeHandlers: Record<string, NodeHandler> = {
    calculateSaju: async (_config, context) => {
      const { studentId } = context.triggerData;
      const { db } = await import('@/lib/db/client');
      const student = await db.student.findUnique({
        where: { id: studentId as string },
        select: { birthDate: true, birthTimeHour: true, birthTimeMinute: true },
      });
      if (!student?.birthDate) return { skipped: true, reason: 'No birth date' };

      const { calculateSaju } = await import('@/features/analysis/saju/saju');
      const result = calculateSaju({
        birthDate: student.birthDate,
        time: student.birthTimeHour != null
          ? { hour: student.birthTimeHour, minute: student.birthTimeMinute ?? 0 }
          : null,
      });
      return { calculated: true, pillars: result.pillars };
    },

    analyzeName: async (_config, context) => {
      const { studentId } = context.triggerData;
      const { db } = await import('@/lib/db/client');
      const student = await db.student.findUnique({
        where: { id: studentId as string },
        select: { name: true, nameHanja: true },
      });
      if (!student) return { skipped: true };
      return { name: student.name, nameHanja: student.nameHanja, analyzed: true };
    },

    generateSajuInterpretation: async (config, _context) => {
      if (config.enabled === false) return { skipped: true, reason: 'Disabled' };
      return { interpreted: true, type: 'saju' };
    },

    generateNameInterpretation: async (config, _context) => {
      if (config.enabled === false) return { skipped: true, reason: 'Disabled' };
      return { interpreted: true, type: 'name' };
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

    scoreSurvey: async (_config, _context) => {
      return { scored: true };
    },

    generateSurveyInterpretation: async (config, _context) => {
      if (config.enabled === false) return { skipped: true, reason: 'Disabled' };
      return { interpreted: true };
    },

    checkAllAnalyses: async (config, context) => {
      const { studentId } = context.triggerData;
      const { db } = await import('@/lib/db/client');
      const [sajuCount, mbtiAnalysis, varkAnalysis] = await Promise.all([
        db.sajuAnalysisHistory.count({ where: { studentId: studentId as string } }),
        db.mbtiAnalysis.findUnique({ where: { subjectType_subjectId: { subjectType: 'STUDENT', subjectId: studentId as string } } }),
        db.varkAnalysis.findUnique({ where: { studentId: studentId as string } }),
      ]);
      const completedCount = [sajuCount > 0, mbtiAnalysis, varkAnalysis].filter(Boolean).length;
      const minAnalyses = (config.minAnalyses as number) ?? 3;
      return completedCount >= minAnalyses;
    },

    generateIntegratedProfile: async (_config, _context) => {
      return { integrated: true };
    },

    notifyPartialComplete: async (_config, _context) => {
      return { notified: true, partial: true };
    },
  };
}
