import { supabase } from '../../lib/supabase'

export async function fetchMembershipFees(year) {
  return supabase
    .from('membership_fees')
    .select('*')
    .eq('year', year)
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
