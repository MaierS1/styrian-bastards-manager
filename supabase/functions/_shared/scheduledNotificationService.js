export const SCHEDULED_NOTIFICATION_TYPES = [
  'event_registration_deadline_reached',
  'invoice_overdue',
  'financing_liability_overdue',
  'membership_fee_due',
  'sponsorship_expiring',
]

export function buildScheduledNotificationPayloads({
  now = new Date(),
  templates = [],
  events = [],
  invoices = [],
  membershipFeeItems = [],
  financingLiabilities = [],
  sponsorContracts = [],
  permissionRecipients = {},
} = {}) {
  const today = toDateOnly(now)
  const templateByType = new Map((templates || []).map((template) => [template.type || template.key, template]))
  const payloads = []
  const skipped = []

  for (const event of events || []) {
    if (!isDueOrPast(event.registration_deadline, today)) continue
    const recipientMemberIds = permissionRecipients['events.edit'] || []
    if (recipientMemberIds.length === 0) {
      skipped.push(skip(event, 'event_registration_deadline_reached', 'no_rbac_recipients'))
      continue
    }

    payloads.push(buildPayload({
      template: templateByType.get('event_registration_deadline_reached'),
      type: 'event_registration_deadline_reached',
      targetId: event.id,
      targetType: 'event',
      recipientMemberIds,
      variables: {
        name: getEventName(event),
      },
      metadata: {
        event_id: event.id,
        registration_deadline: event.registration_deadline,
      },
      idempotencyKey: `scheduled:event-registration-deadline-reached:${event.id}:${toDateOnly(event.registration_deadline)}`,
    }))
  }

  for (const invoice of invoices || []) {
    if (!isDueOrPast(invoice.due_date, today)) continue
    payloads.push(buildPayload({
      template: templateByType.get('invoice_overdue'),
      type: 'invoice_overdue',
      targetId: invoice.id,
      targetType: 'invoice',
      recipientInvoiceId: invoice.id,
      variables: {
        invoice_number: invoice.invoice_number,
        due_date: formatDate(invoice.due_date),
      },
      metadata: {
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        due_date: invoice.due_date,
      },
      idempotencyKey: `scheduled:invoice-overdue:${invoice.id}:${toDateOnly(invoice.due_date)}`,
    }))
  }

  for (const feeItem of membershipFeeItems || []) {
    if (!isDueOrPast(feeItem.due_date, today)) continue
    if (!feeItem.member_id) {
      skipped.push(skip(feeItem, 'membership_fee_due', 'missing_member_id'))
      continue
    }

    payloads.push(buildPayload({
      template: templateByType.get('membership_fee_due'),
      type: 'membership_fee_due',
      targetId: feeItem.id,
      targetType: 'membership_fee_item',
      recipientMemberId: feeItem.member_id,
      variables: {
        period: getFeePeriodLabel(feeItem),
      },
      metadata: {
        membership_fee_item_id: feeItem.id,
        membership_fee_period_id: feeItem.period_id,
        due_date: feeItem.due_date,
      },
      idempotencyKey: `scheduled:membership-fee-due:${feeItem.id}:${toDateOnly(feeItem.due_date)}`,
    }))
  }

  for (const liability of financingLiabilities || []) {
    if (!isDueOrPast(liability.due_date, today)) continue
    if (!liability.creditor_member_id) {
      skipped.push(skip(liability, 'financing_liability_overdue', 'missing_creditor_member_id'))
      continue
    }

    payloads.push(buildPayload({
      template: templateByType.get('financing_liability_overdue'),
      type: 'financing_liability_overdue',
      targetId: liability.id,
      targetType: 'financing_liability',
      recipientMemberId: liability.creditor_member_id,
      variables: {
        description: liability.description,
        due_date: formatDate(liability.due_date),
      },
      metadata: {
        financing_liability_id: liability.id,
        due_date: liability.due_date,
      },
      idempotencyKey: `scheduled:financing-liability-overdue:${liability.id}:${toDateOnly(liability.due_date)}`,
    }))
  }

  for (const contract of sponsorContracts || []) {
    if (!isExpiring(contract.ends_on, today)) continue
    const recipientMemberIds = permissionRecipients['sponsoren.view'] || []
    if (recipientMemberIds.length === 0) {
      skipped.push(skip(contract, 'sponsorship_expiring', 'no_rbac_recipients'))
      continue
    }

    payloads.push(buildPayload({
      template: templateByType.get('sponsorship_expiring'),
      type: 'sponsorship_expiring',
      targetId: contract.id,
      targetType: 'sponsor_contract',
      recipientMemberIds,
      variables: {
        contract_title: contract.title,
        ends_on: formatDate(contract.ends_on),
      },
      metadata: {
        sponsor_contract_id: contract.id,
        sponsor_id: contract.sponsor_id,
        ends_on: contract.ends_on,
      },
      idempotencyKey: `scheduled:sponsorship-expiring:${contract.id}:${toDateOnly(contract.ends_on)}`,
    }))
  }

  const uniqueByKey = new Map()
  for (const payload of payloads.filter(Boolean)) {
    if (!uniqueByKey.has(payload.idempotency_key)) uniqueByKey.set(payload.idempotency_key, payload)
  }

  return {
    payloads: [...uniqueByKey.values()],
    skipped,
  }
}

