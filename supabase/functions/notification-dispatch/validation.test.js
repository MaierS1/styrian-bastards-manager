import assert from 'node:assert/strict'
import test from 'node:test'
import {
  MAX_METADATA_BYTES,
  MAX_RECIPIENTS,
  buildStableIdempotencyKey,
  requiresCommunicationCreate,
  validateDispatchPayload,
} from './validation.js'

const userId = '11111111-1111-4111-8111-111111111111'

function createPayload(overrides = {}) {
  return {
    type: 'system_notice',
    category: 'system',
    title: 'Wichtiger Hinweis',
    message: 'Text der Benachrichtigung',
    channels: ['in_app'],
    recipient_user_id: userId,
    source: {
      module: 'system',
      entity_type: 'notice',
      entity_id: 'notice-1',
    },
    url: '/dashboard',
    priority: 'normal',
    metadata: { test: true },
    ...overrides,
  }
}

test('accepts a minimal valid in-app dispatch payload', () => {
  const result = validateDispatchPayload(createPayload())

  assert.equal(result.ok, true)
  assert.equal(result.value.type, 'system_notice')
  assert.deepEqual(result.value.channels, ['in_app'])
})

test('rejects missing required fields', () => {
  assert.equal(validateDispatchPayload(createPayload({ type: '' })).status, 400)
  assert.equal(validateDispatchPayload(createPayload({ title: '' })).status, 400)
  assert.equal(validateDispatchPayload(createPayload({ message: '' })).status, 400)
  assert.equal(validateDispatchPayload(createPayload({ channels: [] })).status, 400)
})

test('accepts email and combined in-app email dispatch channels', () => {
  assert.deepEqual(validateDispatchPayload(createPayload({ channels: ['email'] })).value.channels, ['email'])
  assert.deepEqual(validateDispatchPayload(createPayload({ channels: ['in_app', 'email'] })).value.channels, ['in_app', 'email'])
})

test('rejects unsupported push or unknown channels', () => {
  assert.equal(validateDispatchPayload(createPayload({ channels: ['push'] })).status, 422)
  assert.equal(validateDispatchPayload(createPayload({ channels: ['sms'] })).status, 422)
})

test('rejects free email transport fields from clients', () => {
  assert.equal(validateDispatchPayload(createPayload({ to: 'test@example.com' })).status, 400)
  assert.equal(validateDispatchPayload(createPayload({ html: '<p>Text</p>' })).status, 400)
  assert.equal(validateDispatchPayload(createPayload({ subject: 'Betreff' })).status, 400)
  assert.equal(validateDispatchPayload(createPayload({ from: 'sender@example.com' })).status, 400)
})

test('rejects unsafe urls and invalid uuids', () => {
  assert.equal(validateDispatchPayload(createPayload({ url: 'https://example.com' })).status, 400)
  assert.equal(validateDispatchPayload(createPayload({ url: 'javascript:alert(1)' })).status, 400)
  assert.equal(validateDispatchPayload(createPayload({ recipient_user_id: 'x' })).status, 400)
})

test('rejects too many recipients and oversized metadata', () => {
  const recipient_user_ids = Array.from({ length: MAX_RECIPIENTS + 1 }, (_, index) => (
    `11111111-1111-4111-8111-${String(index).padStart(12, '0')}`
  ))
  assert.equal(validateDispatchPayload({
    ...createPayload({ recipient_user_id: undefined }),
    recipient_user_ids,
  }).status, 429)

  assert.equal(validateDispatchPayload(createPayload({
    metadata: { value: 'x'.repeat(MAX_METADATA_BYTES + 1) },
  })).status, 400)
})

test('deduplicates repeated explicit recipients', () => {
  const result = validateDispatchPayload({
    ...createPayload({ recipient_user_id: undefined }),
    recipient_user_ids: [userId, userId],
  })

  assert.equal(result.ok, true)
  assert.deepEqual(result.value.recipientUserIds, [userId])
})

test('accepts event registration recipients as a distinct server-side target type', () => {
  const result = validateDispatchPayload({
    ...createPayload({ recipient_user_id: undefined }),
    recipient_event_registration_id: '33333333-3333-4333-8333-333333333333',
  })

  assert.equal(result.ok, true)
  assert.deepEqual(result.value.recipientEventRegistrationIds, ['33333333-3333-4333-8333-333333333333'])
})

test('marks administrative dispatches that require communication.create', () => {
  assert.equal(requiresCommunicationCreate(validateDispatchPayload(createPayload()).value), false)
  assert.equal(requiresCommunicationCreate(validateDispatchPayload(createPayload({ priority: 'critical' })).value), true)
  assert.equal(requiresCommunicationCreate(validateDispatchPayload({
    ...createPayload({ recipient_user_id: undefined }),
    recipient_user_ids: [
      userId,
      '22222222-2222-4222-8222-222222222222',
    ],
  }).value), true)
  assert.equal(requiresCommunicationCreate(validateDispatchPayload({
    ...createPayload({ recipient_user_id: undefined }),
    system_wide: true,
  }).value), true)
})

test('builds stable idempotency keys', () => {
  const first = validateDispatchPayload(createPayload()).value
  const second = validateDispatchPayload(createPayload()).value

  assert.equal(buildStableIdempotencyKey(first), buildStableIdempotencyKey(second))
})
