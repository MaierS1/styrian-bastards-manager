import { supabase } from '../../lib/supabase'

export async function fetchAuditLogs() {
  return supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)
}
