export const FINANCING_LIABILITY_STATUSES = ['open', 'partially_paid', 'paid', 'cancelled']

export const FINANCING_LIABILITY_STATUS_LABELS = {
  open: 'Offen',
  partially_paid: 'Teilweise bezahlt',
  paid: 'Bezahlt',
  cancelled: 'Storniert',
}

export const FINANCING_LIABILITY_CATEGORIES = [
  ['waren', 'Waren'],
  ['leistungen', 'Leistungen'],
  ['reise', 'Reise/Fahrtkosten'],
  ['veranstaltung', 'Veranstaltung'],
  ['sonstiges', 'Sonstiges'],
]

export function toCents(value) {
  const number = Number(String(value ?? '').replace(',', '.'))
  if (!Number.isFinite(number)) return 0
  return Math.round(number * 100)
}

export function centsToAmount(cents) {
  return Number(Number(cents || 0) / 100)
}

export function formatEuro(value) {
  return `${Number(value || 0).toFixed(2)} EUR`
}

export function getRepaymentTotalCents(repayments = []) {
  return repayments
    .filter((repayment) => !repayment?.cancelled_at)
    .reduce((sum, repayment) => sum + toCents(repayment?.amount), 0)
}

export function getLiabilityTotals(liability, repayments = []) {
  const originalCents = toCents(liability?.original_amount)
  const repaidCents = getRepaymentTotalCents(repayments)
  const openCents = Math.max(originalCents - repaidCents, 0)

  return {
    originalCents,
    repaidCents,
    openCents,
    originalAmount: centsToAmount(originalCents),
    repaidAmount: centsToAmount(repaidCents),
    openAmount: centsToAmount(openCents),
  }
}

export function getComputedLiabilityStatus(liability, repayments = []) {
  if (liability?.status === 'cancelled' || liability?.cancelled_at) return 'cancelled'

  const { originalCents, repaidCents } = getLiabilityTotals(liability, repayments)
  if (repaidCents <= 0) return 'open'
  if (repaidCents < originalCents) return 'partially_paid'
  return 'paid'
}

export function getOpenLiabilitiesSummary(liabilities = []) {
  return liabilities.reduce((summary, liability) => {
    const status = liability?.computed_status || liability?.status
    const openAmount = Number(liability?.open_amount || 0)

    if (status === 'open') {
      summary.openCount += 1
      summary.openTotal += openAmount
    }

    if (status === 'partially_paid') {
      summary.partiallyPaidCount += 1
      summary.partiallyPaidOpenTotal += openAmount
      summary.openTotal += openAmount
    }

    if (status === 'paid') {
      summary.paidCount += 1
    }

    return summary
  }, {
    openCount: 0,
    openTotal: 0,
    partiallyPaidCount: 0,
    partiallyPaidOpenTotal: 0,
    paidCount: 0,
  })
}

export function validateLiabilityInput(input = {}) {
  const errors = []
  const hasMember = Boolean(input.creditor_member_id)
  const hasExternalName = String(input.creditor_name || '').trim().length > 0

  if (!hasMember && !hasExternalName) errors.push('Bitte einen Glaeubiger auswaehlen oder einen Namen erfassen.')
  if (toCents(input.original_amount) <= 0) errors.push('Der Betrag muss groesser als 0 sein.')
  if (!String(input.description || '').trim()) errors.push('Die Beschreibung ist erforderlich.')
  if (!input.financed_at) errors.push('Das Datum ist erforderlich.')
  if (!String(input.category || '').trim()) errors.push('Die Kategorie ist erforderlich.')

  return errors
}

export function validateRepaymentInput({ amount, openAmount, paidAt }) {
  const errors = []
  const amountCents = toCents(amount)
  const openCents = toCents(openAmount)

  if (amountCents <= 0) errors.push('Der Rueckzahlungsbetrag muss groesser als 0 sein.')
  if (amountCents > openCents) errors.push('Der Rueckzahlungsbetrag darf den offenen Betrag nicht ueberschreiten.')
  if (!paidAt) errors.push('Das Zahlungsdatum ist erforderlich.')

  return errors
}
