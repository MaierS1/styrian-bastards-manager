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
