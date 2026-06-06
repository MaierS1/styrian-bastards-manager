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
  createPurchaseList,
  createPurchaseListItem,
  deletePurchaseList,
  deletePurchaseListItem,
  deletePurchasePrice,
  deletePurchaseProduct,
  deleteSupplier,
  fetchPurchaseData,
  updatePurchaseList,
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

export function PurchasePage({ canManagePurchase }) {
  const [suppliers, setSuppliers] = useState([])
  const [products, setProducts] = useState([])
  const [prices, setPrices] = useState([])
  const [lists, setLists] = useState([])
  const [listItems, setListItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedProductId, setSelectedProductId] = useState('')
  const [activeTab, setActiveTab] = useState('dashboard')
  const [supplierEditingId, setSupplierEditingId] = useState(null)
  const [productEditingId, setProductEditingId] = useState(null)
  const [priceEditingId, setPriceEditingId] = useState(null)
  const [supplierForm, setSupplierForm] = useState(emptySupplierForm)
  const [productForm, setProductForm] = useState(emptyProductForm)
  const [priceForm, setPriceForm] = useState(emptyPriceForm)
  const [listForm, setListForm] = useState(emptyListForm)
  const [listItemForm, setListItemForm] = useState(emptyListItemForm)

  const loadData = async () => {
    setLoading(true)
    const result = await fetchPurchaseData()
    const firstError = [
      result.suppliersResult.error,
      result.productsResult.error,
      result.pricesResult.error,
      result.listsResult.error,
      result.listItemsResult.error,
    ].find(Boolean)

    if (firstError) {
      alert(firstError.message)
      setLoading(false)
      return
    }

    setSuppliers(result.suppliersResult.data || [])
    setProducts(result.productsResult.data || [])
    setPrices(result.pricesResult.data || [])
    setLists(result.listsResult.data || [])
    setListItems(result.listItemsResult.data || [])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (!selectedProductId && products.length > 0) {
      setSelectedProductId(products[0].id)
    }
  }, [products, selectedProductId])

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return products

    return products.filter((product) => [
      product.name,
      product.category,
      product.brand,
      product.unit,
      product.note,
    ].some((value) => String(value || '').toLowerCase().includes(term)))
  }, [products, search])

  const selectedProduct = products.find((product) => product.id === selectedProductId)
  const selectedProductPrices = getSortedProductPrices(prices, selectedProductId)
  const bestPrice = selectedProductPrices[0]
  const activeSuppliers = suppliers.filter((supplier) => supplier.is_active)
  const activeProducts = products.filter((product) => product.is_active)
  const openLists = lists.filter((list) => ['draft', 'open'].includes(list.status))

  const dashboardStats = [
    ['Produkte', products.length],
    ['Aktive Lieferanten', activeSuppliers.length],
    ['Preise', prices.length],
    ['Offene Listen', openLists.length],
  ]

  const saveSupplier = async () => {
    if (!canManagePurchase()) return alert('Keine Berechtigung fuer Einkauf.')
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
    if (!canManagePurchase()) return alert('Keine Berechtigung fuer Einkauf.')
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
    if (!canManagePurchase()) return alert('Keine Berechtigung fuer Einkauf.')
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

  const saveList = async () => {
    if (!canManagePurchase()) return alert('Keine Berechtigung fuer Einkauf.')
    if (!listForm.title.trim()) return alert('Listentitel ist Pflicht.')

    setSaving(true)
    const { data, error } = await createPurchaseList({
      title: listForm.title.trim(),
      status: listForm.status,
      note: normalizeText(listForm.note),
    })
    setSaving(false)

    if (error) return alert(error.message)
    setListForm(emptyListForm)
    setListItemForm((current) => ({ ...current, list_id: data?.id || current.list_id }))
    await loadData()
  }

  const saveListItem = async () => {
    if (!canManagePurchase()) return alert('Keine Berechtigung fuer Einkauf.')
    if (!listItemForm.list_id || !listItemForm.product_id) return alert('Liste und Produkt sind Pflicht.')

    setSaving(true)
    const { error } = await createPurchaseListItem({
      list_id: listItemForm.list_id,
      product_id: listItemForm.product_id,
      quantity: normalizeNumber(listItemForm.quantity) || 1,
      preferred_supplier_id: normalizeText(listItemForm.preferred_supplier_id),
      note: normalizeText(listItemForm.note),
    })
    setSaving(false)

    if (error) return alert(error.message)
    setListItemForm((current) => ({
      ...emptyListItemForm,
      list_id: current.list_id,
    }))
    await loadData()
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

  const removeSupplier = async (supplier) => {
    if (!canManagePurchase()) return alert('Keine Berechtigung fuer Einkauf.')
    if (!window.confirm(`Lieferant wirklich loeschen?\n\n${supplier.name}`)) return

    const { error } = await deleteSupplier(supplier.id)
    if (error) return alert(error.message)
    await loadData()
  }

  const removeProduct = async (product) => {
    if (!canManagePurchase()) return alert('Keine Berechtigung fuer Einkauf.')
    if (!window.confirm(`Produkt wirklich loeschen?\n\n${product.name}`)) return

    const { error } = await deletePurchaseProduct(product.id)
    if (error) return alert(error.message)
    await loadData()
  }

  const removePrice = async (price) => {
    if (!canManagePurchase()) return alert('Keine Berechtigung fuer Einkauf.')
    if (!window.confirm('Preis wirklich loeschen?')) return

    const { error } = await deletePurchasePrice(price.id)
    if (error) return alert(error.message)
    await loadData()
  }

  const changeListStatus = async (list, status) => {
    if (!canManagePurchase()) return alert('Keine Berechtigung fuer Einkauf.')

    const { error } = await updatePurchaseList({ id: list.id, payload: { status } })
    if (error) return alert(error.message)
    await loadData()
  }

  const removeList = async (list) => {
    if (!canManagePurchase()) return alert('Keine Berechtigung fuer Einkauf.')
    if (!window.confirm(`Einkaufsliste wirklich loeschen?\n\n${list.title}`)) return

    const { error } = await deletePurchaseList(list.id)
    if (error) return alert(error.message)
    await loadData()
  }

  const removeListItem = async (item) => {
    if (!canManagePurchase()) return alert('Keine Berechtigung fuer Einkauf.')

    const { error } = await deletePurchaseListItem(item.id)
    if (error) return alert(error.message)
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

  if (!canManagePurchase()) {
    return (
      <section style={sectionStyle}>
        <h2 style={headingStyle}>Einkauf & Preisvergleich</h2>
        <p>Fuer diesen Bereich hast du keine Berechtigung.</p>
      </section>
    )
  }

  return (
    <section style={sectionStyle}>
      <h2 style={headingStyle}>Einkauf & Preisvergleich</h2>

      <div style={tabsStyle}>
        {[
          ['dashboard', 'Uebersicht'],
          ['products', 'Produkte'],
          ['suppliers', 'Lieferanten'],
          ['prices', 'Preise'],
          ['lists', 'Einkaufslisten'],
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

      {!loading && (
        <>
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
              />
            </>
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
                  prices={prices}
                  editProduct={editProduct}
                  removeProduct={removeProduct}
                  setSelectedProductId={setSelectedProductId}
                  setActiveTab={setActiveTab}
                />
              )}
            />
          )}

          {activeTab === 'suppliers' && (
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
                  suppliers={suppliers}
                  prices={prices}
                  editSupplier={editSupplier}
                  removeSupplier={removeSupplier}
                />
              )}
            />
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
              />
            </>
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
              prices={prices}
              saving={saving}
              saveList={saveList}
              saveListItem={saveListItem}
              changeListStatus={changeListStatus}
              removeList={removeList}
              removeListItem={removeListItem}
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
  return (
    <div style={cardStyle}>
      <h3 style={headingStyle}>{editingId ? 'Preis bearbeiten' : 'Preis pro Produkt erfassen'}</h3>
      <div style={formGridStyle}>
        <select value={form.product_id} onChange={(event) => setFormValue(setForm, 'product_id', event.target.value)} style={inputStyle}>
          <option value="">Produkt auswaehlen</option>
          {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
        </select>
        <select value={form.supplier_id} onChange={(event) => setFormValue(setForm, 'supplier_id', event.target.value)} style={inputStyle}>
          <option value="">Lieferant auswaehlen</option>
          {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
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

function ProductsList({ products, prices, editProduct, removeProduct, setSelectedProductId, setActiveTab }) {
  if (products.length === 0) return <p style={mutedTextStyle}>Keine Produkte gefunden.</p>

  return (
    <div>
      <h3 style={headingStyle}>Produktverwaltung</h3>
      {products.map((product) => {
        const productPrices = prices.filter((price) => price.product_id === product.id)
        const bestPrice = getSortedProductPrices(prices, product.id)[0]

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
            Notiz: {product.note || '-'}
            <br />
            <button onClick={() => editProduct(product)} style={buttonStyle}>Bearbeiten</button>
            <button onClick={() => { setSelectedProductId(product.id); setActiveTab('prices') }} style={secondaryButtonStyle}>Preisvergleich</button>
            <button onClick={() => removeProduct(product)} style={dangerButtonStyle}>Loeschen</button>
          </div>
        )
      })}
    </div>
  )
}

function SuppliersList({ suppliers, prices, editSupplier, removeSupplier }) {
  if (suppliers.length === 0) return <p style={mutedTextStyle}>Noch keine Lieferanten angelegt.</p>

  return (
    <div>
      <h3 style={headingStyle}>Lieferantenverwaltung</h3>
      {suppliers.map((supplier) => (
        <div key={supplier.id} style={{ ...cardStyle, opacity: supplier.is_active ? 1 : 0.68 }}>
          <strong>{supplier.name}</strong>
          <br />
          Website: {supplier.website || '-'}
          <br />
          Status: {supplier.is_active ? 'Aktiv' : 'Inaktiv'} - Preise: {prices.filter((price) => price.supplier_id === supplier.id).length}
          <br />
          Notiz: {supplier.note || '-'}
          <br />
          <button onClick={() => editSupplier(supplier)} style={buttonStyle}>Bearbeiten</button>
          <button onClick={() => removeSupplier(supplier)} style={dangerButtonStyle}>Loeschen</button>
        </div>
      ))}
    </div>
  )
}

function ProductComparison({ products, selectedProductId, setSelectedProductId, selectedProduct, prices, bestPrice, editPrice, removePrice }) {
  return (
    <div style={cardStyle}>
      <h3 style={headingStyle}>Preisvergleich pro Produkt</h3>
      <select value={selectedProductId} onChange={(event) => setSelectedProductId(event.target.value)} style={inputStyle}>
        <option value="">Produkt auswaehlen</option>
        {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
      </select>

      {!selectedProduct && <p style={mutedTextStyle}>Bitte Produkt auswaehlen.</p>}
      {selectedProduct && prices.length === 0 && <p style={mutedTextStyle}>Noch keine Preise fuer dieses Produkt erfasst.</p>}

      {selectedProduct && prices.length > 0 && (
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
              {prices.map((price) => {
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
  saving,
  saveList,
  saveListItem,
  changeListStatus,
  removeList,
  removeListItem,
}) {
  return (
    <>
      <TwoColumnLayout
        left={(
          <div style={cardStyle}>
            <h3 style={headingStyle}>Einkaufsliste erstellen</h3>
            <input placeholder="Titel" value={listForm.title} onChange={(event) => setFormValue(setListForm, 'title', event.target.value)} style={inputStyle} />
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
              {lists.map((list) => <option key={list.id} value={list.id}>{list.title}</option>)}
            </select>
            <select value={listItemForm.product_id} onChange={(event) => setFormValue(setListItemForm, 'product_id', event.target.value)} style={inputStyle}>
              <option value="">Produkt auswaehlen</option>
              {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
            </select>
            <input type="number" min="0.001" step="0.001" placeholder="Menge" value={listItemForm.quantity} onChange={(event) => setFormValue(setListItemForm, 'quantity', event.target.value)} style={inputStyle} />
            <select value={listItemForm.preferred_supplier_id} onChange={(event) => setFormValue(setListItemForm, 'preferred_supplier_id', event.target.value)} style={inputStyle}>
              <option value="">Bestpreis verwenden</option>
              {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
            </select>
            <textarea placeholder="Notiz" value={listItemForm.note} onChange={(event) => setFormValue(setListItemForm, 'note', event.target.value)} style={textareaStyle} />
            <button onClick={saveListItem} disabled={saving} style={buttonStyle}>Position speichern</button>
          </div>
        )}
      />

      {lists.length === 0 && <p style={mutedTextStyle}>Noch keine Einkaufsliste angelegt.</p>}

      {lists.map((list) => {
        const items = listItems.filter((item) => item.list_id === list.id)
        const total = items.reduce((sum, item) => {
          const price = getPreferredOrBestPrice(prices, item.product_id, item.preferred_supplier_id)
          return sum + Number(item.quantity || 0) * Number(getComparablePrice(price) || 0)
        }, 0)

        return (
          <div key={list.id} style={cardStyle}>
            <strong>{list.title}</strong>
            <br />
            Status: {getListStatusLabel(list.status)} - Positionen: {items.length} - Schaetzung: {formatMoney(total, 'EUR')}
            <br />
            Notiz: {list.note || '-'}
            <br />
            <select value={list.status} onChange={(event) => changeListStatus(list, event.target.value)} style={{ ...inputStyle, maxWidth: 260 }}>
              <option value="draft">Entwurf</option>
              <option value="open">Offen</option>
              <option value="completed">Erledigt</option>
              <option value="cancelled">Abgebrochen</option>
            </select>

            {items.length === 0 && <p style={mutedTextStyle}>Keine Positionen.</p>}
            {items.map((item) => {
              const price = getPreferredOrBestPrice(prices, item.product_id, item.preferred_supplier_id)
              const supplierName = item.preferred_supplier?.name || price?.supplier?.name || 'Bestpreis offen'

              return (
                <div key={item.id} style={listItemStyle}>
                  <strong>{item.product?.name || '-'}</strong>
                  <br />
                  Menge: {item.quantity} - Lieferant: {supplierName} - Einzel: {formatMoney(getComparablePrice(price), price?.currency || 'EUR')}
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

function setFormValue(setForm, key, value) {
  setForm((current) => ({ ...current, [key]: value }))
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

function getComparablePrice(price) {
  if (!price) return null
  return price.unit_price ?? price.price_gross ?? price.price_net ?? null
}

function getSortedProductPrices(prices, productId) {
  if (!productId) return []
  return prices
    .filter((price) => price.product_id === productId)
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

function formatMoney(value, currency = 'EUR') {
  if (value === null || value === undefined || value === '') return '-'
  return `${Number(value || 0).toFixed(2)} ${currency || 'EUR'}`
}

function formatDateRange(from, until) {
  if (!from && !until) return '-'
  return `${from || 'offen'} bis ${until || 'offen'}`
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

const statsGridStyle = {
  display: 'grid',
  gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
  gap: 12,
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
