import { supabase } from '../../lib/supabase'

export async function fetchMembershipFees(year) {
  let query = supabase
    .from('membership_fees')
    .select('*')

  if (year) query = query.eq('year', year)

  return query.order('year', { ascending: false })
}

export async function fetchMembershipFeePeriods() {
  return supabase
    .from('membership_fee_periods')
    .select('*')
    .order('year', { ascending: false })
    .order('created_at', { ascending: false })
}

export async function fetchMembershipFeeItems() {
  return supabase
    .from('membership_fee_items')
    .select('*')
    .order('created_at', { ascending: false })
}

export async function createMembershipFeePeriodAndItems({
  year,
  title,
  dueDate,
}) {
  return supabase.rpc('create_membership_fee_period_and_items', {
    p_year: Number(year),
    p_title: title || null,
    p_due_date: dueDate || null,
  })
}

export async function addMissingMembershipFeeItemsForPeriod({
  year,
  title,
  dueDate,
}) {
  return createMembershipFeePeriodAndItems({ year, title, dueDate })
}

export async function markMembershipFeeItemPaid({
  feeItemId,
  paidAt,
  paymentMethod = 'bar',
  createCashEntry = true,
}) {
  return supabase.rpc('mark_membership_fee_item_paid', {
    p_fee_item_id: feeItemId,
    p_paid_at: paidAt || null,
    p_payment_method: paymentMethod,
    p_create_cash_entry: createCashEntry,
  })
}

export async function reopenMembershipFeeItem({
  feeItemId,
  cancelCashEntry = true,
}) {
  return supabase.rpc('reopen_membership_fee_item', {
    p_fee_item_id: feeItemId,
    p_cancel_cash_entry: cancelCashEntry,
  })
}

export async function sendMembershipFeeNotification({
  type,
  feeItemId,
}) {
  return supabase.functions.invoke('membership-notifications', {
    body: {
      type,
      fee_item_id: feeItemId,
    },
  })
}
export async function deleteMembershipFeeItem(itemOrParams) {
  const itemId = typeof itemOrParams === 'object' ? itemOrParams?.feeItemId : itemOrParams

  const { data: item, error: itemError } = await supabase
    .from('membership_fee_items')
    .select('id, status, cash_entry_id')
    .eq('id', itemId)
    .maybeSingle()

  if (itemError) return { error: itemError }

  if (!item) {
    return { error: new Error('Beitrag nicht gefunden.') }
  }

  if (item.status === 'paid' || item.cash_entry_id) {
    return { error: new Error('Bezahlte Beiträge oder Beiträge mit Kassa-Eintrag können nicht direkt gelöscht werden. Bitte zuerst Zahlung rückgängig machen bzw. stornieren.') }
  }

  const { data: activeCashEntries, error: cashEntryError } = await supabase
    .from('cash_entries')
    .select('id')
    .eq('membership_fee_item_id', itemId)
    .eq('is_cancelled', false)
    .limit(1)

  if (cashEntryError) return { error: cashEntryError }

  if (activeCashEntries?.length) {
    return { error: new Error('Zu diesem Beitrag existiert ein aktiver Kassa-Eintrag. Bitte zuerst Zahlung rückgängig machen bzw. stornieren.') }
  }

  return supabase
    .from('membership_fee_items')
    .delete()
    .eq('id', itemId)
}
