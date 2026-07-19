import { BULK_RECEIPT_STATUSES } from './bulkReceiptTypes.js'

const CASH_TYPES = new Set(['einnahme', 'ausgabe'])
const CASH_CATEGORIES = new Set(['mitgliedsbeitrag', 'pfandbecher', 'veranstaltung', 'fanartikel', 'sonstiges'])
const CASH_PAYMENT_METHODS = new Set(['bar', 'ebanking'])

export function validateBulkReceiptDraft(draft, options = {}) {
  const errorsByField = {}
  const warnings = []
  const cashDraft = getCashDraft(draft)
  const amount = parseAmount(cashDraft.amount)
  const dateText = String(cashDraft.date || '').trim()

  if (draft.uploadStatus !== 'uploaded') {
    errorsByField.uploadStatus = 'Upload ist noch nicht erfolgreich abgeschlossen.'
  }

  if (!String(draft.storagePath || '').trim()) {
    errorsByField.storagePath = 'Storage-Pfad fehlt.'
  }

  if (!dateText) {
    errorsByField.date = 'Belegdatum ist erforderlich.'
  } else if (!isValidIsoDate(dateText)) {
    errorsByField.date = 'Belegdatum ist ungültig.'
  }

  if (!CASH_TYPES.has(String(cashDraft.type || '').trim())) {
    errorsByField.type = 'Typ ist erforderlich.'
  }

  if (!CASH_CATEGORIES.has(String(cashDraft.category || '').trim())) {
    errorsByField.category = 'Kategorie ist erforderlich.'
  }

  if (!CASH_PAYMENT_METHODS.has(String(cashDraft.paymentMethod || '').trim())) {
    errorsByField.paymentMethod = 'Zahlungsart ist erforderlich.'
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    errorsByField.amount = 'Betrag muss größer als 0 sein.'
  }

  if (dateText && isValidIsoDate(dateText) && typeof options.isCashMonthClosed === 'function') {
    const year = Number(dateText.slice(0, 4))
    const month = Number(dateText.slice(5, 7))

    if (options.isCashMonthClosed(year, month)) {
      errorsByField.date = 'Der Monat dieses Belegs ist bereits abgeschlossen.'
    }
  }

  normalizeAnalysisWarnings(draft.analysisWarnings).forEach((warning) => {
    warnings.push(warning)
  })

  return {
    isValid: Object.keys(errorsByField).length === 0,
    errorsByField,
    warnings,
  }
}

export function determineBulkReceiptStatus(draft, validation = validateBulkReceiptDraft(draft)) {
  if (
    draft.status === BULK_RECEIPT_STATUSES.CANCELLED
    || draft.taskStatus === BULK_RECEIPT_STATUSES.CANCELLED
  ) {
    return BULK_RECEIPT_STATUSES.CANCELLED
  }

  if (
    draft.uploadError
    || draft.analysisError
    || draft.saveError
    || draft.error
    || draft.uploadStatus === 'error'
    || draft.taskStatus === BULK_RECEIPT_STATUSES.ERROR
  ) {
    return BULK_RECEIPT_STATUSES.ERROR
  }

  if (draft.status === BULK_RECEIPT_STATUSES.SAVED) return BULK_RECEIPT_STATUSES.SAVED
  if (draft.status === BULK_RECEIPT_STATUSES.SAVING) return BULK_RECEIPT_STATUSES.SAVING
  if (draft.uploadStatus === 'uploading') return BULK_RECEIPT_STATUSES.UPLOADING
  if (draft.analysisStatus === 'analyzing') return BULK_RECEIPT_STATUSES.ANALYZING

  if (draft.uploadStatus !== 'uploaded') {
    return BULK_RECEIPT_STATUSES.WAITING
  }

  if (validation.isValid && (validation.warnings.length === 0 && !draft.reviewRequired)) {
    return BULK_RECEIPT_STATUSES.READY
  }

  if (validation.isValid && draft.reviewConfirmed) {
    return BULK_RECEIPT_STATUSES.READY
  }

  return BULK_RECEIPT_STATUSES.NEEDS_REVIEW
}

export function updateBulkReceiptDraftValidation(draft, options = {}) {
  const cashDraft = getCashDraft(draft)
  const validation = validateBulkReceiptDraft(draft, options)
  const status = determineBulkReceiptStatus(draft, validation)

  return {
    ...draft,
    cashDraft,
    status,
    taskStatus: status,
    validation,
    validationErrors: validation.isValid ? [] : Object.values(validation.errorsByField),
  }
}

export function getCashDraft(draft) {
  return {
    date: draft.date ?? draft.cashDraft?.date ?? '',
    type: draft.type ?? draft.cashDraft?.type ?? '',
    category: draft.category ?? draft.cashDraft?.category ?? '',
    paymentMethod: draft.paymentMethod ?? draft.cashDraft?.paymentMethod ?? '',
    eventId: draft.eventId ?? draft.cashDraft?.eventId ?? '',
    amount: draft.amount ?? draft.cashDraft?.amount ?? '',
    description: draft.description ?? draft.cashDraft?.description ?? '',
  }
}

function parseAmount(value) {
  return Number(String(value || '').replace(',', '.'))
}

function isValidIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false

  const date = new Date(`${value}T00:00:00Z`)

  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function normalizeAnalysisWarnings(warnings) {
  return Array.isArray(warnings)
    ? warnings.filter((warning) => warning && typeof warning === 'object')
    : []
}
