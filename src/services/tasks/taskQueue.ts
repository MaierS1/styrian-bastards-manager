import { createTaskEventBus, type TaskEventBus } from './taskEvents.ts'
import { createInitialTaskQueueState, taskReducer, type TaskQueueAction } from './taskReducer.ts'
import { createTaskWorkerRegistry, runTaskWorker, type TaskWorkerRegistry } from './taskWorker.ts'
import type {
  EnqueueTaskOptions,
  TaskError,
  TaskEventName,
  TaskId,
  TaskItem,
  TaskProgress,
  TaskQueueOptions,
  TaskQueueState,
  TaskWorker,
} from './taskTypes.ts'

export class TaskQueue {
  private state: TaskQueueState
  private readonly registry: TaskWorkerRegistry
  private readonly events: TaskEventBus
  private readonly controllers = new Map<TaskId, AbortController>()
  private readonly now: () => number
  private readonly createId: () => TaskId
  private readonly autoStart: boolean
  private concurrency: number
  private sequence = 0

  constructor(options: TaskQueueOptions = {}) {
    this.state = createInitialTaskQueueState()
    this.registry = createTaskWorkerRegistry()
    this.events = createTaskEventBus()
    this.concurrency = Math.max(1, Math.floor(options.concurrency ?? 1))
    this.now = options.now || (() => Date.now())
    this.createId = options.createId || (() => `task-${this.now()}-${this.sequence += 1}`)
    this.autoStart = options.autoStart ?? true
  }

  getState() {
    return cloneState(this.state)
  }

  getTask(id: TaskId) {
    return this.state.tasks[id] || null
  }

  getTasks() {
    return this.state.order.map((id) => this.state.tasks[id]).filter(Boolean)
  }

  getConcurrency() {
    return this.concurrency
  }

  setConcurrency(concurrency: number) {
    this.concurrency = Math.max(1, Math.floor(concurrency))
    this.process()
  }

  on(eventName: TaskEventName | '*', listener: Parameters<TaskEventBus['on']>[1]) {
    return this.events.on(eventName, listener)
  }

  registerWorker(type: string, worker: TaskWorker) {
    const unregister = this.registry.register(type, worker)
    this.process()
    return unregister
  }

  enqueue<TPayload = unknown>(type: string, payload: TPayload, options: EnqueueTaskOptions = {}) {
    const timestamp = this.now()
    const task: TaskItem<TPayload> = {
      id: options.id || this.createId(),
      type,
      payload,
      status: 'queued',
      progress: {
        current: clampProgressValue(options.progress?.current ?? 0),
        total: options.progress?.total === undefined ? undefined : clampProgressValue(options.progress.total),
        message: options.progress?.message,
      },
      attempt: 0,
      maxAttempts: normalizeMaxAttempts(options),
      error: null,
      result: null,
      cancelRequested: false,
      createdAt: timestamp,
      updatedAt: timestamp,
      startedAt: null,
      finishedAt: null,
    }

    this.dispatch({ type: 'enqueue', task }, 'task:queued', task.id)
    if (this.autoStart) this.process()

    return task.id
  }

  start() {
    this.process()
  }

  retry(id: TaskId) {
    const task = this.state.tasks[id]
    if (!task || task.status === 'running') return false

    this.dispatch({ type: 'retry', id, now: this.now() }, 'task:retrying', id)
    this.process()
    return true
  }

  cancel(id: TaskId) {
    const task = this.state.tasks[id]
    if (!task || task.status === 'succeeded' || task.status === 'failed' || task.status === 'cancelled') {
      return false
    }

    this.dispatch({ type: 'request-cancel', id, now: this.now() }, 'task:cancel-requested', id)

    if (task.status === 'queued') {
      this.dispatch({ type: 'cancel', id, now: this.now() }, 'task:cancelled', id)
      this.process()
      return true
    }

    this.controllers.get(id)?.abort()
    return true
  }

