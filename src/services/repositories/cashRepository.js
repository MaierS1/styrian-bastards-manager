import { supabase } from '../../lib/supabase'

export async function fetchCashEntries() {
  return supabase
    .from('cash_entries')
    .select('*')
    .order('entry_date', { ascending: false })
    .order('created_at', { ascending: false })
}

export async function fetchCashMonthClosings() {
  return supabase
    .from('cash_month_closings')
    .select('*')
    .order('year', { ascending: false })
    .order('month', { ascending: false })
}

export async function addCashEntryRecord({
  baseEntry,
  receiptUrl,
  createAuditLog,
  loadCashEntries,
  resetCashForm,
}) {
  const { data, error } = await supabase
    .from('cash_entries')
    .insert({
      ...baseEntry,
      receipt_url: receiptUrl,
    })
    .select()
    .single()

  if (error) return { error }

  await createAuditLog('insert', 'cash_entries', data?.id, null, data)

  resetCashForm()
  await loadCashEntries()

  return { ok: true, data }
}

export async function updateCashEntryRecord({
  editingCashId,
  payload,
  cashEntries,
  createAuditLog,
  loadCashEntries,
  resetCashForm,
  alertFn = alert,
}) {
  const oldCashEntry = cashEntries.find((entry) => entry.id === editingCashId)

  const { error } = await supabase
    .from('cash_entries')
    .update(payload)
    .eq('id', editingCashId)

  if (error) return { error }

  await createAuditLog('update', 'cash_entries', editingCashId, oldCashEntry, payload)

  resetCashForm()
  await loadCashEntries()
  alertFn('Kassa-Eintrag wurde aktualisiert.')
  return { ok: true }
}

export async function deleteCashEntryRecord({
  entry,
  reason,
  createAuditLog,
  loadCashEntries,
  alertFn = alert,
}) {
  const { error } = await supabase
    .from('cash_entries')
    .update({
      is_cancelled: true,
      cancelled_at: new Date().toISOString(),
      cancellation_reason: reason.trim(),
    })
    .eq('id', entry.id)

  if (error) return { error }

  await createAuditLog('delete', 'cash_entries', entry.id, entry, {
    is_cancelled: true,
    cancelled_at: new Date().toISOString(),
    cancellation_reason: reason.trim(),
  })

  await loadCashEntries()
  alertFn('Kassa-Eintrag wurde storniert.')
  return { ok: true }
}

export async function saveMembershipFee({
  fee,
  paymentMethod = 'bar',
  members,
  createAuditLog,
  loadAll,
}) {
  const today = new Date().toISOString().slice(0, 10)

  const { error: feeError } = await supabase
    .from('membership_fees')
    .update({
      paid: true,
      paid_at: today,
      payment_method: paymentMethod,
    })
    .eq('id', fee.id)

  if (feeError) return { error: feeError }

  const member = members.find((m) => m.id === fee.member_id)
  const { data: existingCashEntries, error: existingCashError } = await supabase
    .from('cash_entries')
    .select('id')
    .eq('membership_fee_id', fee.id)
    .eq('is_cancelled', false)
    .limit(1)

  if (existingCashError) return { error: existingCashError }

  if (existingCashEntries?.length > 0) {
    await createAuditLog('payment_mark_paid', 'membership_fees', fee.id, fee, {
      paid: true,
      paid_at: today,
      payment_method: paymentMethod,
      cash_entry: 'already_exists',
    })

    await loadAll()
    return { ok: true }
  }

  const { error: cashError } = await supabase.from('cash_entries').insert({
    entry_date: today,
    entry_year: Number(today.slice(0, 4)),
    is_cancelled: false,
    type: 'einnahme',
    category: 'mitgliedsbeitrag',
    amount: Math.abs(Number(fee.amount || 0)),
    description: `Mitgliedsbeitrag 2026 - ${
      member ? `${member.first_name} ${member.last_name}` : 'Mitglied'
    }`,
    is_test: Boolean(member?.is_test),
    member_id: fee.member_id,
    membership_fee_id: fee.id,
  })

  if (cashError) return { error: cashError }

  await createAuditLog('payment_mark_paid', 'membership_fees', fee.id, fee, {
    paid: true,
    paid_at: today,
    payment_method: paymentMethod,
  })

  await loadAll()
  return { ok: true }
}

export async function deleteMembershipFee({
  fee,
  createAuditLog,
  loadAll,
}) {
  const { error: feeError } = await supabase
    .from('membership_fees')
    .update({
      paid: false,
      paid_at: null,
    })
    .eq('id', fee.id)

  if (feeError) return { error: feeError }

  await supabase.from('cash_entries').delete().eq('membership_fee_id', fee.id)
  await createAuditLog('payment_mark_open', 'membership_fees', fee.id, fee, { paid: false, paid_at: null })
  await loadAll()
  return { ok: true }
}
