import assert from 'node:assert/strict'
import test from 'node:test'
import { applyReceiptAnalysisToDraft } from './receiptAnalysisMappingService.js'

function field(value) {
  return {
    value,
    confidence: 0.9,
    sourceText: 'redacted',
  }
}

function createDraft(overrides = {}) {
  return {
    date: '',
    type: 'ausgabe',
    category: 'sonstiges',
    paymentMethod: 'bar',
    amount: '',
    description: '',
    touchedFields: {},
    ...overrides,
  }
}

test('maps wrapped receipt analysis fields to an empty cash draft', () => {
  const draft = createDraft()
  const mapped = applyReceiptAnalysisToDraft(draft, {
    analysis: {
      invoiceDate: field('2026-07-19'),
      totalAmount: field(42.5),
      merchantName: field('METRO'),
      invoiceNumber: field('R-123'),
      paymentMethod: field('ebanking'),
      suggestedCashType: field('ausgabe'),
      suggestedCategory: field('veranstaltung'),
      suggestedDescription: field('Einkauf Getränke'),
    },
  })

  assert.equal(mapped.date, '2026-07-19')
  assert.equal(mapped.amount, '42.5')
  assert.equal(mapped.type, 'ausgabe')
  assert.equal(mapped.category, 'veranstaltung')
  assert.equal(mapped.paymentMethod, 'ebanking')
  assert.equal(mapped.description, 'METRO – Einkauf Getränke')
  assert.doesNotMatch(mapped.description, /Rechnungsnummer/)
})

test('does not overwrite manually edited fields', () => {
  const draft = createDraft({
    date: '2026-01-01',
    amount: '10',
    description: 'Manuell',
    touchedFields: {
      date: true,
      amount: true,
      description: true,
    },
  })
  const mapped = applyReceiptAnalysisToDraft(draft, {
    result: {
      analysis: {
        invoiceDate: field('2026-07-19'),
        totalAmount: field(42.5),
        merchantName: field('METRO'),
        invoiceNumber: field('R-123'),
        suggestedDescription: field('Einkauf Getränke'),
      },
    },
  })

  assert.equal(mapped.date, '2026-01-01')
  assert.equal(mapped.amount, '10')
  assert.equal(mapped.description, 'Manuell')
})

test('normalizes Austrian dates and comma amounts from direct analysis payloads', () => {
  const mapped = applyReceiptAnalysisToDraft(createDraft(), {
    invoiceDate: field('19.07.2026'),
    totalAmount: field('12,34'),
  })

  assert.equal(mapped.date, '2026-07-19')
  assert.equal(mapped.amount, '12.34')
})

test('formats merchant and recognized items without invoice number in the standard description', () => {
  const mapped = applyReceiptAnalysisToDraft(createDraft(), {
    merchantName: field('Billa AG'),
    invoiceNumber: field('R-456'),
    suggestedDescription: field('100 x Knopfsemmel'),
  })

  assert.equal(mapped.description, 'Billa AG – 100× Knopfsemmel')
  assert.doesNotMatch(mapped.description, /R-456/)
})
