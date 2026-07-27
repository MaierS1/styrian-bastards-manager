import assert from 'node:assert/strict'
import test from 'node:test'
import { createPushSubscriptionRepository } from './pushSubscriptionRepositoryCore.js'

const FIXED_NOW = '2026-07-28T10:00:00.000Z'

function createFakeClient({ authUserId = 'auth-1', rows = [], error = null } = {}) {
  const state = {
    authUserId,
    rows: rows.map((row) => ({ table: 'push_subscriptions', ...row })),
    error,
    queries: [],
  }

  return {
    state,
    auth: {
      async getUser() {
        return { data: { user: { id: authUserId } }, error: null }
      },
    },
    from(table) {
      const query = new FakeQuery(state, table)
      state.queries.push(query)
      return query
    },
  }
}

class FakeQuery {
  constructor(state, table) {
    this.state = state
    this.table = table
    this.operations = []
    this.upsertPayload = null
    this.updatePayload = null
    this.singleResult = false
    this.maybeSingleResult = false
  }

  select(columns) {
    this.operations.push({ type: 'select', columns })
    return this
  }

  eq(column, value) {
    this.operations.push({ type: 'eq', column, value })
    return this
  }

  or(filter) {
    this.operations.push({ type: 'or', filter })
    return this
  }

  order(column, options) {
    this.operations.push({ type: 'order', column, options })
    return this
  }

  limit(value) {
    this.operations.push({ type: 'limit', value })
    return this
  }

  upsert(payload, options) {
    this.upsertPayload = payload
    this.operations.push({ type: 'upsert', payload, options })
    return this
  }

  update(payload) {
    this.updatePayload = payload
    this.operations.push({ type: 'update', payload })
    return this
  }

  single() {
    this.singleResult = true
    return this
  }

  maybeSingle() {
    this.maybeSingleResult = true
    return this
  }

  then(resolve, reject) {
    Promise.resolve(this.execute()).then(resolve, reject)
  }

  execute() {
    if (this.state.error) return { data: null, error: this.state.error }

    if (this.upsertPayload) {
      const existingIndex = this.state.rows.findIndex((row) => row.endpoint === this.upsertPayload.endpoint)
      const row = {
        ...(existingIndex >= 0 ? this.state.rows[existingIndex] : {}),
        ...this.upsertPayload,
        id: existingIndex >= 0 ? this.state.rows[existingIndex].id : `sub-${this.state.rows.length + 1}`,
        table: this.table,
      }

      if (existingIndex >= 0) this.state.rows[existingIndex] = row
      else this.state.rows.push(row)

      return { data: row, error: null }
    }

    let data = this.state.rows.filter((row) => row.table === this.table)
    data = this.applyFilters(data)

    if (this.updatePayload) {
      const ids = new Set(data.map((row) => row.id))
      this.state.rows = this.state.rows.map((row) => (
        ids.has(row.id) ? { ...row, ...this.updatePayload } : row
      ))
      data = this.state.rows.filter((row) => ids.has(row.id))
    }

    const limit = this.operations.find((operation) => operation.type === 'limit')?.value
    if (limit !== undefined) data = data.slice(0, limit)

    if (this.singleResult) {
      return data[0]
        ? { data: data[0], error: null }
        : { data: null, error: { message: 'No rows found' } }
    }
    if (this.maybeSingleResult) return { data: data[0] || null, error: null }
    return { data, error: null }
  }

  applyFilters(data) {
    return this.operations.reduce((items, operation) => {
      if (operation.type === 'eq') {
        return items.filter((item) => item[operation.column] === operation.value)
      }
      if (operation.type === 'or') {
        const filters = operation.filter.split(',')
        return items.filter((item) => filters.some((filter) => {
          const match = /^([a-z_]+)\.eq\.(.*)$/.exec(filter)
          return match && String(item[match[1]] || '') === match[2]
        }))
      }
      return items
    }, data)
  }
}

