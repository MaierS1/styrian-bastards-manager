import { supabase } from '../../lib/supabase'

export async function fetchMerchItems() {
  return supabase
    .from('merch_items')
    .select('*')
    .order('item_number', { ascending: true, nullsFirst: false })
    .order('name', { ascending: true })
}

export async function fetchMerchVariants() {
  return supabase
    .from('merch_variants')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
}
