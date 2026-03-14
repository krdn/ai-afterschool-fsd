import { describe, it, expect } from 'vitest';
import { topologicalSort, getNextNodes } from '../workflow-engine';
import type { WorkflowDefinition } from '../types';

const simpleWorkflow: WorkflowDefinition = {
  nodes: [
    { id: 'trigger-1', type: 'trigger', position: { x: 0, y: 0 }, data: { label: '시작', event: 'student.created', config: {} } },
    { id: 'process-1', type: 'process', position: { x: 200, y: 0 }, data: { label: '사주 계산', action: 'calculateSaju', config: {} } },
    { id: 'action-1', type: 'action', position: { x: 400, y: 0 }, data: { label: '알림', action: 'notifyTeacher', config: {} } },
  ],
  edges: [
    { id: 'e1', source: 'trigger-1', target: 'process-1' },
    { id: 'e2', source: 'process-1', target: 'action-1' },
  ],
};

describe('topologicalSort', () => {
  it('노드를 의존 순서대로 정렬한다', () => {
    const sorted = topologicalSort(simpleWorkflow);
    const ids = sorted.map(n => n.id);
    expect(ids).toEqual(['trigger-1', 'process-1', 'action-1']);
  });
});

describe('getNextNodes', () => {
  it('현재 노드의 다음 노드들을 반환한다', () => {
    const next = getNextNodes('trigger-1', simpleWorkflow);
    expect(next.map(n => n.id)).toEqual(['process-1']);
  });

  it('마지막 노드는 빈 배열을 반환한다', () => {
    const next = getNextNodes('action-1', simpleWorkflow);
    expect(next).toEqual([]);
  });
});
