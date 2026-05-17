import { supabase } from '../../lib/supabase'

export async function fetchDocuments() {
  return supabase
    .from('documents')
    .select('*')
    .order('document_date', { ascending: false })
    .order('created_at', { ascending: false })
}
