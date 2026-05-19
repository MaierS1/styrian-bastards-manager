import {
  buttonStyle,
  cardStyle,
  colors,
  headingStyle,
  inputStyle,
  mutedTextStyle,
  secondaryButtonStyle,
  sectionStyle,
} from '../../styles/appStyles'

export function MerchPage({
  merchItems,
  merchVariants,
  canManageMerch,
  merchItemEditingId,
  merchItemNumber,
  setMerchItemNumber,
  merchItemName,
  setMerchItemName,
  merchItemCategory,
  setMerchItemCategory,
  merchItemImagePath,
  setMerchItemImagePath,
  merchItemStatus,
  setMerchItemStatus,
  merchItemBasePrice,
  setMerchItemBasePrice,
  merchItemTaxRate,
  setMerchItemTaxRate,
  merchItemSkuPrefix,
  setMerchItemSkuPrefix,
  merchItemDescription,
  setMerchItemDescription,
  saveMerchItem,
  resetMerchItemForm,
  editMerchItem,
  deleteMerchItem,
  merchVariantEditingId,
  merchVariantItemId,
  setMerchVariantItemId,
  merchVariantSku,
  setMerchVariantSku,
  merchVariantName,
  setMerchVariantName,
  merchVariantSize,
  setMerchVariantSize,
  merchVariantColor,
  setMerchVariantColor,
  merchVariantPrice,
  setMerchVariantPrice,
  merchVariantStock,
  setMerchVariantStock,
  merchVariantReorderLevel,
  setMerchVariantReorderLevel,
  merchVariantStatus,
  setMerchVariantStatus,
  saveMerchVariant,
  resetMerchVariantForm,
  editMerchVariant,
  deleteMerchVariant,
}) {
  return (
    <section style={sectionStyle}>
      <h2 style={headingStyle}>Fanartikel</h2>

      {canManageMerch() && (
        <>
          <h3 style={headingStyle}>{merchItemEditingId ? 'Fanartikel bearbeiten' : 'Fanartikel anlegen'}</h3>

          <input
            placeholder="Artikelnummer"
            value={merchItemNumber}
            onChange={(event) => setMerchItemNumber(event.target.value)}
            style={inputStyle}
          />

          <input
            placeholder="Name"
            value={merchItemName}
            onChange={(event) => setMerchItemName(event.target.value)}
            style={inputStyle}
          />

          <input
            placeholder="Kategorie"
            value={merchItemCategory}
            onChange={(event) => setMerchItemCategory(event.target.value)}
            style={inputStyle}
          />

          <input
            placeholder="Bild-Pfad"
            value={merchItemImagePath}
            onChange={(event) => setMerchItemImagePath(event.target.value)}
            style={inputStyle}
          />

          <select value={merchItemStatus} onChange={(event) => setMerchItemStatus(event.target.value)} style={inputStyle}>
            <option value="active">Aktiv</option>
            <option value="inactive">Inaktiv</option>
            <option value="archived">Archiviert</option>
          </select>

          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="Basispreis in EUR"
            value={merchItemBasePrice}
            onChange={(event) => setMerchItemBasePrice(event.target.value)}
            style={inputStyle}
          />

          <input
            type="number"
            min="0"
            max="100"
            step="0.01"
            placeholder="Steuersatz"
            value={merchItemTaxRate}
            onChange={(event) => setMerchItemTaxRate(event.target.value)}
            style={inputStyle}
          />

          <input
            placeholder="SKU-Prefix"
            value={merchItemSkuPrefix}
            onChange={(event) => setMerchItemSkuPrefix(event.target.value)}
            style={inputStyle}
          />

          <input
            placeholder="Beschreibung"
            value={merchItemDescription}
            onChange={(event) => setMerchItemDescription(event.target.value)}
            style={inputStyle}
          />

          <button onClick={saveMerchItem} style={buttonStyle}>
            {merchItemEditingId ? 'Fanartikel speichern' : 'Fanartikel anlegen'}
          </button>

          {merchItemEditingId && (
            <button onClick={resetMerchItemForm} style={secondaryButtonStyle}>
              Bearbeiten abbrechen
            </button>
          )}

          <h3 style={headingStyle}>{merchVariantEditingId ? 'Variante bearbeiten' : 'Variante anlegen'}</h3>

          <select value={merchVariantItemId} onChange={(event) => setMerchVariantItemId(event.target.value)} style={inputStyle}>
            <option value="">Fanartikel auswahlen</option>
            {merchItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.item_number ? `${item.item_number} - ${item.name}` : item.name}
              </option>
            ))}
          </select>

          <input
            placeholder="SKU"
            value={merchVariantSku}
            onChange={(event) => setMerchVariantSku(event.target.value)}
            style={inputStyle}
          />

          <input
            placeholder="Variantenname"
            value={merchVariantName}
            onChange={(event) => setMerchVariantName(event.target.value)}
            style={inputStyle}
          />

          <input
            placeholder="Groesse"
            value={merchVariantSize}
            onChange={(event) => setMerchVariantSize(event.target.value)}
            style={inputStyle}
          />

          <input
            placeholder="Farbe"
            value={merchVariantColor}
            onChange={(event) => setMerchVariantColor(event.target.value)}
            style={inputStyle}
          />

          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="Variantenpreis in EUR"
            value={merchVariantPrice}
            onChange={(event) => setMerchVariantPrice(event.target.value)}
            style={inputStyle}
          />

          <input
            type="number"
            min="0"
            step="1"
            placeholder="Bestand"
            value={merchVariantStock}
            onChange={(event) => setMerchVariantStock(event.target.value)}
            style={inputStyle}
          />

          <input
            type="number"
            min="0"
            step="1"
            placeholder="Mindestbestand"
            value={merchVariantReorderLevel}
            onChange={(event) => setMerchVariantReorderLevel(event.target.value)}
            style={inputStyle}
          />

          <select value={merchVariantStatus} onChange={(event) => setMerchVariantStatus(event.target.value)} style={inputStyle}>
            <option value="active">Aktiv</option>
            <option value="inactive">Inaktiv</option>
            <option value="sold_out">Ausverkauft</option>
            <option value="archived">Archiviert</option>
          </select>

          <button onClick={saveMerchVariant} style={buttonStyle}>
            {merchVariantEditingId ? 'Variante speichern' : 'Variante anlegen'}
          </button>

          {merchVariantEditingId && (
            <button onClick={resetMerchVariantForm} style={secondaryButtonStyle}>
              Bearbeiten abbrechen
            </button>
          )}
        </>
      )}

      <p>
        Fanartikel: <strong>{merchItems.length}</strong>
        <br />
        Varianten: <strong>{merchVariants.length}</strong>
      </p>

      {merchItems.length === 0 && <p style={mutedTextStyle}>Noch keine Fanartikel angelegt.</p>}

      {merchItems.map((item) => (
        <MerchItemCard
          key={item.id}
          item={item}
          variants={merchVariants.filter((variant) => variant.merch_item_id === item.id)}
          canManageMerch={canManageMerch}
          editMerchItem={editMerchItem}
          deleteMerchItem={deleteMerchItem}
          editMerchVariant={editMerchVariant}
          deleteMerchVariant={deleteMerchVariant}
        />
      ))}
    </section>
  )
}

