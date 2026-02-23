import { EventEmitter } from 'events'
import type { ServerEvent } from './types'

class EventBus extends EventEmitter {
  private static instance: EventBus

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus()
      EventBus.instance.setMaxListeners(100)
    }
    return EventBus.instance
  }

  emitEvent(event: ServerEvent) {
    this.emit('server-event', event)
  }

  onEvent(listener: (event: ServerEvent) => void) {
    this.on('server-event', listener)
    return () => this.off('server-event', listener)
  }
}

const globalForEventBus = globalThis as unknown as { eventBus: EventBus }
export const eventBus = globalForEventBus.eventBus ?? EventBus.getInstance()
if (process.env.NODE_ENV !== 'production') globalForEventBus.eventBus = eventBus
