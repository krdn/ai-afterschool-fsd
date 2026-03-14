import { describe, it, expect, vi, beforeEach } from 'vitest';
import { eventBus } from '../event-bus';

describe('EventBus', () => {
  beforeEach(() => {
    eventBus.removeAllListeners();
  });

  it('이벤트별 구독이 동작한다', () => {
    const handler = vi.fn();
    eventBus.on('student.created', handler);
    eventBus.emit('student.created', { studentId: 's1', teacherId: 't1' });
    expect(handler).toHaveBeenCalledWith({ studentId: 's1', teacherId: 't1' });
  });

  it('다른 이벤트에는 반응하지 않는다', () => {
    const handler = vi.fn();
    eventBus.on('student.created', handler);
    eventBus.emit('grade.uploaded', { studentId: 's1', scanId: 'sc1', imageUrl: 'url' });
    expect(handler).not.toHaveBeenCalled();
  });

  it('기존 onEvent는 하위 호환된다 (콜론 구분자)', () => {
    const handler = vi.fn();
    eventBus.onEvent(handler);
    eventBus.emitEvent({
      type: 'analysis:complete',
      analysisType: 'saju',
      subjectType: 'STUDENT',
      subjectId: 's1',
      subjectName: '홍길동',
      timestamp: new Date().toISOString(),
    });
    expect(handler).toHaveBeenCalled();
  });
});