function subscription(overrides = {}) {
  return {
    id: 'sub-1',
    auth_user_id: 'auth-1',
    member_id: 'member-1',
    endpoint: 'https://push.example/device-1',
    p256dh: 'key',
    auth: 'auth',
    is_active: true,
    ...overrides,
  }
}

test('upserts own subscription using the authenticated session user', async () => {
  const client = createFakeClient({ authUserId: 'auth-session' })
  const repository = createPushSubscriptionRepository(client, { now: () => FIXED_NOW })

  const result = await repository.upsertOwnSubscription({
    auth_user_id: 'auth-session',
    member_id: 'member-1',
    endpoint: 'https://push.example/device',
    p256dh: 'key',
    auth: 'auth',
  })

  assert.equal(result.error, null)
  assert.equal(result.data.auth_user_id, 'auth-session')
  assert.equal(result.data.member_id, 'member-1')
})

test('rejects a foreign auth_user_id before writing', async () => {
  const client = createFakeClient({ authUserId: 'auth-session' })
  const repository = createPushSubscriptionRepository(client)

  const result = await repository.upsertOwnSubscription({
    auth_user_id: 'other-user',
    endpoint: 'https://push.example/device',
    p256dh: 'key',
    auth: 'auth',
  })

  assert.equal(result.data, null)
  assert.equal(result.error.status, 403)
  assert.equal(client.state.queries.length, 0)
})

test('prevents duplicate endpoint rows by upserting on endpoint', async () => {
  const client = createFakeClient({
    rows: [subscription({ id: 'existing', endpoint: 'https://push.example/device' })],
  })
  const repository = createPushSubscriptionRepository(client, { now: () => FIXED_NOW })

  await repository.upsertOwnSubscription({
    endpoint: 'https://push.example/device',
    p256dh: 'new-key',
    auth: 'new-auth',
  })

  assert.equal(client.state.rows.length, 1)
  assert.equal(client.state.rows[0].id, 'existing')
  assert.equal(client.state.rows[0].p256dh, 'new-key')
  assert.equal(client.state.queries[0].operations.some((operation) => (
    operation.type === 'upsert' && operation.options.onConflict === 'endpoint'
  )), true)
})

test('reads only own subscription filters', async () => {
  const client = createFakeClient({
    rows: [
      subscription({ id: 'own', auth_user_id: 'auth-1' }),
      subscription({ id: 'foreign', auth_user_id: 'auth-2' }),
    ],
  })
  const repository = createPushSubscriptionRepository(client)

  const result = await repository.getOwnSubscriptions({ authUserId: 'auth-1' })

  assert.deepEqual(result.data.map((row) => row.id), ['own'])
})

test('soft-deactivates a subscription without deleting it', async () => {
  const client = createFakeClient({ rows: [subscription()] })
  const repository = createPushSubscriptionRepository(client, { now: () => FIXED_NOW })

  const result = await repository.deactivateSubscription({ id: 'sub-1' })

  assert.equal(result.data.id, 'sub-1')
  assert.equal(result.data.is_active, false)
  assert.equal(result.data.opted_out_at, FIXED_NOW)
  assert.equal(client.state.rows.length, 1)
})

test('updates a device label without exposing the endpoint in errors or logs', async () => {
  const client = createFakeClient({ rows: [subscription()] })
  const repository = createPushSubscriptionRepository(client, { now: () => FIXED_NOW })
  const originalConsoleError = console.error
  const consoleErrors = []
  console.error = (...args) => consoleErrors.push(args.join(' '))

  try {
    const result = await repository.updateDeviceLabel({ id: 'sub-1', deviceLabel: 'Mein Browser' })

    assert.equal(result.error, null)
    assert.equal(result.data.device_label, 'Mein Browser')
    assert.equal(consoleErrors.some((line) => line.includes('https://push.example/device-1')), false)
  } finally {
    console.error = originalConsoleError
  }
})
