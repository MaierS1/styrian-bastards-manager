import { supabase } from '../../lib/supabase'

export async function fetchCurrentMemberByAuthUserId(authUserId) {
  return supabase
    .from('members')
    .select('*')
    .eq('auth_user_id', authUserId)
    .maybeSingle()
}
