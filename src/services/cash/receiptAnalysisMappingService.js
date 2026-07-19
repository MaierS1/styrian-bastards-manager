const CASH_TYPES = new Set(['einnahme', 'ausgabe'])
const CASH_CATEGORIES = new Set(['mitgliedsbeitrag', 'pfandbecher', 'veranstaltung', 'fanartikel', 'sonstiges'])
const CASH_PAYMENT_METHODS = new Set(['bar', 'ebanking'])

export function applyReceiptAnalysisToDraft(draft, response) {
  const analysis = extractAnalysis(response)
  const touchedFields = draft.touchedFields || {}
  const updates = {}

  setIfEditable(updates, draft, touchedFields, 'date', normalizeDate(getFieldValue(analysis.invoiceDate)))
  setIfEditable(updates, draft, touchedFields, 'amount', normalizeAmount(getFieldValue(analysis.totalAmount)))
  setIfEditable(updates, draft, touchedFields, 'type', normalizeCashType(getFieldValue(analysis.suggestedCashType)))
  setIfEditable(updates, draft, touchedFields, 'category', normalizeCategory(getFieldValue(analysis.suggestedCategory)))
  setIfEditable(updates, draft, touchedFields, 'paymentMethod', normalizePaymentMethod(getFieldValue(analysis.paymentMethod)))
  setIfEditable(updates, draft, touchedFields, 'description', buildDescription(analysis))

  return {
    ...draft,
    ...updates,
  }
}

function extractAnalysis(response) {
  if (!response || typeof response !== 'object') return {}

  if (response.analysis && typeof response.analysis === 'object') {
    return response.analysis
  }

  if (response.data?.analysis && typeof response.data.analysis === 'object') {
    return response.data.analysis
  }

  if (response.result?.analysis && typeof response.result.analysis === 'object') {
    return response.result.analysis
  }

  return response
}

function getFieldValue(field) {
  if (field && typeof field === 'object' && 'value' in field) {
    return field.value
  }

  return field
}

function setIfEditable(updates, draft, touchedFields, fieldName, value) {
  if (value === null || value === undefined || value === '') return
  if (touchedFields[fieldName] && String(draft[fieldName] || '').trim()) return

  updates[fieldName] = value
}

function normalizeDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10)
  }

  const text = String(value || '').trim()
  if (!text) return ''

  const isoDate = text.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (isoDate) return `${isoDate[1]}-${isoDate[2]}-${isoDate[3]}`

  const austrianDate = text.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  if (austrianDate) {
    return [
      austrianDate[3],
      austrianDate[2].padStart(2, '0'),
      austrianDate[1].padStart(2, '0'),
    ].join('-')
  }

  return ''
}

function normalizeAmount(value) {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return String(value)
  }

  const amount = Number(String(value || '').trim().replace(',', '.'))

  return Number.isFinite(amount) && amount > 0 ? String(amount) : ''
}

function normalizeCashType(value) {
  const text = String(value || '').trim().toLowerCase()

  return CASH_TYPES.has(text) ? text : ''
}

function normalizeCategory(value) {
  const text = String(value || '').trim().toLowerCase()

  return CASH_CATEGORIES.has(text) ? text : ''
}

function normalizePaymentMethod(value) {
  const text = String(value || '').trim().toLowerCase()

  return CASH_PAYMENT_METHODS.has(text) ? text : ''
}

function buildDescription(analysis) {
  const suggestedDescription = normalizeText(getFieldValue(analysis.suggestedDescription))
  const merchantName = normalizeText(getFieldValue(analysis.merchantName))
  const invoiceNumber = normalizeText(getFieldValue(analysis.invoiceNumber))
  const parts = []

  if (suggestedDescription) parts.push(suggestedDescription)
  if (merchantName) parts.push(`Händler/Lieferant: ${merchantName}`)
  if (invoiceNumber) parts.push(`Rechnungsnummer: ${invoiceNumber}`)

  return parts.join(' | ')
}

function normalizeText(value) {
  return String(value || '').trim()
}
