import assert from 'node:assert/strict'
import test from 'node:test'
import { BULK_RECEIPT_STATUSES } from '../../../services/cash/bulkReceiptTypes.js'
import {
  getBulkReceiptProgress,
  getBulkReceiptShortIssue,
  getBulkReceiptStatusLabel,
  getBulkReceiptSummary,
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
