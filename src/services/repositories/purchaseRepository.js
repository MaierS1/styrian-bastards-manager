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

export async function searchProductOffers(query) {
  const cleanedQuery = String(query || '').trim()

  if (!cleanedQuery) {
    return {
      data: null,
      error: new Error('Suchbegriff ist Pflicht.'),
    }
  }

  return supabase.functions.invoke('product-offer-search', {
    body: {
      query: cleanedQuery,
    },
  })
}

export async function listRecentSearchResults() {
  return supabase
    .from('purchase_search_results')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(25)
}

export async function saveSearchResultToPriceComparison(result) {
  const supplierName = String(result?.supplier_name || '').trim()
  const productName = String(result?.product_name || '').trim()
  const allowedSuppliers = new Set(['METRO', 'TRANSGOURMET'])
  const normalizedSupplierName = supplierName.toUpperCase()

  if (!supplierName || !productName) {
    return {
      data: null,
      error: new Error('Lieferant und Produktname sind Pflicht.'),
    }
  }

  if (!allowedSuppliers.has(normalizedSupplierName)) {
    return {
      data: null,
      error: new Error('Nur METRO oder Transgourmet sind erlaubt.'),
    }
  }

  const hasPrice = [result?.price_net, result?.price_gross, result?.unit_price].some((value) => value !== null && value !== undefined && value !== '')
  if (!hasPrice) {
    return {
      data: null,
      error: new Error('Fuer diesen Treffer ist kein Preis vorhanden.'),
    }
  }

  const supplier = await findOrCreatePurchaseEntity('suppliers', supplierName)
  if (supplier.error) return supplier

  const product = await findOrCreatePurchaseEntity('purchase_products', productName)
  if (product.error) return product

  const pricePayload = {
    product_id: product.data.id,
    supplier_id: supplier.data.id,
    price_net: normalizeNumericValue(result?.price_net),
    price_gross: normalizeNumericValue(result?.price_gross),
    tax_rate: null,
    unit_price: normalizeNumericValue(result?.unit_price),
    currency: 'EUR',
    valid_from: normalizeDateValue(result?.offer_valid_from),
    valid_until: normalizeDateValue(result?.offer_valid_until),
    is_offer: true,
    offer_note: buildOfferNote(result),
  }

  const priceResult = await supabase
    .from('purchase_prices')
    .insert(pricePayload)
    .select('*, product:purchase_products(*), supplier:suppliers(*)')
    .single()

  if (priceResult.error) {
    return priceResult
  }

  return {
    data: {
      supplier: supplier.data,
      product: product.data,
      price: priceResult.data,
    },
    error: null,
  }
}

async function findOrCreatePurchaseEntity(table, name) {
  const cleanedName = String(name || '').trim()

  if (!cleanedName) {
    return {
      data: null,
      error: new Error('Name ist Pflicht.'),
    }
  }

  const selectQuery = supabase
    .from(table)
    .select('*')
    .ilike('name', cleanedName)
    .maybeSingle()

  const { data: existing, error: existingError } = await selectQuery

  if (existingError) {
    return { data: null, error: existingError }
  }

  if (existing) {
    return { data: existing, error: null }
  }

  const { data, error } = await supabase
    .from(table)
    .insert({ name: cleanedName })
    .select('*')
    .single()

  return { data, error }
}

function normalizeNumericValue(value) {
  if (value === null || value === undefined || value === '') return null
  const normalized = Number(String(value).replace(',', '.'))
  return Number.isFinite(normalized) ? normalized : null
}

function normalizeDateValue(value) {
  if (!value) return null
  const text = String(value).trim()
  if (!text) return null

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text
  }

  const parts = text.match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
  if (parts) {
    return `${parts[3]}-${parts[2]}-${parts[1]}`
  }

  const parsed = new Date(text)
  if (Number.isNaN(parsed.getTime())) return null

  return parsed.toISOString().slice(0, 10)
}

function buildOfferNote(result) {
  const sourceUrl = String(result?.source_url || '').trim()
  const sourceType = String(result?.source_type || 'public_offer').trim()
  const parts = ['Import aus oeffentlich verfuegbarem Angebot']

  if (sourceType) {
    parts.push(`Quelle: ${sourceType}`)
  }

  if (sourceUrl) {
    parts.push(sourceUrl)
  }

  return parts.join(' | ')
}
