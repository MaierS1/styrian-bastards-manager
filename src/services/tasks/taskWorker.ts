import type { TaskItem, TaskWorker, TaskWorkerContext } from './taskTypes.ts'

export function createTaskWorkerRegistry() {
  const workers = new Map<string, TaskWorker>()

  function register(type: string, worker: TaskWorker) {
    if (!type.trim()) {
      throw new Error('Task worker type is required.')
    }

    workers.set(type, worker)

    return () => unregister(type)
  }

  function unregister(type: string) {
    workers.delete(type)
  }

  function get(type: string) {
    return workers.get(type) || null
  }

  function has(type: string) {
    return workers.has(type)
  }

  return {
    register,
    unregister,
    get,
    has,
  }
}

export async function runTaskWorker(task: TaskItem, worker: TaskWorker, context: Omit<TaskWorkerContext, 'task'>) {
  return worker(task.payload, {
    ...context,
    task,
  })
}

export type TaskWorkerRegistry = ReturnType<typeof createTaskWorkerRegistry>
