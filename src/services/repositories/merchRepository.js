import { supabase } from '../../lib/supabase'

export async function fetchMerchItems() {
  return supabase
    .from('merch_items')
    .select('*')
    .order('item_number', { ascending: true, nullsFirst: false })
    .order('name', { ascending: true })
}

export async function fetchMerchVariants() {
  return supabase
    .from('merch_variants')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
}

export async function saveMerchItemRecord({
  merchItemEditingId,
  payload,
  merchItems,
  createAuditLog,
  loadMerchItems,
  resetMerchItemForm,
  alertFn = alert,
}) {
  if (merchItemEditingId) {
    const oldItem = merchItems.find((item) => item.id === merchItemEditingId)

    const { error } = await supabase
      .from('merch_items')
      .update(payload)
      .eq('id', merchItemEditingId)

    if (error) return { error }

    await createAuditLog('update', 'merch_items', merchItemEditingId, oldItem, payload)
    alertFn('Fanartikel wurde aktualisiert.')
  } else {
    const { data, error } = await supabase
      .from('merch_items')
      .insert(payload)
      .select()
      .single()

    if (error) return { error }

    await createAuditLog('insert', 'merch_items', data?.id, null, data)
    alertFn('Fanartikel wurde angelegt.')
  }

  resetMerchItemForm()
  await loadMerchItems()
  return { ok: true }
}

export async function deleteMerchItemRecord({
  item,
  createAuditLog,
  loadMerchItems,
  loadMerchVariants,
  alertFn = alert,
}) {
  const { error } = await supabase
    .from('merch_items')
    .delete()
    .eq('id', item.id)

  if (error) return { error }

  await createAuditLog('delete', 'merch_items', item.id, item, null)
  await loadMerchItems()
  await loadMerchVariants()
  alertFn('Fanartikel wurde geloscht.')

  return { ok: true }
}

export async function saveMerchVariantRecord({
  merchVariantEditingId,
  payload,
  merchVariants,
  createAuditLog,
  loadMerchVariants,
  resetMerchVariantForm,
  alertFn = alert,
}) {
  if (merchVariantEditingId) {
    const oldVariant = merchVariants.find((variant) => variant.id === merchVariantEditingId)

    const { error } = await supabase
      .from('merch_variants')
      .update(payload)
      .eq('id', merchVariantEditingId)

    if (error) return { error }

    await createAuditLog('update', 'merch_variants', merchVariantEditingId, oldVariant, payload)
    alertFn('Fanartikel-Variante wurde aktualisiert.')
  } else {
    const { data, error } = await supabase
      .from('merch_variants')
      .insert(payload)
      .select()
      .single()

    if (error) return { error }

    await createAuditLog('insert', 'merch_variants', data?.id, null, data)
    alertFn('Fanartikel-Variante wurde angelegt.')
  }

  resetMerchVariantForm()
  await loadMerchVariants()
  return { ok: true }
}

export async function deleteMerchVariantRecord({
  variant,
  createAuditLog,
  loadMerchVariants,
  alertFn = alert,
}) {
  const { error } = await supabase
    .from('merch_variants')
    .delete()
    .eq('id', variant.id)

  if (error) return { error }

  await createAuditLog('delete', 'merch_variants', variant.id, variant, null)
  await loadMerchVariants()
  alertFn('Fanartikel-Variante wurde geloscht.')

  return { ok: true }
}
