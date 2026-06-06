import { supabase } from '../../lib/supabase'

export async function fetchPurchaseData() {
  const [
    suppliersResult,
    productsResult,
    pricesResult,
    listsResult,
    listItemsResult,
    favoritesResult,
    priceHistoryResult,
    supplierRatingsResult,
    eventsResult,
  ] = await Promise.all([
    supabase
      .from('suppliers')
      .select('*')
      .order('name', { ascending: true }),
    supabase
      .from('purchase_products')
      .select('*')
      .order('name', { ascending: true }),
    supabase
      .from('purchase_prices')
      .select('*, product:purchase_products(*), supplier:suppliers(*)')
      .order('created_at', { ascending: false }),
    supabase
      .from('purchase_lists')
      .select('*, event:events(id, name, event_date)')
      .order('created_at', { ascending: false }),
    supabase
      .from('purchase_list_items')
      .select('*, product:purchase_products(*), preferred_supplier:suppliers(*)')
      .order('created_at', { ascending: true }),
    supabase
      .from('purchase_product_favorites')
      .select('*, product:purchase_products(*)')
      .order('created_at', { ascending: false }),
    supabase
      .from('purchase_price_history')
      .select('*, product:purchase_products(*), supplier:suppliers(*)')
      .order('changed_at', { ascending: false }),
    supabase
      .from('purchase_supplier_ratings')
      .select('*, supplier:suppliers(*)')
      .order('updated_at', { ascending: false }),
    supabase
      .from('events')
      .select('id, name, event_date')
      .order('event_date', { ascending: false }),
  ])

  return {
    suppliersResult,
    productsResult,
    pricesResult,
    listsResult,
    listItemsResult,
    favoritesResult,
    priceHistoryResult,
    supplierRatingsResult,
    eventsResult,
  }
}

export async function upsertSupplier({ id, payload }) {
  if (id) {
    return supabase
      .from('suppliers')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
  }

  return supabase
    .from('suppliers')
    .insert(payload)
    .select()
    .single()
}

export async function deleteSupplier(id) {
  return supabase
    .from('suppliers')
    .delete()
    .eq('id', id)
}

export async function upsertPurchaseProduct({ id, payload }) {
  if (id) {
    return supabase
      .from('purchase_products')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
  }

  return supabase
    .from('purchase_products')
    .insert(payload)
    .select()
    .single()
}

export async function deletePurchaseProduct(id) {
  return supabase
    .from('purchase_products')
    .delete()
    .eq('id', id)
}

export async function upsertPurchasePrice({ id, payload }) {
  if (id) {
    return supabase
      .from('purchase_prices')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
  }

  return supabase
    .from('purchase_prices')
    .insert(payload)
    .select()
    .single()
}

export async function deletePurchasePrice(id) {
  return supabase
    .from('purchase_prices')
    .delete()
    .eq('id', id)
}

export async function createPurchaseList(payload) {
  return supabase
    .from('purchase_lists')
    .insert(payload)
    .select()
    .single()
}

export async function updatePurchaseList({ id, payload }) {
  return supabase
    .from('purchase_lists')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
}

export async function deletePurchaseList(id) {
  return supabase
    .from('purchase_lists')
    .delete()
    .eq('id', id)
}

export async function createPurchaseListItem(payload) {
  return supabase
    .from('purchase_list_items')
    .insert(payload)
    .select()
    .single()
}

export async function deletePurchaseListItem(id) {
  return supabase
    .from('purchase_list_items')
    .delete()
    .eq('id', id)
}

export async function addPurchaseProductFavorite(payload) {
  return supabase
    .from('purchase_product_favorites')
    .insert(payload)
    .select()
    .single()
}

export async function deletePurchaseProductFavorite(id) {
  return supabase
    .from('purchase_product_favorites')
    .delete()
    .eq('id', id)
}

export async function upsertSupplierRating({ id, payload }) {
  if (id) {
    return supabase
      .from('purchase_supplier_ratings')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
  }

  return supabase
    .from('purchase_supplier_ratings')
    .insert(payload)
    .select()
    .single()
}
