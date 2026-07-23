import assert from 'node:assert/strict'
import test from 'node:test'
import { createNotificationRepository } from './notificationRepositoryCore.js'

const FIXED_NOW = '2026-07-23T18:00:00.000Z'

function createFakeClient({ rows = [], error = null } = {}) {
  const state = {
    rows: rows.map((row) => ({ ...row })),
    error,
    queries: [],
    channels: [],
    removedChannels: [],
  }

  return {
    state,
    from(table) {
      const query = new FakeQuery(state, table)
      state.queries.push(query)
      return query
    },
    channel(name) {
      const channel = new FakeChannel(name)
      state.channels.push(channel)
      return channel
    },
    removeChannel(channel) {
      state.removedChannels.push(channel)
    },
  }
}

class FakeChannel {
  constructor(name) {
    this.name = name
    this.handlers = []
    this.subscribed = false
  }

  on(event, filter, handler) {
    this.handlers.push({ event, filter, handler })
    return this
  }

  subscribe() {
    this.subscribed = true
    return this
  }
}

class FakeQuery {
  constructor(state, table) {
    this.state = state
    this.table = table
    this.operations = []
    this.updatePayload = null
    this.singleResult = false
    this.maybeSingleResult = false
  }

  select(columns, options) {
    this.operations.push({ type: 'select', columns, options })
    return this
  }

  is(column, value) {
    this.operations.push({ type: 'is', column, value })
    return this
  }

  eq(column, value) {
    this.operations.push({ type: 'eq', column, value })
    return this
  }

  lt(column, value) {
    this.operations.push({ type: 'lt', column, value })
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

  update(payload) {
    this.updatePayload = payload
    this.operations.push({ type: 'update', payload })
    return this
  }

  insert(payload) {
    this.operations.push({ type: 'insert', payload })
    this.state.rows.push({ ...payload, id: payload.id || `inserted-${this.state.rows.length}` })
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

    let data = this.state.rows.filter((row) => row.table === this.table || this.table === 'in_app_notifications')
    data = this.applyFilters(data)

    if (this.updatePayload) {
      const ids = new Set(data.map((row) => row.id))
      this.state.rows = this.state.rows.map((row) => (
        ids.has(row.id) ? { ...row, ...this.updatePayload } : row
      ))
      data = this.state.rows.filter((row) => ids.has(row.id))
    }

    data = this.applyOrdering(data)
    const limit = this.operations.find((operation) => operation.type === 'limit')?.value
    if (limit !== undefined) data = data.slice(0, limit)

    const select = this.operations.find((operation) => operation.type === 'select')
    if (select?.options?.head) return { data: null, error: null, count: data.length }
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
      if (operation.type === 'is') {
        return items.filter((item) => item[operation.column] === operation.value)
      }
      if (operation.type === 'eq') {
        return items.filter((item) => item[operation.column] === operation.value)
      }
      if (operation.type === 'lt') {
        return items.filter((item) => String(item[operation.column] || '') < operation.value)
      }
      if (operation.type === 'or') {
        return items.filter((item) => matchesCursorOrFilter(item, operation.filter))
      }
      return items
    }, data)
  }

  applyOrdering(data) {
    const orders = this.operations.filter((operation) => operation.type === 'order')
    return [...data].sort((a, b) => {
      for (const order of orders) {
        const left = String(a[order.column] || '')
        const right = String(b[order.column] || '')
        const comparison = left.localeCompare(right)
        if (comparison !== 0) return order.options?.ascending === false ? -comparison : comparison
      }
      return 0
    })
  }
}

function matchesCursorOrFilter(item, filter) {
  const match = /^created_at\.lt\.(.*),and\(created_at\.eq\.(.*),id\.lt\.(.*)\)$/.exec(filter)
  if (!match) return false
  const [, olderCreatedAt, sameCreatedAt, lowerId] = match
  return String(item.created_at || '') < olderCreatedAt
    || (String(item.created_at || '') === sameCreatedAt && String(item.id || '') < lowerId)
}

