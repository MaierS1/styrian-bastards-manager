import { supabase } from '../../lib/supabase'

export async function fetchInventoryItems() {
  return supabase
    .from('inventory_items')
    .select('*')
    .order('inventory_number', { ascending: true })
}
