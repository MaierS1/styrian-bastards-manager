import assert from 'node:assert/strict'
import test from 'node:test'
import {
  formatUnreadBadge,
  getCategoryLabel,
  isSafeInternalPath,
  mergeNotificationList,
  resolveNotificationTarget,
} from './notificationCenterCore.js'

test('formats unread badge compactly', () => {
  assert.equal(formatUnreadBadge(0), '')
  assert.equal(formatUnreadBadge(7), '7')
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
  assert.deepEqual(resolveNotificationTarget({ url: '/events/123' }), {
    kind: 'path',
    path: '/events/123',
    page: 'events',
  })

  assert.deepEqual(resolveNotificationTarget({
    url: '',
    data: { source: { module: 'membership_fees' } },
  }), {
    kind: 'page',
    page: 'fees',
  })
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