export function buildPayload({
  template,
  type,
  targetId,
  targetType,
  recipientMemberId = null,
  recipientMemberIds = null,
  recipientInvoiceId = null,
  variables = {},
  metadata = {},
  idempotencyKey,
}) {
  if (!template) return null
  const defaultChannels = normalizeChannels(template.default_channels)
  const payload = {
    type,
    category: template.category,
    title: renderTemplate(template.title_template, variables),
    message: renderTemplate(template.body_template, variables),
    channels: defaultChannels,
    source: {
      module: getSourceModule(template.deep_link),
      entity_type: targetType,
      entity_id: targetId,
    },
    url: buildDeepLink(template.deep_link, targetId),
    priority: template.priority || 'normal',
    idempotency_key: idempotencyKey,
    metadata: {
      ...metadata,
      target_type: targetType,
      target_id: targetId,
      created_by: null,
      created_at: new Date().toISOString(),
      deep_link: buildDeepLink(template.deep_link, targetId),
      icon: template.icon || null,
      scheduled_notification: true,
    },
  }

  if (recipientInvoiceId) payload.recipient_invoice_id = recipientInvoiceId
  if (recipientMemberId) payload.recipient_member_id = recipientMemberId
  if (Array.isArray(recipientMemberIds) && recipientMemberIds.length > 0) {
    payload.recipient_member_ids = [...new Set(recipientMemberIds.filter(Boolean))]
  }

  return payload
}

export function renderTemplate(value, variables = {}) {
  return String(value || '').replace(/\{([a-zA-Z0-9_]+)\}/g, (_match, key) => {
    const replacement = variables[key]
    if (replacement === undefined || replacement === null || replacement === '') return '-'
    return String(replacement)
  })
}

export function toDateOnly(value) {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10)
  return date.toISOString().slice(0, 10)
}

function normalizeChannels(channels) {
  return [...new Set((channels || ['in_app']).filter((channel) => ['in_app', 'email'].includes(channel)))]
}

function isDueOrPast(value, today) {
  const date = toDateOnly(value)
  return Boolean(date) && date <= today
}

function isExpiring(value, today) {
  const date = toDateOnly(value)
  if (!date) return false

  const limit = new Date(`${today}T00:00:00.000Z`)
  limit.setUTCDate(limit.getUTCDate() + 30)
  return date >= today && date <= toDateOnly(limit)
}

function formatDate(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value || '-')
  return new Intl.DateTimeFormat('de-AT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

function getEventName(event) {
  return event?.public_title || event?.title || event?.name || 'Event'
}

function getFeePeriodLabel(feeItem) {
  const period = feeItem?.membership_fee_periods || feeItem?.period || {}
  if (period.year && period.title) return `${period.year} - ${period.title}`
  return String(period.year || feeItem?.year || 'Mitgliedsbeitrag')
}

function getSourceModule(deepLink) {
  const map = {
    '/events': 'events',
    '/invoices': 'rechnungen',
    '/financing': 'vorfinanzierungen',
    '/fees': 'beitraege',
    '/sponsors': 'sponsoren',
  }
  return map[deepLink] || 'system'
}

function buildDeepLink(basePath, targetId) {
  if (!basePath) return null
  if (!targetId) return basePath
  return `${basePath}?id=${encodeURIComponent(targetId)}`
}

function skip(record, type, reason) {
  return {
    type,
    reason,
    target_id: record?.id || null,
  }
}
