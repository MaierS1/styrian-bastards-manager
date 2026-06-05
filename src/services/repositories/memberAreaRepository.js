import { supabase } from '../../lib/supabase'

export async function fetchMemberDocuments() {
  return supabase
    .from('member_documents')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })
}

export async function saveMemberDocumentRecord({ editingId, payload }) {
  if (editingId) {
    return supabase
      .from('member_documents')
      .update(payload)
      .eq('id', editingId)
      .select()
      .single()
  }

  return supabase
    .from('member_documents')
    .insert(payload)
    .select()
    .single()
}

export async function deactivateMemberDocumentRecord(documentId) {
  return supabase
    .from('member_documents')
    .update({ is_active: false })
    .eq('id', documentId)
}

export async function deleteMemberDocumentRecord(documentId) {
  return supabase
    .from('member_documents')
    .delete()
    .eq('id', documentId)
}
