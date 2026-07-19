export const TASK_STATUSES = [
  'queued',
  'running',
  'succeeded',
  'failed',
  'cancelled',
] as const

export type TaskStatus = typeof TASK_STATUSES[number]

export type TaskId = string

export type TaskProgress = {
  current: number
  total?: number
  message?: string
}

export type TaskError = {
  message: string
  code?: string
  cause?: unknown
}

export type TaskItem<TPayload = unknown, TResult = unknown> = {
  id: TaskId
  type: string
  payload: TPayload
  status: TaskStatus
  progress: TaskProgress
  attempt: number
  maxAttempts: number
  error: TaskError | null
  result: TResult | null
  cancelRequested: boolean
  createdAt: number
  updatedAt: number
  startedAt: number | null
  finishedAt: number | null
}

export type TaskQueueState = {
  tasks: Record<TaskId, TaskItem>
  order: TaskId[]
  activeIds: TaskId[]
}

export type TaskEventName =
  | 'task:queued'
  | 'task:started'
  | 'task:progress'
  | 'task:succeeded'
  | 'task:failed'
  | 'task:retrying'
  | 'task:cancel-requested'
  | 'task:cancelled'
  | 'queue:changed'

export type TaskEvent = {
  name: TaskEventName
  task: TaskItem
  state: TaskQueueState
}

export type TaskEventListener = (event: TaskEvent) => void

export type TaskWorkerContext = {
  task: TaskItem
  signal: AbortSignal
  reportProgress: (progress: Partial<TaskProgress>) => void
}

export type TaskWorker<TPayload = unknown, TResult = unknown> = (
  payload: TPayload,
  context: TaskWorkerContext
) => Promise<TResult> | TResult

export type TaskWorkerRegistration<TPayload = unknown, TResult = unknown> = {
  type: string
  worker: TaskWorker<TPayload, TResult>
}

export type EnqueueTaskOptions = {
  id?: TaskId
  maxAttempts?: number
  maxRetries?: number
  progress?: Partial<TaskProgress>
}

export type TaskQueueOptions = {
  concurrency?: number
  now?: () => number
  createId?: () => TaskId
  autoStart?: boolean
}
