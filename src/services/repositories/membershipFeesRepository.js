import { supabase } from '../../lib/supabase'

export async function fetchMembershipFees(year) {
  return supabase
    .from('membership_fees')
    .select('*')
    .eq('year', year)
}