test('fetchInAppNotifications uses stable created_at and id cursor ordering', async () => {
  const client = createFakeClient({
    rows: [
      notification('c', '2026-07-20T10:00:00Z'),
      notification('b', '2026-07-20T10:00:00Z'),
      notification('a', '2026-07-20T10:00:00Z'),
      notification('z', '2026-07-19T10:00:00Z'),
    ],
  })
  const repository = createNotificationRepository(client, { now: () => FIXED_NOW })

  const firstPage = await repository.fetchInAppNotifications({ limit: 2 })
  const secondPage = await repository.fetchInAppNotifications({
    limit: 2,
    cursor: firstPage.data[firstPage.data.length - 1],
  })
  const thirdPage = await repository.fetchInAppNotifications({
    limit: 2,
    cursor: secondPage.data[secondPage.data.length - 1],
  })

  assert.deepEqual(firstPage.data.map((item) => item.id), ['c', 'b'])
  assert.deepEqual(secondPage.data.map((item) => item.id), ['a', 'z'])
  assert.deepEqual(thirdPage.data, [])
})

test('fetchInAppNotifications applies unreadOnly and archived filters', async () => {
  const client = createFakeClient({
    rows: [
      notification('unread', '2026-07-20T10:00:00Z'),
      notification('read', '2026-07-20T09:00:00Z', { read_at: FIXED_NOW }),
      notification('archived', '2026-07-20T08:00:00Z', { archived_at: FIXED_NOW }),
    ],
  })
  const repository = createNotificationRepository(client)

  const result = await repository.fetchInAppNotifications({ unreadOnly: true })

  assert.deepEqual(result.data.map((item) => item.id), ['unread'])
})

test('repository returns Supabase errors unchanged', async () => {
  const error = { message: 'permission denied' }
  const client = createFakeClient({ error })
  const repository = createNotificationRepository(client)

  const result = await repository.fetchInAppNotifications()

  assert.equal(result.error, error)
})

test('markInAppNotificationRead updates a single notification', async () => {
  const client = createFakeClient({
    rows: [notification('one', '2026-07-20T10:00:00Z')],
  })
  const repository = createNotificationRepository(client, { now: () => FIXED_NOW })

  const result = await repository.markInAppNotificationRead('one')

  assert.equal(result.data.id, 'one')
  assert.equal(result.data.read_at, FIXED_NOW)
})

test('markAllInAppNotificationsRead updates only active unread notifications', async () => {
  const client = createFakeClient({
    rows: [
      notification('one', '2026-07-20T10:00:00Z'),
      notification('read', '2026-07-20T09:00:00Z', { read_at: '2026-07-21T10:00:00Z' }),
      notification('archived', '2026-07-20T08:00:00Z', { archived_at: FIXED_NOW }),
    ],
  })
  const repository = createNotificationRepository(client, { now: () => FIXED_NOW })

  const result = await repository.markAllInAppNotificationsRead()

  assert.deepEqual(result.data.map((item) => item.id), ['one'])
  assert.equal(result.data[0].read_at, FIXED_NOW)
})

test('subscribeToInAppNotifications registers auth and member realtime filters', () => {
  const client = createFakeClient()
  const repository = createNotificationRepository(client)
  const subscription = repository.subscribeToInAppNotifications({
    authUserId: 'auth-1',
    memberId: 'member-1',
    onChange: () => {},
  })

  assert.equal(client.state.channels.length, 1)
  assert.equal(client.state.channels[0].subscribed, true)
  assert.deepEqual(client.state.channels[0].handlers.map((handler) => handler.filter.filter), [
    'auth_user_id=eq.auth-1',
    'member_id=eq.member-1',
  ])

  subscription.unsubscribe()
  assert.equal(client.state.removedChannels.length, 1)
})

function notification(id, createdAt, overrides = {}) {
  return {
    id,
    table: 'in_app_notifications',
    created_at: createdAt,
    read_at: null,
    archived_at: null,
    deleted_at: null,
    ...overrides,
  }
}
