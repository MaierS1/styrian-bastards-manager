export const MAX_FILENAME_LENGTH = 140
export const MAX_PDF_BYTES = 8 * 1024 * 1024

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/
const SAFE_FILENAME_PATTERN = /^[A-Za-z0-9._ -]+\.pdf$/i
const ALLOWED_KEYS = new Set([
  'invoice_id',
  'reminder',
  'allow_resend',
  'pdf_base64',
  'filename',
  'mime_type',
])

export function validateInvoiceEmailPayload(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, status: 400, error: 'Ungueltiger Request Body.' }
  }

  const unexpectedKeys = Object.keys(body).filter((key) => !ALLOWED_KEYS.has(key))
  if (unexpectedKeys.length > 0) {
    return { ok: false, status: 400, error: 'Unerwartete Request-Felder.' }
  }

  const invoiceId = String(body.invoice_id || '').trim()
  const pdfBase64 = String(body.pdf_base64 || '').trim()
  const filename = String(body.filename || 'rechnung.pdf').trim()
  const mimeType = String(body.mime_type || 'application/pdf').trim().toLowerCase()
  const reminder = body.reminder === true
  const allowResend = body.allow_resend === true

  if (
    (body.reminder !== undefined && typeof body.reminder !== 'boolean')
    || (body.allow_resend !== undefined && typeof body.allow_resend !== 'boolean')
  ) {
    return { ok: false, status: 400, error: 'Ungueltige Request-Felder.' }
  }

  if (!UUID_PATTERN.test(invoiceId)) {
    return { ok: false, status: 400, error: 'invoice_id ist erforderlich.' }
  }

  if (mimeType !== 'application/pdf') {
    return { ok: false, status: 400, error: 'Nur PDF-Anhaenge sind erlaubt.' }
  }

  if (!SAFE_FILENAME_PATTERN.test(filename) || filename.includes('..') || filename.length > MAX_FILENAME_LENGTH) {
    return { ok: false, status: 400, error: 'Ungueltiger PDF-Dateiname.' }
  }

  const pdfValidation = validatePdfBase64(pdfBase64)
  if (!pdfValidation.ok) return pdfValidation

  return {
    ok: true,
    value: {
      invoiceId,
      reminder,
      allowResend,
      pdfBase64,
      filename,
      mimeType,
      pdfBytes: pdfValidation.bytes,
    },
  }
}

export function validatePdfBase64(value) {
  if (!value) {
    return { ok: false, status: 400, error: 'PDF ist erforderlich.' }
  }

  if (value.startsWith('data:')) {
    return { ok: false, status: 400, error: 'PDF muss als reiner Base64-Inhalt uebergeben werden.' }
  }

  const normalized = value.replace(/\s/g, '')
  if (normalized.length !== value.length || normalized.length % 4 !== 0 || !BASE64_PATTERN.test(normalized)) {
    return { ok: false, status: 400, error: 'PDF ist kein gueltiger Base64-Inhalt.' }
  }

  const padding = normalized.endsWith('==') ? 2 : normalized.endsWith('=') ? 1 : 0
  const bytes = Math.floor((normalized.length * 3) / 4) - padding

  if (bytes <= 0) {
    return { ok: false, status: 400, error: 'PDF ist leer.' }
  }

  if (bytes > MAX_PDF_BYTES) {
    return { ok: false, status: 400, error: 'PDF ist zu gross.' }
  }

  if (!hasPdfSignature(normalized)) {
    return { ok: false, status: 400, error: 'PDF-Signatur ist ungueltig.' }
  }

  return { ok: true, bytes }
}

export function isValidEmail(value) {
  return EMAIL_PATTERN.test(String(value || '').trim())
}

export function buildInvoiceNotificationMessage({ invoice, reminder, resent }) {
  const invoiceNumber = String(invoice?.invoice_number || '').trim()
  const amount = formatCurrency(invoice?.total_amount)
  const dueDate = invoice?.due_date ? formatDate(invoice.due_date) : null
  const issueDate = invoice?.issue_date ? formatDate(invoice.issue_date) : null

  if (!invoiceNumber) {
    return { ok: false, status: 400, error: 'Rechnungsinhalt ist ungueltig.' }
  }

  const title = reminder
    ? `Zahlungserinnerung zu Rechnung ${invoiceNumber}`
    : resent
      ? `Rechnung ${invoiceNumber} erneut zugesendet`
      : `Rechnung ${invoiceNumber}`

  const message = reminder
    ? [
        'Hallo,',
        '',
        `wir moechten freundlich an die offene Rechnung ${invoiceNumber} erinnern.`,
        `Betrag: ${amount}`,
        dueDate ? `Faellig am: ${dueDate}` : '',
        '',
        'Die Rechnung ist als PDF angehaengt.',
        '',
        'Danke und sportliche Gruesse',
        'Styrian Bastards Eishockey-Fanclub',
      ].filter(Boolean).join('\n')
    : [
        'Hallo,',
        '',
        `anbei senden wir die Rechnung ${invoiceNumber}.`,
        issueDate ? `Rechnungsdatum: ${issueDate}` : '',
        `Betrag: ${amount}`,
        dueDate ? `Faellig am: ${dueDate}` : '',
        '',
        'Die Rechnung ist als PDF angehaengt.',
        '',
        'Danke und sportliche Gruesse',
        'Styrian Bastards Eishockey-Fanclub',
      ].filter(Boolean).join('\n')

  return { ok: true, title, message }
}

export function buildSafeInvoiceFilename(invoice) {
  const number = String(invoice?.invoice_number || 'rechnung')
    .replace(/[^A-Za-z0-9._ -]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 100)
    || 'rechnung'

  return `Rechnung_${number}.pdf`
}

export function validateInvoiceForSending({ invoice, reminder, allowResend }) {
  if (!invoice) {
    return { ok: false, status: 404, error: 'Rechnung nicht gefunden.' }
  }

  if (!isValidEmail(invoice.customer_email)) {
    return { ok: false, status: 400, error: 'Rechnung hat keine gueltige Empfaengeradresse.' }
  }

  if (String(invoice.status || '').toLowerCase() === 'storniert') {
    return { ok: false, status: 409, error: 'Stornierte Rechnungen koennen nicht versendet werden.' }
  }

  if (reminder && String(invoice.status || '').toLowerCase() !== 'offen') {
    return { ok: false, status: 409, error: 'Zahlungserinnerungen sind nur fuer offene Rechnungen erlaubt.' }
  }

  if (!reminder && invoice.emailed_at && !allowResend) {
    return { ok: false, status: 409, error: 'Rechnung wurde bereits versendet.' }
  }

  if (reminder && invoice.last_reminder_at && !allowResend) {
    return { ok: false, status: 409, error: 'Zahlungserinnerung wurde bereits versendet.' }
  }

  return { ok: true }
}

export function maskEmail(value) {
  const email = String(value || '').trim()
  const [localPart, domain] = email.split('@')

  if (!localPart || !domain) return 'ungueltig'

  const visibleLocal = localPart.length <= 2
    ? `${localPart[0] || '*'}*`
    : `${localPart.slice(0, 2)}***`

  return `${visibleLocal}@${domain}`
}

function hasPdfSignature(value) {
  try {
    const prefix = atob(value.slice(0, 16))
    return prefix.startsWith('%PDF-')
  } catch {
    return false
  }
}

function formatCurrency(value) {
  return new Intl.NumberFormat('de-AT', {
    style: 'currency',
    currency: 'EUR',
  }).format(Number(value || 0))
}

function formatDate(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value || '')

  return new Intl.DateTimeFormat('de-AT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}
