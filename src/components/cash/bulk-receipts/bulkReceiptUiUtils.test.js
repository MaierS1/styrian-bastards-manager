import assert from 'node:assert/strict'
import test from 'node:test'
import { BULK_RECEIPT_STATUSES } from '../../../services/cash/bulkReceiptTypes.js'
import {
  getBulkReceiptDashboard,
  getBulkReceiptProgress,
  getBulkReceiptProgressHint,
  getBulkReceiptQueueState,
  getBulkReceiptShortIssue,
  getBulkReceiptStatusLabel,
  getBulkReceiptSummary,
  shortenReceiptFileName,
  toggleSingleExpandedDraft,
} from './bulkReceiptUiUtils.js'

function draft(status, overrides = {}) {
  return {
    status,
    ...overrides,
  }
}

test('summarizes an empty draft list', () => {
  const summary = getBulkReceiptSummary([])
  const progress = getBulkReceiptProgress([])

  assert.equal(summary.total, 0)
  assert.equal(summary.countsByStatus[BULK_RECEIPT_STATUSES.READY], 0)
  assert.deepEqual(progress, { processed: 0, total: 0, percent: 0 })
})

test('counts mixed statuses including errors and needs_review', () => {
  const summary = getBulkReceiptSummary([
    draft(BULK_RECEIPT_STATUSES.WAITING),
    draft(BULK_RECEIPT_STATUSES.UPLOADING),
    draft(BULK_RECEIPT_STATUSES.ANALYZING),
    draft(BULK_RECEIPT_STATUSES.READY),
    draft(BULK_RECEIPT_STATUSES.NEEDS_REVIEW),
    draft(BULK_RECEIPT_STATUSES.ERROR),
    draft(BULK_RECEIPT_STATUSES.SAVED),
  ])

  assert.equal(summary.total, 7)
  assert.equal(summary.countsByStatus[BULK_RECEIPT_STATUSES.NEEDS_REVIEW], 1)
  assert.equal(summary.countsByStatus[BULK_RECEIPT_STATUSES.ERROR], 1)
  assert.deepEqual(getBulkReceiptDashboard(summary), {
    processing: 2,
    ready: 2,
    needsReview: 1,
    error: 1,
  })
})

test('returns a clear queue state label', () => {
  assert.equal(getBulkReceiptQueueState(getBulkReceiptSummary([])), 'bereit für Belege')
  assert.equal(getBulkReceiptQueueState(getBulkReceiptSummary([draft(BULK_RECEIPT_STATUSES.ANALYZING)])), 'Verarbeitung läuft')
  assert.equal(getBulkReceiptQueueState(getBulkReceiptSummary([draft(BULK_RECEIPT_STATUSES.NEEDS_REVIEW)])), 'Prüfung erforderlich')
  assert.equal(getBulkReceiptQueueState(getBulkReceiptSummary([draft(BULK_RECEIPT_STATUSES.READY)])), 'bereit zum Verbuchen')
})

test('calculates weighted overall progress without calling it successful', () => {
  const progress = getBulkReceiptProgress([
    draft(BULK_RECEIPT_STATUSES.WAITING),
    draft(BULK_RECEIPT_STATUSES.UPLOADING),
    draft(BULK_RECEIPT_STATUSES.ANALYZING),
    draft(BULK_RECEIPT_STATUSES.READY),
  ])

  assert.equal(progress.processed, 1)
  assert.equal(progress.total, 4)
  assert.equal(progress.percent, 48)
})

test('counts error as processed and excludes cancelled from progress denominator', () => {
  const progress = getBulkReceiptProgress([
    draft(BULK_RECEIPT_STATUSES.ERROR),
    draft(BULK_RECEIPT_STATUSES.CANCELLED),
  ])

  assert.equal(progress.processed, 1)
  assert.equal(progress.total, 1)
  assert.equal(progress.percent, 100)
})

test('creates progress hints for review and errors', () => {
  const summary = getBulkReceiptSummary([
    draft(BULK_RECEIPT_STATUSES.NEEDS_REVIEW),
    draft(BULK_RECEIPT_STATUSES.ERROR),
  ])

  assert.match(getBulkReceiptProgressHint(summary), /benötigen Prüfung/)
  assert.match(getBulkReceiptProgressHint(summary), /mit Fehler/)
})

test('returns central status labels', () => {
  assert.equal(getBulkReceiptStatusLabel(BULK_RECEIPT_STATUSES.READY), 'Bereit zur Verbuchung')
  assert.equal(getBulkReceiptStatusLabel('unknown'), 'Wartet')
})

test('prefers technical errors before validation and warnings for short issues', () => {
  assert.equal(getBulkReceiptShortIssue({
    error: 'Technischer Fehler',
    validationErrors: ['Datum fehlt'],
  }), 'Technischer Fehler')

  assert.equal(getBulkReceiptShortIssue({
    validationErrors: ['Datum fehlt'],
    analysisWarnings: [{ message: 'Unsicher' }],
  }), 'Datum fehlt')

  assert.equal(getBulkReceiptShortIssue({
    analysisWarnings: [{ code: 'LOW_CONFIDENCE' }],
  }), 'LOW_CONFIDENCE')
})

test('shortens long filenames while keeping the extension visible', () => {
  const shortened = shortenReceiptFileName('sehr-langer-dateiname-fuer-einen-kassenbeleg-vom-sommerfest-2026.pdf', 34)

  assert.ok(shortened.length <= 34)
  assert.ok(shortened.includes('...'))
  assert.ok(shortened.endsWith('.pdf'))
})

test('keeps only one draft expanded at a time', () => {
  const drafts = [
    { id: 'one', isExpanded: true },
    { id: 'two', isExpanded: false },
    { id: 'three', isExpanded: true },
  ]

  assert.deepEqual(toggleSingleExpandedDraft(drafts, 'two').map(({ id, isExpanded }) => ({ id, isExpanded })), [
    { id: 'one', isExpanded: false },
    { id: 'two', isExpanded: true },
    { id: 'three', isExpanded: false },
  ])

  assert.deepEqual(toggleSingleExpandedDraft(drafts, 'one').map(({ id, isExpanded }) => ({ id, isExpanded })), [
    { id: 'one', isExpanded: false },
    { id: 'two', isExpanded: false },
    { id: 'three', isExpanded: false },
  ])
})