  remove(id: TaskId) {
    this.cancel(id)
    this.dispatch({ type: 'remove', id })
  }

  clearCompleted() {
    this.dispatch({ type: 'clear-completed' })
  }

  private process() {
    const availableSlots = this.concurrency - this.state.activeIds.length
    if (availableSlots <= 0) return

    const nextTasks = this.state.order
      .map((id) => this.state.tasks[id])
      .filter((task) => task?.status === 'queued' && !task.cancelRequested)
      .slice(0, availableSlots)

    nextTasks.forEach((task) => {
      void this.run(task.id)
    })
  }

  private async run(id: TaskId) {
    const task = this.state.tasks[id]
    const worker = task ? this.registry.get(task.type) : null

    if (!task || !worker || task.status !== 'queued') return

    const controller = new AbortController()
    this.controllers.set(id, controller)
    this.dispatch({ type: 'start', id, now: this.now() }, 'task:started', id)

    try {
      const result = await runTaskWorker(task, worker, {
        signal: controller.signal,
        reportProgress: (progress) => this.reportProgress(id, progress),
      })

      if (this.state.tasks[id]?.cancelRequested || controller.signal.aborted) {
        this.dispatch({ type: 'cancel', id, now: this.now() }, 'task:cancelled', id)
        return
      }

      this.dispatch({ type: 'succeed', id, result, now: this.now() }, 'task:succeeded', id)
    } catch (error) {
      if (this.state.tasks[id]?.cancelRequested || controller.signal.aborted) {
        this.dispatch({ type: 'cancel', id, now: this.now() }, 'task:cancelled', id)
        return
      }

      const currentTask = this.state.tasks[id]
      const taskError = normalizeTaskError(error)

      if (currentTask && currentTask.attempt < currentTask.maxAttempts) {
        this.dispatch({ type: 'fail', id, error: taskError, now: this.now() }, 'task:failed', id)
        this.dispatch({ type: 'retry', id, now: this.now() }, 'task:retrying', id)
        return
      }

      this.dispatch({ type: 'fail', id, error: taskError, now: this.now() }, 'task:failed', id)
    } finally {
      this.controllers.delete(id)
      this.process()
    }
  }

  private reportProgress(id: TaskId, progress: Partial<TaskProgress>) {
    const task = this.state.tasks[id]
    if (!task || task.status !== 'running') return

    this.dispatch({ type: 'progress', id, progress, now: this.now() }, 'task:progress', id)
  }

  private dispatch(action: TaskQueueAction, eventName?: TaskEventName, taskId?: TaskId) {
    this.state = taskReducer(this.state, action)

    if (eventName && taskId && this.state.tasks[taskId]) {
      this.events.emit({
        name: eventName,
        task: this.state.tasks[taskId],
        state: this.getState(),
      })
    }

    const task = taskId ? this.state.tasks[taskId] : this.getTasks()[0]
    if (task) {
      this.events.emit({
        name: 'queue:changed',
        task,
        state: this.getState(),
      })
    }
  }
}

export function createTaskQueue(options?: TaskQueueOptions) {
  return new TaskQueue(options)
}

function normalizeTaskError(error: unknown): TaskError {
  if (error instanceof Error) {
    return {
      message: error.message,
      cause: error,
    }
  }

  return {
    message: String(error || 'Task failed.'),
    cause: error,
  }
}

function cloneState(state: TaskQueueState): TaskQueueState {
  return {
    tasks: { ...state.tasks },
    order: [...state.order],
    activeIds: [...state.activeIds],
  }
}

function normalizeMaxAttempts(options: EnqueueTaskOptions) {
  if (options.maxAttempts !== undefined) {
    return Math.max(1, Math.floor(options.maxAttempts))
  }

  return Math.max(1, Math.floor((options.maxRetries ?? 0) + 1))
}

function clampProgressValue(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, value))
}
