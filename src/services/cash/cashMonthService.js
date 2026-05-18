import { supabase } from '../../lib/supabase'

export async function closeCashMonthService({
  year,
  month,
  isAdmin,
  isCashMonthClosed,
  user,
  createAuditLog,
  loadCashMonthClosings,
  alertFn = alert,
  confirmFn = window.confirm,
  promptFn = window.prompt,
}) {
  if (!isAdmin()) return alertFn('Nur Admins dÃ¼rfen Monate abschlieÃŸen.')

  if (!year || !month) {
    alertFn('Jahr und Monat fehlen.')
    return
  }

  if (isCashMonthClosed(year, month)) {
    alertFn('Dieser Monat ist bereits abgeschlossen.')
    return
  }

  const note = promptFn(`Notiz zum Monatsabschluss ${String(month).padStart(2, '0')}/${year}:`, '')

  const confirmed = confirmFn(
    `Monat wirklich abschlieÃŸen?\n\n${String(month).padStart(2, '0')}/${year}\n\nDanach kÃ¶nnen EintrÃ¤ge in diesem Monat nicht mehr bearbeitet oder storniert werden.`
  )

  if (!confirmed) return

  const { error } = await supabase.from('cash_month_closings').insert({
    year: Number(year),
    month: Number(month),
    closed_by: user?.id || null,
    note: note || null,
  })

  if (error) return alertFn(error.message)

  await createAuditLog('close_month', 'cash_month_closings', null, null, {
    year: Number(year),
    month: Number(month),
    note: note || null,
  })

  await loadCashMonthClosings()
  alertFn('Monat wurde abgeschlossen.')
}

export async function reopenCashMonthService({
  year,
  month,
  isAdmin,
  createAuditLog,
  loadCashMonthClosings,
  alertFn = alert,
  confirmFn = window.confirm,
}) {
  if (!isAdmin()) return alertFn('Nur Admins dÃ¼rfen MonatsabschlÃ¼sse aufheben.')

  const confirmed = confirmFn(
    `Monatsabschluss wirklich aufheben?\n\n${String(month).padStart(2, '0')}/${year}`
  )

  if (!confirmed) return

  const { error } = await supabase
    .from('cash_month_closings')
    .delete()
    .eq('year', Number(year))
    .eq('month', Number(month))

  if (error) return alertFn(error.message)

  await createAuditLog('reopen_month', 'cash_month_closings', null, {
    year: Number(year),
    month: Number(month),
  }, null)

  await loadCashMonthClosings()
  alertFn('Monatsabschluss wurde aufgehoben.')
}
