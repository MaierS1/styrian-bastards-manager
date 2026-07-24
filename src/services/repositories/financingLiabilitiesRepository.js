import { supabase } from '../../lib/supabase'

export async function fetchFinancingLiabilityBalances() {
  return supabase
    .from('financing_liability_balances')
    .select('*')
    .order('financed_at', { ascending: false })
    .order('created_at', { ascending: false })
}

export async function fetchFinancingLiabilityRepayments() {
  return supabase
    .from('financing_liability_repayments')
    .select('*')
    .order('paid_at', { ascending: false })
    .order('created_at', { ascending: false })
}

export async function createFinancingLiability(payload) {
  return supabase
    .from('financing_liabilities')
    .insert(payload)
    .select()
    .single()
}

export async function updateFinancingLiability(id, payload) {
  return supabase
    .from('financing_liabilities')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
}

export async function createFinancingLiabilityRepayment(payload) {
  return supabase.rpc('create_financing_liability_repayment', {
    p_liability_id: payload.liabilityId,
    p_amount: payload.amount,
    p_paid_at: payload.paidAt,
    p_payment_method: payload.paymentMethod,
    p_description: payload.description,
    p_note: payload.note,
  })
}

export async function cancelFinancingLiability(id, reason) {
  return supabase.rpc('cancel_financing_liability', {
    p_liability_id: id,
    p_cancellation_reason: reason,
  })
}

export async function cancelFinancingLiabilityRepayment(id, reason) {
  return supabase.rpc('cancel_financing_liability_repayment', {
    p_repayment_id: id,
    p_cancellation_reason: reason,
  })
}
