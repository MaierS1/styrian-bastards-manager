import type { TaskEvent, TaskEventListener, TaskEventName } from './taskTypes.ts'

export function createTaskEventBus() {
  const listeners = new Map<TaskEventName | '*', Set<TaskEventListener>>()

  function on(eventName: TaskEventName | '*', listener: TaskEventListener) {
    const eventListeners = listeners.get(eventName) || new Set<TaskEventListener>()
    eventListeners.add(listener)
    listeners.set(eventName, eventListeners)

    return () => off(eventName, listener)
  }

  function off(eventName: TaskEventName | '*', listener: TaskEventListener) {
    listeners.get(eventName)?.delete(listener)
  }

  function emit(event: TaskEvent) {
    listeners.get(event.name)?.forEach((listener) => listener(event))
    listeners.get('*')?.forEach((listener) => listener(event))
  }

  function clear() {
    listeners.clear()
  }

  return {
    on,
    off,
    emit,
    clear,
  }
}

export type TaskEventBus = ReturnType<typeof createTaskEventBus>
