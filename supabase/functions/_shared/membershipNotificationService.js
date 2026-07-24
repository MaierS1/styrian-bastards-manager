export const MEMBERSHIP_NOTIFICATION_TYPES = {
  fee_reminder: 'membership_fee_reminder',
  fee_paid_confirmation: 'membership_fee_payment_confirmed',
  fee_reminder_test: 'membership_fee_reminder_test',
  fee_paid_confirmation_test: 'membership_fee_payment_confirmed_test',
}

export const LEGACY_MEMBERSHIP_NOTIFICATION_TYPES = Object.keys(MEMBERSHIP_NOTIFICATION_TYPES)

export function buildMembershipNotificationPayload({
  type,
  feeItem,
  period,
  member,
  paymentSettings = null,
  actorUserId,
}) {
  const notificationType = MEMBERSHIP_NOTIFICATION_TYPES[type]
  if (!notificationType) {
    return { ok: false, status: 400, error: 'Ungueltiger Mailtyp.' }
  }

  const isTest = type.endsWith('_test')
  const message = buildMembershipMessage(type, feeItem, period, member, paymentSettings)
  const recipient = isTest
    ? { recipient_user_id: actorUserId }
    : { recipient_member_id: feeItem.member_id }

  if (isTest && !actorUserId) {
    return { ok: false, status: 400, error: 'Testversand benoetigt einen angemeldeten Benutzer.' }
  }

  return {
    ok: true,
    value: {
      type: notificationType,
      category: 'membership_fee',
      title: message.title,
      message: message.message,
      channels: ['in_app', 'email'],
      ...recipient,
      source: {
        module: 'membership_fees',
        entity_type: 'membership_fee_item',
        entity_id: feeItem.id,
      },
      url: '/portal',
      priority: type.includes('reminder') ? 'high' : 'normal',
      idempotency_key: buildMembershipIdempotencyKey({ type, feeItem, actorUserId }),
      metadata: {
        legacy_type: type,
        membership_fee_item_id: feeItem.id,
        membership_fee_period_id: feeItem.period_id,
        test: isTest,
      },
    },
  }
}

export function validateMembershipNotificationState({ type, feeItem, member }) {
  if (!feeItem) return { ok: false, status: 404, error: 'Beitragsposition nicht gefunden.' }
  if (!member) return { ok: false, status: 404, error: 'Mitglied nicht gefunden.' }

  const isTest = type.endsWith('_test')
  const baseType = isTest ? type.replace('_test', '') : type

  if (!isTest && member.status !== 'aktiv') {
    return { ok: false, status: 400, error: 'Mitglied ist nicht aktiv.' }
  }

  if (baseType === 'fee_reminder') {
    if (!['open', 'reminded'].includes(feeItem.status)) {
      return { ok: false, status: 400, error: 'Erinnerungen sind nur fuer offene Beitraege zulaessig.' }
    }

    if (member.member_type === 'ehrenmitglied' || Number(feeItem.amount || 0) <= 0) {
      return { ok: false, status: 400, error: 'Fuer Ehrenmitglieder oder 0-Euro-Beitraege wird keine Zahlungsaufforderung versendet.' }
    }
  }

  if (baseType === 'fee_paid_confirmation' && feeItem.status !== 'paid') {
    return { ok: false, status: 400, error: 'Zahlungsbestaetigungen sind nur fuer bezahlte Beitraege zulaessig.' }
  }

  return { ok: true }
}

export async function dispatchMembershipNotification({
  notificationDispatchUrl,
  internalSecret,
  actorUserId,
  fetchImpl = fetch,
  payload,
}) {
  if (!notificationDispatchUrl || !internalSecret) {
    return {
      ok: false,
      status: 500,
      error: 'Interne Benachrichtigungskonfiguration fehlt.',
    }
  }

  const headers = {
    'Content-Type': 'application/json',
    'x-internal-notification-secret': internalSecret,
  }

  if (actorUserId) headers['x-internal-actor-user-id'] = actorUserId

  const response = await fetchImpl(notificationDispatchUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })

  const result = await safeReadJson(response)
  if (!response.ok || result?.error) {
    return {
      ok: false,
      status: response.status,
      error: result?.error || 'Benachrichtigung konnte nicht versendet werden.',
    }
  }

  return {
    ok: true,
    status: response.status,
    data: result,
  }
}

export function buildMembershipUpdatePayload({ type, feeItem, dispatchResult }) {
  if (!dispatchResult.ok || Number(dispatchResult.data?.failed_count || 0) > 0 || Number(dispatchResult.data?.delivered_count || 0) === 0) {
    return {
      notification_status: 'error',
      notification_error: dispatchResult.error || 'Benachrichtigung konnte nicht vollstaendig versendet werden.',
    }
  }

  if (type.endsWith('_test')) return null

  const updatePayload = {
    notification_status: 'sent',
    notification_error: null,
  }

  if (type === 'fee_reminder') {
    updatePayload.reminder_sent_at = new Date().toISOString()
    if (feeItem.status === 'open') updatePayload.status = 'reminded'
  }

  return updatePayload
}

