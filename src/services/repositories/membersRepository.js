import { supabase } from '../../lib/supabase'

export async function fetchMembers() {
  return supabase
    .from('members')
    .select('*')
    .order('created_at', { ascending: false })
}
