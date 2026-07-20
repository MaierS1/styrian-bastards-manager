import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildInvoiceIdempotencyKey,
  buildInvoiceNotificationPayload,
  buildInvoiceUpdatePayload,
  dispatchInvoiceNotification,
} from './invoiceNotificationService.js'

const invoice = {
  id: '11111111-1111-4111-8111-111111111111',
  invoice_number: '2026/001',
  customer_email: 'kunde@example.com',
  status: 'offen',
  issue_date: '2026-07-20',
  due_date: '2026-08-01',
  total_amount: 123.45,
  emailed_at: null,
  last_reminder_at: null,
  reminder_count: 0,
  updated_at: '2026-07-20T10:00:00Z',
}

const actorUserId = '22222222-2222-4222-8222-222222222222'
const pdfBase64 = 'JVBERi0xLjQgdGVzdA=='

test('builds invoice issued payload for notification-dispatch', () => {
  const result = buildInvoiceNotificationPayload({
    invoice,
    reminder: false,
    allowResend: false,
    pdfBase64,
  })

  assert.equal(result.ok, true)
  assert.equal(result.value.type, 'invoice_issued')
  assert.equal(result.value.category, 'invoice')
  assert.deepEqual(result.value.channels, ['email'])
  assert.equal(result.value.recipient_invoice_id, invoice.id)
  assert.equal(result.value.source.entity_id, invoice.id)
  assert.equal(result.value.attachments[0].filename, 'Rechnung_2026_001.pdf')
  assert.equal(result.value.attachments[0].contentBase64, pdfBase64)
})

test('builds reminder and resend idempotency keys from invoice state', () => {
  assert.equal(
    buildInvoiceIdempotencyKey({ invoice, reminder: false, allowResend: false }),
    `invoice-issued:${invoice.id}:${invoice.updated_at}`,
  )
  assert.equal(
    buildInvoiceIdempotencyKey({ invoice: { ...invoice, emailed_at: '2026-07-20T12:00:00Z' }, reminder: false, allowResend: true }),
    `invoice-resent:${invoice.id}:2026-07-20T12:00:00Z`,
  )
  assert.equal(
    buildInvoiceIdempotencyKey({ invoice: { ...invoice, reminder_count: 1 }, reminder: true, allowResend: true }),
    `invoice-reminder:${invoice.id}:2`,
  )
})

test('builds invoice status update only for new successful dispatches', () => {
  const update = buildInvoiceUpdatePayload({
    invoice,
    reminder: false,
    dispatchResult: { ok: true, data: { delivered_count: 1, failed_count: 0, existing: false } },
  })

  assert.equal(typeof update.emailed_at, 'string')

  assert.equal(buildInvoiceUpdatePayload({
    invoice,
    reminder: false,
    dispatchResult: { ok: true, data: { delivered_count: 1, failed_count: 0, existing: true } },
  }), null)

  assert.equal(buildInvoiceUpdatePayload({
    invoice,
    reminder: false,
    dispatchResult: { ok: false, error: 'failed' },
  }), null)
})

test('dispatches invoice notification with internal server auth', async () => {
  const payload = buildInvoiceNotificationPayload({
    invoice,
    reminder: false,
    allowResend: false,
    pdfBase64,
  }).value
  let request = null

  const result = await dispatchInvoiceNotification({
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
