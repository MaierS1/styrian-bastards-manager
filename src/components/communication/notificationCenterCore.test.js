import assert from 'node:assert/strict'
import test from 'node:test'
import {
  applyOptimisticRead,
  createNotificationCursor,
  formatUnreadBadge,
  getCategoryLabel,
  getNotificationListState,
  isSafeInternalPath,
  mergeNotificationPage,
  mergeNotificationList,
  normalizeNotificationItems,
  openNotificationAndNavigate,
  paginateNotifications,
  resolveNotificationTarget,
} from './notificationCenterCore.js'

test('formats unread badge compactly', () => {
  assert.equal(formatUnreadBadge(0), '')
  assert.equal(formatUnreadBadge(7), '7')
  assert.equal(formatUnreadBadge(99), '99')
  assert.equal(formatUnreadBadge(120), '99+')
})

test('resolves known categories and falls back safely', () => {
  assert.equal(getCategoryLabel('invoice'), 'Rechnung')
  assert.equal(getCategoryLabel('unknown'), 'unknown')
  assert.equal(getCategoryLabel(''), 'Info')
})

test('accepts only safe internal notification paths', () => {
  assert.equal(isSafeInternalPath('/dashboard'), true)
  assert.equal(isSafeInternalPath('/events/123?tab=details'), true)
  assert.equal(isSafeInternalPath('https://example.com'), false)
  assert.equal(isSafeInternalPath('//example.com'), false)
  assert.equal(isSafeInternalPath('javascript:alert(1)'), false)
  assert.equal(isSafeInternalPath('/x?next=javascript:alert(1)'), false)
})

test('resolves notification targets from safe paths or source modules', () => {
  const canOpenPage = (page) => ['events', 'fees'].includes(page)

  assert.deepEqual(resolveNotificationTarget({ url: '/events/123' }, { canOpenPage }), {
    kind: 'path',
    path: '/events/123',
    page: 'events',
    entityId: null,
  })

  assert.deepEqual(resolveNotificationTarget({
    url: '',
    data: { source: { module: 'membership_fees' } },
  }, { canOpenPage }), {
    kind: 'page',
    page: 'fees',
    path: null,
    entityId: null,
  })
})

test('resolves member notification deep links with query ids', () => {
  const target = resolveNotificationTarget({
    type: 'member_accepted',
    category: 'member',
    url: '/members?id=member-1',
    data: {
      source: { module: 'mitglieder', entity_id: 'member-1' },
      metadata: { member_id: 'member-1' },
    },
  }, { canOpenPage: (page) => page === 'members' })

  assert.deepEqual(target, {
    kind: 'path',
    page: 'members',
    path: '/members?id=member-1',
    entityId: 'member-1',
  })
})

test('falls back safely for member notifications without ids', () => {
  assert.deepEqual(resolveNotificationTarget({
    type: 'member_accepted',
    category: 'member',
    url: '',
  }, { canOpenPage: (page) => page === 'members' }), {
    kind: 'fallback',
    page: 'members',
    path: null,
    entityId: null,
  })
})

test('resolves all integrated notification categories to existing pages', () => {
  const expectedPages = {
    event: 'events',
    invoice: 'invoices',
    financing: 'financingLiabilities',
    member: 'members',
    membership_fee: 'fees',
    shop: 'merch',
    sponsor: 'sponsors',
    document: 'documents',
    press: 'media',
    news: 'media',
  }

  for (const [category, page] of Object.entries(expectedPages)) {
    assert.equal(resolveNotificationTarget({
      category,
      url: `/${page === 'financingLiabilities' ? 'financing' : page}?id=target-1`,
    }, { canOpenPage: () => true }).page, page)
  }
})

test('rejects notification targets that are unknown or not permitted', () => {
  assert.deepEqual(resolveNotificationTarget({ url: '/unknown' }, { canOpenPage: () => true }), {
    kind: 'fallback',
    page: 'dashboard',
    path: null,
    entityId: null,
  })

  assert.deepEqual(resolveNotificationTarget({ url: '/admin' }, { canOpenPage: () => false }), {
    kind: 'none',
    page: null,
    path: null,
    entityId: null,
  })

  assert.deepEqual(resolveNotificationTarget({ url: '/admin' }, { canOpenPage: (page) => page === 'admin' }), {
    kind: 'path',
    page: 'admin',
    path: '/admin',
    entityId: null,
  })
})

test('rejects external, protocol-relative, javascript, missing, and manipulated targets', () => {
  const canOpenPage = (page) => page === 'dashboard'
  const rejectedTargets = [
    { url: 'https://example.com' },
    { url: '//example.com' },
    { url: 'javascript:alert(1)' },
    { url: '' },
    { url: '/events?next=javascript:alert(1)' },
    { url: '/events\r\n/admin' },
  ]

  for (const notification of rejectedTargets) {
    assert.deepEqual(resolveNotificationTarget(notification, { canOpenPage }), {
      kind: 'fallback',
      page: 'dashboard',
      path: null,
      entityId: null,
    })
  }
})

test('keeps blocked invalid deep links on none when fallback is not permitted', () => {
  assert.deepEqual(resolveNotificationTarget({ url: 'javascript:alert(1)' }, { canOpenPage: () => false }), {
    kind: 'none',
    page: null,
    path: null,
    entityId: null,
  })
})

