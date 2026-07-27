import assert from 'node:assert/strict'
import test from 'node:test'
import {
  DEFAULT_PUSH_BODY,
  DEFAULT_PUSH_TITLE,
  DEFAULT_PUSH_URL,
  isSameClientUrl,
  parsePushPayload,
  resolveSafeClientUrl,
} from './pushNotificationCore.js'

test('builds notification options from a valid push payload', () => {
  const result = parsePushPayload({
    title: 'Mitglied aufgenommen',
    body: 'Max wurde aufgenommen.',
    url: '/members?id=member-1',
    notification_id: 'notification-1',
    type: 'member_accepted',
    category: 'member',
    priority: 'high',
    tag: 'member-accepted',
  })

  assert.equal(result.title, 'Mitglied aufgenommen')
  assert.equal(result.options.body, 'Max wurde aufgenommen.')
  assert.equal(result.options.data.url, '/members?id=member-1')
  assert.equal(result.options.data.notification_id, 'notification-1')
  assert.equal(result.options.data.type, 'member_accepted')
  assert.equal(result.options.requireInteraction, false)
})

test('handles invalid JSON as text body', () => {
  const result = parsePushPayload('{invalid-json')

  assert.equal(result.title, DEFAULT_PUSH_TITLE)
  assert.equal(result.options.body, '{invalid-json')
})

test('uses defaults for empty push payloads', () => {
  const result = parsePushPayload(null)

  assert.equal(result.title, DEFAULT_PUSH_TITLE)
  assert.equal(result.options.body, DEFAULT_PUSH_BODY)
  assert.equal(result.options.data.url, DEFAULT_PUSH_URL)
})

test('allows internal deep links', () => {
  assert.equal(resolveSafeClientUrl('/events?id=event-1#details', 'https://app.example.test'), '/events?id=event-1#details')
  assert.equal(resolveSafeClientUrl('https://app.example.test/financing', 'https://app.example.test'), '/financing')
})

test('rejects external and unsafe URLs', () => {
  assert.equal(resolveSafeClientUrl('https://evil.example.test/members', 'https://app.example.test'), '/')
  assert.equal(resolveSafeClientUrl('javascript:alert(1)', 'https://app.example.test'), '/')
  assert.equal(resolveSafeClientUrl('data:text/html,hello', 'https://app.example.test'), '/')
  assert.equal(resolveSafeClientUrl('//evil.example.test/path', 'https://app.example.test'), '/')
})

test('matches already opened clients by normalized internal URL', () => {
  assert.equal(isSameClientUrl('https://app.example.test/members?id=1', '/members?id=1', 'https://app.example.test'), true)
  assert.equal(isSameClientUrl('https://app.example.test/members?id=2', '/members?id=1', 'https://app.example.test'), false)
  assert.equal(isSameClientUrl('https://other.example.test/members?id=1', '/members?id=1', 'https://app.example.test'), false)
})
