import assert from 'node:assert/strict'
import test from 'node:test'
import {
  DOMAIN_NOTIFICATION_TEMPLATES,
  notifyDomainEvent,
  resolveEffectiveTemplateChannels,
  resolveRecipientMemberIds,
} from './domainNotificationService.js'

const members = [
  member('admin-member', 'super_admin'),
  member('cash-member', 'kassier'),
  member('event-member', 'mitglied'),
  { ...member('inactive-member', 'super_admin'), status: 'inaktiv' },
  { ...member('no-login-member', 'super_admin'), auth_user_id: null },
]

test('resolves recipients through existing RBAC permissions without explicit role lists', () => {
  assert.deepEqual(resolveRecipientMemberIds({ members, module: 'events', action: 'view' }), [
    'admin-member',
    'event-member',
  ])
  assert.deepEqual(resolveRecipientMemberIds({ members, module: 'vorfinanzierungen', action: 'view' }), [
    'admin-member',
    'cash-member',
  ])
})

test('dispatches required V1 domain notification payloads through the Notification Engine', async () => {
  const cases = [
    ['event_created', 'event', 'events'],
    ['event_updated', 'event', 'events'],
    ['invoice_created', 'invoice', 'rechnungen'],
    ['invoice_paid', 'invoice', 'rechnungen'],
    ['financing_liability_created', 'financing', 'vorfinanzierungen'],
    ['financing_liability_partial_repayment', 'financing', 'vorfinanzierungen'],
    ['financing_liability_repaid', 'financing', 'vorfinanzierungen'],
    ['document_published', 'document', 'dokumente'],
    ['news_published', 'news', 'events'],
    ['shop_order_received', 'shop', 'shop'],
    ['member_application_received', 'member', 'mitglieder'],
  ]
  const dispatchedPayloads = []

  for (const [type, category, module] of cases) {
    const result = await notifyDomainEvent({
      type,
      targetId: `${type}-id`,
      targetType: 'test_target',
      variables: {
        name: 'Training',
        date: '2026-07-25',
        invoice_number: '2026/001',
        customer_name: 'Kunde',
        creditor_name: 'Max Muster',
        amount: '10,00 EUR',
        description: 'Material',
        title: 'Titel',
        buyer_name: 'Kunde',
        order_number: 'SHOP-1',
        member_name: 'Max Mitglied',
      },
      members,
      currentMember: members[0],
      createdBy: 'actor-user',
      dispatchNotification: async (payload) => {
        dispatchedPayloads.push(payload)
        return { data: { job_id: `job-${payload.type}` }, error: null }
      },
    })

    assert.equal(result.error, null)
    const payload = dispatchedPayloads.at(-1)
    assert.equal(payload.type, type)
    assert.equal(payload.category, category)
    assert.equal(payload.source.module, module)
    assert.equal(payload.source.entity_type, 'test_target')
    assert.equal(payload.source.entity_id, `${type}-id`)
    assert.deepEqual(payload.channels, DOMAIN_NOTIFICATION_TEMPLATES[type].defaultChannels)
    assert.equal(payload.metadata.target_id, `${type}-id`)
    assert.equal(payload.metadata.created_by, 'actor-user')
    assert.equal(typeof payload.metadata.deep_link, 'string')
    assert.equal(typeof payload.metadata.icon, 'string')
    assert.equal(payload.recipient_member_ids.length > 0, true)
  }

  assert.equal(dispatchedPayloads.length, cases.length)
})

test('intersects requested channels with template defaults and technically available channels', () => {
  assert.deepEqual(resolveEffectiveTemplateChannels({
    requestedChannels: ['email', 'push', 'in_app'],
    defaultChannels: ['in_app'],
  }), ['in_app'])

  assert.deepEqual(resolveEffectiveTemplateChannels({
    requestedChannels: ['email'],
    defaultChannels: ['in_app'],
  }), [])
})

test('documents fachlich reviewed default channel policy for V1 templates', () => {
  const inAppOnly = [
    'invoice_created',
    'invoice_paid',
    'invoice_cancelled',
    'financing_liability_created',
    'financing_liability_partial_repayment',
    'shop_order_received',
    'sponsor_created',
    'cash_large_income',
  ]

  for (const type of inAppOnly) {
    assert.deepEqual(DOMAIN_NOTIFICATION_TEMPLATES[type].defaultChannels, ['in_app'], type)
  }

  assert.deepEqual(DOMAIN_NOTIFICATION_TEMPLATES.event_cancelled.defaultChannels, ['in_app', 'email'])
  assert.deepEqual(DOMAIN_NOTIFICATION_TEMPLATES.invoice_overdue.defaultChannels, ['in_app', 'email'])
  assert.deepEqual(DOMAIN_NOTIFICATION_TEMPLATES.membership_fee_due.defaultChannels, ['in_app', 'email'])
  assert.deepEqual(DOMAIN_NOTIFICATION_TEMPLATES.news_published.defaultChannels, ['in_app', 'email'])
})

test('contains central templates for all requested notification types', () => {
  const requiredTypes = [
    'event_created',
    'event_updated',
    'event_moved',
    'event_cancelled',
    'event_full',
    'event_waitlist_enabled',
    'event_registration_deadline_reached',
    'invoice_created',
    'invoice_paid',
    'invoice_cancelled',
    'invoice_overdue',
    'financing_liability_created',
    'financing_liability_updated',
    'financing_liability_partial_repayment',
    'financing_liability_repaid',
    'financing_liability_cancelled',
    'financing_liability_overdue',
    'member_application_received',
    'member_accepted',
    'member_rejected',
    'member_deactivated',
    'membership_fee_due',
    'membership_fee_paid',
    'membership_fee_reminder_created',
    'shop_order_received',
    'shop_order_paid',
    'shop_order_shipped',
    'shop_order_cancelled',
    'sponsor_created',
    'sponsorship_renewed',
    'sponsorship_expiring',
    'sponsorship_payment_received',
    'document_published',
    'press_published',
    'news_published',
    'cash_large_income',
    'cash_large_expense',
  ]

  for (const type of requiredTypes) {
    assert.ok(DOMAIN_NOTIFICATION_TEMPLATES[type], `${type} template missing`)
  }
})

function member(id, appRole) {
  return {
    id,
    auth_user_id: `auth-${id}`,
    email: `${id}@example.test`,
    status: 'aktiv',
    app_role: appRole,
  }
}
