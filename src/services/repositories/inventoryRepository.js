import { supabase } from '../../lib/supabase'

export async function fetchInventoryItems() {
  return supabase
    .from('inventory_items')
    .select('*')
    .order('inventory_number', { ascending: true })
}

export async function importInventoryRowsRecord({
  rowsToInsert,
  inventoryCsvFileName,
  createAuditLog,
  loadInventoryItems,
  setInventoryCsvRows,
  setInventoryCsvFileName,
  alertFn = alert,
}) {
  const { error } = await supabase
    .from('inventory_items')
    .insert(rowsToInsert)

  if (error) return { error }

  await createAuditLog('bulk_import', 'inventory_items', null, null, {
    count: rowsToInsert.length,
    file: inventoryCsvFileName,
  })

  setInventoryCsvRows([])
  setInventoryCsvFileName('')
  await loadInventoryItems()

  alertFn(`${rowsToInsert.length} Inventar-Eintr�ge wurden importiert.`)
  return { ok: true }
}

export async function saveInventoryItemRecord({
  inventoryEditingId,
  payload,
  inventoryItems,
  createAuditLog,
  loadInventoryItems,
  resetInventoryForm,
  alertFn = alert,
}) {
  if (inventoryEditingId) {
    const oldItem = inventoryItems.find((item) => item.id === inventoryEditingId)

    const { error } = await supabase
      .from('inventory_items')
      .update(payload)
      .eq('id', inventoryEditingId)

    if (error) return { error }

    await createAuditLog('update', 'inventory_items', inventoryEditingId, oldItem, payload)
    alertFn('Inventar-Eintrag wurde aktualisiert.')
  } else {
    const { data, error } = await supabase
      .from('inventory_items')
      .insert(payload)
      .select()
      .single()

    if (error) return { error }

    await createAuditLog('insert', 'inventory_items', data?.id, null, data)
    alertFn('Inventar-Eintrag wurde angelegt.')
  }

  resetInventoryForm()
  await loadInventoryItems()
  return { ok: true }
}

export async function retireInventoryItemRecord({
  item,
  reason,
  createAuditLog,
  loadInventoryItems,
  alertFn = alert,
}) {
  const { error } = await supabase
    .from('inventory_items')
    .update({
      status: 'ausgemustert',
      notes: `${item.notes || ''}\nAusgemustert: ${reason.trim()}`.trim(),
    })
    .eq('id', item.id)

  if (error) return { error }

  await createAuditLog('retire', 'inventory_items', item.id, item, {
    status: 'ausgemustert',
    reason: reason.trim(),
  })

  await loadInventoryItems()
  alertFn('Inventar wurde ausgemustert.')
  return { ok: true }
}

export async function deleteInventoryItemRecord({
  item,
  createAuditLog,
  loadInventoryItems,
  alertFn = alert,
}) {
  const { error } = await supabase
    .from('inventory_items')
    .delete()
    .eq('id', item.id)

  if (error) return { error }

  await createAuditLog('delete', 'inventory_items', item.id, item, null)
  await loadInventoryItems()
  alertFn('Inventar-Eintrag wurde gel�scht.')
  return { ok: true }
}
