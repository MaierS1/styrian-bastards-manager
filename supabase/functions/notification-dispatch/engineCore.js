export function dedupeRecipients(recipients) {
  const seen = new Set()
  const result = []

  for (const recipient of recipients) {
    const key = recipient.auth_user_id
      ? `auth:${recipient.auth_user_id}`
      : `member:${recipient.member_id || recipient.input_id || ''}`

    if (seen.has(key)) continue
    seen.add(key)
    result.push(recipient)
  }

  return result
}

export function shouldDeliverInApp({ payload, recipient, preference }) {
  if (!recipient.auth_user_id) {
    return { deliver: false, status: 'skipped', errorCode: 'no_app_user' }
  }

  if (recipient.status && recipient.status !== 'aktiv') {
    return { deliver: false, status: 'skipped', errorCode: 'inactive_user' }
  }

  if (payload.category === 'system' && payload.priority === 'critical') {
    return { deliver: true, status: 'delivered', errorCode: null }
  }

  if (preference && preference.enabled === false && preference.required !== true) {
    return { deliver: false, status: 'skipped', errorCode: 'preference_disabled' }
  }

  return { deliver: true, status: 'delivered', errorCode: null }
}

export function calculateJobStatus({ deliveredCount, skippedCount, failedCount, recipientCount }) {
  if (recipientCount === 0) return 'failed'
  if (failedCount > 0 && deliveredCount === 0) return 'failed'
  if (deliveredCount === 0 && skippedCount > 0 && failedCount === 0) return 'sent'
  if (failedCount > 0 || skippedCount > 0) return 'partial'
  return 'sent'
}

export function createResponseSummary({ jobId, existing = false, recipientCount = 0, deliveredCount = 0, skippedCount = 0, failedCount = 0 }) {
  return {
    success: failedCount === 0,
    existing,
    job_id: jobId,
    recipient_count: recipientCount,
    delivered_count: deliveredCount,
    skipped_count: skippedCount,
    failed_count: failedCount,
  }
}

export function sanitizeLogErrorMessage(message) {
  if (!message) return null
  return String(message).slice(0, 180)
}
