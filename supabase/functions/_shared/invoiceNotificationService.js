import {
  buildInvoiceNotificationMessage,
  buildSafeInvoiceFilename,
} from '../send-invoice-email/validation.js'

export const INVOICE_NOTIFICATION_TYPES = {
  issued: 'invoice_issued',
  resent: 'invoice_resent',
  reminder: 'invoice_reminder',
}

export function buildInvoiceNotificationPayload({
  invoice,
  reminder,
  allowResend,
  pdfBase64,
  mimeType = 'application/pdf',
}) {
  const notificationType = getInvoiceNotificationType({ reminder, allowResend, invoice })
  const message = buildInvoiceNotificationMessage({
    invoice,
    reminder,
    resent: notificationType === INVOICE_NOTIFICATION_TYPES.resent,
  })

  if (!message.ok) return message

  return {
    ok: true,
    value: {
      type: notificationType,
      category: 'invoice',
      title: message.title,
      message: message.message,
      channels: ['email'],
      recipient_invoice_id: invoice.id,
      source: {
        module: 'invoices',
        entity_type: 'invoice',
        entity_id: invoice.id,
      },
      url: null,
      priority: reminder ? 'high' : 'normal',
      idempotency_key: buildInvoiceIdempotencyKey({ invoice, reminder, allowResend }),
      metadata: {
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        reminder,
        allow_resend: allowResend,
      },
      attachments: [
        {
          filename: buildSafeInvoiceFilename(invoice),
          contentBase64: pdfBase64,
          contentType: mimeType,
        },
      ],
    },
  }
}

export async function dispatchInvoiceNotification({
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
      error: result?.error || 'Rechnung konnte nicht versendet werden.',
    }
  }

  return {
    ok: true,
    status: response.status,
    data: result,
  }
}

export function buildInvoiceUpdatePayload({ invoice, reminder, dispatchResult }) {
  if (
    !dispatchResult.ok
    || Number(dispatchResult.data?.failed_count || 0) > 0
    || Number(dispatchResult.data?.delivered_count || 0) === 0
  ) {
    return null
  }

  if (dispatchResult.data?.existing === true) return null

  const now = new Date().toISOString()
  if (reminder) {
    return {
      last_reminder_at: now,
      reminder_count: Number(invoice.reminder_count || 0) + 1,
    }
  }

  return { emailed_at: now }
}

export function buildInvoiceIdempotencyKey({ invoice, reminder, allowResend }) {
  if (reminder) {
    const occurrence = allowResend
      ? Number(invoice.reminder_count || 0) + 1
      : Number(invoice.reminder_count || 0) || 'initial'
    return `invoice-reminder:${invoice.id}:${occurrence}`
  }

  if (allowResend) {
    return `invoice-resent:${invoice.id}:${invoice.emailed_at || invoice.updated_at || 'resent'}`
  }

  return `invoice-issued:${invoice.id}:${invoice.updated_at || invoice.invoice_number || 'initial'}`
}

function getInvoiceNotificationType({ reminder, allowResend, invoice }) {
  if (reminder) return INVOICE_NOTIFICATION_TYPES.reminder
  if (allowResend || invoice?.emailed_at) return INVOICE_NOTIFICATION_TYPES.resent
  return INVOICE_NOTIFICATION_TYPES.issued
}

async function safeReadJson(response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}
