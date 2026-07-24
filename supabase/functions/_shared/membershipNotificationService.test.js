import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildMembershipIdempotencyKey,
  buildMembershipMessage,
  buildMembershipNotificationPayload,
  buildMembershipUpdatePayload,
  dispatchMembershipNotification,
  validateMembershipNotificationState,
} from './membershipNotificationService.js'

const feeItem = {
  id: '11111111-1111-4111-8111-111111111111',
  period_id: '22222222-2222-4222-8222-222222222222',
  member_id: '33333333-3333-4333-8333-333333333333',
  amount: 42,
  status: 'open',
  due_date: '2026-08-01',
  reminder_sent_at: null,
  paid_at: null,
  updated_at: '2026-07-20T10:00:00Z',
}

const paidFeeItem = {
  ...feeItem,
  status: 'paid',
  paid_at: '2026-07-20T12:00:00Z',
}

const period = {
  id: feeItem.period_id,
  year: 2026,
  title: 'Saison',
  due_date: '2026-08-01',
}

const member = {
  id: feeItem.member_id,
  first_name: 'Max',
  last_name: 'Mustermann',
  status: 'aktiv',
  member_type: 'vollmitglied',
}

const actorUserId = '44444444-4444-4444-8444-444444444444'

const paymentSettings = {
  account_holder: 'Styrian Bastards',
  iban: 'AT611904300234573201',
  bic: 'TESTATWW',
  bank_name: 'Testbank',
  cash_enabled: true,
}

test('builds reminder dispatch payload for notification-dispatch', () => {
  const result = buildMembershipNotificationPayload({
    type: 'fee_reminder',
    feeItem,
    period,
    member,
    paymentSettings,
    actorUserId,
  })

  assert.equal(result.ok, true)
  assert.equal(result.value.type, 'membership_fee_reminder')
  assert.equal(result.value.category, 'membership_fee')
  assert.deepEqual(result.value.channels, ['in_app', 'email'])
  assert.equal(result.value.recipient_member_id, feeItem.member_id)
  assert.equal(result.value.source.entity_id, feeItem.id)
  assert.equal(result.value.priority, 'high')
})

test('routes test notifications to the actor instead of a free recipient address', () => {
  const result = buildMembershipNotificationPayload({
    type: 'fee_paid_confirmation_test',
    feeItem: paidFeeItem,
    period,
    member,
    actorUserId,
  })

  assert.equal(result.ok, true)
  assert.equal(result.value.recipient_user_id, actorUserId)
  assert.equal('recipient_member_id' in result.value, false)
  assert.equal(result.value.metadata.test, true)
})

test('validates membership fee status server-side', () => {
  assert.equal(validateMembershipNotificationState({ type: 'fee_reminder', feeItem, member }).ok, true)
  assert.equal(validateMembershipNotificationState({ type: 'fee_reminder', feeItem: paidFeeItem, member }).status, 400)
  assert.equal(validateMembershipNotificationState({ type: 'fee_paid_confirmation', feeItem, member }).status, 400)
  assert.equal(validateMembershipNotificationState({
    type: 'fee_reminder',
    feeItem,
    member: { ...member, status: 'ausgetreten' },
  }).status, 400)
  assert.equal(validateMembershipNotificationState({
    type: 'fee_reminder',
    feeItem: { ...feeItem, amount: 0 },
    member,
  }).status, 400)
})

test('builds safe content and stable idempotency keys', () => {
  assert.match(buildMembershipMessage('fee_reminder', feeItem, period, member, paymentSettings).message, /42,00/)
  assert.match(buildMembershipMessage('fee_reminder', feeItem, period, member, paymentSettings).message, /IBAN/)
  assert.match(buildMembershipMessage('fee_reminder', feeItem, period, member, paymentSettings).message, /Verwendungszweck/)
  assert.match(buildMembershipMessage('fee_paid_confirmation', paidFeeItem, period, member).title, /Zahlungsbestaetigung/)

  assert.equal(
    buildMembershipIdempotencyKey({ type: 'fee_reminder', feeItem, actorUserId }),
    `membership-fee-reminder:${feeItem.id}:initial`,
  )
  assert.equal(
    buildMembershipIdempotencyKey({ type: 'fee_paid_confirmation', feeItem: paidFeeItem, actorUserId }),
    `membership-fee-payment-confirmed:${feeItem.id}:${paidFeeItem.paid_at}`,
  )
})

test('builds membership fee item update payloads from dispatch result', () => {
  const reminderUpdate = buildMembershipUpdatePayload({
    type: 'fee_reminder',
    feeItem,
    dispatchResult: { ok: true, data: { delivered_count: 1, failed_count: 0 } },
  })

  assert.equal(reminderUpdate.notification_status, 'sent')
  assert.equal(reminderUpdate.status, 'reminded')
  assert.ok(reminderUpdate.reminder_sent_at)

  assert.equal(buildMembershipUpdatePayload({
    type: 'fee_reminder_test',
    feeItem,
    dispatchResult: { ok: true, data: { delivered_count: 1, failed_count: 0 } },
  }), null)

  assert.equal(buildMembershipUpdatePayload({
    type: 'fee_reminder',
    feeItem,
    dispatchResult: { ok: true, data: { delivered_count: 0, failed_count: 0 } },
  }).notification_status, 'error')
})

test('dispatches membership notification with internal server auth', async () => {
  const payload = buildMembershipNotificationPayload({
    type: 'fee_reminder',
    feeItem,
    period,
    member,
    actorUserId,
  }).value
  let request = null

  const result = await dispatchMembershipNotification({
    notificationDispatchUrl: 'https://example.test/functions/v1/notification-dispatch',
    internalSecret: 'internal-secret',
    actorUserId,
    payload,
    fetchImpl: async (url, options) => {
      request = { url, options }
      return {
        ok: true,
        status: 200,
        async json() {
          return { success: true, job_id: 'job-1', delivered_count: 1, failed_count: 0 }
        },
      }
    },
  })

  assert.equal(result.ok, true)
  assert.equal(request.options.headers['x-internal-notification-secret'], 'internal-secret')
  assert.equal(request.options.headers['x-internal-actor-user-id'], actorUserId)
  assert.deepEqual(JSON.parse(request.options.body), payload)
})
