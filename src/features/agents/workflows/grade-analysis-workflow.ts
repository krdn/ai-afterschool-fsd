import type { WorkflowDefinition } from '../core/types';

export const gradeAnalysisWorkflowA: WorkflowDefinition = {
  nodes: [
    { id: 'trigger-upload', type: 'trigger', position: { x: 250, y: 0 }, data: { label: '성적 업로드', event: 'grade.uploaded', config: {} } },
    { id: 'process-ocr', type: 'process', position: { x: 250, y: 120 }, data: { label: 'OCR 처리', action: 'processOcr', config: { timeout: 60, retries: 2 } } },
    { id: 'condition-confidence', type: 'condition', position: { x: 250, y: 240 }, data: { label: '신뢰도 충분?', action: 'checkOcrConfidence', config: { threshold: 95 } } },
    { id: 'action-auto-save', type: 'action', position: { x: 100, y: 360 }, data: { label: '자동 저장', action: 'autoConfirmGrade', config: {} } },
    { id: 'action-review', type: 'action', position: { x: 400, y: 360 }, data: { label: '교사 검토 요청', action: 'requestTeacherReview', config: {} } },
  ],
  edges: [
    { id: 'e1', source: 'trigger-upload', target: 'process-ocr' },
    { id: 'e2', source: 'process-ocr', target: 'condition-confidence' },
    { id: 'e3', source: 'condition-confidence', target: 'action-auto-save', sourceHandle: 'true', label: '높음' },
    { id: 'e4', source: 'condition-confidence', target: 'action-review', sourceHandle: 'false', label: '낮음' },
  ],
};

export const gradeAnalysisWorkflowB: WorkflowDefinition = {
  nodes: [
    { id: 'trigger-confirmed', type: 'trigger', position: { x: 250, y: 0 }, data: { label: '성적 확인', event: 'grade.confirmed', config: {} } },
    { id: 'process-coaching', type: 'process', position: { x: 250, y: 120 }, data: { label: '코칭 리포트', action: 'generateCoachingReport', config: { enabled: true, timeout: 90, retries: 2 } } },
    { id: 'process-parent', type: 'process', position: { x: 250, y: 240 }, data: { label: '학부모 리포트', action: 'generateParentReport', config: { enabled: true, timeout: 90, retries: 2 } } },
    { id: 'condition-send', type: 'condition', position: { x: 250, y: 360 }, data: { label: '자동 발송?', action: 'checkAutoSend', config: { autoSend: false } } },
    { id: 'action-send', type: 'action', position: { x: 100, y: 480 }, data: { label: '알림톡 발송', action: 'sendAlimtalk', config: { timeRestriction: { start: '09:00', end: '21:00' } } } },
    { id: 'action-notify-send', type: 'action', position: { x: 400, y: 480 }, data: { label: '발송 대기 알림', action: 'notifyPendingSend', config: {} } },
  ],
  edges: [
    { id: 'e1', source: 'trigger-confirmed', target: 'process-coaching' },
    { id: 'e2', source: 'process-coaching', target: 'process-parent' },
    { id: 'e3', source: 'process-parent', target: 'condition-send' },
    { id: 'e4', source: 'condition-send', target: 'action-send', sourceHandle: 'true', label: '발송' },
    { id: 'e5', source: 'condition-send', target: 'action-notify-send', sourceHandle: 'false', label: '대기' },
  ],
};
