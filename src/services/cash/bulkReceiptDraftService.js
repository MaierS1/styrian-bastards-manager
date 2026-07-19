import {
  BULK_RECEIPT_FILE_LIMITS,
  BULK_RECEIPT_STATUSES,
} from './bulkReceiptTypes.js'
import { updateBulkReceiptDraftValidation } from './bulkReceiptValidationService.js'

const acceptedExtensions = new Set(BULK_RECEIPT_FILE_LIMITS.acceptedExtensions)
const acceptedMimeTypes = new Set(BULK_RECEIPT_FILE_LIMITS.acceptedMimeTypes)

export function createBulkReceiptDraft(file, index = 0, existingCount = 0, options = {}) {
  const validationError = validateBulkReceiptFile(file)
  const id = options.id || `${Date.now()}-${existingCount + index}-${file.name}`
  const cashDraft = {
    date: '',
    type: 'ausgabe',
    category: 'sonstiges',
    paymentMethod: 'bar',
    eventId: '',
    amount: '',
    description: '',
  }
  const draft = {
    id,
    fileKey: getBulkReceiptFileKey(file),
    file,
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type || getFileExtension(file.name).toUpperCase(),
    mimeType: file.type || '',
    storagePath: '',
    status: validationError ? BULK_RECEIPT_STATUSES.ERROR : BULK_RECEIPT_STATUSES.WAITING,
    taskId: validationError ? '' : id,
    taskStatus: validationError ? BULK_RECEIPT_STATUSES.ERROR : BULK_RECEIPT_STATUSES.WAITING,
    uploadStatus: validationError ? 'error' : 'pending',
    uploadError: validationError,
    error: validationError,
    cashDraft,
    date: cashDraft.date,
    type: cashDraft.type,
    category: cashDraft.category,
    paymentMethod: cashDraft.paymentMethod,
    eventId: cashDraft.eventId,
    amount: cashDraft.amount,
    description: cashDraft.description,
    validation: {
      isValid: false,
      errorsByField: {},
      warnings: [],
    },
    validationErrors: [],
    analysisStatus: 'idle',
    analysisResult: null,
    analysisError: '',
    analysisWarnings: [],
    touchedFields: {},
    selected: true,
    isExpanded: false,
  }

  return validationError ? draft : updateBulkReceiptDraftValidation(draft)
}

export function applyBulkReceiptDraftFieldChange(draft, field, value) {
  const cashDraft = {
    ...draft.cashDraft,
    [field]: value,
  }

  return updateBulkReceiptDraftValidation({
    ...draft,
    cashDraft,
    [field]: value,
    touchedFields: {
      ...(draft.touchedFields || {}),
      [field]: true,
    },
    error: draft.uploadStatus === 'uploaded' ? '' : draft.error,
  })
}

export function getBulkReceiptFileKey(file) {
  return [
    file.name,
    file.size,
    file.lastModified,
    file.type,
  ].join('|')
}

export function validateBulkReceiptFile(file) {
  const extension = getFileExtension(file.name)
  const hasAcceptedExtension = acceptedExtensions.has(extension)
  const hasAcceptedType = acceptedMimeTypes.has(file.type)

  if (!hasAcceptedExtension && !hasAcceptedType) {
    return 'Ungültiger Dateityp. Erlaubt sind PDF, JPG, JPEG, PNG und WEBP.'
  }

  if (file.size > BULK_RECEIPT_FILE_LIMITS.maxFileSizeBytes) {
    return 'Datei ist größer als 15 MB.'
  }

  return ''
}

export function getFileExtension(fileName) {
  return String(fileName || '')
    .split('.')
    .pop()
    .toLowerCase()
}
