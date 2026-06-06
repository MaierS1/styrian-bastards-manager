import { useEffect, useMemo, useState } from 'react'
import {
  buttonStyle,
  cardStyle,
  colors,
  headingStyle,
  inputStyle,
  isMobile,
  mutedTextStyle,
  secondaryButtonStyle,
  sectionStyle,
} from '../../styles/appStyles'
import {
  addPurchaseProductFavorite,
  createPurchaseList,
  createPurchaseListItem,
  deletePurchaseProductFavorite,
  deletePurchaseList,
  deletePurchaseListItem,
  deletePurchasePrice,
  deletePurchaseProduct,
  deleteSupplier,
  fetchPurchaseData,
  listRecentSearchResults,
  saveSearchResultToPriceComparison,
  searchProductOffers,
  updatePurchaseList,
  upsertSupplierRating,
  upsertPurchasePrice,
  upsertPurchaseProduct,
  upsertSupplier,
} from '../../services/repositories/purchaseRepository'

const emptySupplierForm = {
  name: '',
  website: '',
  note: '',
  is_active: true,
}

const emptyProductForm = {
  name: '',
  category: '',
  brand: '',
  unit: '',
  package_size: '',
  note: '',
  is_active: true,
}

const emptyPriceForm = {
  product_id: '',
  supplier_id: '',
  price_net: '',
  price_gross: '',
  tax_rate: '20',
  unit_price: '',
  currency: 'EUR',
  valid_from: '',
  valid_until: '',
  is_offer: false,
  offer_note: '',
}

const emptyListForm = {
  title: '',
  event_id: '',
  status: 'draft',
  note: '',
}

const emptyListItemForm = {
  list_id: '',
  product_id: '',
  quantity: '1',
  preferred_supplier_id: '',
  note: '',
}

const emptyRatingForm = {
  supplier_id: '',
  price_rating: '',
  quality_rating: '',
  reliability_rating: '',
  note: '',
}

