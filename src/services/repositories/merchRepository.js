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

export async function fetchMerchSales() {
  return supabase
    .from('merch_sales')
    .select('*')
    .order('sale_date', { ascending: false })
    .order('created_at', { ascending: false })
}

export async function fetchMerchSaleItems() {
  return supabase
    .from('merch_sale_items')
    .select('*')
    .order('created_at', { ascending: true })
}

export async function fetchShopOrders() {
  return supabase
    .from('shop_orders')
    .select('*')
    .order('order_date', { ascending: false })
    .order('created_at', { ascending: false })
}

export async function fetchShopOrderItems() {
  return supabase
    .from('shop_order_items')
    .select('*')
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
  alertFn('Fanartikel wurde gelöscht.')

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
  alertFn('Fanartikel-Variante wurde gelöscht.')

  return { ok: true }
}

export async function createMerchSaleWithItemRecord({
  rpcPayload,
  createAuditLog,
  loadMerchSales,
  loadMerchSaleItems,
  loadMerchVariants,
  loadCashEntries,
  resetMerchSaleForm,
  alertFn = alert,
}) {
  const { data, error } = await supabase
    .rpc('create_merch_sale', rpcPayload)
    .single()

  if (error) return { error }

  await createAuditLog('insert', 'merch_sales', data?.merch_sale_id, null, {
    rpc: 'create_merch_sale',
    result: data,
  })

  resetMerchSaleForm()
  await loadMerchSales()
  await loadMerchSaleItems()
  await loadMerchVariants()

  if (rpcPayload.p_create_cash_entry) {
    await loadCashEntries()
  }

  alertFn('Fanartikel-Verkauf wurde gespeichert.')

  return { ok: true, sale: data }
}

export async function createMerchSaleWithInvoiceRecord({
  rpcPayload,
  createAuditLog,
  loadMerchSales,
  loadMerchSaleItems,
  loadMerchVariants,
  loadCashEntries,
  loadInvoices,
  loadInvoiceItems,
  resetMerchSaleForm,
  alertFn = alert,
}) {
  const { data, error } = await supabase
    .rpc('create_merch_sale_with_invoice', rpcPayload)
    .single()

  if (error) return { error }

  await createAuditLog('insert_with_invoice', 'merch_sales', data?.merch_sale_id, null, {
    rpc: 'create_merch_sale_with_invoice',
    result: data,
  })

  resetMerchSaleForm()
  await loadMerchSales()
  await loadMerchSaleItems()
  await loadMerchVariants()
  await loadInvoices()
  await loadInvoiceItems()

  if (rpcPayload.p_create_cash_entry) {
    await loadCashEntries()
  }

  alertFn(`Fanartikel-Verkauf wurde gespeichert. Rechnung: ${data?.invoice_number || '-'}`)

  return { ok: true, sale: data }
}

export async function cancelMerchSaleRecord({
  sale,
  cancellationReason,
  createAuditLog,
  loadMerchSales,
  loadMerchSaleItems,
  loadMerchVariants,
  loadCashEntries,
  alertFn = alert,
}) {
  const { data, error } = await supabase
    .rpc('cancel_merch_sale', {
      p_merch_sale_id: sale.id,
      p_cancellation_reason: cancellationReason,
    })
    .single()

  if (error) return { error }

  await createAuditLog('cancel_merch_sale', 'merch_sales', sale.id, sale, {
    rpc: 'cancel_merch_sale',
    reason: cancellationReason,
    result: data,
  })

  await loadMerchSales()
  await loadMerchSaleItems()
  await loadMerchVariants()
  await loadCashEntries()

  alertFn('Fanartikel-Verkauf wurde storniert.')

  return { ok: true, sale: data }
}

export async function createShopOrderRecord({
  rpcPayload,
  createAuditLog,
  loadShopOrders,
  loadShopOrderItems,
  loadMerchVariants,
  loadCashEntries,
  resetShopOrderForm,
  alertFn = alert,
}) {
  const { data, error } = await supabase
    .rpc('create_shop_order', rpcPayload)
    .single()

  if (error) return { error }

  await createAuditLog('insert', 'shop_orders', data?.shop_order_id, null, {
    rpc: 'create_shop_order',
    result: data,
  })

  resetShopOrderForm()
  await loadShopOrders()
  await loadShopOrderItems()
  await loadMerchVariants()

  if (data?.cash_entry_id) {
    await loadCashEntries()
  }

  alertFn('Shop-Bestellung wurde gespeichert.')

  return { ok: true, order: data }
}

export async function updateShopOrderRecord({
  rpcPayload,
  shopOrders,
  createAuditLog,
  loadShopOrders,
  loadCashEntries,
  resetShopOrderForm,
  alertFn = alert,
}) {
  const oldOrder = shopOrders.find((order) => order.id === rpcPayload.p_shop_order_id)

  const { data, error } = await supabase
    .rpc('update_shop_order', rpcPayload)
    .single()

  if (error) return { error }

  await createAuditLog('update', 'shop_orders', data?.shop_order_id, oldOrder, {
    rpc: 'update_shop_order',
    result: data,
  })

  resetShopOrderForm()
  await loadShopOrders()

  if (data?.cash_entry_id && data.cash_entry_id !== oldOrder?.cash_entry_id) {
    await loadCashEntries()
  }

  alertFn('Shop-Bestellung wurde aktualisiert.')

  return { ok: true, order: data }
}

export async function deleteOpenMerchOrderRecord({
  order,
  shopOrders,
  createAuditLog,
  loadShopOrders,
  loadShopOrderItems,
  alertFn = alert,
}) {
  const oldOrder = shopOrders.find((item) => item.id === order.id) || order

  const { data, error } = await supabase
    .rpc('delete_open_merch_order', { p_shop_order_id: order.id })
    .single()

  if (error) return { error }

  await createAuditLog('delete', 'shop_orders', data?.shop_order_id || order.id, oldOrder, {
    rpc: 'delete_open_merch_order',
    result: data,
  })

  await loadShopOrders()
  await loadShopOrderItems()
  alertFn('Offene Bestellung wurde gelöscht.')

  return { ok: true, order: data }
}
