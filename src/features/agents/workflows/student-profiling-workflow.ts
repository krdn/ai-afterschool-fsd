import type { WorkflowDefinition } from '../core/types';

export const studentProfilingWorkflowA: WorkflowDefinition = {
  nodes: [
    { id: 'trigger-created', type: 'trigger', position: { x: 250, y: 0 }, data: { label: '학생 등록', event: 'student.created', config: {} } },
    { id: 'process-saju', type: 'process', position: { x: 100, y: 120 }, data: { label: '사주 계산', action: 'calculateSaju', config: { timeout: 30, retries: 2 } } },
    { id: 'process-name', type: 'process', position: { x: 400, y: 120 }, data: { label: '이름 분석', action: 'analyzeName', config: { timeout: 30, retries: 2 } } },
    { id: 'action-saju-llm', type: 'action', position: { x: 100, y: 240 }, data: { label: '사주 LLM 해석', action: 'generateSajuInterpretation', config: { enabled: true, timeout: 60, retries: 2 } } },
    { id: 'action-name-llm', type: 'action', position: { x: 400, y: 240 }, data: { label: '이름 LLM 해석', action: 'generateNameInterpretation', config: { enabled: true, timeout: 60, retries: 2 } } },
    { id: 'action-notify', type: 'action', position: { x: 250, y: 360 }, data: { label: '교사 알림', action: 'notifyTeacher', config: { message: '기본 분석 완료. MBTI/VARK 설문을 진행하세요.' } } },
  ],
  edges: [
    { id: 'e1', source: 'trigger-created', target: 'process-saju' },
    { id: 'e2', source: 'trigger-created', target: 'process-name' },
    { id: 'e3', source: 'process-saju', target: 'action-saju-llm' },
    { id: 'e4', source: 'process-name', target: 'action-name-llm' },
    { id: 'e5', source: 'action-saju-llm', target: 'action-notify' },
    { id: 'e6', source: 'action-name-llm', target: 'action-notify' },
  ],
};

export const studentProfilingWorkflowB: WorkflowDefinition = {
  nodes: [
    { id: 'trigger-survey', type: 'trigger', position: { x: 250, y: 0 }, data: { label: '설문 완료', event: 'mbti.submitted', config: {} } },
    { id: 'process-score', type: 'process', position: { x: 250, y: 120 }, data: { label: '설문 채점', action: 'scoreSurvey', config: { timeout: 10, retries: 1 } } },
    { id: 'action-llm', type: 'action', position: { x: 250, y: 240 }, data: { label: 'LLM 해석', action: 'generateSurveyInterpretation', config: { enabled: true, timeout: 60, retries: 2 } } },
    { id: 'condition-all', type: 'condition', position: { x: 250, y: 360 }, data: { label: '모든 분석 완료?', action: 'checkAllAnalyses', config: { minAnalyses: 3 } } },
    { id: 'action-profile', type: 'action', position: { x: 100, y: 480 }, data: { label: '통합 프로파일 생성', action: 'generateIntegratedProfile', config: { timeout: 90, retries: 2 } } },
    { id: 'action-partial', type: 'action', position: { x: 400, y: 480 }, data: { label: '부분 완료 알림', action: 'notifyPartialComplete', config: {} } },
  ],
  edges: [
    { id: 'e1', source: 'trigger-survey', target: 'process-score' },
    { id: 'e2', source: 'process-score', target: 'action-llm' },
    { id: 'e3', source: 'action-llm', target: 'condition-all' },
    { id: 'e4', source: 'condition-all', target: 'action-profile', sourceHandle: 'true', label: '완료' },
    { id: 'e5', source: 'condition-all', target: 'action-partial', sourceHandle: 'false', label: '미완료' },
  ],
};