export function PurchasePage({ canManagePurchase }) {
  const [suppliers, setSuppliers] = useState([])
  const [products, setProducts] = useState([])
  const [prices, setPrices] = useState([])
  const [lists, setLists] = useState([])
  const [listItems, setListItems] = useState([])
  const [favorites, setFavorites] = useState([])
  const [priceHistory, setPriceHistory] = useState([])
  const [supplierRatings, setSupplierRatings] = useState([])
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedProductId, setSelectedProductId] = useState('')
  const [activeTab, setActiveTab] = useState('dashboard')
  const [supplierEditingId, setSupplierEditingId] = useState(null)
  const [productEditingId, setProductEditingId] = useState(null)
  const [priceEditingId, setPriceEditingId] = useState(null)
  const [ratingEditingId, setRatingEditingId] = useState(null)
  const [supplierForm, setSupplierForm] = useState(emptySupplierForm)
  const [productForm, setProductForm] = useState(emptyProductForm)
  const [priceForm, setPriceForm] = useState(emptyPriceForm)
  const [listForm, setListForm] = useState(emptyListForm)
  const [listItemForm, setListItemForm] = useState(emptyListItemForm)
  const [ratingForm, setRatingForm] = useState(emptyRatingForm)
  const [offerSearchQuery, setOfferSearchQuery] = useState('')
  const [offerSearchResults, setOfferSearchResults] = useState([])
  const [offerSearchLoading, setOfferSearchLoading] = useState(false)
  const [offerSearchError, setOfferSearchError] = useState('')
  const [offerSearchMessage, setOfferSearchMessage] = useState('')
  const [recentSearchResults, setRecentSearchResults] = useState([])
  const hasPurchaseAccess = getSafePurchaseAccess(canManagePurchase)

  const loadData = async () => {
    setLoading(true)
    setLoadError('')

    try {
      const result = await fetchPurchaseData()
      const blockingError = [
        result.suppliersResult?.error,
        result.productsResult?.error,
        result.pricesResult?.error,
        result.listsResult?.error,
        result.listItemsResult?.error,
        result.favoritesResult?.error,
        result.priceHistoryResult?.error,
        result.supplierRatingsResult?.error,
      ].find(Boolean)

      const optionalError = result.eventsResult?.error

      if (blockingError) {
        setLoadError(blockingError.message || 'Einkaufsdaten konnten nicht geladen werden.')
        setLoading(false)
        return
      }

      if (optionalError) {
        console.warn(optionalError.message)
      }

      setSuppliers(ensureArray(result.suppliersResult?.data))
      setProducts(ensureArray(result.productsResult?.data))
      setPrices(ensureArray(result.pricesResult?.data))
      setLists(ensureArray(result.listsResult?.data))
      setListItems(ensureArray(result.listItemsResult?.data))
      setFavorites(ensureArray(result.favoritesResult?.data))
      setPriceHistory(ensureArray(result.priceHistoryResult?.data))
      setSupplierRatings(ensureArray(result.supplierRatingsResult?.data))
      setEvents(optionalError ? [] : ensureArray(result.eventsResult?.data))
      setLoading(false)
    } catch (error) {
      console.error(error)
      setLoadError(error?.message || 'Einkaufsdaten konnten nicht geladen werden.')
      setLoading(false)
    }
  }

  const loadRecentSearchResults = async () => {
    try {
      const { data, error } = await listRecentSearchResults()
      if (error) {
        console.warn(error.message)
        return
      }

      setRecentSearchResults(ensureArray(data))
    } catch (error) {
      console.warn(error)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    loadRecentSearchResults()
  }, [])

  useEffect(() => {
    const loadedProducts = ensureArray(products)
    if (!selectedProductId && loadedProducts.length > 0) {
      setSelectedProductId(loadedProducts[0].id)
    }
  }, [products, selectedProductId])

  const handleOfferSearch = async (event) => {
    event?.preventDefault?.()

    const query = offerSearchQuery.trim()
    if (!query) {
      setOfferSearchError('Bitte einen Suchbegriff eingeben.')
      setOfferSearchResults([])
      setOfferSearchMessage('')
      return
    }

    setOfferSearchLoading(true)
    setOfferSearchError('')
    setOfferSearchMessage('')
    setOfferSearchResults([])

    try {
      const { data, error } = await searchProductOffers(query)

      if (error) {
        setOfferSearchError(error.message || 'Die Angebotssuche ist fehlgeschlagen.')
        setOfferSearchResults([])
        setOfferSearchLoading(false)
        return
      }

      const results = ensureArray(data?.results || data?.data || [])
      setOfferSearchResults(results)
      setOfferSearchMessage(
        data?.message || (results.length === 0
          ? 'Fuer diesen Suchbegriff wurden keine oeffentlich verfuegbaren Angebote gefunden.'
          : `Es wurden ${results.length} Angebote gefunden.`),
      )
      await loadRecentSearchResults()
    } catch (error) {
      console.error(error)
      setOfferSearchError(error?.message || 'Die Angebotssuche ist fehlgeschlagen.')
      setOfferSearchResults([])
    } finally {
      setOfferSearchLoading(false)
    }
  }

  const importSearchResult = async (result) => {
    if (!hasPurchaseAccess) return alert('Keine Berechtigung fuer Einkauf.')

    const { data, error } = await saveSearchResultToPriceComparison(result)
    if (error) return alert(error.message)

    if (data?.product?.id) {
      setSelectedProductId(data.product.id)
    }

    setActiveTab('prices')
    await loadData()
    await loadRecentSearchResults()
  }

  const safeSuppliers = ensureArray(suppliers)
  const safeProducts = ensureArray(products)
  const safePrices = ensureArray(prices)
  const safeLists = ensureArray(lists)
  const safeListItems = ensureArray(listItems)
  const safeFavorites = ensureArray(favorites)
  const safePriceHistory = ensureArray(priceHistory)
  const safeSupplierRatings = ensureArray(supplierRatings)
  const safeEvents = ensureArray(events)
  const safeRecentSearchResults = ensureArray(recentSearchResults)

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return safeProducts

    return safeProducts.filter((product) => [
      product?.name,
      product?.category,
      product?.brand,
      product?.unit,
      product?.note,
    ].some((value) => String(value || '').toLowerCase().includes(term)))
  }, [safeProducts, search])

  const selectedProduct = safeProducts.find((product) => product?.id === selectedProductId)
  const selectedProductPrices = getSortedProductPrices(safePrices, selectedProductId)
  const bestPrice = selectedProductPrices[0]
  const activeSuppliers = safeSuppliers.filter((supplier) => supplier?.is_active)
  const activeProducts = safeProducts.filter((product) => product?.is_active)
  const openLists = safeLists.filter((list) => ['draft', 'open'].includes(list?.status))
  const favoriteProductIds = new Set(safeFavorites.map((favorite) => favorite?.product_id))
  const favoriteProducts = safeProducts.filter((product) => favoriteProductIds.has(product?.id))
  const selectedProductHistory = safePriceHistory.filter((entry) => entry?.product_id === selectedProductId)
  const lastPriceChangesByProduct = getLastPriceChangesByProduct(safePriceHistory)

  const dashboardStats = [
    ['Produkte', safeProducts.length],
    ['Aktive Lieferanten', activeSuppliers.length],
    ['Preise', safePrices.length],
    ['Favoriten', safeFavorites.length],
    ['Offene Listen', openLists.length],
  ]

  const searchResultsSorted = useMemo(() => {
    const results = ensureArray(offerSearchResults)
    return [...results].sort((a, b) => {
      const aPrice = Number(getComparablePrice(a) ?? Number.MAX_SAFE_INTEGER)
      const bPrice = Number(getComparablePrice(b) ?? Number.MAX_SAFE_INTEGER)
      return aPrice - bPrice
    })
  }, [offerSearchResults])

  const saveSupplier = async () => {
    if (!hasPurchaseAccess) return alert('Keine Berechtigung fuer Einkauf.')
    if (!supplierForm.name.trim()) return alert('Lieferantenname ist Pflicht.')

    setSaving(true)
    const { error } = await upsertSupplier({
      id: supplierEditingId,
      payload: {
        name: supplierForm.name.trim(),
        website: normalizeText(supplierForm.website),
        note: normalizeText(supplierForm.note),
        is_active: supplierForm.is_active,
      },
    })
    setSaving(false)

    if (error) return alert(error.message)
    resetSupplierForm()
    await loadData()
  }

  const saveProduct = async () => {
    if (!hasPurchaseAccess) return alert('Keine Berechtigung fuer Einkauf.')
    if (!productForm.name.trim()) return alert('Produktname ist Pflicht.')

    setSaving(true)
    const { error } = await upsertPurchaseProduct({
      id: productEditingId,
      payload: {
        name: productForm.name.trim(),
        category: normalizeText(productForm.category),
        brand: normalizeText(productForm.brand),
        unit: normalizeText(productForm.unit),
        package_size: normalizeNumber(productForm.package_size),
        note: normalizeText(productForm.note),
        is_active: productForm.is_active,
      },
    })
    setSaving(false)

    if (error) return alert(error.message)
    resetProductForm()
    await loadData()
  }

  const savePrice = async () => {
    if (!hasPurchaseAccess) return alert('Keine Berechtigung fuer Einkauf.')
    if (!priceForm.product_id || !priceForm.supplier_id) return alert('Produkt und Lieferant sind Pflicht.')

    setSaving(true)
    const { error } = await upsertPurchasePrice({
      id: priceEditingId,
      payload: {
        product_id: priceForm.product_id,
        supplier_id: priceForm.supplier_id,
        price_net: normalizeNumber(priceForm.price_net),
        price_gross: normalizeNumber(priceForm.price_gross),
        tax_rate: normalizeNumber(priceForm.tax_rate),
        unit_price: normalizeNumber(priceForm.unit_price),
        currency: (priceForm.currency || 'EUR').trim().toUpperCase(),
        valid_from: normalizeText(priceForm.valid_from),
        valid_until: normalizeText(priceForm.valid_until),
        is_offer: priceForm.is_offer,
        offer_note: normalizeText(priceForm.offer_note),
      },
    })
    setSaving(false)

    if (error) return alert(error.message)
    resetPriceForm()
    await loadData()
  }

  const toggleFavorite = async (product) => {
    if (!hasPurchaseAccess) return alert('Keine Berechtigung fuer Einkauf.')
    const existingFavorite = safeFavorites.find((favorite) => favorite?.product_id === product?.id)

    const { error } = existingFavorite
      ? await deletePurchaseProductFavorite(existingFavorite.id)
      : await addPurchaseProductFavorite({ product_id: product.id })

    if (error) return alert(error.message)
    await loadData()
  }

  const saveSupplierRating = async () => {
    if (!hasPurchaseAccess) return alert('Keine Berechtigung fuer Einkauf.')
    if (!ratingForm.supplier_id) return alert('Lieferant ist Pflicht.')

    setSaving(true)
    const { error } = await upsertSupplierRating({
      id: ratingEditingId,
      payload: {
        supplier_id: ratingForm.supplier_id,
        price_rating: normalizeInteger(ratingForm.price_rating),
        quality_rating: normalizeInteger(ratingForm.quality_rating),
        reliability_rating: normalizeInteger(ratingForm.reliability_rating),
        note: normalizeText(ratingForm.note),
      },
    })
    setSaving(false)

    if (error) return alert(error.message)
    resetRatingForm()
    await loadData()
  }

  const saveList = async () => {
    if (!hasPurchaseAccess) return alert('Keine Berechtigung fuer Einkauf.')
    if (!listForm.title.trim()) return alert('Listentitel ist Pflicht.')

    setSaving(true)
    const { data, error } = await createPurchaseList({
      title: listForm.title.trim(),
      event_id: normalizeText(listForm.event_id),
      status: listForm.status,
      note: normalizeText(listForm.note),
      estimated_total_net: 0,
      estimated_total_gross: 0,
    })
    setSaving(false)

    if (error) return alert(error.message)
    setListForm(emptyListForm)
    setListItemForm((current) => ({ ...current, list_id: data?.id || current.list_id }))
    await loadData()
  }

  const saveListItem = async () => {
    if (!hasPurchaseAccess) return alert('Keine Berechtigung fuer Einkauf.')
    if (!listItemForm.list_id || !listItemForm.product_id) return alert('Liste und Produkt sind Pflicht.')

    setSaving(true)
    const payload = {
      list_id: listItemForm.list_id,
      product_id: listItemForm.product_id,
      quantity: normalizeNumber(listItemForm.quantity) || 1,
      preferred_supplier_id: normalizeText(listItemForm.preferred_supplier_id),
      note: normalizeText(listItemForm.note),
    }
    const { data, error } = await createPurchaseListItem(payload)
    setSaving(false)

    if (error) return alert(error.message)
    await updateListEstimate(listItemForm.list_id, data || payload)
    setListItemForm((current) => ({
      ...emptyListItemForm,
      list_id: current.list_id,
    }))
    await loadData()
  }

  const updateListEstimate = async (listId, extraItem = null) => {
    const currentItems = safeListItems.filter((item) => item?.list_id === listId)
    const nextItems = extraItem ? [...currentItems, extraItem] : currentItems
    const totals = getListTotals(nextItems, safePrices)

    await updatePurchaseList({
      id: listId,
      payload: {
        estimated_total_net: totals.net,
        estimated_total_gross: totals.gross,
      },
    })
  }

  const editSupplier = (supplier) => {
    setSupplierEditingId(supplier.id)
    setSupplierForm({
      name: supplier.name || '',
      website: supplier.website || '',
      note: supplier.note || '',
      is_active: supplier.is_active,
    })
    setActiveTab('suppliers')
  }

  const editProduct = (product) => {
    setProductEditingId(product.id)
    setProductForm({
      name: product.name || '',
      category: product.category || '',
      brand: product.brand || '',
      unit: product.unit || '',
      package_size: product.package_size ?? '',
      note: product.note || '',
      is_active: product.is_active,
    })
    setSelectedProductId(product.id)
    setActiveTab('products')
  }

  const editPrice = (price) => {
    setPriceEditingId(price.id)
    setPriceForm({
      product_id: price.product_id || '',
      supplier_id: price.supplier_id || '',
      price_net: price.price_net ?? '',
      price_gross: price.price_gross ?? '',
      tax_rate: price.tax_rate ?? '',
      unit_price: price.unit_price ?? '',
      currency: price.currency || 'EUR',
      valid_from: price.valid_from || '',
      valid_until: price.valid_until || '',
      is_offer: price.is_offer,
      offer_note: price.offer_note || '',
    })
    setSelectedProductId(price.product_id)
    setActiveTab('prices')
  }

  const editSupplierRating = (rating) => {
    setRatingEditingId(rating.id)
    setRatingForm({
      supplier_id: rating.supplier_id || '',
      price_rating: rating.price_rating ?? '',
      quality_rating: rating.quality_rating ?? '',
      reliability_rating: rating.reliability_rating ?? '',
      note: rating.note || '',
    })
    setActiveTab('suppliers')
  }

  const removeSupplier = async (supplier) => {
    if (!hasPurchaseAccess) return alert('Keine Berechtigung fuer Einkauf.')
    if (!window.confirm(`Lieferant wirklich loeschen?\n\n${supplier.name}`)) return

    const { error } = await deleteSupplier(supplier.id)
    if (error) return alert(error.message)
    await loadData()
  }

  const removeProduct = async (product) => {
    if (!hasPurchaseAccess) return alert('Keine Berechtigung fuer Einkauf.')
    if (!window.confirm(`Produkt wirklich loeschen?\n\n${product.name}`)) return

    const { error } = await deletePurchaseProduct(product.id)
    if (error) return alert(error.message)
    await loadData()
  }

  const removePrice = async (price) => {
    if (!hasPurchaseAccess) return alert('Keine Berechtigung fuer Einkauf.')
    if (!window.confirm('Preis wirklich loeschen?')) return

    const { error } = await deletePurchasePrice(price.id)
    if (error) return alert(error.message)
    await loadData()
  }

  const changeListStatus = async (list, status) => {
    if (!hasPurchaseAccess) return alert('Keine Berechtigung fuer Einkauf.')

    const { error } = await updatePurchaseList({ id: list.id, payload: { status } })
    if (error) return alert(error.message)
    await loadData()
  }

  const changeListEvent = async (list, eventId) => {
    if (!hasPurchaseAccess) return alert('Keine Berechtigung fuer Einkauf.')

    const { error } = await updatePurchaseList({
      id: list.id,
      payload: { event_id: normalizeText(eventId) },
    })
    if (error) return alert(error.message)
    await loadData()
  }

  const removeList = async (list) => {
    if (!hasPurchaseAccess) return alert('Keine Berechtigung fuer Einkauf.')
    if (!window.confirm(`Einkaufsliste wirklich loeschen?\n\n${list.title}`)) return

    const { error } = await deletePurchaseList(list.id)
    if (error) return alert(error.message)
    await loadData()
  }

  const removeListItem = async (item) => {
    if (!hasPurchaseAccess) return alert('Keine Berechtigung fuer Einkauf.')

    const { error } = await deletePurchaseListItem(item.id)
    if (error) return alert(error.message)
    const remainingItems = safeListItems.filter((listItem) => listItem?.list_id === item?.list_id && listItem?.id !== item?.id)
    const totals = getListTotals(remainingItems, safePrices)
    await updatePurchaseList({
      id: item.list_id,
      payload: {
        estimated_total_net: totals.net,
        estimated_total_gross: totals.gross,
      },
    })
    await loadData()
  }

  const resetSupplierForm = () => {
    setSupplierEditingId(null)
    setSupplierForm(emptySupplierForm)
  }

  const resetProductForm = () => {
    setProductEditingId(null)
    setProductForm(emptyProductForm)
  }

  const resetPriceForm = () => {
    setPriceEditingId(null)
    setPriceForm(emptyPriceForm)
  }

  const resetRatingForm = () => {
    setRatingEditingId(null)
    setRatingForm(emptyRatingForm)
  }

  const exportSelectedComparisonCsv = () => {
    if (!selectedProduct) return alert('Bitte Produkt auswaehlen.')
    const rows = buildComparisonRows(selectedProduct, selectedProductPrices, bestPrice)
    downloadCsv(`preisvergleich-${selectedProduct.name}.csv`, rows)
  }

  const exportSelectedComparisonPdf = async () => {
    if (!selectedProduct) return alert('Bitte Produkt auswaehlen.')
    const rows = buildComparisonRows(selectedProduct, selectedProductPrices, bestPrice)
    const totals = getComparisonTotals(selectedProductPrices)
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
    ])
    const doc = new jsPDF('landscape')

    doc.text('Styrian Bastards', 14, 15)
    doc.text(`Preisvergleich - ${selectedProduct.name}`, 14, 23)
    doc.text(`Datum: ${new Date().toLocaleDateString('de-AT')}`, 14, 31)
    doc.text(`Summen netto: ${formatMoney(totals.net, 'EUR')} / brutto: ${formatMoney(totals.gross, 'EUR')}`, 14, 39)

    autoTable(doc, {
      startY: 48,
      head: [['Produkt', 'Menge', 'Lieferant', 'Netto', 'Brutto', 'Einheitspreis', 'Bestpreis']],
      body: rows.map((row) => [
        row.Produkt,
        row.Menge,
        row.Lieferant,
        row.Netto,
        row.Brutto,
        row.Einheitspreis,
        row.Bestpreis,
      ]),
      headStyles: { fillColor: [5, 5, 5] },
    })

    doc.save(`preisvergleich-${sanitizeFileName(selectedProduct.name)}.pdf`)
  }

  const exportListCsv = (list) => {
    const items = safeListItems.filter((item) => item?.list_id === list?.id)
    const rows = buildListRows(list, items, safePrices)
    downloadCsv(`einkaufsliste-${list.title}.csv`, rows)
  }

  const exportListPdf = async (list) => {
    const items = safeListItems.filter((item) => item?.list_id === list?.id)
    const rows = buildListRows(list, items, safePrices)
    const totals = getListTotals(items, safePrices)
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
    ])
    const doc = new jsPDF('landscape')

    doc.text('Styrian Bastards', 14, 15)
    doc.text(`Einkaufsliste - ${list.title}`, 14, 23)
    doc.text(`Datum: ${new Date().toLocaleDateString('de-AT')}`, 14, 31)
    doc.text(`Event: ${list.event?.name || '-'}`, 14, 39)
    doc.text(`Gesamt netto: ${formatMoney(totals.net, 'EUR')} / brutto: ${formatMoney(totals.gross, 'EUR')}`, 14, 47)

    autoTable(doc, {
      startY: 56,
      head: [['Produkt', 'Menge', 'Lieferant', 'Netto', 'Brutto', 'Einheitspreis', 'Bestpreis']],
      body: rows.map((row) => [
        row.Produkt,
        row.Menge,
        row.Lieferant,
        row.Netto,
        row.Brutto,
        row.Einheitspreis,
        row.Bestpreis,
      ]),
      headStyles: { fillColor: [5, 5, 5] },
    })

    doc.save(`einkaufsliste-${sanitizeFileName(list.title)}.pdf`)
  }

  if (!hasPurchaseAccess) {
    return (
      <section style={purchaseSectionStyle}>
        <PurchaseDebugHeader />
        <div style={errorBoxStyle}>
          <strong>Kein Zugriff auf Einkauf & Preisvergleich.</strong>
          <br />
          Dieser Bereich ist nur fuer Vorstand, Admin und Kassier sichtbar.
        </div>
      </section>
    )
  }

  return (
    <section style={purchaseSectionStyle}>
      <PurchaseDebugHeader />
      <h2 style={headingStyle}>Einkauf & Preisvergleich</h2>
      <div style={infoBoxStyle}>
        Dieses Modul ist fuer den geschuetzten Mitgliederbereich vorbereitet.
      </div>

      <div style={cardStyle}>
        <h3 style={headingStyle}>Produkt oder Angebot suchen</h3>
        <form onSubmit={handleOfferSearch}>
          <input
            placeholder="Produkt oder Angebot suchen"
            value={offerSearchQuery}
            onChange={(event) => setOfferSearchQuery(event.target.value)}
            style={inputStyle}
          />
          <button type="submit" disabled={offerSearchLoading} style={buttonStyle}>
            {offerSearchLoading ? 'Suche laeuft...' : 'Angebote suchen'}
          </button>
        </form>

        <p style={mutedTextStyle}>
          Nur oeffentlich verfuegbare Angebotsseiten werden verwendet. Keine Zugangsdaten, kein Login, kein aggressives Scraping.
        </p>

        {offerSearchError && (
          <div style={errorBoxStyle}>
            <strong>Suchfehler</strong>
            <br />
            {offerSearchError}
          </div>
        )}

        {!offerSearchError && offerSearchMessage && (
          <div style={infoBoxStyle}>
            {offerSearchMessage}
          </div>
        )}

        {searchResultsSorted.length > 0 && (
          <div style={searchResultsGridStyle}>
            {searchResultsSorted.map((result, index) => {
              const bestComparablePrice = getComparablePrice(searchResultsSorted[0])
              const currentComparablePrice = getComparablePrice(result)
              const isBest = currentComparablePrice !== null && currentComparablePrice !== undefined && Number(currentComparablePrice) === Number(bestComparablePrice)
              const canImport = [result?.price_net, result?.price_gross, result?.unit_price].some((value) => value !== null && value !== undefined && value !== '')

              return (
                <div key={result.id || `${result.source_url}-${index}`} style={searchResultCardStyle(isBest)}>
                  <strong>{result.product_name}</strong>
                  {isBest && <span style={bestBadgeStyle}>Bestpreis</span>}
                  <br />
                  Lieferant: {result.supplier_name || '-'}
                  <br />
                  Netto: {formatMoney(result.price_net, 'EUR')}
                  <br />
                  Brutto: {formatMoney(result.price_gross, 'EUR')}
                  <br />
                  Einheitspreis: {formatMoney(result.unit_price, 'EUR')}
                  <br />
                  Einheit: {result.unit || '-'} {result.package_size ? `- Packung: ${result.package_size}` : ''}
                  <br />
                  Angebotszeitraum: {formatSearchOfferRange(result.offer_valid_from, result.offer_valid_until)}
                  <br />
                  Quelle:{' '}
                  <a href={result.source_url} target="_blank" rel="noreferrer" style={searchLinkStyle}>
                    {result.source_url}
                  </a>
                  <br />
                  <button
                    type="button"
                    onClick={() => importSearchResult(result)}
                    disabled={!hasPurchaseAccess || !canImport}
                    style={buttonStyle}
                  >
                    In Preisvergleich uebernehmen
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {!offerSearchLoading && !offerSearchError && offerSearchMessage && searchResultsSorted.length === 0 && (
          <p style={mutedTextStyle}>Keine Treffer fuer die aktuelle Suche.</p>
        )}

        {safeRecentSearchResults.length > 0 && (
          <div style={recentSearchPanelStyle}>
            <h4 style={{ ...headingStyle, marginTop: 12 }}>Zuletzt gefundene Angebote</h4>
            {safeRecentSearchResults.slice(0, 8).map((result) => (
              <div key={result.id} style={recentSearchRowStyle}>
                <strong>{result.product_name}</strong>
                <br />
                {result.search_query} - {result.supplier_name} - {formatMoney(result.price_gross ?? result.price_net ?? result.unit_price, 'EUR')}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={cardStyle}>
        <h3 style={headingStyle}>Manuelle Pflege</h3>
        <p style={mutedTextStyle}>
          Produkt-, Lieferanten-, Preis- und Listenpflege bleibt als Zusatzfunktion erhalten.
        </p>
      </div>

      <div style={tabsStyle}>
        {[
          ['dashboard', 'Uebersicht'],
          ['favorites', 'Favoriten'],
          ['products', 'Produkte'],
          ['suppliers', 'Lieferanten'],
          ['prices', 'Preise'],
          ['history', 'Preis-Historie'],
          ['lists', 'Einkaufslisten'],
          ['exports', 'Exporte'],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            style={activeTab === key ? buttonStyle : secondaryButtonStyle}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && <p style={mutedTextStyle}>Einkaufsdaten werden geladen...</p>}

      {!loading && loadError && (
        <div style={errorBoxStyle}>
          <strong>Einkaufsdaten konnten nicht geladen werden.</strong>
          <br />
          {loadError}
          <br />
          Bitte pruefen, ob die Supabase-Migrationen angewendet wurden und die Rolle Zugriff hat.
        </div>
      )}

      {!loading && (
        <>
          {!loadError && safeProducts.length === 0 && safeSuppliers.length === 0 && safePrices.length === 0 && (
            <div style={cardStyle}>
              <strong>Noch keine Einkaufsdaten vorhanden.</strong>
              <br />
              Lege zuerst einen Lieferanten oder ein Produkt an.
              <br />
              <button onClick={() => setActiveTab('suppliers')} style={buttonStyle}>Lieferant anlegen</button>
              <button onClick={() => setActiveTab('products')} style={secondaryButtonStyle}>Produkt anlegen</button>
            </div>
          )}

          <input
            placeholder="Produkte suchen..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            style={inputStyle}
          />

          {activeTab === 'dashboard' && (
            <>
              <div style={statsGridStyle}>
                {dashboardStats.map(([label, value]) => (
                  <div key={label} style={cardStyle}>
                    <strong style={statNumberStyle}>{value}</strong>
                    <br />
                    {label}
                  </div>
                ))}
              </div>

              <ProductComparison
                products={filteredProducts}
                selectedProductId={selectedProductId}
                setSelectedProductId={setSelectedProductId}
                selectedProduct={selectedProduct}
                prices={selectedProductPrices}
                bestPrice={bestPrice}
                editPrice={editPrice}
                removePrice={removePrice}
                exportCsv={exportSelectedComparisonCsv}
                exportPdf={exportSelectedComparisonPdf}
              />
            </>
          )}

          {activeTab === 'favorites' && (
            <FavoritesList
              products={favoriteProducts}
              prices={safePrices}
              lastPriceChangesByProduct={lastPriceChangesByProduct}
              toggleFavorite={toggleFavorite}
              setSelectedProductId={setSelectedProductId}
              setActiveTab={setActiveTab}
            />
          )}

          {activeTab === 'products' && (
            <TwoColumnLayout
              left={(
                <ProductForm
                  form={productForm}
                  setForm={setProductForm}
                  editingId={productEditingId}
                  saving={saving}
                  save={saveProduct}
                  reset={resetProductForm}
                />
              )}
              right={(
                <ProductsList
                  products={filteredProducts}
                  prices={safePrices}
                  favorites={safeFavorites}
                  lastPriceChangesByProduct={lastPriceChangesByProduct}
                  toggleFavorite={toggleFavorite}
                  editProduct={editProduct}
                  removeProduct={removeProduct}
                  setSelectedProductId={setSelectedProductId}
                  setActiveTab={setActiveTab}
                />
              )}
            />
          )}

          {activeTab === 'suppliers' && (
            <>
              <TwoColumnLayout
                left={(
                  <SupplierForm
                    form={supplierForm}
                    setForm={setSupplierForm}
                    editingId={supplierEditingId}
                    saving={saving}
                    save={saveSupplier}
                    reset={resetSupplierForm}
                  />
                )}
                right={(
                  <SuppliersList
                  suppliers={safeSuppliers}
                  prices={safePrices}
                  ratings={safeSupplierRatings}
                    editSupplier={editSupplier}
                    removeSupplier={removeSupplier}
                    editSupplierRating={editSupplierRating}
                  />
                )}
              />
              <SupplierRatingForm
                form={ratingForm}
                setForm={setRatingForm}
                suppliers={safeSuppliers}
                editingId={ratingEditingId}
                saving={saving}
                save={saveSupplierRating}
                reset={resetRatingForm}
              />
            </>
          )}

          {activeTab === 'prices' && (
            <>
              <PriceForm
                form={priceForm}
                setForm={setPriceForm}
                products={activeProducts}
                suppliers={activeSuppliers}
                editingId={priceEditingId}
                saving={saving}
                save={savePrice}
                reset={resetPriceForm}
              />

              <ProductComparison
                products={filteredProducts}
                selectedProductId={selectedProductId}
                setSelectedProductId={setSelectedProductId}
                selectedProduct={selectedProduct}
                prices={selectedProductPrices}
                bestPrice={bestPrice}
                editPrice={editPrice}
                removePrice={removePrice}
                exportCsv={exportSelectedComparisonCsv}
                exportPdf={exportSelectedComparisonPdf}
              />
            </>
          )}

          {activeTab === 'history' && (
            <PriceHistory
              products={filteredProducts}
              selectedProductId={selectedProductId}
              setSelectedProductId={setSelectedProductId}
              selectedProduct={selectedProduct}
              history={selectedProductHistory}
            />
          )}

          {activeTab === 'lists' && (
            <PurchaseLists
              listForm={listForm}
              setListForm={setListForm}
              listItemForm={listItemForm}
              setListItemForm={setListItemForm}
              lists={lists}
              listItems={listItems}
              products={activeProducts}
              suppliers={activeSuppliers}
              prices={safePrices}
              events={safeEvents}
              saving={saving}
              saveList={saveList}
              saveListItem={saveListItem}
              changeListStatus={changeListStatus}
              changeListEvent={changeListEvent}
              removeList={removeList}
              removeListItem={removeListItem}
              exportListCsv={exportListCsv}
              exportListPdf={exportListPdf}
            />
          )}

          {activeTab === 'exports' && (
            <ExportsPanel
              lists={safeLists}
              selectedProduct={selectedProduct}
              selectedProductPrices={selectedProductPrices}
              exportSelectedComparisonCsv={exportSelectedComparisonCsv}
              exportSelectedComparisonPdf={exportSelectedComparisonPdf}
              exportListCsv={exportListCsv}
              exportListPdf={exportListPdf}
            />
          )}
        </>
      )}
    </section>
  )
}

function SupplierForm({ form, setForm, editingId, saving, save, reset }) {
  return (
    <div style={cardStyle}>
      <h3 style={headingStyle}>{editingId ? 'Lieferant bearbeiten' : 'Lieferant anlegen'}</h3>
      <input placeholder="Name" value={form.name} onChange={(event) => setFormValue(setForm, 'name', event.target.value)} style={inputStyle} />
      <input placeholder="Website" value={form.website} onChange={(event) => setFormValue(setForm, 'website', event.target.value)} style={inputStyle} />
      <textarea placeholder="Notiz" value={form.note} onChange={(event) => setFormValue(setForm, 'note', event.target.value)} style={textareaStyle} />
      <Checkbox checked={form.is_active} onChange={(value) => setFormValue(setForm, 'is_active', value)} label="Aktiv" />
      <button onClick={save} disabled={saving} style={buttonStyle}>{saving ? 'Speichern...' : 'Speichern'}</button>
      {editingId && <button onClick={reset} style={secondaryButtonStyle}>Abbrechen</button>}
    </div>
  )
}

function ProductForm({ form, setForm, editingId, saving, save, reset }) {
  return (
    <div style={cardStyle}>
      <h3 style={headingStyle}>{editingId ? 'Produkt bearbeiten' : 'Produkt anlegen'}</h3>
      <input placeholder="Name" value={form.name} onChange={(event) => setFormValue(setForm, 'name', event.target.value)} style={inputStyle} />
      <input placeholder="Kategorie" value={form.category} onChange={(event) => setFormValue(setForm, 'category', event.target.value)} style={inputStyle} />
      <input placeholder="Marke" value={form.brand} onChange={(event) => setFormValue(setForm, 'brand', event.target.value)} style={inputStyle} />
      <input placeholder="Einheit, z.B. kg, l, Stk" value={form.unit} onChange={(event) => setFormValue(setForm, 'unit', event.target.value)} style={inputStyle} />
      <input type="number" min="0" step="0.001" placeholder="Packungsgroesse" value={form.package_size} onChange={(event) => setFormValue(setForm, 'package_size', event.target.value)} style={inputStyle} />
      <textarea placeholder="Notiz" value={form.note} onChange={(event) => setFormValue(setForm, 'note', event.target.value)} style={textareaStyle} />
      <Checkbox checked={form.is_active} onChange={(value) => setFormValue(setForm, 'is_active', value)} label="Aktiv" />
      <button onClick={save} disabled={saving} style={buttonStyle}>{saving ? 'Speichern...' : 'Speichern'}</button>
      {editingId && <button onClick={reset} style={secondaryButtonStyle}>Abbrechen</button>}
    </div>
  )
}

function PriceForm({ form, setForm, products, suppliers, editingId, saving, save, reset }) {
  const safeProducts = ensureArray(products)
  const safeSuppliers = ensureArray(suppliers)

  return (
    <div style={cardStyle}>
      <h3 style={headingStyle}>{editingId ? 'Preis bearbeiten' : 'Preis pro Produkt erfassen'}</h3>
      <div style={formGridStyle}>
        <select value={form.product_id} onChange={(event) => setFormValue(setForm, 'product_id', event.target.value)} style={inputStyle}>
          <option value="">Produkt auswaehlen</option>
          {safeProducts.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
        </select>
        <select value={form.supplier_id} onChange={(event) => setFormValue(setForm, 'supplier_id', event.target.value)} style={inputStyle}>
          <option value="">Lieferant auswaehlen</option>
          {safeSuppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
        </select>
        <input type="number" min="0" step="0.01" placeholder="Netto" value={form.price_net} onChange={(event) => setFormValue(setForm, 'price_net', event.target.value)} style={inputStyle} />
        <input type="number" min="0" step="0.01" placeholder="Brutto" value={form.price_gross} onChange={(event) => setFormValue(setForm, 'price_gross', event.target.value)} style={inputStyle} />
        <input type="number" min="0" step="0.01" placeholder="Steuer %" value={form.tax_rate} onChange={(event) => setFormValue(setForm, 'tax_rate', event.target.value)} style={inputStyle} />
        <input type="number" min="0" step="0.0001" placeholder="Einheitspreis" value={form.unit_price} onChange={(event) => setFormValue(setForm, 'unit_price', event.target.value)} style={inputStyle} />
        <input placeholder="Waehrung" value={form.currency} onChange={(event) => setFormValue(setForm, 'currency', event.target.value)} style={inputStyle} />
        <input type="date" value={form.valid_from} onChange={(event) => setFormValue(setForm, 'valid_from', event.target.value)} style={inputStyle} />
        <input type="date" value={form.valid_until} onChange={(event) => setFormValue(setForm, 'valid_until', event.target.value)} style={inputStyle} />
      </div>
      <Checkbox checked={form.is_offer} onChange={(value) => setFormValue(setForm, 'is_offer', value)} label="Angebot" />
      <textarea placeholder="Angebotshinweis" value={form.offer_note} onChange={(event) => setFormValue(setForm, 'offer_note', event.target.value)} style={textareaStyle} />
      <button onClick={save} disabled={saving} style={buttonStyle}>{saving ? 'Speichern...' : 'Preis speichern'}</button>
      {editingId && <button onClick={reset} style={secondaryButtonStyle}>Abbrechen</button>}
    </div>
  )
}

function FavoritesList({ products, prices, lastPriceChangesByProduct, toggleFavorite, setSelectedProductId, setActiveTab }) {
  const safeProducts = ensureArray(products)
  const safePrices = ensureArray(prices)

  if (safeProducts.length === 0) return <p style={mutedTextStyle}>Noch keine Favoriten markiert.</p>

  return (
    <div>
      <h3 style={headingStyle}>Favoritenliste</h3>
      {safeProducts.map((product) => {
        const bestPrice = getSortedProductPrices(safePrices, product?.id)[0]
        const lastChange = lastPriceChangesByProduct?.[product?.id]

        return (
          <div key={product.id} style={cardStyle}>
            <strong>{product.name}</strong>
            <br />
            Bestpreis: {bestPrice ? formatMoney(getComparablePrice(bestPrice), bestPrice.currency) : '-'} bei {bestPrice?.supplier?.name || '-'}
            <br />
            Letzte Preisaenderung: {lastChange ? `${formatDateTime(lastChange.changed_at)} - vorher ${formatMoney(getComparablePriceFromHistory(lastChange), lastChange.old_currency)}` : '-'}
            <br />
            <button onClick={() => { setSelectedProductId(product.id); setActiveTab('prices') }} style={buttonStyle}>Preisvergleich</button>
            <button onClick={() => toggleFavorite(product)} style={secondaryButtonStyle}>Favorit entfernen</button>
          </div>
        )
      })}
    </div>
  )
}

function ProductsList({
  products,
  prices,
  favorites,
  lastPriceChangesByProduct,
  toggleFavorite,
  editProduct,
  removeProduct,
  setSelectedProductId,
  setActiveTab,
}) {
  const safeProducts = ensureArray(products)
  const safePrices = ensureArray(prices)
  const safeFavorites = ensureArray(favorites)

  if (safeProducts.length === 0) return <p style={mutedTextStyle}>Keine Produkte gefunden.</p>

  return (
    <div>
      <h3 style={headingStyle}>Produktverwaltung</h3>
      {safeProducts.map((product) => {
        const productPrices = safePrices.filter((price) => price?.product_id === product?.id)
        const bestPrice = getSortedProductPrices(safePrices, product?.id)[0]
        const isFavorite = safeFavorites.some((favorite) => favorite?.product_id === product?.id)
        const lastChange = lastPriceChangesByProduct?.[product?.id]

        return (
          <div key={product.id} style={{ ...cardStyle, opacity: product.is_active ? 1 : 0.68 }}>
            <strong>{product.name}</strong>
            <br />
            {product.category || '-'} {product.brand ? `- ${product.brand}` : ''}
            <br />
            Einheit: {product.unit || '-'} - Packung: {product.package_size || '-'}
            <br />
            Preise: {productPrices.length} - Bestpreis: {bestPrice ? formatMoney(getComparablePrice(bestPrice), bestPrice.currency) : '-'}
            <br />
            Favorit: {isFavorite ? 'Ja' : 'Nein'} - Letzte Preisaenderung: {lastChange ? formatDateTime(lastChange.changed_at) : '-'}
            <br />
            Notiz: {product.note || '-'}
            <br />
            <button onClick={() => editProduct(product)} style={buttonStyle}>Bearbeiten</button>
            <button onClick={() => toggleFavorite(product)} style={secondaryButtonStyle}>{isFavorite ? 'Favorit entfernen' : 'Als Favorit markieren'}</button>
            <button onClick={() => { setSelectedProductId(product.id); setActiveTab('prices') }} style={secondaryButtonStyle}>Preisvergleich</button>
            <button onClick={() => removeProduct(product)} style={dangerButtonStyle}>Loeschen</button>
          </div>
        )
      })}
    </div>
  )
}

function SuppliersList({ suppliers, prices, ratings, editSupplier, removeSupplier, editSupplierRating }) {
  const safeSuppliers = ensureArray(suppliers)
  const safeRatings = ensureArray(ratings)

  if (safeSuppliers.length === 0) return <p style={mutedTextStyle}>Noch keine Lieferanten angelegt.</p>

  return (
    <div>
      <h3 style={headingStyle}>Lieferantenverwaltung</h3>
      {safeSuppliers.map((supplier) => (
        <SupplierCard
          key={supplier.id}
          supplier={supplier}
          prices={prices}
          rating={safeRatings.find((item) => item?.supplier_id === supplier?.id)}
          editSupplier={editSupplier}
          removeSupplier={removeSupplier}
          editSupplierRating={editSupplierRating}
        />
      ))}
    </div>
  )
}

function SupplierCard({ supplier, prices, rating, editSupplier, removeSupplier, editSupplierRating }) {
  const safePrices = ensureArray(prices)

  return (
    <div style={{ ...cardStyle, opacity: supplier.is_active ? 1 : 0.68 }}>
      <strong>{supplier.name}</strong>
      <br />
      Website: {supplier.website || '-'}
      <br />
      Status: {supplier?.is_active ? 'Aktiv' : 'Inaktiv'} - Preise: {safePrices.filter((price) => price?.supplier_id === supplier?.id).length}
      <br />
      Bewertung: Preis {rating?.price_rating || '-'} / Qualitaet {rating?.quality_rating || '-'} / Zuverlaessigkeit {rating?.reliability_rating || '-'}
      <br />
      Bewertungsnotiz: {rating?.note || '-'}
      <br />
      Notiz: {supplier.note || '-'}
      <br />
      <button onClick={() => editSupplier(supplier)} style={buttonStyle}>Bearbeiten</button>
      <button
        onClick={() => editSupplierRating(rating || { supplier_id: supplier.id })}
        style={secondaryButtonStyle}
      >
        Bewertung
      </button>
      <button onClick={() => removeSupplier(supplier)} style={dangerButtonStyle}>Loeschen</button>
    </div>
  )
}

function SupplierRatingForm({ form, setForm, suppliers, editingId, saving, save, reset }) {
  const safeSuppliers = ensureArray(suppliers)

  return (
    <div style={cardStyle}>
      <h3 style={headingStyle}>{editingId ? 'Lieferantenbewertung bearbeiten' : 'Lieferantenbewertung'}</h3>
      <div style={formGridStyle}>
        <select value={form.supplier_id} onChange={(event) => setFormValue(setForm, 'supplier_id', event.target.value)} style={inputStyle}>
          <option value="">Lieferant auswaehlen</option>
          {safeSuppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
        </select>
        <RatingSelect label="Preis" value={form.price_rating} onChange={(value) => setFormValue(setForm, 'price_rating', value)} />
        <RatingSelect label="Qualitaet" value={form.quality_rating} onChange={(value) => setFormValue(setForm, 'quality_rating', value)} />
        <RatingSelect label="Zuverlaessigkeit" value={form.reliability_rating} onChange={(value) => setFormValue(setForm, 'reliability_rating', value)} />
      </div>
      <textarea placeholder="Bewertungsnotiz" value={form.note} onChange={(event) => setFormValue(setForm, 'note', event.target.value)} style={textareaStyle} />
      <button onClick={save} disabled={saving} style={buttonStyle}>{saving ? 'Speichern...' : 'Bewertung speichern'}</button>
      {editingId && <button onClick={reset} style={secondaryButtonStyle}>Abbrechen</button>}
    </div>
  )
}

function RatingSelect({ label, value, onChange }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} style={inputStyle}>
      <option value="">{label} bewerten</option>
      <option value="1">1 - schwach</option>
      <option value="2">2</option>
      <option value="3">3</option>
      <option value="4">4</option>
      <option value="5">5 - sehr gut</option>
    </select>
  )
}

function ProductComparison({
  products,
  selectedProductId,
  setSelectedProductId,
  selectedProduct,
  prices,
  bestPrice,
  editPrice,
  removePrice,
  exportCsv,
  exportPdf,
}) {
  const safeProducts = ensureArray(products)
  const safePrices = ensureArray(prices)

  return (
    <div style={cardStyle}>
      <h3 style={headingStyle}>Preisvergleich pro Produkt</h3>
      <select value={selectedProductId} onChange={(event) => setSelectedProductId(event.target.value)} style={inputStyle}>
        <option value="">Produkt auswaehlen</option>
        {safeProducts.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
      </select>

      {selectedProduct && (
        <>
          <button onClick={exportCsv} style={secondaryButtonStyle}>Preisvergleich CSV</button>
          <button onClick={exportPdf} style={buttonStyle}>Preisvergleich PDF</button>
        </>
      )}

      {!selectedProduct && <p style={mutedTextStyle}>Bitte Produkt auswaehlen.</p>}
      {selectedProduct && safePrices.length === 0 && <p style={mutedTextStyle}>Noch keine Preise fuer dieses Produkt erfasst.</p>}

      {selectedProduct && safePrices.length > 0 && (
        <div style={tableWrapStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Lieferant</th>
                <th style={thStyle}>Netto</th>
                <th style={thStyle}>Brutto</th>
                <th style={thStyle}>Einheitspreis</th>
                <th style={thStyle}>Gueltigkeit</th>
                <th style={thStyle}>Angebot</th>
                <th style={thStyle}>Aktion</th>
              </tr>
            </thead>
            <tbody>
              {safePrices.map((price) => {
                const isBest = bestPrice?.id === price.id

                return (
                  <tr key={price.id} style={isBest ? bestRowStyle : null}>
                    <td style={tdStyle}>
                      <strong>{price.supplier?.name || '-'}</strong>
                      {isBest && <span style={bestBadgeStyle}>Bestpreis</span>}
                    </td>
                    <td style={tdStyle}>{formatMoney(price.price_net, price.currency)}</td>
                    <td style={tdStyle}>{formatMoney(price.price_gross, price.currency)}</td>
                    <td style={tdStyle}>{formatMoney(price.unit_price, price.currency)}</td>
                    <td style={tdStyle}>{formatDateRange(price.valid_from, price.valid_until)}</td>
                    <td style={tdStyle}>{price.is_offer ? `Ja${price.offer_note ? ` - ${price.offer_note}` : ''}` : 'Nein'}</td>
                    <td style={tdStyle}>
                      <button onClick={() => editPrice(price)} style={smallButtonStyle}>Bearbeiten</button>
                      <button onClick={() => removePrice(price)} style={smallDangerButtonStyle}>Loeschen</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function PriceHistory({ products, selectedProductId, setSelectedProductId, selectedProduct, history }) {
  const safeProducts = ensureArray(products)
  const safeHistory = ensureArray(history)

  return (
    <div style={cardStyle}>
      <h3 style={headingStyle}>Preis-Historie und Preisentwicklung</h3>
      <select value={selectedProductId} onChange={(event) => setSelectedProductId(event.target.value)} style={inputStyle}>
        <option value="">Produkt auswaehlen</option>
        {safeProducts.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
      </select>

      {!selectedProduct && <p style={mutedTextStyle}>Bitte Produkt auswaehlen.</p>}
      {selectedProduct && safeHistory.length === 0 && <p style={mutedTextStyle}>Noch keine Preis-Historie fuer dieses Produkt.</p>}

      {safeHistory.length > 0 && (
        <div style={tableWrapStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Datum</th>
                <th style={thStyle}>Lieferant</th>
                <th style={thStyle}>Alter Netto</th>
                <th style={thStyle}>Alter Brutto</th>
                <th style={thStyle}>Alter Einheitspreis</th>
                <th style={thStyle}>Angebot</th>
              </tr>
            </thead>
            <tbody>
              {safeHistory.map((entry) => (
                <tr key={entry.id}>
                  <td style={tdStyle}>{formatDateTime(entry.changed_at)}</td>
                  <td style={tdStyle}>{entry.supplier?.name || '-'}</td>
                  <td style={tdStyle}>{formatMoney(entry.old_price_net, entry.old_currency)}</td>
                  <td style={tdStyle}>{formatMoney(entry.old_price_gross, entry.old_currency)}</td>
                  <td style={tdStyle}>{formatMoney(entry.old_unit_price, entry.old_currency)}</td>
                  <td style={tdStyle}>{entry.old_is_offer ? `Ja${entry.old_offer_note ? ` - ${entry.old_offer_note}` : ''}` : 'Nein'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function PurchaseLists({
  listForm,
  setListForm,
  listItemForm,
  setListItemForm,
  lists,
  listItems,
  products,
  suppliers,
  prices,
  events,
  saving,
  saveList,
  saveListItem,
  changeListStatus,
  changeListEvent,
  removeList,
  removeListItem,
  exportListCsv,
  exportListPdf,
}) {
  const safeLists = ensureArray(lists)
  const safeListItems = ensureArray(listItems)
  const safeProducts = ensureArray(products)
  const safeSuppliers = ensureArray(suppliers)
  const safePrices = ensureArray(prices)
  const safeEvents = ensureArray(events)

  return (
    <>
      <TwoColumnLayout
        left={(
          <div style={cardStyle}>
            <h3 style={headingStyle}>Einkaufsliste erstellen</h3>
            <input placeholder="Titel" value={listForm.title} onChange={(event) => setFormValue(setListForm, 'title', event.target.value)} style={inputStyle} />
            <select value={listForm.event_id} onChange={(event) => setFormValue(setListForm, 'event_id', event.target.value)} style={inputStyle}>
              <option value="">Kein Event</option>
              {safeEvents.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name} {event.event_date ? `(${event.event_date})` : ''}
                </option>
              ))}
            </select>
            <select value={listForm.status} onChange={(event) => setFormValue(setListForm, 'status', event.target.value)} style={inputStyle}>
              <option value="draft">Entwurf</option>
              <option value="open">Offen</option>
              <option value="completed">Erledigt</option>
              <option value="cancelled">Abgebrochen</option>
            </select>
            <textarea placeholder="Notiz" value={listForm.note} onChange={(event) => setFormValue(setListForm, 'note', event.target.value)} style={textareaStyle} />
            <button onClick={saveList} disabled={saving} style={buttonStyle}>Liste anlegen</button>
          </div>
        )}
        right={(
          <div style={cardStyle}>
            <h3 style={headingStyle}>Position hinzufuegen</h3>
            <select value={listItemForm.list_id} onChange={(event) => setFormValue(setListItemForm, 'list_id', event.target.value)} style={inputStyle}>
              <option value="">Liste auswaehlen</option>
              {safeLists.map((list) => <option key={list.id} value={list.id}>{list.title}</option>)}
            </select>
            <select value={listItemForm.product_id} onChange={(event) => setFormValue(setListItemForm, 'product_id', event.target.value)} style={inputStyle}>
              <option value="">Produkt auswaehlen</option>
              {safeProducts.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
            </select>
            <input type="number" min="0.001" step="0.001" placeholder="Menge" value={listItemForm.quantity} onChange={(event) => setFormValue(setListItemForm, 'quantity', event.target.value)} style={inputStyle} />
            <select value={listItemForm.preferred_supplier_id} onChange={(event) => setFormValue(setListItemForm, 'preferred_supplier_id', event.target.value)} style={inputStyle}>
              <option value="">Bestpreis verwenden</option>
              {safeSuppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
            </select>
            <textarea placeholder="Notiz" value={listItemForm.note} onChange={(event) => setFormValue(setListItemForm, 'note', event.target.value)} style={textareaStyle} />
            <button onClick={saveListItem} disabled={saving} style={buttonStyle}>Position speichern</button>
          </div>
        )}
      />

      {safeLists.length === 0 && <p style={mutedTextStyle}>Noch keine Einkaufsliste angelegt.</p>}

      {safeLists.map((list) => {
        const items = safeListItems.filter((item) => item?.list_id === list?.id)
        const totals = getListTotals(items, safePrices)

        return (
          <div key={list.id} style={cardStyle}>
            <strong>{list.title}</strong>
            <br />
            Event: {list.event?.name || '-'}
            <br />
            Status: {getListStatusLabel(list.status)} - Positionen: {items.length}
            <br />
            Gesamtkosten netto: {formatMoney(totals.net, 'EUR')} - brutto: {formatMoney(totals.gross, 'EUR')}
            <br />
            Notiz: {list.note || '-'}
            <br />
            <select value={list.status} onChange={(event) => changeListStatus(list, event.target.value)} style={{ ...inputStyle, maxWidth: 260 }}>
              <option value="draft">Entwurf</option>
              <option value="open">Offen</option>
              <option value="completed">Erledigt</option>
              <option value="cancelled">Abgebrochen</option>
            </select>
            <select value={list.event_id || ''} onChange={(event) => changeListEvent(list, event.target.value)} style={{ ...inputStyle, maxWidth: 360 }}>
              <option value="">Kein Event</option>
              {safeEvents.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name} {event.event_date ? `(${event.event_date})` : ''}
                </option>
              ))}
            </select>
            <button onClick={() => exportListCsv(list)} style={secondaryButtonStyle}>Liste CSV</button>
            <button onClick={() => exportListPdf(list)} style={buttonStyle}>Liste PDF</button>

            {items.length === 0 && <p style={mutedTextStyle}>Keine Positionen.</p>}
            {items.map((item) => {
              const price = getPreferredOrBestPrice(safePrices, item?.product_id, item?.preferred_supplier_id)
              const bestPrice = getSortedProductPrices(safePrices, item?.product_id)[0]
              const supplierName = item.preferred_supplier?.name || price?.supplier?.name || 'Bestpreis offen'

              return (
                <div key={item.id} style={listItemStyle}>
                  <strong>{item.product?.name || '-'}</strong>
                  <br />
                  Menge: {item.quantity} - Lieferant: {supplierName} {bestPrice?.id === price?.id ? '(Bestpreis)' : ''}
                  <br />
                  Netto: {formatMoney(price?.price_net, price?.currency || 'EUR')} - Brutto: {formatMoney(price?.price_gross, price?.currency || 'EUR')} - Einheit: {formatMoney(price?.unit_price, price?.currency || 'EUR')}
                  <br />
                  Notiz: {item.note || '-'}
                  <br />
                  <button onClick={() => removeListItem(item)} style={smallDangerButtonStyle}>Position loeschen</button>
                </div>
              )
            })}

            <button onClick={() => removeList(list)} style={dangerButtonStyle}>Liste loeschen</button>
          </div>
        )
      })}
    </>
  )
}

function ExportsPanel({
  lists,
  selectedProduct,
  selectedProductPrices,
  exportSelectedComparisonCsv,
  exportSelectedComparisonPdf,
  exportListCsv,
  exportListPdf,
}) {
  const safeLists = ensureArray(lists)

  return (
    <div style={cardStyle}>
      <h3 style={headingStyle}>Exporte</h3>
      <p style={mutedTextStyle}>
        Preisvergleiche und Einkaufslisten werden clientseitig als PDF oder CSV erzeugt.
      </p>

      <h4>Aktueller Preisvergleich</h4>
      <p>
        Produkt: <strong>{selectedProduct?.name || '-'}</strong> - Preise: {selectedProductPrices.length}
      </p>
      <button onClick={exportSelectedComparisonCsv} style={secondaryButtonStyle}>Preisvergleich CSV</button>
      <button onClick={exportSelectedComparisonPdf} style={buttonStyle}>Preisvergleich PDF</button>

      <h4>Einkaufslisten</h4>
      {safeLists.length === 0 && <p style={mutedTextStyle}>Keine Einkaufslisten vorhanden.</p>}
      {safeLists.map((list) => (
        <div key={list.id} style={listItemStyle}>
          <strong>{list.title}</strong>
          <br />
          Event: {list.event?.name || '-'} - Status: {getListStatusLabel(list.status)}
          <br />
          <button onClick={() => exportListCsv(list)} style={secondaryButtonStyle}>CSV</button>
          <button onClick={() => exportListPdf(list)} style={buttonStyle}>PDF</button>
        </div>
      ))}
    </div>
  )
}

function TwoColumnLayout({ left, right }) {
  return (
    <div style={twoColumnStyle}>
      <div>{left}</div>
      <div>{right}</div>
    </div>
  )
}

function Checkbox({ checked, onChange, label }) {
  return (
    <label style={checkboxLabelStyle}>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      {label}
    </label>
  )
}

function PurchaseDebugHeader() {
  return (
    <div style={debugHeaderStyle}>
      <strong>Einkauf & Preisvergleich geladen</strong>
      <br />
      Interner Bereich fuer manuelle Lieferanten, Produkte, Preise und Einkaufslisten.
    </div>
  )
}

function setFormValue(setForm, key, value) {
  setForm((current) => ({ ...current, [key]: value }))
}

function ensureArray(value) {
  return Array.isArray(value) ? value : []
}

function getSafePurchaseAccess(canManagePurchase) {
  try {
    if (typeof canManagePurchase === 'function') {
      return Boolean(canManagePurchase())
    }

    return Boolean(canManagePurchase)
  } catch (error) {
    console.warn('Purchase permission check failed', error)
    return false
  }
}

function normalizeText(value) {
  const trimmed = String(value || '').trim()
  return trimmed || null
}

function normalizeNumber(value) {
  if (value === '' || value === null || value === undefined) return null
  const normalized = Number(String(value).replace(',', '.'))
  return Number.isFinite(normalized) ? normalized : null
}

function normalizeInteger(value) {
  const normalized = normalizeNumber(value)
  return normalized === null ? null : Math.round(normalized)
}

function getComparablePrice(price) {
  if (!price) return null
  return price.unit_price ?? price.price_gross ?? price.price_net ?? null
}

function getComparablePriceFromHistory(entry) {
  if (!entry) return null
  return entry.old_unit_price ?? entry.old_price_gross ?? entry.old_price_net ?? null
}

function getSortedProductPrices(prices, productId) {
  if (!productId) return []
  return ensureArray(prices)
    .filter((price) => price?.product_id === productId)
    .sort((a, b) => {
      const aPrice = Number(getComparablePrice(a) ?? Number.MAX_SAFE_INTEGER)
      const bPrice = Number(getComparablePrice(b) ?? Number.MAX_SAFE_INTEGER)
      return aPrice - bPrice
    })
}

function getPreferredOrBestPrice(prices, productId, preferredSupplierId) {
  const productPrices = getSortedProductPrices(prices, productId)
  if (preferredSupplierId) {
    return productPrices.find((price) => price.supplier_id === preferredSupplierId) || productPrices[0]
  }

  return productPrices[0]
}

function getListTotals(items, prices) {
  return ensureArray(items).reduce((totals, item) => {
    const price = getPreferredOrBestPrice(prices, item?.product_id, item?.preferred_supplier_id)
    const quantity = Number(item?.quantity || 0)

    return {
      net: totals.net + quantity * Number(price?.price_net || 0),
      gross: totals.gross + quantity * Number(price?.price_gross ?? price?.unit_price ?? price?.price_net ?? 0),
    }
  }, { net: 0, gross: 0 })
}

function getComparisonTotals(prices) {
  return ensureArray(prices).reduce((totals, price) => ({
    net: totals.net + Number(price?.price_net || 0),
    gross: totals.gross + Number(price?.price_gross ?? price?.unit_price ?? price?.price_net ?? 0),
  }), { net: 0, gross: 0 })
}

function getLastPriceChangesByProduct(history) {
  return ensureArray(history).reduce((changes, entry) => {
    if (entry?.product_id && !changes[entry.product_id]) {
      changes[entry.product_id] = entry
    }

    return changes
  }, {})
}

function formatMoney(value, currency = 'EUR') {
  if (value === null || value === undefined || value === '') return '-'
  return `${Number(value || 0).toFixed(2)} ${currency || 'EUR'}`
}

function formatDateTime(value) {
  if (!value) return '-'
  return new Date(value).toLocaleString('de-AT')
}

function formatDateRange(from, until) {
  if (!from && !until) return '-'
  return `${from || 'offen'} bis ${until || 'offen'}`
}

function formatSearchOfferRange(from, until) {
  if (!from && !until) return '-'
  if (from && until) return `${from} bis ${until}`
  return from || until || '-'
}

function buildComparisonRows(product, prices, bestPrice) {
  const safePrices = ensureArray(prices)
  const rows = safePrices.map((price) => ({
    Produkt: product?.name || '-',
    Menge: '1',
    Lieferant: price.supplier?.name || '-',
    Netto: formatMoney(price.price_net, price.currency),
    Brutto: formatMoney(price.price_gross, price.currency),
    Einheitspreis: formatMoney(price.unit_price, price.currency),
    Bestpreis: bestPrice?.id === price.id ? 'Ja' : 'Nein',
  }))
  const totals = getComparisonTotals(safePrices)

  return [
    ...rows,
    {
      Produkt: 'GESAMT',
      Menge: '',
      Lieferant: '',
      Netto: formatMoney(totals.net, 'EUR'),
      Brutto: formatMoney(totals.gross, 'EUR'),
      Einheitspreis: '',
      Bestpreis: '',
    },
  ]
}

function buildListRows(list, items, prices) {
  const safeItems = ensureArray(items)
  const safePrices = ensureArray(prices)
  const rows = safeItems.map((item) => {
    const price = getPreferredOrBestPrice(safePrices, item?.product_id, item?.preferred_supplier_id)
    const bestPrice = getSortedProductPrices(safePrices, item?.product_id)[0]

    return {
      Einkaufsliste: list.title || '-',
      Event: list.event?.name || '-',
      Produkt: item.product?.name || '-',
      Menge: item.quantity || 0,
      Lieferant: item.preferred_supplier?.name || price?.supplier?.name || '-',
      Netto: formatMoney(price?.price_net, price?.currency || 'EUR'),
      Brutto: formatMoney(price?.price_gross, price?.currency || 'EUR'),
      Einheitspreis: formatMoney(price?.unit_price, price?.currency || 'EUR'),
      Bestpreis: bestPrice?.id === price?.id ? 'Ja' : 'Nein',
    }
  })
  const totals = getListTotals(safeItems, safePrices)

  return [
    ...rows,
    {
      Einkaufsliste: list.title || '-',
      Event: list.event?.name || '-',
      Produkt: 'GESAMT',
      Menge: '',
      Lieferant: '',
      Netto: formatMoney(totals.net, 'EUR'),
      Brutto: formatMoney(totals.gross, 'EUR'),
      Einheitspreis: '',
      Bestpreis: '',
    },
  ]
}

function downloadCsv(fileName, rows) {
  const columns = Object.keys(rows[0] || { Hinweis: 'Keine Daten' })
  const bodyRows = rows.length > 0 ? rows : [{ Hinweis: 'Keine Daten' }]
  const csv = [
    columns.join(';'),
    ...bodyRows.map((row) => columns.map((column) => escapeCsvValue(row[column])).join(';')),
  ].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = sanitizeFileName(fileName)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function escapeCsvValue(value) {
  const text = String(value ?? '')
  return `"${text.replace(/"/g, '""')}"`
}

function sanitizeFileName(value) {
  return String(value || 'export')
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function getListStatusLabel(status) {
  if (status === 'draft') return 'Entwurf'
  if (status === 'open') return 'Offen'
  if (status === 'completed') return 'Erledigt'
  if (status === 'cancelled') return 'Abgebrochen'
  return status || '-'
}

const tabsStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 8,
  marginBottom: 12,
}

const purchaseSectionStyle = {
  ...sectionStyle,
  background: colors.offWhite,
  color: colors.text,
  minHeight: 240,
  opacity: 1,
  overflow: 'visible',
}

const debugHeaderStyle = {
  ...cardStyle,
  borderLeft: `6px solid ${colors.red}`,
  background: colors.white,
  color: colors.text,
  fontSize: isMobile ? 17 : 16,
}

const infoBoxStyle = {
  ...cardStyle,
  borderLeft: `6px solid ${colors.blue}`,
  background: colors.white,
  color: colors.text,
}

function searchResultCardStyle(isBest) {
  return {
    ...cardStyle,
    background: isBest ? colors.successBg : colors.white,
    borderLeft: isBest ? `6px solid ${colors.successText}` : `1px solid ${colors.border}`,
  }
}

const searchLinkStyle = {
  color: colors.blue,
  wordBreak: 'break-all',
}

const statsGridStyle = {
  display: 'grid',
  gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
  gap: 12,
}

const searchResultsGridStyle = {
  display: 'grid',
  gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))',
  gap: 12,
}

const recentSearchPanelStyle = {
  ...cardStyle,
  marginTop: 12,
}

const recentSearchRowStyle = {
  ...cardStyle,
  marginBottom: 8,
  background: colors.offWhite,
}

const statNumberStyle = {
  fontSize: 28,
  fontWeight: 900,
  color: colors.black,
}

const twoColumnStyle = {
  display: 'grid',
  gridTemplateColumns: isMobile ? '1fr' : 'minmax(280px, 420px) 1fr',
  gap: 16,
  alignItems: 'start',
}

const formGridStyle = {
  display: 'grid',
  gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
  gap: 12,
}

const textareaStyle = {
  ...inputStyle,
  minHeight: 84,
  resize: 'vertical',
}

const checkboxLabelStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  margin: '8px 0 12px',
  fontWeight: 800,
}

const tableWrapStyle = {
  overflowX: 'auto',
  width: '100%',
}

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  minWidth: 760,
}

const thStyle = {
  textAlign: 'left',
  borderBottom: `2px solid ${colors.border}`,
  padding: 10,
}

const tdStyle = {
  borderBottom: `1px solid ${colors.border}`,
  padding: 10,
  verticalAlign: 'top',
}

const bestRowStyle = {
  background: colors.successBg,
}

const bestBadgeStyle = {
  display: 'inline-block',
  marginLeft: 8,
  padding: '2px 8px',
  borderRadius: 999,
  background: colors.successText,
  color: colors.white,
  fontSize: 12,
  fontWeight: 900,
}

const errorBoxStyle = {
  ...cardStyle,
  borderLeft: `6px solid ${colors.red}`,
  background: colors.dangerBg,
  color: colors.dangerText,
}

const smallButtonStyle = {
  ...secondaryButtonStyle,
  padding: '8px 10px',
  fontSize: 13,
}

const dangerButtonStyle = {
  ...secondaryButtonStyle,
  borderColor: colors.red,
  color: colors.red,
}

const smallDangerButtonStyle = {
  ...dangerButtonStyle,
  padding: '8px 10px',
  fontSize: 13,
}

const listItemStyle = {
  borderTop: `1px solid ${colors.border}`,
  marginTop: 10,
  paddingTop: 10,
}