function MerchItemCard({
  item,
  variants,
  canManageMerch,
  editMerchItem,
  deleteMerchItem,
  editMerchVariant,
  deleteMerchVariant,
}) {
  return (
    <div
      style={{
        ...cardStyle,
        borderLeft: `6px solid ${item.status === 'active' ? colors.blue : colors.muted}`,
        opacity: item.status === 'archived' ? 0.72 : 1,
      }}
    >
      <strong>{item.item_number ? `${item.item_number} - ${item.name}` : item.name}</strong>
      <br />
      Kategorie: {item.category || '-'} - Status: {getItemStatusLabel(item.status)}
      <br />
      Basispreis: {formatAmount(item.base_price_cents)} - Steuer: {Number(item.tax_rate || 0).toFixed(2)} %
      <br />
      SKU-Prefix: {item.sku_prefix || '-'} - Bild: {item.image_path || '-'}
      <br />
      Beschreibung: {item.description || '-'}

      <MerchVariantsList
        variants={variants}
        canManageMerch={canManageMerch}
        editMerchVariant={editMerchVariant}
        deleteMerchVariant={deleteMerchVariant}
      />

      {canManageMerch() && (
        <>
          <br />
          <button onClick={() => editMerchItem(item)} style={buttonStyle}>
            Bearbeiten
          </button>
          <button
            onClick={() => deleteMerchItem(item)}
            style={{ ...secondaryButtonStyle, borderColor: '#7f1d1d', color: '#7f1d1d' }}
          >
            Fanartikel loschen
          </button>
        </>
      )}
    </div>
  )
}

function MerchVariantsList({
  variants,
  canManageMerch,
  editMerchVariant,
  deleteMerchVariant,
}) {
  if (variants.length === 0) {
    return (
      <>
        <br />
        <span style={mutedTextStyle}>Keine Varianten hinterlegt.</span>
      </>
    )
  }

  return (
    <div style={{ marginTop: 12 }}>
      <strong>Varianten</strong>
      {variants.map((variant) => {
        const lowStock = variant.stock_quantity <= variant.reorder_level

        return (
          <div
            key={variant.id}
            style={{
              borderTop: `1px solid ${colors.border}`,
              marginTop: 10,
              paddingTop: 10,
            }}
          >
            <strong>{variant.variant_name || variant.sku || 'Variante'}</strong>
            <br />
            SKU: {variant.sku || '-'} - Groesse: {variant.size || '-'} - Farbe: {variant.color || '-'}
            <br />
            Preis: {variant.price_cents === null ? 'Artikelpreis' : formatAmount(variant.price_cents)}
            <br />
            Bestand:{' '}
            <strong style={{ color: lowStock ? colors.red : colors.text }}>
              {variant.stock_quantity}
            </strong>{' '}
            - Mindestbestand: {variant.reorder_level}
            <br />
            Status: {getVariantStatusLabel(variant.status)}

            {canManageMerch() && (
              <>
                <br />
                <button onClick={() => editMerchVariant(variant)} style={buttonStyle}>
                  Variante bearbeiten
                </button>
                <button
                  onClick={() => deleteMerchVariant(variant)}
                  style={{ ...secondaryButtonStyle, borderColor: '#7f1d1d', color: '#7f1d1d' }}
                >
                  Variante loschen
                </button>
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}

function getItemStatusLabel(status) {
  if (status === 'active') return 'Aktiv'
  if (status === 'inactive') return 'Inaktiv'
  if (status === 'archived') return 'Archiviert'
  return status || '-'
}

function getVariantStatusLabel(status) {
  if (status === 'active') return 'Aktiv'
  if (status === 'inactive') return 'Inaktiv'
  if (status === 'sold_out') return 'Ausverkauft'
  if (status === 'archived') return 'Archiviert'
  return status || '-'
}

function formatAmount(amountCents) {
  return `${(Number(amountCents || 0) / 100).toFixed(2)} EUR`
}
