import { supabase } from '../../lib/supabase'

export async function fetchMemberChangeRequests() {
  return supabase
    .from('member_change_requests')
    .select('*')
    .order('created_at', { ascending: false })
}
