/**
 * EventBus.ts - A simple, centralized event system for the background script.
 */
export class EventBus {
  private events: Map<string, Set<Function>> = new Map();

  public on(event: string, handler: Function): void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(handler);
  }

  public off(event: string, handler: Function): void {
    this.events.get(event)?.delete(handler);
  }

  public emit(event: string, data?: any): void {
    this.events.get(event)?.forEach(handler => handler(data));
  }
}

export const backgroundEventBus = new EventBus();
