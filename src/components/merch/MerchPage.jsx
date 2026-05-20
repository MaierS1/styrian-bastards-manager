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
  merchSales,
  merchSaleItems,
  members,
  events,
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
  merchSaleVariantId,
  setMerchSaleVariantId,
  merchSaleQuantity,
  setMerchSaleQuantity,
  merchSaleDiscount,
  setMerchSaleDiscount,
  merchSaleMemberId,
  setMerchSaleMemberId,
  merchSaleBuyerName,
  setMerchSaleBuyerName,
  merchSaleEventId,
  setMerchSaleEventId,
  merchSalePaymentMethod,
  setMerchSalePaymentMethod,
  merchSaleCreateCashEntry,
  setMerchSaleCreateCashEntry,
  saveMerchSale,
  resetMerchSaleForm,
  getMerchSaleUnitPriceCents,
  getMerchSaleTotals,
}) {
  const saleTotals = getMerchSaleTotals()

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

          <h3 style={headingStyle}>Verkauf erfassen</h3>

          <select value={merchSaleVariantId} onChange={(event) => setMerchSaleVariantId(event.target.value)} style={inputStyle}>
            <option value="">Variante auswahlen</option>
            {merchVariants.map((variant) => {
              const item = merchItems.find((merchItem) => merchItem.id === variant.merch_item_id)
              const variantLabel = [variant.variant_name, variant.size, variant.color, variant.sku]
                .filter(Boolean)
                .join(' / ')

              return (
                <option key={variant.id} value={variant.id}>
                  {item?.name || 'Fanartikel'} - {variantLabel || 'Variante'}
                </option>
              )
            })}
          </select>

          <input
            type="number"
            min="1"
            step="1"
            placeholder="Menge"
            value={merchSaleQuantity}
            onChange={(event) => setMerchSaleQuantity(event.target.value)}
            style={inputStyle}
          />

          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="Rabatt in EUR"
            value={merchSaleDiscount}
            onChange={(event) => setMerchSaleDiscount(event.target.value)}
            style={inputStyle}
          />

          <select value={merchSaleMemberId} onChange={(event) => setMerchSaleMemberId(event.target.value)} style={inputStyle}>
            <option value="">Kein Mitglied zuordnen</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {`${member.first_name || ''} ${member.last_name || ''}`.trim() || member.email || member.id}
              </option>
            ))}
          </select>

          <input
            placeholder="Kaufer Freitext"
            value={merchSaleBuyerName}
            onChange={(event) => setMerchSaleBuyerName(event.target.value)}
            style={inputStyle}
          />

          <select value={merchSaleEventId} onChange={(event) => setMerchSaleEventId(event.target.value)} style={inputStyle}>
            <option value="">Kein Event zuordnen</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.name}
              </option>
            ))}
          </select>

          <select value={merchSalePaymentMethod} onChange={(event) => setMerchSalePaymentMethod(event.target.value)} style={inputStyle}>
            <option value="bar">Bar</option>
            <option value="karte">Karte</option>
            <option value="ueberweisung">Ueberweisung</option>
            <option value="ebanking">E-Banking</option>
            <option value="sonstiges">Sonstiges</option>
          </select>

          <label style={{ display: 'block', margin: '10px 0', color: colors.text }}>
            <input
              type="checkbox"
              checked={merchSaleCreateCashEntry}
              onChange={(event) => setMerchSaleCreateCashEntry(event.target.checked)}
              style={{ marginRight: 8 }}
            />
            Kassa-Eintrag erzeugen
          </label>

          <p style={mutedTextStyle}>
            Preis: <strong>{formatAmount(getMerchSaleUnitPriceCents())}</strong>
            <br />
            Zwischensumme: <strong>{formatAmount(saleTotals.subtotalCents)}</strong>
            <br />
            Rabatt: <strong>{formatAmount(saleTotals.discountCents)}</strong>
            <br />
            Gesamt: <strong>{formatAmount(saleTotals.totalCents)}</strong>
          </p>

          <button onClick={saveMerchSale} style={buttonStyle}>
            Verkauf speichern
          </button>

          <button onClick={resetMerchSaleForm} style={secondaryButtonStyle}>
            Verkauf zurucksetzen
          </button>
        </>
      )}

      <p>
        Fanartikel: <strong>{merchItems.length}</strong>
        <br />
        Varianten: <strong>{merchVariants.length}</strong>
        <br />
        Verkaeufe: <strong>{merchSales.length}</strong>
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

      <MerchSalesList
        merchSales={merchSales}
        merchSaleItems={merchSaleItems}
        merchVariants={merchVariants}
        merchItems={merchItems}
        members={members}
        events={events}
      />
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

function MerchSalesList({
  merchSales,
  merchSaleItems,
  merchVariants,
  merchItems,
  members,
  events,
}) {
  if (merchSales.length === 0) {
    return <p style={mutedTextStyle}>Noch keine Fanartikel-Verkaeufe erfasst.</p>
  }

  return (
    <>
      <h3 style={headingStyle}>Verkaeufe</h3>
      {merchSales.map((sale) => {
        const member = members.find((item) => item.id === sale.member_id)
        const event = events.find((item) => item.id === sale.event_id)
        const saleItems = merchSaleItems.filter((item) => item.merch_sale_id === sale.id)

        return (
          <div key={sale.id} style={cardStyle}>
            <strong>{sale.sale_date}</strong> - {formatAmount(sale.total_cents)}
            <br />
            Zahlung: {getPaymentMethodLabel(sale.payment_method)} - Status: {sale.status || '-'}
            <br />
            Kaufer: {getBuyerLabel(sale, member)}
            <br />
            Event: {event?.name || '-'}
            <br />
            Rabatt: {formatAmount(sale.discount_cents)}
            <MerchSaleItemsList
              saleItems={saleItems}
              merchVariants={merchVariants}
              merchItems={merchItems}
            />
          </div>
        )
      })}
    </>
  )
}

function MerchSaleItemsList({
  saleItems,
  merchVariants,
  merchItems,
}) {
  if (saleItems.length === 0) return null

  return (
    <div style={{ marginTop: 10 }}>
      {saleItems.map((item) => {
        const variant = merchVariants.find((variantItem) => variantItem.id === item.merch_variant_id)
        const merchItem = merchItems.find((candidate) => candidate.id === variant?.merch_item_id)

        return (
          <div key={item.id} style={{ borderTop: `1px solid ${colors.border}`, marginTop: 8, paddingTop: 8 }}>
            {merchItem?.name || 'Fanartikel'} - {variant?.variant_name || variant?.sku || 'Variante'}
            <br />
            Menge: {item.quantity} - Einzelpreis: {formatAmount(item.unit_price_cents)} - Summe: {formatAmount(item.total_cents)}
          </div>
        )
      })}
    </div>
  )
}

function getBuyerLabel(sale, member) {
  const memberName = member ? `${member.first_name || ''} ${member.last_name || ''}`.trim() : ''
  return memberName || sale.buyer_name || '-'
}

function getPaymentMethodLabel(paymentMethod) {
  if (paymentMethod === 'bar') return 'Bar'
  if (paymentMethod === 'karte') return 'Karte'
  if (paymentMethod === 'ueberweisung') return 'Ueberweisung'
  if (paymentMethod === 'ebanking') return 'E-Banking'
  if (paymentMethod === 'sonstiges') return 'Sonstiges'
  return paymentMethod || '-'
}

function formatAmount(amountCents) {
  return `${(Number(amountCents || 0) / 100).toFixed(2)} EUR`
}
