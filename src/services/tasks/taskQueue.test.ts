import assert from 'node:assert/strict'
import test from 'node:test'
import { createTaskQueue } from './taskQueue.ts'
import type { TaskItem } from './taskTypes.ts'

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function waitForTask(queue: ReturnType<typeof createTaskQueue>, id: string) {
  return new Promise<void>((resolve) => {
    const current = queue.getTask(id)
    if (current && ['succeeded', 'failed', 'cancelled'].includes(current.status)) {
      resolve()
      return
    }

    const off = queue.on('*', (event) => {
      if (event.task.id !== id) return
      if (!['succeeded', 'failed', 'cancelled'].includes(event.task.status)) return

      off()
      resolve()
    })
  })
}

function waitForStatus(queue: ReturnType<typeof createTaskQueue>, id: string, status: string) {
  return new Promise<void>((resolve) => {
    if (queue.getTask(id)?.status === status) {
      resolve()
      return
    }

    const off = queue.on('*', (event) => {
      if (event.task.id !== id || event.task.status !== status) return

      off()
      resolve()
    })
  })
}

function waitForTaskMatching(
  queue: ReturnType<typeof createTaskQueue>,
  id: string,
  predicate: (task: TaskItem) => boolean
) {
  return new Promise<void>((resolve) => {
    const current = queue.getTask(id)
    if (current && predicate(current)) {
      resolve()
      return
    }

    const off = queue.on('*', (event) => {
      if (event.task.id !== id || !predicate(event.task)) return

      off()
      resolve()
    })
  })
}

test('queues tasks and runs a registered worker', async () => {
  const queue = createTaskQueue({ concurrency: 1 })
  queue.registerWorker('double', async (payload) => {
    return Number(payload) * 2
  })

  const id = queue.enqueue('double', 21)
  await waitForTask(queue, id)

  const task = queue.getTask(id)
  assert.equal(task?.status, 'succeeded')
  assert.equal(task?.result, 42)
})

test('retries failed tasks until maxRetries is reached', async () => {
  const queue = createTaskQueue({ concurrency: 1 })
  let attempts = 0

  queue.registerWorker('flaky', async () => {
    attempts += 1
    if (attempts < 2) throw new Error('temporary')
    return 'ok'
  })

  const id = queue.enqueue('flaky', null, { maxRetries: 1 })
  await waitForStatus(queue, id, 'succeeded')

  const task = queue.getTask(id)
  assert.equal(attempts, 2)
  assert.equal(task?.status, 'succeeded')
  assert.equal(task?.result, 'ok')
})

test('respects maxAttempts for permanent failures', async () => {
  const queue = createTaskQueue({ concurrency: 1 })
  let attempts = 0

  queue.registerWorker('always-fails', async () => {
    attempts += 1
    throw new Error('permanent')
  })

  const id = queue.enqueue('always-fails', null, { maxAttempts: 2 })
  await waitForTaskMatching(queue, id, (task) => task.status === 'failed' && task.attempt === 2)

  const task = queue.getTask(id)
  assert.equal(attempts, 2)
  assert.equal(task?.attempt, 2)
  assert.equal(task?.status, 'failed')
  assert.equal(task?.error?.message, 'permanent')
})

test('limits parallel workers by configured concurrency', async () => {
  const queue = createTaskQueue({ concurrency: 2 })
  let active = 0
  let maxActive = 0

  queue.registerWorker('slow', async () => {
    active += 1
    maxActive = Math.max(maxActive, active)
    await wait(20)
    active -= 1
    return 'done'
  })

  const ids = [
    queue.enqueue('slow', 1),
    queue.enqueue('slow', 2),
    queue.enqueue('slow', 3),
    queue.enqueue('slow', 4),
  ]

  await Promise.all(ids.map((id) => waitForTask(queue, id)))

  assert.equal(maxActive, 2)
  assert.deepEqual(ids.map((id) => queue.getTask(id)?.status), [
    'succeeded',
    'succeeded',
    'succeeded',
    'succeeded',
  ])
})

