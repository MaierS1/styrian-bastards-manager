import assert from 'node:assert/strict'
import test from 'node:test'
import { BULK_RECEIPT_STATUSES } from './bulkReceiptTypes.js'
import {
  applyBulkReceiptDraftFieldChange,
  createBulkReceiptDraft,
} from './bulkReceiptDraftService.js'
import {
  determineBulkReceiptStatus,
  updateBulkReceiptDraftValidation,
  validateBulkReceiptDraft,
} from './bulkReceiptValidationService.js'

function createFile(overrides = {}) {
  return {
    name: 'receipt.pdf',
    size: 1024,
    lastModified: 1,
    type: 'application/pdf',
    ...overrides,
  }
}

function createUploadedDraft(overrides = {}) {
  return updateBulkReceiptDraftValidation({
    ...createBulkReceiptDraft(createFile(), 0, 0, { id: 'draft-1' }),
    uploadStatus: 'uploaded',
    storagePath: 'cash/receipt.pdf',
    date: '2026-07-19',
    type: 'ausgabe',
    category: 'sonstiges',
    paymentMethod: 'bar',
    amount: '12.34',
    description: '',
    cashDraft: {
      date: '2026-07-19',
      type: 'ausgabe',
      category: 'sonstiges',
      paymentMethod: 'bar',
      eventId: '',
      amount: '12.34',
      description: '',
    },
    analysisStatus: 'completed',
    ...overrides,
  })
}

test('creates a new compatible bulk receipt draft', () => {
  const draft = createBulkReceiptDraft(createFile(), 0, 0, { id: 'draft-1' })

  assert.equal(draft.id, 'draft-1')
  assert.equal(draft.fileName, 'receipt.pdf')
  assert.equal(draft.mimeType, 'application/pdf')
  assert.equal(draft.status, BULK_RECEIPT_STATUSES.WAITING)
  assert.equal(draft.cashDraft.type, 'ausgabe')
  assert.equal(draft.type, 'ausgabe')
  assert.equal(draft.selected, true)
  assert.deepEqual(draft.touchedFields, {})
})

test('validates a complete uploaded draft', () => {
  const draft = createUploadedDraft()
  const validation = validateBulkReceiptDraft(draft)

  assert.equal(validation.isValid, true)
  assert.deepEqual(validation.errorsByField, {})
})

test('reports a missing date', () => {
  const draft = createUploadedDraft({
    date: '',
    cashDraft: {
      ...createUploadedDraft().cashDraft,
      date: '',
    },
  })
  const validation = validateBulkReceiptDraft(draft)

  assert.equal(validation.isValid, false)
  assert.equal(validation.errorsByField.date, 'Belegdatum ist erforderlich.')
})

test('reports invalid and empty amounts', () => {
  const invalidDraft = createUploadedDraft({
    amount: 'abc',
    cashDraft: {
      ...createUploadedDraft().cashDraft,
      amount: 'abc',
    },
  })
  const emptyDraft = createUploadedDraft({
    amount: '',
    cashDraft: {
      ...createUploadedDraft().cashDraft,
      amount: '',
    },
  })

  assert.equal(validateBulkReceiptDraft(invalidDraft).errorsByField.amount, 'Betrag muss größer als 0 sein.')
  assert.equal(validateBulkReceiptDraft(emptyDraft).errorsByField.amount, 'Betrag muss größer als 0 sein.')
})

test('reports a missing storage path', () => {
  const draft = createUploadedDraft({ storagePath: '' })
  const validation = validateBulkReceiptDraft(draft)

  assert.equal(validation.isValid, false)
  assert.equal(validation.errorsByField.storagePath, 'Storage-Pfad fehlt.')
})

test('analysis warning leads to needs_review', () => {
  const draft = createUploadedDraft({
    analysisWarnings: [{ code: 'LOW_CONFIDENCE', message: 'Unsicher' }],
  })

  assert.equal(determineBulkReceiptStatus(draft, validateBulkReceiptDraft(draft)), BULK_RECEIPT_STATUSES.NEEDS_REVIEW)
})

test('complete draft leads to ready', () => {
  const draft = createUploadedDraft()

  assert.equal(draft.status, BULK_RECEIPT_STATUSES.READY)
})

test('technical error leads to error', () => {
  const draft = createUploadedDraft({ analysisError: 'Analyse fehlgeschlagen.' })

  assert.equal(determineBulkReceiptStatus(draft), BULK_RECEIPT_STATUSES.ERROR)
})

test('manual changes revalidate the draft', () => {
  const draft = createUploadedDraft({
    amount: '',
    cashDraft: {
      ...createUploadedDraft().cashDraft,
      amount: '',
    },
  })
  const changed = applyBulkReceiptDraftFieldChange(draft, 'amount', '42.50')

  assert.equal(changed.amount, '42.50')
  assert.equal(changed.cashDraft.amount, '42.50')
  assert.equal(changed.touchedFields.amount, true)
  assert.equal(changed.validation.isValid, true)
  assert.equal(changed.status, BULK_RECEIPT_STATUSES.READY)
})
