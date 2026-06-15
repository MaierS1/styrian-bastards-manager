import { supabase } from '../../lib/supabase'

export async function fetchVirtualBastardKnowledge() {
  return supabase
    .from('virtual_bastard_knowledge')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('title', { ascending: true })
}

export async function saveVirtualBastardKnowledgeRecord({ entryId, payload }) {
  if (entryId) {
    return supabase
      .from('virtual_bastard_knowledge')
      .update(payload)
      .eq('id', entryId)
      .select()
      .single()
  }

  return supabase
    .from('virtual_bastard_knowledge')
    .insert(payload)
    .select()
    .single()
}

export async function deleteVirtualBastardKnowledgeRecord(entryId) {
  return supabase
    .from('virtual_bastard_knowledge')
    .delete()
    .eq('id', entryId)
}

export async function updateVirtualBastardKnowledgeFlags(entryId, flags) {
  return supabase
    .from('virtual_bastard_knowledge')
    .update(flags)
    .eq('id', entryId)
}
