import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildScheduledNotificationPayloads,
  renderTemplate,
} from './scheduledNotificationService.js'

const templates = [
  template('event_registration_deadline_reached', 'event', ['in_app'], '/events'),
  template('invoice_overdue', 'invoice', ['in_app', 'email'], '/invoices'),
  template('financing_liability_overdue', 'financing', ['in_app', 'email'], '/financing'),
  template('membership_fee_due', 'membership_fee', ['in_app', 'email'], '/fees'),
  template('sponsorship_expiring', 'sponsor', ['in_app'], '/sponsors'),
]

test('builds idempotent scheduled notification jobs for due domain data', () => {
  const first = buildScheduledNotificationPayloads(fixtures())
  const second = buildScheduledNotificationPayloads(fixtures())

  assert.equal(first.payloads.length, 5)
  assert.deepEqual(
    first.payloads.map((payload) => payload.idempotency_key),
    second.payloads.map((payload) => payload.idempotency_key)
  )
  assert.equal(new Set(first.payloads.map((payload) => payload.idempotency_key)).size, first.payloads.length)
})

test('uses correct types, categories, targets, recipients and default channels', () => {
  const { payloads } = buildScheduledNotificationPayloads(fixtures())
  const byType = new Map(payloads.map((payload) => [payload.type, payload]))

  assert.deepEqual(byType.get('event_registration_deadline_reached').recipient_member_ids, ['event-admin'])
  assert.equal(byType.get('event_registration_deadline_reached').category, 'event')
  assert.equal(byType.get('event_registration_deadline_reached').source.entity_type, 'event')

  assert.equal(byType.get('invoice_overdue').recipient_invoice_id, 'invoice-1')
  assert.equal(byType.get('invoice_overdue').category, 'invoice')
  assert.deepEqual(byType.get('invoice_overdue').channels, ['in_app', 'email'])

  assert.equal(byType.get('membership_fee_due').recipient_member_id, 'member-1')
  assert.equal(byType.get('financing_liability_overdue').recipient_member_id, 'creditor-1')
  assert.deepEqual(byType.get('sponsorship_expiring').recipient_member_ids, ['sponsor-admin'])
  assert.deepEqual(byType.get('sponsorship_expiring').channels, ['in_app'])
})

test('skips scheduled notifications without valid fachliche recipient mapping', () => {
  const result = buildScheduledNotificationPayloads({
    ...fixtures(),
    permissionRecipients: {},
    financingLiabilities: [{ id: 'fin-1', due_date: '2026-07-01', description: 'Material' }],
  })

  assert.equal(result.payloads.some((payload) => payload.type === 'sponsorship_expiring'), false)
  assert.equal(result.payloads.some((payload) => payload.type === 'event_registration_deadline_reached'), false)
  assert.ok(result.skipped.some((item) => item.reason === 'no_rbac_recipients'))
  assert.ok(result.skipped.some((item) => item.reason === 'missing_creditor_member_id'))
})

test('renders scheduled templates without distributed texts in the scheduler', () => {
  assert.equal(renderTemplate('Hallo {name}', { name: 'Max' }), 'Hallo Max')
  assert.equal(renderTemplate('Hallo {name}', {}), 'Hallo -')
})

function fixtures() {
  return {
    now: new Date('2026-07-25T08:00:00.000Z'),
    templates,
    events: [{ id: 'event-1', name: 'Training', registration_deadline: '2026-07-25T07:00:00.000Z' }],
    invoices: [{ id: 'invoice-1', invoice_number: '2026/001', due_date: '2026-07-01' }],
    membershipFeeItems: [{
      id: 'fee-1',
      member_id: 'member-1',
      period_id: 'period-1',
      due_date: '2026-07-01',
      membership_fee_periods: { year: 2026, title: 'Saison' },
    }],
    financingLiabilities: [{
      id: 'fin-1',
      creditor_member_id: 'creditor-1',
      description: 'Material',
      due_date: '2026-07-01',
    }],
    sponsorContracts: [{
      id: 'contract-1',
      sponsor_id: 'sponsor-1',
      title: 'Gold',
      ends_on: '2026-08-10',
    }],
    permissionRecipients: {
      'events.edit': ['event-admin'],
      'sponsoren.view': ['sponsor-admin'],
    },
  }
}

function template(type, category, defaultChannels, deepLink) {
  return {
    key: type,
    type,
    category,
    default_channels: defaultChannels,
    title_template: `${type}: {name}{invoice_number}{period}{description}{contract_title}`,
    body_template: `${type} Body {due_date}{ends_on}`,
    priority: type.includes('overdue') ? 'high' : 'normal',
    icon: 'bell',
    deep_link: deepLink,
  }
}