test('marks a notification as read and navigates once', async () => {
  const calls = []
  const result = await openNotificationAndNavigate({
    notification: { id: 'n1', url: '/members?id=member-1', category: 'member' },
    markRead: async (notification) => calls.push(['read', notification.id]),
    onNavigate: (page, target) => calls.push(['navigate', page, target.entityId]),
    canOpenPage: (page) => page === 'members',
  })

  assert.equal(result.navigated, true)
  assert.deepEqual(calls, [
    ['read', 'n1'],
    ['navigate', 'members', 'member-1'],
  ])
})

test('navigates even when marking read fails and does not navigate twice', async () => {
  const calls = []
  const result = await openNotificationAndNavigate({
    notification: { id: 'n1', url: '/members?id=member-1', category: 'member' },
    markRead: async () => {
      throw new Error('read failed')
    },
    onNavigate: (page) => calls.push(page),
    onError: (error) => calls.push(error.message),
    canOpenPage: (page) => page === 'members',
  })

  assert.equal(result.navigated, true)
  assert.deepEqual(calls, ['read failed', 'members'])
})

test('merges realtime notification changes without duplicates', () => {
  const current = [
    { id: '1', title: 'Alt', created_at: '2026-07-20T10:00:00Z' },
    { id: '2', title: 'Zwei', created_at: '2026-07-20T09:00:00Z' },
  ]

  const merged = mergeNotificationList(current, {
    id: '1',
    title: 'Neu',
    created_at: '2026-07-20T11:00:00Z',
  })

  assert.equal(merged.length, 2)
  assert.equal(merged[0].title, 'Neu')
})

test('merges realtime notification changes with stable ordering and limit', () => {
  const merged = mergeNotificationList([
    { id: 'a', title: 'A', created_at: '2026-07-20T10:00:00Z' },
    { id: 'b', title: 'B', created_at: '2026-07-20T10:00:00Z' },
  ], {
    id: 'c',
    title: 'C',
    created_at: '2026-07-20T10:00:00Z',
  }, { limit: 2 })

  assert.deepEqual(merged.map((item) => item.id), ['c', 'b'])
})

test('removes archived or deleted realtime notification changes from lists', () => {
  const current = [
    { id: '1', title: 'Alt', created_at: '2026-07-20T10:00:00Z' },
  ]

  assert.deepEqual(mergeNotificationList(current, {
    id: '1',
    title: 'Alt',
    archived_at: '2026-07-20T11:00:00Z',
  }), [])
})

test('creates cursor and paginates notifications without skipping identical timestamps', () => {
  const items = [
    { id: 'c', created_at: '2026-07-20T10:00:00Z' },
    { id: 'b', created_at: '2026-07-20T10:00:00Z' },
    { id: 'a', created_at: '2026-07-20T10:00:00Z' },
    { id: 'z', created_at: '2026-07-19T10:00:00Z' },
  ]

  const firstPage = paginateNotifications(items, { limit: 2 })
  const secondPage = paginateNotifications(items, {
    cursor: createNotificationCursor(firstPage[firstPage.length - 1]),
    limit: 2,
  })
  const emptyPage = paginateNotifications(items, {
    cursor: createNotificationCursor(secondPage[secondPage.length - 1]),
    limit: 2,
  })

  assert.deepEqual(firstPage.map((item) => item.id), ['c', 'b'])
  assert.deepEqual(secondPage.map((item) => item.id), ['a', 'z'])
  assert.deepEqual(emptyPage, [])
})

test('appends paginated notification rows without duplicates', () => {
  const merged = mergeNotificationPage([
    { id: 'c', created_at: '2026-07-20T10:00:00Z' },
    { id: 'b', created_at: '2026-07-20T10:00:00Z' },
  ], [
    { id: 'b', created_at: '2026-07-20T10:00:00Z' },
    { id: 'a', created_at: '2026-07-20T10:00:00Z' },
  ])

  assert.deepEqual(merged.map((item) => item.id), ['c', 'b', 'a'])
})

test('reports list states for popover and full page rendering', () => {
  assert.equal(getNotificationListState({ loading: true, items: [] }), 'loading')
  assert.equal(getNotificationListState({ loading: false, items: [] }), 'empty')
  assert.equal(getNotificationListState({ error: 'Fehler', items: [] }), 'error')
  assert.equal(getNotificationListState({ items: [{ id: '1' }] }), 'ready')
  assert.equal(getNotificationListState({ loading: false, items: null }), 'empty')
  assert.equal(getNotificationListState({ loading: true, items: null }), 'loading')
})

test('normalizes missing notification page rows and keeps archived rows renderable', () => {
  assert.deepEqual(normalizeNotificationItems(null), [])
  assert.deepEqual(normalizeNotificationItems(undefined), [])
  assert.deepEqual(normalizeNotificationItems([null, { id: 'archived', archived_at: '2026-07-20T10:00:00Z' }]), [
    { id: 'archived', archived_at: '2026-07-20T10:00:00Z' },
  ])
})

test('merges empty, error, and null pagination rows without crashing', () => {
  assert.deepEqual(mergeNotificationPage(null, null, { reset: true }), [])
  assert.deepEqual(mergeNotificationPage([{ id: 'a', created_at: '2026-07-20T10:00:00Z' }], null), [
    { id: 'a', created_at: '2026-07-20T10:00:00Z' },
  ])
})

test('applies optimistic read state without mutating previous items', () => {
  const previous = [{ id: '1', read_at: null }]
  const next = applyOptimisticRead(previous, '1', '2026-07-20T10:00:00Z')

  assert.equal(previous[0].read_at, null)
  assert.equal(next[0].read_at, '2026-07-20T10:00:00Z')
})
