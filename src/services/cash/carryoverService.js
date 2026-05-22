import { supabase } from '../../lib/supabase'

export async function createAutomaticCarryoverService({
  canManageCash,
  carryoverFromYear,
  carryoverToYear,
  hasOpeningForYear,
  getCashBalanceForYear,
  createAuditLog,
  loadCashEntries,
  setSelectedCashYear,
  alertFn = alert,
  confirmFn = window.confirm,
}) {
  if (!canManageCash()) return alertFn('Keine Berechtigung für Kassa.')

  if (!carryoverFromYear || !carryoverToYear) {
    alertFn('Bitte Quelljahr und Zieljahr auswählen.')
    return
  }

  if (String(carryoverFromYear) === String(carryoverToYear)) {
    alertFn('Quelljahr und Zieljahr dürfen nicht gleich sein.')
    return
  }

  if (Number(carryoverToYear) !== Number(carryoverFromYear) + 1) {
    const proceed = confirmFn(
      'Das Zieljahr ist nicht direkt das Folgejahr. Trotzdem Übertrag erstellen?'
    )

    if (!proceed) return
  }

  if (hasOpeningForYear(carryoverToYear)) {
    alertFn(`Für ${carryoverToYear} existiert bereits ein Übertrag Vorjahr.`)
    return
  }

  const balance = getCashBalanceForYear(carryoverFromYear)

  if (balance === 0) {
    const proceed = confirmFn(
      `Der Endsaldo ${carryoverFromYear} ist 0,00 €. Trotzdem Übertrag erstellen?`
    )

    if (!proceed) return
  }

  const confirmed = confirmFn(
    `Übertrag erstellen?\n\nEndsaldo ${carryoverFromYear}: ${balance.toFixed(2)} €\nZieljahr: ${carryoverToYear}\n\nDer Übertrag wird als Startsaldo am 01.01.${carryoverToYear} angelegt.`
  )

  if (!confirmed) return

  const carryoverEntry = {
    entry_date: `${carryoverToYear}-01-01`,
    entry_year: Number(carryoverToYear),
    type: balance >= 0 ? 'einnahme' : 'ausgabe',
    category: 'sonstiges',
    payment_method: 'bar',
    is_opening: true,
    amount: Math.abs(balance),
    description: `Übertrag Vorjahr automatisch aus ${carryoverFromYear}`,
    receipt_url: null,
    event_id: null,
  }

  const { error } = await supabase.from('cash_entries').insert(carryoverEntry)

  if (error) return alertFn(error.message)

  await createAuditLog('create_carryover', 'cash_entries', null, null, carryoverEntry)

  await loadCashEntries()
  setSelectedCashYear(String(carryoverToYear))
  alertFn('Übertrag wurde erstellt.')
}
