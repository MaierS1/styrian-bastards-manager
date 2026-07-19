export const BULK_RECEIPT_STATUSES = Object.freeze({
  WAITING: 'waiting',
  UPLOADING: 'uploading',
  ANALYZING: 'analyzing',
  READY: 'ready',
  NEEDS_REVIEW: 'needs_review',
  ERROR: 'error',
  SAVING: 'saving',
  SAVED: 'saved',
  CANCELLED: 'cancelled',
})

export const BULK_RECEIPT_STATUS_LABELS = Object.freeze({
  [BULK_RECEIPT_STATUSES.WAITING]: 'Wartet',
  [BULK_RECEIPT_STATUSES.UPLOADING]: 'Wird hochgeladen',
  [BULK_RECEIPT_STATUSES.ANALYZING]: 'Wird analysiert',
  [BULK_RECEIPT_STATUSES.READY]: 'Bereit zur Verbuchung',
  [BULK_RECEIPT_STATUSES.NEEDS_REVIEW]: 'Prüfung erforderlich',
  [BULK_RECEIPT_STATUSES.ERROR]: 'Fehler',
  [BULK_RECEIPT_STATUSES.SAVING]: 'Wird gespeichert',
  [BULK_RECEIPT_STATUSES.SAVED]: 'Gespeichert',
  [BULK_RECEIPT_STATUSES.CANCELLED]: 'Abgebrochen',
})

export const BULK_RECEIPT_TASK_TYPE = 'bulk-receipt-upload-analysis'
export const BULK_RECEIPT_CONCURRENCY = 3

export const BULK_RECEIPT_FILE_LIMITS = Object.freeze({
  maxFiles: 50,
  maxFileSizeBytes: 15 * 1024 * 1024,
  acceptedExtensions: ['pdf', 'jpg', 'jpeg', 'png', 'webp'],
  acceptedMimeTypes: [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
  ],
  fileInputAccept: '.pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp',
})
