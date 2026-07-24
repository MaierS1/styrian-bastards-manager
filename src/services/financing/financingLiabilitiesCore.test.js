import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getComputedLiabilityStatus,
  getLiabilityTotals,
  getOpenLiabilitiesSummary,
  validateLiabilityInput,
  validateRepaymentInput,
} from './financingLiabilitiesCore.js'

const baseLiability = {
  id: 'liability-1',
  original_amount: 620.94,
  status: 'open',
}

test('calculates initial open status and amount for a 620.94 EUR liability', () => {
  const totals = getLiabilityTotals(baseLiability, [])

  assert.equal(getComputedLiabilityStatus(baseLiability, []), 'open')
  assert.equal(totals.originalAmount, 620.94)
  assert.equal(totals.repaidAmount, 0)
  assert.equal(totals.openAmount, 620.94)
})

test('calculates partially paid status after a 200.00 EUR repayment', () => {
  const repayments = [{ amount: 200 }]
  const totals = getLiabilityTotals(baseLiability, repayments)

  assert.equal(getComputedLiabilityStatus(baseLiability, repayments), 'partially_paid')
  assert.equal(totals.repaidAmount, 200)
  assert.equal(totals.openAmount, 420.94)
})

test('calculates paid status after the remaining 420.94 EUR repayment', () => {
  const repayments = [{ amount: 200 }, { amount: 420.94 }]
  const totals = getLiabilityTotals(baseLiability, repayments)

  assert.equal(getComputedLiabilityStatus(baseLiability, repayments), 'paid')
  assert.equal(totals.repaidAmount, 620.94)
  assert.equal(totals.openAmount, 0)
})

test('prevents overpayment and zero or negative repayment amounts in validation', () => {
  assert.equal(validateRepaymentInput({ amount: 420.95, openAmount: 420.94, paidAt: '2026-07-24' }).length, 1)
  assert.equal(validateRepaymentInput({ amount: 0, openAmount: 420.94, paidAt: '2026-07-24' }).length, 1)
  assert.equal(validateRepaymentInput({ amount: -1, openAmount: 420.94, paidAt: '2026-07-24' }).length, 1)
})

test('ignores cancelled repayments in totals and status', () => {
  const repayments = [
    { amount: 200 },
    { amount: 420.94, cancelled_at: '2026-07-24T10:00:00Z' },
  ]
  const totals = getLiabilityTotals(baseLiability, repayments)

  assert.equal(getComputedLiabilityStatus(baseLiability, repayments), 'partially_paid')
  assert.equal(totals.repaidAmount, 200)
  assert.equal(totals.openAmount, 420.94)
})

test('keeps cancelled liabilities out of open totals', () => {
  const summary = getOpenLiabilitiesSummary([
    { computed_status: 'open', open_amount: 120 },
    { computed_status: 'partially_paid', open_amount: 80 },
    { computed_status: 'paid', open_amount: 0 },
    { computed_status: 'cancelled', open_amount: 500 },
  ])

  assert.equal(summary.openCount, 1)
  assert.equal(summary.partiallyPaidCount, 1)
  assert.equal(summary.paidCount, 1)
  assert.equal(summary.openTotal, 200)
})

test('requires creditor, description, date, category and positive amount', () => {
  const errors = validateLiabilityInput({
    creditor_name: '',
    original_amount: 0,
    financed_at: '',
    description: '',
    category: '',
  })

  assert.equal(errors.length, 5)
})

test('marks cancelled and fully paid liabilities as ineligible for further repayment', () => {
  assert.equal(getComputedLiabilityStatus({ ...baseLiability, status: 'cancelled' }, []), 'cancelled')
  assert.equal(getComputedLiabilityStatus(baseLiability, [{ amount: 620.94 }]), 'paid')
})
