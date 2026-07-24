import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildEventIdempotencyKey,
  buildEventMessage,
  buildEventNotificationPayload,
  buildRegistrationUpdatePayload,
  dispatchEventNotification,
  validateEventNotificationState,
} from './eventNotificationService.js'

const event = {
  id: '22222222-2222-4222-8222-222222222222',
  public_title: 'Sommerfest',
  starts_at: '2026-08-01T17:00:00+02:00',
  location: 'Graz',
  meeting_point: 'Eingang',
}

const registration = {
  id: '11111111-1111-4111-8111-111111111111',
  event_id: event.id,
  full_name: 'Max Mustermann',
  team_name: 'Team Test',
  participant_count: 2,
  status: 'registered',
  confirmation_sent_at: null,
  reminder_sent_at: null,
  notification_status: 'pending',
  updated_at: '2026-07-20T10:00:00Z',
}

test('builds event registration dispatch payload for the notification engine', () => {
  const result = buildEventNotificationPayload({
    type: 'registration_confirmation',
    event,
    registration,
  })

  assert.equal(result.ok, true)
  assert.equal(result.value.type, 'event_registration_confirmed')
  assert.equal(result.value.category, 'event')
  assert.deepEqual(result.value.channels, ['in_app', 'email'])
  assert.equal(result.value.recipient_event_registration_id, registration.id)
  assert.deepEqual(result.value.source, {
    module: 'events',
    entity_type: 'event_registration',
    entity_id: registration.id,
  })
  assert.equal(result.value.priority, 'high')
  assert.match(result.value.idempotency_key, /^event-registration-confirmed:/)
})

test('builds distinct event texts and stable idempotency keys', () => {
  assert.match(buildEventMessage('waitlist_confirmation', event, { ...registration, status: 'waitlist' }).title, /Warteliste/)
  assert.match(buildEventMessage('event_reminder', event, registration).message, /Treffpunkt/)

  assert.equal(
    buildEventIdempotencyKey('event_reminder', event, registration),
    `event-reminder:${event.id}:${registration.id}:initial`,
  )
  assert.equal(
    buildEventIdempotencyKey('cancellation_notification', event, { ...registration, status: 'cancelled' }),
    `event-registration-cancelled:${registration.id}:${registration.updated_at}`,
  )
})

test('validates public and administrative event notification states', () => {
  assert.equal(validateEventNotificationState({
    type: 'registration_confirmation',
    registration,
    isPublicRegistrationNotification: true,
  }).ok, true)

  assert.equal(validateEventNotificationState({
    type: 'event_reminder',
    registration,
    isPublicRegistrationNotification: true,
  }).status, 400)

  assert.equal(validateEventNotificationState({
    type: 'waitlist_confirmation',
    registration,
    isPublicRegistrationNotification: false,
  }).status, 409)

  assert.equal(validateEventNotificationState({
    type: 'event_reminder',
    registration: { ...registration, status: 'cancelled' },
    isPublicRegistrationNotification: false,
  }).status, 409)
})

test('builds registration update payloads from dispatch result', () => {
  assert.equal(buildRegistrationUpdatePayload({
    type: 'registration_confirmation',
    dispatchResult: { ok: true, data: { failed_count: 0 } },
  }).notification_status, 'sent')

  assert.ok(buildRegistrationUpdatePayload({
    type: 'event_reminder',
    dispatchResult: { ok: true, data: { failed_count: 0 } },
  }).reminder_sent_at)

  assert.equal(buildRegistrationUpdatePayload({
    type: 'registration_confirmation',
    dispatchResult: { ok: false, error: 'failed' },
  }).notification_status, 'error')
})

test('dispatches event notification with internal server auth only', async () => {
  const payload = buildEventNotificationPayload({
    type: 'registration_confirmation',
    event,
    registration,
  }).value
  let request = null

  const result = await dispatchEventNotification({
    notificationDispatchUrl: 'https://example.test/functions/v1/notification-dispatch',
    internalSecret: 'internal-secret',
    actorUserId: '33333333-3333-4333-8333-333333333333',
    payload,
    fetchImpl: async (url, options) => {
      request = { url, options }
      return {
        ok: true,
        status: 200,
        async json() {
          return { success: true, job_id: 'job-1', failed_count: 0 }
        },
      }
    },
  })

  assert.equal(result.ok, true)
  assert.equal(request.url, 'https://example.test/functions/v1/notification-dispatch')
  assert.equal(request.options.headers['x-internal-notification-secret'], 'internal-secret')
  assert.equal(request.options.headers['x-internal-actor-user-id'], '33333333-3333-4333-8333-333333333333')
  assert.deepEqual(JSON.parse(request.options.body), payload)
})