export function buildMembershipMessage(type, feeItem, period, member, paymentSettings = null) {
  const baseType = type.endsWith('_test') ? type.replace('_test', '') : type
  const periodLabel = getPeriodLabel(period)
  const memberName = getMemberName(member)
  const amount = formatCurrency(feeItem.amount)

  if (baseType === 'fee_paid_confirmation') {
    return {
      title: `Zahlungsbestaetigung: ${periodLabel}`,
      message: [
        `Hallo ${memberName},`,
        '',
        `dein Mitgliedsbeitrag fuer ${periodLabel} ueber ${amount} wurde als bezahlt markiert.`,
        feeItem.paid_at ? `Bezahlt am: ${formatDate(feeItem.paid_at)}` : '',
        '',
        'Vielen Dank.',
      ].filter(Boolean).join('\n'),
    }
  }

  return {
    title: `Erinnerung: ${periodLabel}`,
    message: [
      `Hallo ${memberName},`,
      '',
      `fuer ${periodLabel} ist ein Mitgliedsbeitrag ueber ${amount} offen.`,
      feeItem.due_date || period?.due_date ? `Faellig am: ${formatDate(feeItem.due_date || period.due_date)}` : '',
      '',
      'Bitte um zeitnahe Erledigung.',
      '',
      buildPaymentText({ memberName, periodLabel, paymentSettings }),
    ].filter(Boolean).join('\n'),
  }
}

export function buildMembershipIdempotencyKey({ type, feeItem, actorUserId }) {
  if (type === 'fee_paid_confirmation') {
    return `membership-fee-payment-confirmed:${feeItem.id}:${feeItem.paid_at || feeItem.updated_at || 'paid'}`
  }

  if (type === 'fee_paid_confirmation_test') {
    return `membership-fee-payment-confirmed-test:${feeItem.id}:${actorUserId || 'actor'}:${feeItem.paid_at || feeItem.updated_at || 'paid'}`
  }

  if (type === 'fee_reminder_test') {
    return `membership-fee-reminder-test:${feeItem.id}:${actorUserId || 'actor'}:${feeItem.reminder_sent_at || 'initial'}`
  }

  return `membership-fee-reminder:${feeItem.id}:${feeItem.reminder_sent_at || 'initial'}`
}

function getPeriodLabel(period) {
  if (period?.title) return `${period.year} - ${period.title}`
  return String(period?.year || 'Mitgliedsbeitrag')
}

function getMemberName(member) {
  return `${member?.first_name || ''} ${member?.last_name || ''}`.trim() || 'Mitglied'
}

function formatCurrency(value) {
  return new Intl.NumberFormat('de-AT', {
    style: 'currency',
    currency: 'EUR',
  }).format(Number(value || 0))
}

function formatDate(value) {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)

  return new Intl.DateTimeFormat('de-AT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

function buildPaymentText({ memberName, periodLabel, paymentSettings }) {
  const blocks = []
  const paymentPurpose = `Mitgliedsbeitrag ${periodLabel} - ${memberName}`

  if (hasText(paymentSettings?.iban)) {
    blocks.push([
      'E-Banking:',
      hasText(paymentSettings?.account_holder) ? `Kontoinhaber: ${paymentSettings.account_holder}` : '',
      `IBAN: ${paymentSettings.iban}`,
      hasText(paymentSettings?.bic) ? `BIC: ${paymentSettings.bic}` : '',
      hasText(paymentSettings?.bank_name) ? `Bank: ${paymentSettings.bank_name}` : '',
      `Verwendungszweck: ${paymentPurpose}`,
    ].filter(Boolean).join('\n'))
  }

  if (paymentSettings?.cash_enabled === true) {
    blocks.push('Barzahlung: Der Beitrag kann bei einem Vereinstreffen oder direkt bei einem Vorstandsmitglied bezahlt werden.')
  }

  if (
    paymentSettings?.paypal_enabled === true
    && (hasText(paymentSettings?.paypal_address) || hasText(paymentSettings?.paypal_link))
  ) {
    const paypalTarget = String(paymentSettings?.paypal_link || paymentSettings?.paypal_address || '')
    blocks.push(`PayPal: Zahlung per PayPal an ${paypalTarget}. Bitte im Verwendungszweck Namen und Saison angeben.`)
  }

  return blocks.length ? blocks.join('\n\n') : 'Keine Zahlungsoptionen hinterlegt.'
}

function hasText(value) {
  return String(value || '').trim().length > 0
}

async function safeReadJson(response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}
