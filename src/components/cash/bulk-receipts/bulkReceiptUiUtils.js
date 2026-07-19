import {
  BULK_RECEIPT_STATUSES,
  BULK_RECEIPT_STATUS_LABELS,
} from '../../../services/cash/bulkReceiptTypes.js'

const progressByStatus = {
  [BULK_RECEIPT_STATUSES.WAITING]: 0,
  [BULK_RECEIPT_STATUSES.UPLOADING]: 25,
  [BULK_RECEIPT_STATUSES.ANALYZING]: 65,
  [BULK_RECEIPT_STATUSES.READY]: 100,
  [BULK_RECEIPT_STATUSES.NEEDS_REVIEW]: 100,
  [BULK_RECEIPT_STATUSES.ERROR]: 100,
  [BULK_RECEIPT_STATUSES.SAVING]: 80,
  [BULK_RECEIPT_STATUSES.SAVED]: 100,
  [BULK_RECEIPT_STATUSES.CANCELLED]: 0,
}

const processedStatuses = new Set([
  BULK_RECEIPT_STATUSES.READY,
  BULK_RECEIPT_STATUSES.NEEDS_REVIEW,
  BULK_RECEIPT_STATUSES.ERROR,
  BULK_RECEIPT_STATUSES.SAVED,
])

export function getBulkReceiptSummary(drafts = []) {
  const countsByStatus = Object.values(BULK_RECEIPT_STATUSES).reduce((counts, status) => {
    counts[status] = 0
    return counts
  }, {})

  drafts.forEach((draft) => {
    const status = normalizeDraftStatus(draft?.status)
    countsByStatus[status] = (countsByStatus[status] || 0) + 1
  })

  return {
    total: drafts.length,
    countsByStatus,
  }
}

export function getBulkReceiptDashboard(summary) {
  const counts = summary?.countsByStatus || {}
  const processing = (counts[BULK_RECEIPT_STATUSES.UPLOADING] || 0)
    + (counts[BULK_RECEIPT_STATUSES.ANALYZING] || 0)
    + (counts[BULK_RECEIPT_STATUSES.SAVING] || 0)
  const ready = (counts[BULK_RECEIPT_STATUSES.READY] || 0)
    + (counts[BULK_RECEIPT_STATUSES.SAVED] || 0)
  const needsReview = counts[BULK_RECEIPT_STATUSES.NEEDS_REVIEW] || 0
  const error = counts[BULK_RECEIPT_STATUSES.ERROR] || 0

  return {
    processing,
    ready,
    needsReview,
    error,
  }
}

export function getBulkReceiptQueueState(summary) {
  const dashboard = getBulkReceiptDashboard(summary)
  const total = summary?.total || 0

  if (dashboard.processing > 0) return 'Verarbeitung läuft'
  if (dashboard.error > 0 || dashboard.needsReview > 0) return 'Prüfung erforderlich'
  if (dashboard.ready > 0) return 'bereit zum Verbuchen'
  if (total > 0) return 'abgeschlossen'

  return 'bereit für Belege'
}

export function getBulkReceiptProgress(drafts = []) {
  const activeDrafts = drafts.filter((draft) => normalizeDraftStatus(draft?.status) !== BULK_RECEIPT_STATUSES.CANCELLED)

  if (activeDrafts.length === 0) {
    return {
      processed: 0,
      total: drafts.length,
      percent: 0,
    }
  }

  const processed = activeDrafts.filter((draft) => processedStatuses.has(normalizeDraftStatus(draft?.status))).length
  const weightedPercent = activeDrafts.reduce((sum, draft) => (
    sum + progressByStatus[normalizeDraftStatus(draft?.status)]
  ), 0) / activeDrafts.length

  return {
    processed,
    total: activeDrafts.length,
    percent: Math.round(weightedPercent),
  }
}

export function getBulkReceiptProgressHint(summary) {
  const dashboard = getBulkReceiptDashboard(summary)
  const hints = []

  if (dashboard.needsReview > 0) {
    hints.push(`${dashboard.needsReview} Beleg${dashboard.needsReview === 1 ? '' : 'e'} benötigen Prüfung`)
  }

  if (dashboard.error > 0) {
    hints.push(`${dashboard.error} Beleg${dashboard.error === 1 ? '' : 'e'} mit Fehler`)
  }

  return hints.length > 0
    ? hints.join(' · ')
    : 'Keine offenen Probleme in der Verarbeitung.'
}

export function getBulkReceiptStatusLabel(status) {
  return BULK_RECEIPT_STATUS_LABELS[normalizeDraftStatus(status)]
}

export function getBulkReceiptShortIssue(draft) {
  if (draft?.error) return draft.error
  if (draft?.uploadError) return draft.uploadError
  if (draft?.analysisError) return draft.analysisError
  if (draft?.validationErrors?.length > 0) return draft.validationErrors[0]
  if (draft?.analysisWarnings?.length > 0) {
    const warning = draft.analysisWarnings[0]
    return warning.message || warning.code || 'Hinweis zur Beleganalyse'
  }

  return ''
}

export function shortenReceiptFileName(fileName, maxLength = 42) {
  const text = String(fileName || '').trim()
  if (text.length <= maxLength) return text
  if (maxLength < 12) return text.slice(0, maxLength)

  const dotIndex = text.lastIndexOf('.')
  const extension = dotIndex > 0 ? text.slice(dotIndex) : ''
  const available = maxLength - extension.length - 3
  const headLength = Math.max(8, Math.ceil(available * 0.62))
  const tailLength = Math.max(4, available - headLength)

  return `${text.slice(0, headLength)}...${text.slice(text.length - tailLength - extension.length)}`
}

export function toggleSingleExpandedDraft(drafts = [], draftId) {
  return drafts.map((draft) => ({
    ...draft,
    isExpanded: draft.id === draftId ? !draft.isExpanded : false,
  }))
}

export function isBulkReceiptProcessing(status) {
  const normalized = normalizeDraftStatus(status)
  return normalized === BULK_RECEIPT_STATUSES.UPLOADING
    || normalized === BULK_RECEIPT_STATUSES.ANALYZING
    || normalized === BULK_RECEIPT_STATUSES.SAVING
}

function normalizeDraftStatus(status) {
  return Object.values(BULK_RECEIPT_STATUSES).includes(status)
    ? status
    : BULK_RECEIPT_STATUSES.WAITING
}
