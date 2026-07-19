import type { TaskError, TaskId, TaskItem, TaskProgress, TaskQueueState } from './taskTypes.ts'

export type TaskQueueAction =
  | { type: 'enqueue'; task: TaskItem }
  | { type: 'start'; id: TaskId; now: number }
  | { type: 'progress'; id: TaskId; progress: Partial<TaskProgress>; now: number }
  | { type: 'succeed'; id: TaskId; result: unknown; now: number }
  | { type: 'fail'; id: TaskId; error: TaskError; now: number }
  | { type: 'retry'; id: TaskId; now: number }
  | { type: 'request-cancel'; id: TaskId; now: number }
  | { type: 'cancel'; id: TaskId; now: number }
  | { type: 'remove'; id: TaskId }
  | { type: 'clear-completed' }

export function createInitialTaskQueueState(): TaskQueueState {
  return {
    tasks: {},
    order: [],
    activeIds: [],
  }
}

export function taskReducer(state: TaskQueueState, action: TaskQueueAction): TaskQueueState {
  switch (action.type) {
    case 'enqueue':
      if (state.tasks[action.task.id]) return state

      return {
        ...state,
        tasks: {
          ...state.tasks,
          [action.task.id]: action.task,
        },
        order: [...state.order, action.task.id],
      }

    case 'start':
      return updateTask(state, action.id, (task) => ({
        ...task,
        status: 'running',
        attempt: task.attempt + 1,
        error: null,
        startedAt: action.now,
        updatedAt: action.now,
      }), {
        activeIds: addUnique(state.activeIds, action.id),
      })

    case 'progress':
      return updateTask(state, action.id, (task) => ({
        ...task,
        progress: {
          ...task.progress,
          ...normalizeProgress(action.progress),
        },
        updatedAt: action.now,
      }))

    case 'succeed':
      return updateTask(state, action.id, (task) => ({
        ...task,
        status: 'succeeded',
        result: action.result,
        error: null,
        progress: {
          ...task.progress,
          current: clampProgressValue(task.progress.total ?? task.progress.current),
        },
        updatedAt: action.now,
        finishedAt: action.now,
      }), {
        activeIds: state.activeIds.filter((id) => id !== action.id),
      })

    case 'fail':
      return updateTask(state, action.id, (task) => ({
        ...task,
        status: 'failed',
        error: action.error,
        updatedAt: action.now,
        finishedAt: action.now,
      }), {
        activeIds: state.activeIds.filter((id) => id !== action.id),
      })

    case 'retry':
      return updateTask(state, action.id, (task) => ({
        ...task,
        status: 'queued',
        error: null,
        result: null,
        cancelRequested: false,
        finishedAt: null,
        updatedAt: action.now,
      }), {
        activeIds: state.activeIds.filter((activeId) => activeId !== action.id),
      })

    case 'request-cancel':
      return updateTask(state, action.id, (task) => ({
        ...task,
        cancelRequested: true,
        updatedAt: action.now,
      }))

    case 'cancel':
      return updateTask(state, action.id, (task) => ({
        ...task,
        status: 'cancelled',
        cancelRequested: true,
        updatedAt: action.now,
        finishedAt: action.now,
      }), {
        activeIds: state.activeIds.filter((activeId) => activeId !== action.id),
      })

    case 'remove': {
      const { [action.id]: _removed, ...tasks } = state.tasks

      return {
        ...state,
        tasks,
        order: state.order.filter((id) => id !== action.id),
        activeIds: state.activeIds.filter((id) => id !== action.id),
      }
    }

    case 'clear-completed': {
      const keepIds = state.order.filter((id) => {
        const status = state.tasks[id]?.status
        return status !== 'succeeded' && status !== 'failed' && status !== 'cancelled'
      })

      return {
        ...state,
        tasks: keepIds.reduce<Record<TaskId, TaskItem>>((tasks, id) => {
          tasks[id] = state.tasks[id]
          return tasks
        }, {}),
        order: keepIds,
        activeIds: state.activeIds.filter((id) => keepIds.includes(id)),
      }
    }

    default:
      return state
  }
}

function updateTask(
  state: TaskQueueState,
  id: TaskId,
  update: (task: TaskItem) => TaskItem,
  patch: Partial<TaskQueueState> = {}
): TaskQueueState {
  const task = state.tasks[id]
  if (!task) return state

  return {
    ...state,
    ...patch,
    tasks: {
      ...state.tasks,
      [id]: update(task),
    },
  }
}

function addUnique(values: TaskId[], value: TaskId) {
  return values.includes(value) ? values : [...values, value]
}

function normalizeProgress(progress: Partial<TaskProgress>) {
  const normalized: Partial<TaskProgress> = { ...progress }

  if (progress.current !== undefined) {
    normalized.current = clampProgressValue(progress.current)
  }

  if (progress.total !== undefined) {
    normalized.total = clampProgressValue(progress.total)
  }

  return normalized
}

function clampProgressValue(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, value))
}
