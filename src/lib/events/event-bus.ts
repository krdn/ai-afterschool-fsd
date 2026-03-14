import { EventEmitter } from 'events';
import type { AgentEventMap, AgentEventName, ServerEvent } from './types';

class EventBus extends EventEmitter {
  private static instance: EventBus;

  private constructor() {
    super();
    this.setMaxListeners(100);
  }

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  // 신규: 이벤트별 타입 안전 emit
  override emit<K extends AgentEventName>(event: K, data: AgentEventMap[K]): boolean {
    return super.emit(event, data);
  }

  // 신규: 이벤트별 타입 안전 구독
  override on<K extends AgentEventName>(event: K, listener: (data: AgentEventMap[K]) => void): this {
    return super.on(event, listener as (...args: unknown[]) => void);
  }

  // 신규: 이벤트별 구독 해제
  override off<K extends AgentEventName>(event: K, listener: (data: AgentEventMap[K]) => void): this {
    return super.off(event, listener as (...args: unknown[]) => void);
  }

  // 하위 호환: 기존 SSE용 단일 채널
  emitEvent(event: ServerEvent): void {
    super.emit('server-event', event);
  }

  onEvent(listener: (event: ServerEvent) => void): () => void {
    super.on('server-event', listener);
    return () => {
      super.off('server-event', listener);
    };
  }
}

const globalForEventBus = globalThis as unknown as { eventBus: EventBus };
export const eventBus = globalForEventBus.eventBus ?? EventBus.getInstance();
if (process.env.NODE_ENV !== 'production') globalForEventBus.eventBus = eventBus;
