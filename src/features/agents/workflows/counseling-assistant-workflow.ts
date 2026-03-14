import type { WorkflowDefinition } from '../core/types';

export const counselingAssistantWorkflowA: WorkflowDefinition = {
  nodes: [
    { id: 'trigger-scheduled', type: 'trigger', position: { x: 250, y: 0 }, data: { label: '상담 예약', event: 'counseling.scheduled', config: {} } },
    { id: 'process-personality', type: 'process', position: { x: 250, y: 120 }, data: { label: '성향 요약 생성', action: 'generatePersonalitySummary', config: { enabled: true, timeout: 60, retries: 2 } } },
    { id: 'process-scenario', type: 'process', position: { x: 250, y: 240 }, data: { label: '시나리오 생성', action: 'generateScenario', config: { enabled: true, timeout: 90, retries: 2 } } },
    { id: 'action-notify', type: 'action', position: { x: 250, y: 360 }, data: { label: '교사 알림', action: 'notifyTeacher', config: { message: '상담 준비 자료가 생성되었습니다.' } } },
  ],
  edges: [
    { id: 'e1', source: 'trigger-scheduled', target: 'process-personality' },
    { id: 'e2', source: 'process-personality', target: 'process-scenario' },
    { id: 'e3', source: 'process-scenario', target: 'action-notify' },
  ],
};

export const counselingAssistantWorkflowB: WorkflowDefinition = {
  nodes: [
    { id: 'trigger-completed', type: 'trigger', position: { x: 250, y: 0 }, data: { label: '상담 완료', event: 'counseling.completed', config: {} } },
    { id: 'process-summary', type: 'process', position: { x: 250, y: 120 }, data: { label: '상담 요약 생성', action: 'generateCounselingSummary', config: { enabled: true, timeout: 90, retries: 2 } } },
    { id: 'condition-nth', type: 'condition', position: { x: 250, y: 240 }, data: { label: 'N회차 도달?', action: 'checkNthSession', config: { nthSession: 3 } } },
    { id: 'process-report', type: 'process', position: { x: 100, y: 360 }, data: { label: '종합 리포트', action: 'generateComprehensiveReport', config: { timeout: 120, retries: 2 } } },
    { id: 'action-pdf', type: 'action', position: { x: 100, y: 480 }, data: { label: 'PDF 생성', action: 'generatePdf', config: {} } },
    { id: 'action-done', type: 'action', position: { x: 400, y: 360 }, data: { label: '완료 알림', action: 'notifyTeacher', config: { message: '상담 요약이 저장되었습니다.' } } },
  ],
  edges: [
    { id: 'e1', source: 'trigger-completed', target: 'process-summary' },
    { id: 'e2', source: 'process-summary', target: 'condition-nth' },
    { id: 'e3', source: 'condition-nth', target: 'process-report', sourceHandle: 'true', label: '도달' },
    { id: 'e4', source: 'process-report', target: 'action-pdf' },
    { id: 'e5', source: 'condition-nth', target: 'action-done', sourceHandle: 'false', label: '미도달' },
  ],
};