test('emits status and progress changes', async () => {
  const queue = createTaskQueue({ concurrency: 1 })
  const events: string[] = []

  queue.on('*', (event) => {
    events.push(`${event.name}:${event.task.status}:${event.task.progress.current}`)
  })

  queue.registerWorker('progress', async (_payload, context) => {
    context.reportProgress({ current: 1, total: 2, message: 'half' })
    context.reportProgress({ current: 2, total: 2, message: 'done' })
    return true
  })

  const id = queue.enqueue('progress', null)
  await waitForTask(queue, id)

  assert.equal(queue.getTask(id)?.status, 'succeeded')
  assert.ok(events.some((event) => event.startsWith('task:started:running')))
  assert.ok(events.some((event) => event === 'task:progress:running:1'))
  assert.ok(events.some((event) => event.startsWith('task:succeeded:succeeded')))
})

test('clamps progress values between 0 and 100', async () => {
  const queue = createTaskQueue({ concurrency: 1 })

  queue.registerWorker('progress-clamp', async (_payload, context) => {
    context.reportProgress({ current: -10, total: 150 })
    context.reportProgress({ current: 120 })
    return true
  })

  const id = queue.enqueue('progress-clamp', null)
  await waitForTask(queue, id)

  const task = queue.getTask(id)
  assert.equal(task?.progress.current, 100)
  assert.equal(task?.progress.total, 100)
})

test('isolates worker errors from other queued tasks', async () => {
  const queue = createTaskQueue({ concurrency: 1 })

  queue.registerWorker('mixed', async (payload) => {
    if (payload === 'fail') throw new Error('task failed')
    return payload
  })

  const failedId = queue.enqueue('mixed', 'fail')
  const succeededId = queue.enqueue('mixed', 'ok')

  await Promise.all([
    waitForTask(queue, failedId),
    waitForTask(queue, succeededId),
  ])

  assert.equal(queue.getTask(failedId)?.status, 'failed')
  assert.equal(queue.getTask(succeededId)?.status, 'succeeded')
  assert.equal(queue.getTask(succeededId)?.result, 'ok')
})

test('cancels queued and running tasks', async () => {
  const queue = createTaskQueue({ concurrency: 1 })

  queue.registerWorker('blocking', async (_payload, context) => {
    await new Promise((_resolve, reject) => {
      context.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true })
    })
  })

  const runningId = queue.enqueue('blocking', null)
  const queuedId = queue.enqueue('blocking', null)

  await wait(0)
  assert.equal(queue.cancel(queuedId), true)
  assert.equal(queue.cancel(runningId), true)

  await Promise.all([
    waitForTask(queue, runningId),
    waitForTask(queue, queuedId),
  ])

  assert.equal(queue.getTask(runningId)?.status, 'cancelled')
  assert.equal(queue.getTask(queuedId)?.status, 'cancelled')
})

test('does not accept worker result after a running task is cancelled', async () => {
  const queue = createTaskQueue({ concurrency: 1 })
  let releaseWorker: (() => void) | null = null

  queue.registerWorker('late-result', async () => {
    await new Promise<void>((resolve) => {
      releaseWorker = resolve
    })
    return 'late'
  })

  const id = queue.enqueue('late-result', null)
  await waitForStatus(queue, id, 'running')
  assert.equal(queue.cancel(id), true)
  releaseWorker?.()
  await waitForTask(queue, id)

  const task = queue.getTask(id)
  assert.equal(task?.status, 'cancelled')
  assert.equal(task?.result, null)
})

test('removes event subscribers cleanly', async () => {
  const queue = createTaskQueue({ concurrency: 1 })
  let callCount = 0

  const off = queue.on('task:queued', () => {
    callCount += 1
  })

  queue.registerWorker('noop', async () => true)
  const firstId = queue.enqueue('noop', 1)
  off()
  const secondId = queue.enqueue('noop', 2)

  await Promise.all([
    waitForTask(queue, firstId),
    waitForTask(queue, secondId),
  ])

  assert.equal(callCount, 1)
})
