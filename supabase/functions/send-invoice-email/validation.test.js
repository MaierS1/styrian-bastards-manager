import assert from 'node:assert/strict'
import test from 'node:test'
import {
  MAX_PDF_BYTES,
  buildInvoiceNotificationMessage,
  buildSafeInvoiceFilename,
  maskEmail,
  validateInvoiceEmailPayload,
  validateInvoiceForSending,
} from './validation.js'

const invoiceId = '11111111-1111-4111-8111-111111111111'
const smallPdf = 'JVBERi0xLjQgdGVzdA=='

function createPayload(overrides = {}) {
  return {
    invoice_id: invoiceId,
    reminder: false,
    allow_resend: false,
    pdf_base64: smallPdf,
    filename: 'rechnung-2026-001.pdf',
    mime_type: 'application/pdf',
    ...overrides,
  }
}

function createInvoice(overrides = {}) {
  return {
    id: invoiceId,
    invoice_number: '2026-001',
    customer_email: 'kunde@example.com',
    status: 'offen',
    emailed_at: null,
    last_reminder_at: null,
    reminder_count: 0,
    ...overrides,
  }
}

test('accepts the hardened invoice email payload', () => {
  const result = validateInvoiceEmailPayload(createPayload())

  assert.equal(result.ok, true)
  assert.equal(result.value.invoiceId, invoiceId)
  assert.equal(result.value.mimeType, 'application/pdf')
})

test('rejects legacy arbitrary recipient and content fields', () => {
  const result = validateInvoiceEmailPayload(createPayload({
    to: 'attacker@example.com',
    subject: 'Freier Betreff',
    html: '<p>frei</p>',
  }))

  assert.equal(result.ok, false)
  assert.equal(result.status, 400)
})

test('rejects invalid invoice id and filename', () => {
  assert.equal(validateInvoiceEmailPayload(createPayload({ invoice_id: 'x' })).status, 400)
  assert.equal(validateInvoiceEmailPayload(createPayload({ filename: '../rechnung.pdf' })).status, 400)
  assert.equal(validateInvoiceEmailPayload(createPayload({ filename: 'rechnung.exe' })).status, 400)
})

test('rejects non-boolean control flags', () => {
  assert.equal(validateInvoiceEmailPayload(createPayload({ reminder: 'true' })).status, 400)
  assert.equal(validateInvoiceEmailPayload(createPayload({ allow_resend: 'true' })).status, 400)
})

test('rejects non-pdf mime type and invalid base64', () => {
  assert.equal(validateInvoiceEmailPayload(createPayload({ mime_type: 'text/html' })).status, 400)
  assert.equal(validateInvoiceEmailPayload(createPayload({ pdf_base64: 'data:application/pdf;base64,abc' })).status, 400)
  assert.equal(validateInvoiceEmailPayload(createPayload({ pdf_base64: 'not base64' })).status, 400)
  assert.equal(validateInvoiceEmailPayload(createPayload({ pdf_base64: 'bm90IGEgcGRm' })).status, 400)
})

test('rejects too large pdf payloads', () => {
  const tooLargePdf = `${'A'.repeat(Math.ceil((MAX_PDF_BYTES + 1) / 3) * 4)}`
  const result = validateInvoiceEmailPayload(createPayload({ pdf_base64: tooLargePdf }))

  assert.equal(result.ok, false)
  assert.equal(result.status, 400)
})

test('rejects missing or manipulated invoice recipient data', () => {
  assert.equal(validateInvoiceForSending({ invoice: null, reminder: false, allowResend: false }).status, 404)
  assert.equal(validateInvoiceForSending({
    invoice: createInvoice({ customer_email: 'ungueltig' }),
    reminder: false,
    allowResend: false,
  }).status, 400)
})

test('rejects cancelled invoices and invalid reminders', () => {
  assert.equal(validateInvoiceForSending({
    invoice: createInvoice({ status: 'storniert' }),
    reminder: false,
    allowResend: false,
  }).status, 409)
  assert.equal(validateInvoiceForSending({
    invoice: createInvoice({ status: 'bezahlt' }),
    reminder: true,
    allowResend: false,
  }).status, 409)
})

test('requires explicit resend for duplicate invoice and reminder emails', () => {
  assert.equal(validateInvoiceForSending({
    invoice: createInvoice({ emailed_at: '2026-07-20T10:00:00Z' }),
    reminder: false,
    allowResend: false,
  }).status, 409)
  assert.equal(validateInvoiceForSending({
    invoice: createInvoice({ emailed_at: '2026-07-20T10:00:00Z' }),
    reminder: false,
    allowResend: true,
  }).ok, true)
  assert.equal(validateInvoiceForSending({
    invoice: createInvoice({ last_reminder_at: '2026-07-20T10:00:00Z' }),
    reminder: true,
    allowResend: false,
  }).status, 409)
})

test('builds server-side invoice notification text and masks recipient for logs', () => {
  const result = buildInvoiceNotificationMessage({ invoice: createInvoice(), reminder: false, resent: false })

  assert.equal(result.ok, true)
  assert.equal(result.title, 'Rechnung 2026-001')
  assert.match(result.message, /2026-001/)
  assert.equal(maskEmail('kunde@example.com'), 'ku***@example.com')
})

test('builds notification message and safe invoice filename server-side', () => {
  const invoice = createInvoice({
    invoice_number: '2026/001',
    issue_date: '2026-07-20',
    due_date: '2026-08-01',
    total_amount: 123.45,
  })
  const message = buildInvoiceNotificationMessage({ invoice, reminder: true, resent: false })

  assert.equal(message.ok, true)
  assert.match(message.title, /Zahlungserinnerung/)
  assert.match(message.message, /123,45/)
  assert.equal(buildSafeInvoiceFilename(invoice), 'Rechnung_2026_001.pdf')
})
