import { useCallback, useEffect, useState } from 'react'
import { createTaskQueue } from './taskQueue.ts'
import type { TaskQueueOptions, TaskWorker } from './taskTypes.ts'

export function useTaskQueue(options: TaskQueueOptions = {}) {
  const [queue] = useState(() => createTaskQueue(options))
  const [state, setState] = useState(queue.getState())
  const enqueue = useCallback(queue.enqueue.bind(queue), [queue])
  const cancel = useCallback(queue.cancel.bind(queue), [queue])
  const retry = useCallback(queue.retry.bind(queue), [queue])
  const setConcurrency = useCallback(queue.setConcurrency.bind(queue), [queue])
  const clearCompleted = useCallback(queue.clearCompleted.bind(queue), [queue])
  const registerWorker = useCallback((type: string, worker: TaskWorker) => (
    queue.registerWorker(type, worker)
  ), [queue])

  useEffect(() => {
    return queue.on('queue:changed', (event) => {
      setState(event.state)
    })
  }, [queue])

  return {
    queue,
    state,
    tasks: queue.getTasks(),
    enqueue,
    cancel,
    retry,
    registerWorker,
    setConcurrency,
    clearCompleted,
  }
}
