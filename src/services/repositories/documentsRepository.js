import { supabase } from '../../lib/supabase'

export async function fetchDocuments() {
  return supabase
    .from('documents')
    .select('*')
    .order('document_date', { ascending: false })
    .order('created_at', { ascending: false })
}

export async function uploadDocumentRecord({
  documentTitle,
  documentCategory,
  documentDate,
  documentDescription,
  documentFile,
  documentShowInMemberArea = false,
  documentMembersOnly = true,
  documentMemberAreaCategory = '',
  documentSortOrder = 0,
  documentIsActive = true,
  createAuditLog,
  loadDocuments,
  resetDocumentForm,
  alertFn = alert,
}) {
  const safeName = documentFile.name.replace(/[^a-zA-Z0-9_.-]/g, '-')
  const filePath = `${Date.now()}-${Math.random().toString(36).substring(2)}-${safeName}`

  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(filePath, documentFile)

  if (uploadError) return { error: uploadError }

  const { error } = await supabase.from('documents').insert({
    title: documentTitle,
    category: documentCategory,
    document_date: documentDate || null,
    description: documentDescription || null,
    file_path: filePath,
    file_name: documentFile.name,
    mime_type: documentFile.type || null,
    show_in_member_area: documentShowInMemberArea,
    members_only: documentMembersOnly,
    member_area_category: documentMemberAreaCategory || null,
    sort_order: documentSortOrder,
    is_active: documentIsActive,
  })

  if (error) return { error }

  await createAuditLog('insert', 'documents', null, null, {
    title: documentTitle,
    category: documentCategory,
    file_path: filePath,
    file_name: documentFile.name,
  })

  resetDocumentForm()
  await loadDocuments()
  alertFn('Dokument wurde hochgeladen.')

  return { filePath }
}

export async function updateDocumentMemberAreaSettings({
  documentId,
  settings,
  createAuditLog,
  loadDocuments,
  alertFn = alert,
}) {
  const { data: updatedDocument, error } = await supabase
    .from('documents')
    .update(settings)
    .eq('id', documentId)
    .select()
    .single()

  if (error) return { error }

  await createAuditLog('update', 'documents', documentId, null, settings)
  await loadDocuments()
  alertFn('Dokument-Einstellungen wurden gespeichert.')

  return { document: updatedDocument }
}

export async function deleteDocumentRecord({
  document,
  createAuditLog,
  loadDocuments,
  alertFn = alert,
}) {
  const { error: storageError } = await supabase.storage
    .from('documents')
    .remove([document.file_path])

  if (storageError) return { error: storageError }

  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', document.id)

  if (error) return { error }

  await createAuditLog('delete', 'documents', document.id, document, null)
  await loadDocuments()
  alertFn('Dokument wurde gelöscht.')

  return { ok: true }
}

export async function getSignedDocumentUrl(path) {
  const { data, error } = await supabase.storage
    .from('documents')
    .createSignedUrl(path, 120)

  if (error) return { error }

  return { signedUrl: data.signedUrl }
}
