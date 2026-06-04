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
import { supabase } from '../../lib/supabase'
import { RichTextEditor } from '../common/RichTextEditor'

const checkboxLabelStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  margin: '8px 0',
  color: colors.text,
  fontWeight: 700,
}

const checkboxInputStyle = {
  width: 18,
  height: 18,
  flex: '0 0 auto',
}

const formGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: 12,
}

const textareaStyle = {
  ...inputStyle,
  minHeight: 92,
  resize: 'vertical',
}

const badgeStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  minHeight: 24,
  padding: '2px 8px',
  marginRight: 6,
  marginBottom: 6,
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 900,
  background: colors.infoBg,
  color: colors.infoText,
  border: `1px solid ${colors.blue}`,
}

const richTextFieldStyle = {
  marginBottom: 12,
}

const richTextHintStyle = {
  ...mutedTextStyle,
  margin: '0 0 8px',
  fontWeight: 700,
}

export function MerchPage({
  merchItems,
  merchVariants,
  merchSales,
  merchSaleItems,
  shopOrders,
  shopOrderItems,
  invoices,
  invoiceCustomers,
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
  merchItemPurchasePrice,
  setMerchItemPurchasePrice,
  merchItemMemberPrice,
  setMerchItemMemberPrice,
  merchItemTaxRate,
  setMerchItemTaxRate,
  merchItemSkuPrefix,
  setMerchItemSkuPrefix,
  merchItemShortDescription,
  setMerchItemShortDescription,
  merchItemDescription,
  setMerchItemDescription,
  merchItemStorageLocation,
  setMerchItemStorageLocation,
  merchItemIsPreorder,
  setMerchItemIsPreorder,
  merchItemIsLimited,
  setMerchItemIsLimited,
  merchItemIsBestseller,
  setMerchItemIsBestseller,
  merchItemIsNew,
  setMerchItemIsNew,
  merchItemIsClearance,
  setMerchItemIsClearance,
  merchItemPickupAvailable,
  setMerchItemPickupAvailable,
  merchItemShippingAvailable,
  setMerchItemShippingAvailable,
  merchItemShippingCost,
  setMerchItemShippingCost,
  merchItemIsPublic,
  setMerchItemIsPublic,
  merchItemPublicSortOrder,
  setMerchItemPublicSortOrder,
  merchItemPublicTitle,
  setMerchItemPublicTitle,
  merchItemPublicDescription,
  setMerchItemPublicDescription,
  merchItemPublicDescriptionHtml,
  setMerchItemPublicDescriptionHtml,
  merchItemPublicImageAlt,
  setMerchItemPublicImageAlt,
  merchItemPublicCtaLabel,
  setMerchItemPublicCtaLabel,
  merchItemPublicCtaUrl,
  setMerchItemPublicCtaUrl,
  merchItemSaving,
  merchItemDeletingId,
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
  merchVariantIsPublic,
  setMerchVariantIsPublic,
  merchVariantPublicSortOrder,
  setMerchVariantPublicSortOrder,
  merchVariantSaving,
  merchVariantDeletingId,
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
  merchSaleCreateInvoice,
  setMerchSaleCreateInvoice,
  merchSaleInvoiceCustomerId,
  setMerchSaleInvoiceCustomerId,
  merchSaleInvoiceEmail,
  setMerchSaleInvoiceEmail,
  merchSaleInvoiceStatus,
  setMerchSaleInvoiceStatus,
  merchSaleSendInvoiceEmail,
  setMerchSaleSendInvoiceEmail,
  merchSaleSaving,
  merchSaleCancellingId,
  shopOrderEditingId,
  shopOrderVariantId,
  setShopOrderVariantId,
  shopOrderQuantity,
  setShopOrderQuantity,
  shopOrderDiscount,
  setShopOrderDiscount,
  shopOrderShippingCost,
  setShopOrderShippingCost,
  shopOrderMemberId,
  setShopOrderMemberId,
  shopOrderBuyerName,
  setShopOrderBuyerName,
  shopOrderBuyerEmail,
  setShopOrderBuyerEmail,
  shopOrderBuyerPhone,
  setShopOrderBuyerPhone,
  shopOrderStatus,
  setShopOrderStatus,
  shopOrderPaymentStatus,
  setShopOrderPaymentStatus,
  shopOrderPaymentMethod,
  setShopOrderPaymentMethod,
  shopOrderDeliveryMethod,
  setShopOrderDeliveryMethod,
  shopOrderNotes,
  setShopOrderNotes,
  shopOrderInternalNotes,
  setShopOrderInternalNotes,
  shopOrderSaving,
  shopOrderDeletingId,
  saveMerchSale,
  saveShopOrder,
  editShopOrder,
  deleteShopOrder,
  cancelMerchSale,
  openMerchSaleInvoice,
  sendMerchSaleInvoice,
  resetMerchSaleForm,
  resetShopOrderForm,
  getMerchSaleUnitPriceCents,
  getMerchSaleTotals,
  getShopOrderTotals,
}) {
  const saleTotals = getMerchSaleTotals()
  const shopOrderTotals = getShopOrderTotals()

  return (
    <section style={sectionStyle}>
      <h2 style={headingStyle}>Shop & Fanartikel</h2>

      {canManageMerch() && (
        <>
          <h3 style={headingStyle}>{merchItemEditingId ? 'Shop-Artikel bearbeiten' : 'Shop-Artikel anlegen'}</h3>
          <h4>Produktdaten</h4>

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
            placeholder="Kurzbeschreibung"
            value={merchItemShortDescription}
            onChange={(event) => setMerchItemShortDescription(event.target.value)}
            style={inputStyle}
          />

          <textarea
            placeholder="Ausführliche Beschreibung"
            value={merchItemDescription}
            onChange={(event) => setMerchItemDescription(event.target.value)}
            style={textareaStyle}
          />

          <select value={merchItemStatus} onChange={(event) => setMerchItemStatus(event.target.value)} style={inputStyle}>
            <option value="active">Aktiv</option>
            <option value="inactive">Inaktiv</option>
            <option value="archived">Archiviert</option>
          </select>

          <h4>Preis & Verkauf</h4>

          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="Verkaufspreis in EUR"
            value={merchItemBasePrice}
            onChange={(event) => setMerchItemBasePrice(event.target.value)}
            style={inputStyle}
          />

          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="Einkaufspreis intern in EUR"
            value={merchItemPurchasePrice}
            onChange={(event) => setMerchItemPurchasePrice(event.target.value)}
            style={inputStyle}
          />

          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="Mitgliederpreis in EUR"
            value={merchItemMemberPrice}
            onChange={(event) => setMerchItemMemberPrice(event.target.value)}
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

          <h4>Lagerbestand</h4>

          <input
            placeholder="Lagerort"
            value={merchItemStorageLocation}
            onChange={(event) => setMerchItemStorageLocation(event.target.value)}
            style={inputStyle}
          />

          <p style={mutedTextStyle}>Lagerstand und Mindestbestand werden pro Variante geführt.</p>

          <h4>Bilder</h4>

          <input
            placeholder="Bild-Pfad"
            value={merchItemImagePath}
            onChange={(event) => setMerchItemImagePath(event.target.value)}
            style={inputStyle}
          />

          <h4>Versand & Ausgabe</h4>

          <label style={checkboxLabelStyle}>
            <input
              type="checkbox"
              checked={merchItemPickupAvailable}
              onChange={(event) => setMerchItemPickupAvailable(event.target.checked)}
              style={checkboxInputStyle}
            />
            Abholung möglich
          </label>

          <label style={checkboxLabelStyle}>
            <input
              type="checkbox"
              checked={merchItemShippingAvailable}
              onChange={(event) => setMerchItemShippingAvailable(event.target.checked)}
              style={checkboxInputStyle}
            />
            Versand möglich
          </label>

          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="Versandkosten in EUR"
            value={merchItemShippingCost}
            onChange={(event) => setMerchItemShippingCost(event.target.value)}
            style={inputStyle}
          />

          <h4>Einstellungen</h4>

          <label style={checkboxLabelStyle}>
            <input
              type="checkbox"
              checked={merchItemIsPublic}
              onChange={(event) => setMerchItemIsPublic(event.target.checked)}
              style={checkboxInputStyle}
            />
            Aktiv im Shop anzeigen
          </label>

          <label style={checkboxLabelStyle}>
            <input
              type="checkbox"
              checked={merchItemIsNew}
              onChange={(event) => setMerchItemIsNew(event.target.checked)}
              style={checkboxInputStyle}
            />
            Neu im Shop
          </label>

          <label style={checkboxLabelStyle}>
            <input
              type="checkbox"
              checked={merchItemIsBestseller}
              onChange={(event) => setMerchItemIsBestseller(event.target.checked)}
              style={checkboxInputStyle}
            />
            Bestseller
          </label>

          <label style={checkboxLabelStyle}>
            <input
              type="checkbox"
              checked={merchItemIsPreorder}
              onChange={(event) => setMerchItemIsPreorder(event.target.checked)}
              style={checkboxInputStyle}
            />
            Vorbestellung
          </label>

          <label style={checkboxLabelStyle}>
            <input
              type="checkbox"
              checked={merchItemIsLimited}
              onChange={(event) => setMerchItemIsLimited(event.target.checked)}
              style={checkboxInputStyle}
            />
            Limitierte Auflage
          </label>

          <label style={checkboxLabelStyle}>
            <input
              type="checkbox"
              checked={merchItemIsClearance}
              onChange={(event) => setMerchItemIsClearance(event.target.checked)}
              style={checkboxInputStyle}
            />
            Restposten
          </label>

          <input
            placeholder="Oeffentlicher Titel"
            value={merchItemPublicTitle}
            onChange={(event) => setMerchItemPublicTitle(event.target.value)}
            style={inputStyle}
          />

          <input
            placeholder="Oeffentliche Beschreibung"
            value={merchItemPublicDescription}
            onChange={(event) => setMerchItemPublicDescription(event.target.value)}
            style={inputStyle}
          />

          <div style={richTextFieldStyle}>
            <p style={richTextHintStyle}>Formatierte Beschreibung fuer Homepage- und Detail-Ausgaben</p>
            <RichTextEditor
              value={merchItemPublicDescriptionHtml}
              onChange={setMerchItemPublicDescriptionHtml}
              placeholder="Formatierte Fanartikel-Beschreibung"
              disabled={merchItemSaving}
              minHeight={160}
            />
          </div>

          <input
            placeholder="Bild-Alt-Text"
            value={merchItemPublicImageAlt}
            onChange={(event) => setMerchItemPublicImageAlt(event.target.value)}
            style={inputStyle}
          />

          <input
            type="number"
            min="0"
            step="1"
            placeholder="Oeffentliche Sortierung"
            value={merchItemPublicSortOrder}
            onChange={(event) => setMerchItemPublicSortOrder(event.target.value)}
            style={inputStyle}
          />

          <input
            placeholder="CTA-Label"
            value={merchItemPublicCtaLabel}
            onChange={(event) => setMerchItemPublicCtaLabel(event.target.value)}
            style={inputStyle}
          />

          <input
            placeholder="CTA-URL"
            value={merchItemPublicCtaUrl}
            onChange={(event) => setMerchItemPublicCtaUrl(event.target.value)}
            style={inputStyle}
          />

          <button onClick={saveMerchItem} disabled={merchItemSaving} style={buttonStyle}>
            {merchItemSaving ? 'Fanartikel wird gespeichert...' : merchItemEditingId ? 'Fanartikel speichern' : 'Fanartikel anlegen'}
          </button>

          {merchItemEditingId && (
            <button onClick={resetMerchItemForm} style={secondaryButtonStyle}>
              Bearbeiten abbrechen
            </button>
          )}

          <h3 style={headingStyle}>{merchVariantEditingId ? 'Variante bearbeiten' : 'Variante anlegen'}</h3>

          <select value={merchVariantItemId} onChange={(event) => setMerchVariantItemId(event.target.value)} style={inputStyle}>
            <option value="">Fanartikel auswählen</option>
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
            placeholder="Größe"
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

          <label style={checkboxLabelStyle}>
            <input
              type="checkbox"
              checked={merchVariantIsPublic}
              onChange={(event) => setMerchVariantIsPublic(event.target.checked)}
              style={checkboxInputStyle}
            />
            Variante oeffentlich anzeigen
          </label>

          <input
            type="number"
            min="0"
            step="1"
            placeholder="Varianten-Sortierung"
            value={merchVariantPublicSortOrder}
            onChange={(event) => setMerchVariantPublicSortOrder(event.target.value)}
            style={inputStyle}
          />

          <button onClick={saveMerchVariant} disabled={merchVariantSaving} style={buttonStyle}>
            {merchVariantSaving ? 'Variante wird gespeichert...' : merchVariantEditingId ? 'Variante speichern' : 'Variante anlegen'}
          </button>

          {merchVariantEditingId && (
            <button onClick={resetMerchVariantForm} style={secondaryButtonStyle}>
              Bearbeiten abbrechen
            </button>
          )}

          <h3 style={headingStyle}>Verkauf erfassen</h3>

          <select value={merchSaleVariantId} onChange={(event) => setMerchSaleVariantId(event.target.value)} style={inputStyle}>
            <option value="">Variante auswählen</option>
            {merchVariants.filter((variant) => {
              const item = merchItems.find((merchItem) => merchItem.id === variant.merch_item_id)
              return variant.status === 'active' && item?.status === 'active'
            }).map((variant) => {
              const item = merchItems.find((merchItem) => merchItem.id === variant.merch_item_id)
              const variantLabel = [variant.variant_name, variant.size, variant.color, variant.sku]
                .filter(Boolean)
                .join(' / ')
              const stockQuantity = Number(variant.stock_quantity || 0)

              return (
                <option key={variant.id} value={variant.id}>
                  {item?.name || 'Fanartikel'} - {variantLabel || 'Variante'} - Bestand: {stockQuantity}
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

          <label style={checkboxLabelStyle}>
            <input
              type="checkbox"
              checked={merchSaleCreateInvoice}
              onChange={(event) => {
                setMerchSaleCreateInvoice(event.target.checked)
                if (event.target.checked) {
                  setMerchSaleCreateCashEntry(true)
                  setMerchSaleInvoiceStatus('bezahlt')
                }
              }}
              style={checkboxInputStyle}
            />
            Rechnung erzeugen
          </label>

          {merchSaleCreateInvoice && (
            <div style={{ ...cardStyle, background: colors.infoBg, borderColor: colors.blue }}>
              <strong>Rechnungsempfaenger</strong>
              <p style={mutedTextStyle}>
                Verwendet wird das ausgewaehlte Mitglied, ein Rechnungskunde oder der Freitext-Kunde.
              </p>

              <select
                value={merchSaleInvoiceCustomerId}
                onChange={(event) => setMerchSaleInvoiceCustomerId(event.target.value)}
                style={inputStyle}
              >
                <option value="">Keinen Rechnungskunden auswaehlen</option>
                {invoiceCustomers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} - {customer.city || '-'}
                  </option>
                ))}
              </select>

              <input
                placeholder="E-Mail fuer Rechnung optional"
                value={merchSaleInvoiceEmail}
                onChange={(event) => setMerchSaleInvoiceEmail(event.target.value)}
                style={inputStyle}
              />

              <select
                value={merchSaleInvoiceStatus}
                onChange={(event) => {
                  setMerchSaleInvoiceStatus(event.target.value)
                  if (event.target.value === 'offen') setMerchSaleCreateCashEntry(false)
                }}
                style={inputStyle}
              >
                <option value="bezahlt">Bezahlt</option>
                <option value="offen">Offen</option>
              </select>

              <label style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  checked={merchSaleSendInvoiceEmail}
                  onChange={(event) => setMerchSaleSendInvoiceEmail(event.target.checked)}
                  style={checkboxInputStyle}
                />
                Rechnung per E-Mail senden
              </label>
            </div>
          )}

          <p style={mutedTextStyle}>
            Preis: <strong>{formatAmount(getMerchSaleUnitPriceCents())}</strong>
            <br />
            Zwischensumme: <strong>{formatAmount(saleTotals.subtotalCents)}</strong>
            <br />
            Rabatt: <strong>{formatAmount(saleTotals.discountCents)}</strong>
            <br />
            Gesamt: <strong>{formatAmount(saleTotals.totalCents)}</strong>
          </p>

          <button onClick={saveMerchSale} disabled={merchSaleSaving} style={buttonStyle}>
            {merchSaleSaving ? 'Verkauf wird gespeichert...' : 'Verkauf speichern'}
          </button>

          <button onClick={resetMerchSaleForm} style={secondaryButtonStyle}>
            Verkauf zurücksetzen
          </button>
          <ShopOrderForm
            shopOrderEditingId={shopOrderEditingId}
            shopOrderVariantId={shopOrderVariantId}
            setShopOrderVariantId={setShopOrderVariantId}
            shopOrderQuantity={shopOrderQuantity}
            setShopOrderQuantity={setShopOrderQuantity}
            shopOrderDiscount={shopOrderDiscount}
            setShopOrderDiscount={setShopOrderDiscount}
            shopOrderShippingCost={shopOrderShippingCost}
            setShopOrderShippingCost={setShopOrderShippingCost}
            shopOrderMemberId={shopOrderMemberId}
            setShopOrderMemberId={setShopOrderMemberId}
            shopOrderBuyerName={shopOrderBuyerName}
            setShopOrderBuyerName={setShopOrderBuyerName}
            shopOrderBuyerEmail={shopOrderBuyerEmail}
            setShopOrderBuyerEmail={setShopOrderBuyerEmail}
            shopOrderBuyerPhone={shopOrderBuyerPhone}
            setShopOrderBuyerPhone={setShopOrderBuyerPhone}
            shopOrderStatus={shopOrderStatus}
            setShopOrderStatus={setShopOrderStatus}
            shopOrderPaymentStatus={shopOrderPaymentStatus}
            setShopOrderPaymentStatus={setShopOrderPaymentStatus}
            shopOrderPaymentMethod={shopOrderPaymentMethod}
            setShopOrderPaymentMethod={setShopOrderPaymentMethod}
            shopOrderDeliveryMethod={shopOrderDeliveryMethod}
            setShopOrderDeliveryMethod={setShopOrderDeliveryMethod}
            shopOrderNotes={shopOrderNotes}
            setShopOrderNotes={setShopOrderNotes}
            shopOrderInternalNotes={shopOrderInternalNotes}
            setShopOrderInternalNotes={setShopOrderInternalNotes}
            shopOrderSaving={shopOrderSaving}
            saveShopOrder={saveShopOrder}
            resetShopOrderForm={resetShopOrderForm}
            shopOrderTotals={shopOrderTotals}
            merchItems={merchItems}
            merchVariants={merchVariants}
            members={members}
          />
        </>
      )}

      <p>
        Shop-Artikel: <strong>{merchItems.length}</strong>
        <br />
        Varianten: <strong>{merchVariants.length}</strong>
        <br />
        Bestellungen: <strong>{shopOrders.length}</strong>
        <br />
        Verkaeufe: <strong>{merchSales.length}</strong>
      </p>

      {merchItems.length === 0 && <p style={mutedTextStyle}>Noch keine Shop-Artikel angelegt.</p>}

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
          merchItemDeletingId={merchItemDeletingId}
          merchVariantDeletingId={merchVariantDeletingId}
        />
      ))}

      <MerchSalesList
        merchSales={merchSales}
        merchSaleItems={merchSaleItems}
        merchVariants={merchVariants}
        merchItems={merchItems}
        invoices={invoices}
        members={members}
        events={events}
        canManageMerch={canManageMerch}
        merchSaleCancellingId={merchSaleCancellingId}
        cancelMerchSale={cancelMerchSale}
        openMerchSaleInvoice={openMerchSaleInvoice}
        sendMerchSaleInvoice={sendMerchSaleInvoice}
      />

      <ShopOrdersList
        shopOrders={shopOrders}
        shopOrderItems={shopOrderItems}
        members={members}
        canManageMerch={canManageMerch}
        editShopOrder={editShopOrder}
        deleteShopOrder={deleteShopOrder}
        shopOrderDeletingId={shopOrderDeletingId}
      />
    </section>
  )
}

function ShopOrderForm({
  shopOrderEditingId,
  shopOrderVariantId,
  setShopOrderVariantId,
  shopOrderQuantity,
  setShopOrderQuantity,
  shopOrderDiscount,
  setShopOrderDiscount,
  shopOrderShippingCost,
  setShopOrderShippingCost,
  shopOrderMemberId,
  setShopOrderMemberId,
  shopOrderBuyerName,
  setShopOrderBuyerName,
  shopOrderBuyerEmail,
  setShopOrderBuyerEmail,
  shopOrderBuyerPhone,
  setShopOrderBuyerPhone,
  shopOrderStatus,
  setShopOrderStatus,
  shopOrderPaymentStatus,
  setShopOrderPaymentStatus,
  shopOrderPaymentMethod,
  setShopOrderPaymentMethod,
  shopOrderDeliveryMethod,
  setShopOrderDeliveryMethod,
  shopOrderNotes,
  setShopOrderNotes,
  shopOrderInternalNotes,
  setShopOrderInternalNotes,
  shopOrderSaving,
  saveShopOrder,
  resetShopOrderForm,
  shopOrderTotals,
  merchItems,
  merchVariants,
  members,
}) {
  return (
    <>
      <h3 style={headingStyle}>{shopOrderEditingId ? 'Shop-Bestellung bearbeiten' : 'Shop-Bestellung anlegen'}</h3>
      <div style={{ ...cardStyle, background: colors.infoBg, borderColor: colors.blue }}>
        <strong>Bestellsystem</strong>
        <p style={mutedTextStyle}>
          Bezahlte Bestellungen erzeugen automatisch eine Einnahme in der Kassa mit Kategorie Fanartikel.
          Position und Menge werden beim Bearbeiten nicht geaendert, damit Lagerbewegungen nachvollziehbar bleiben.
        </p>
      </div>

      <select
        value={shopOrderVariantId}
        onChange={(event) => setShopOrderVariantId(event.target.value)}
        disabled={Boolean(shopOrderEditingId)}
        style={inputStyle}
      >
        <option value="">Variante auswÃ¤hlen</option>
        {merchVariants.filter((variant) => {
          const item = merchItems.find((merchItem) => merchItem.id === variant.merch_item_id)
          return shopOrderEditingId || (variant.status === 'active' && item?.status === 'active')
        }).map((variant) => {
          const item = merchItems.find((merchItem) => merchItem.id === variant.merch_item_id)
          const variantLabel = [variant.variant_name, variant.size, variant.color, variant.sku]
            .filter(Boolean)
            .join(' / ')

          return (
            <option key={variant.id} value={variant.id}>
              {item?.name || 'Fanartikel'} - {variantLabel || 'Variante'} - Bestand: {Number(variant.stock_quantity || 0)}
            </option>
          )
        })}
      </select>

      <div style={formGridStyle}>
        <input
          type="number"
          min="1"
          step="1"
          placeholder="Menge"
          value={shopOrderQuantity}
          onChange={(event) => setShopOrderQuantity(event.target.value)}
          disabled={Boolean(shopOrderEditingId)}
          style={inputStyle}
        />
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="Rabatt in EUR"
          value={shopOrderDiscount}
          onChange={(event) => setShopOrderDiscount(event.target.value)}
          disabled={Boolean(shopOrderEditingId)}
          style={inputStyle}
        />
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="Versandkosten in EUR"
          value={shopOrderShippingCost}
          onChange={(event) => setShopOrderShippingCost(event.target.value)}
          disabled={Boolean(shopOrderEditingId)}
          style={inputStyle}
        />
      </div>

      <div style={formGridStyle}>
        <select value={shopOrderMemberId} onChange={(event) => setShopOrderMemberId(event.target.value)} style={inputStyle}>
          <option value="">Kein Mitglied zuordnen</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {`${member.first_name || ''} ${member.last_name || ''}`.trim() || member.email || member.id}
            </option>
          ))}
        </select>
        <input
          placeholder="Kaufer Freitext"
          value={shopOrderBuyerName}
          onChange={(event) => setShopOrderBuyerName(event.target.value)}
          style={inputStyle}
        />
        <input
          placeholder="E-Mail"
          value={shopOrderBuyerEmail}
          onChange={(event) => setShopOrderBuyerEmail(event.target.value)}
          style={inputStyle}
        />
        <input
          placeholder="Telefon"
          value={shopOrderBuyerPhone}
          onChange={(event) => setShopOrderBuyerPhone(event.target.value)}
          style={inputStyle}
        />
      </div>

      <div style={formGridStyle}>
        <select value={shopOrderStatus} onChange={(event) => setShopOrderStatus(event.target.value)} style={inputStyle}>
          <option value="new">Neu</option>
          <option value="processing">In Bearbeitung</option>
          <option value="ready_for_pickup">Bereit zur Abholung</option>
          <option value="shipped">Versendet</option>
          <option value="completed">Abgeschlossen</option>
          <option value="cancelled">Storniert</option>
        </select>
        <select value={shopOrderPaymentStatus} onChange={(event) => setShopOrderPaymentStatus(event.target.value)} style={inputStyle}>
          <option value="open">Offen</option>
          <option value="partially_paid">Teilweise bezahlt</option>
          <option value="paid">Bezahlt</option>
          <option value="refunded">RÃ¼ckerstattet</option>
          <option value="cancelled">Storniert</option>
        </select>
        <select value={shopOrderPaymentMethod} onChange={(event) => setShopOrderPaymentMethod(event.target.value)} style={inputStyle}>
          <option value="bar">Bar</option>
          <option value="ueberweisung">Ãœberweisung</option>
          <option value="vereinskonto">Vereinskonto</option>
          <option value="sonstiges">Sonstiges</option>
        </select>
        <select value={shopOrderDeliveryMethod} onChange={(event) => setShopOrderDeliveryMethod(event.target.value)} style={inputStyle}>
          <option value="pickup">Abholung</option>
          <option value="shipping">Versand</option>
          <option value="mixed">Abholung und Versand</option>
        </select>
      </div>

      <textarea
        placeholder="Hinweise fuer Bestellung"
        value={shopOrderNotes}
        onChange={(event) => setShopOrderNotes(event.target.value)}
        style={textareaStyle}
      />
      <textarea
        placeholder="Interne Notizen"
        value={shopOrderInternalNotes}
        onChange={(event) => setShopOrderInternalNotes(event.target.value)}
        style={textareaStyle}
      />

      <p style={mutedTextStyle}>
        Einzelpreis: <strong>{formatAmount(shopOrderTotals.unitPriceCents)}</strong>
        <br />
        Zwischensumme: <strong>{formatAmount(shopOrderTotals.subtotalCents)}</strong>
        <br />
        Rabatt: <strong>{formatAmount(shopOrderTotals.discountCents)}</strong>
        <br />
        Versand: <strong>{formatAmount(shopOrderTotals.shippingCostCents)}</strong>
        <br />
        Gesamt: <strong>{formatAmount(shopOrderTotals.totalCents)}</strong>
      </p>

      <button onClick={saveShopOrder} disabled={shopOrderSaving} style={buttonStyle}>
        {shopOrderSaving ? 'Bestellung wird gespeichert...' : shopOrderEditingId ? 'Bestellung speichern' : 'Bestellung anlegen'}
      </button>
      <button onClick={resetShopOrderForm} style={secondaryButtonStyle}>
        Bestellung zurÃ¼cksetzen
      </button>
    </>
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
  merchItemDeletingId,
  merchVariantDeletingId,
}) {
  const badges = getMerchItemBadges(item, variants)
  const totalStock = variants.reduce((sum, variant) => sum + Number(variant.stock_quantity || 0), 0)
  const displayName = item.public_title || item.name
  const displayDescription = item.public_description || item.short_description || item.description || '-'
  const imageUrl = getPublicAssetUrl(item.image_path)

  return (
    <div
      style={{
        ...cardStyle,
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 16,
        borderLeft: `6px solid ${item.status === 'active' ? colors.blue : colors.muted}`,
        opacity: item.status === 'archived' ? 0.72 : 1,
      }}
    >
      <div
        style={{
          minHeight: 150,
          borderRadius: 10,
          border: `1px solid ${colors.border}`,
          background: colors.offWhite,
          overflow: 'hidden',
        }}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={item.public_image_alt || displayName}
            style={{ width: '100%', height: '100%', minHeight: 150, objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div style={{ padding: 16, color: colors.muted, fontWeight: 800 }}>Kein Bild</div>
        )}
      </div>

      <div>
        <div>
          {badges.map((badge) => (
            <span key={badge} style={badgeStyle}>{badge}</span>
          ))}
        </div>
        <strong style={{ display: 'block', fontSize: 20, lineHeight: 1.25 }}>
          {item.item_number ? `${item.item_number} - ${displayName}` : displayName}
        </strong>
        <p style={{ ...mutedTextStyle, marginTop: 6 }}>{displayDescription}</p>
        <div style={formGridStyle}>
          <span>Kategorie: <strong>{item.category || '-'}</strong></span>
          <span>Preis: <strong>{formatAmount(item.base_price_cents)}</strong></span>
          <span>Mitgliederpreis: <strong>{item.member_price_cents ? formatAmount(item.member_price_cents) : '-'}</strong></span>
          <span>Bestand: <strong>{totalStock}</strong></span>
          <span>Lagerort: <strong>{item.storage_location || '-'}</strong></span>
          <span>Shop: <strong>{item.is_public ? 'Aktiv' : 'Intern'}</strong></span>
        </div>
        <p style={mutedTextStyle}>
          Status: {getItemStatusLabel(item.status)} - Steuer: {Number(item.tax_rate || 0).toFixed(2)} %
          <br />
          Abholung: {item.pickup_available === false ? 'Nein' : 'Ja'} - Versand: {item.shipping_available ? 'Ja' : 'Nein'}
          {item.shipping_available ? ` (${formatAmount(item.shipping_cost_cents)})` : ''}
          <br />
          CTA: {getCtaLabel(item)}
          <br />
          Formatierte Beschreibung: {item.public_description_html ? 'Vorhanden' : '-'}
        </p>

      <MerchVariantsList
        variants={variants}
        canManageMerch={canManageMerch}
        editMerchVariant={editMerchVariant}
        deleteMerchVariant={deleteMerchVariant}
        merchVariantDeletingId={merchVariantDeletingId}
      />

      {canManageMerch() && (
        <>
          <br />
          <button onClick={() => editMerchItem(item)} style={buttonStyle}>
            Bearbeiten
          </button>
          <button
            onClick={() => deleteMerchItem(item)}
            disabled={merchItemDeletingId === item.id}
            style={{ ...secondaryButtonStyle, borderColor: '#7f1d1d', color: '#7f1d1d' }}
          >
            {merchItemDeletingId === item.id ? 'Fanartikel wird gelöscht...' : 'Fanartikel löschen'}
          </button>
        </>
      )}
      </div>
    </div>
  )
}

function MerchVariantsList({
  variants,
  canManageMerch,
  editMerchVariant,
  deleteMerchVariant,
  merchVariantDeletingId,
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
            SKU: {variant.sku || '-'} - Größe: {variant.size || '-'} - Farbe: {variant.color || '-'}
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
            <br />
            Oeffentlich: {variant.is_public ? 'Ja' : 'Nein'} - Sortierung: {variant.public_sort_order ?? 0}

            {canManageMerch() && (
              <>
                <br />
                <button onClick={() => editMerchVariant(variant)} style={buttonStyle}>
                  Variante bearbeiten
                </button>
                <button
                  onClick={() => deleteMerchVariant(variant)}
                  disabled={merchVariantDeletingId === variant.id}
                  style={{ ...secondaryButtonStyle, borderColor: '#7f1d1d', color: '#7f1d1d' }}
                >
                  {merchVariantDeletingId === variant.id ? 'Variante wird gelöscht...' : 'Variante löschen'}
                </button>
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}

function getMerchItemBadges(item, variants) {
  const badges = []
  const totalStock = variants.reduce((sum, variant) => sum + Number(variant.stock_quantity || 0), 0)

  if (item.is_new) badges.push('Neu')
  if (item.is_bestseller) badges.push('Bestseller')
  if (item.is_preorder) badges.push('Vorbestellung')
  if (item.is_limited) badges.push('Limitiert')
  if (variants.length > 0 && totalStock <= 0) {
    badges.push('Ausverkauft')
  }

  return badges
}

function getPublicAssetUrl(path) {
  if (!path) return ''
  if (/^(https?:|data:)/i.test(path)) return path

  const { data } = supabase.storage.from('public-assets').getPublicUrl(path)
  return data?.publicUrl || ''
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

function getCtaLabel(item) {
  const label = item.public_cta_label || '-'
  const url = item.public_cta_url || '-'

  return `${label} - ${url}`
}

function ShopOrdersList({
  shopOrders,
  shopOrderItems,
  members,
  canManageMerch,
  editShopOrder,
  deleteShopOrder,
  shopOrderDeletingId,
}) {
  if (shopOrders.length === 0) {
    return <p style={mutedTextStyle}>Noch keine Shop-Bestellungen erfasst.</p>
  }

  return (
    <>
      <h3 style={headingStyle}>Shop-Bestellungen</h3>
      {shopOrders.map((order) => {
        const member = members.find((item) => item.id === order.member_id)
        const orderItems = shopOrderItems.filter((item) => item.shop_order_id === order.id)
        const isTerminalShopOrder = ['shipped', 'completed', 'cancelled'].includes(order.status)
        const canDeleteOpenOrder = canManageMerch()
          && order.payment_status === 'open'
          && !order.cash_entry_id
          && !isTerminalShopOrder

        return (
          <div key={order.id} style={cardStyle}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              <strong>{order.order_number || order.id}</strong>
              <span style={badgeStyle}>{getShopOrderStatusLabel(order.status)}</span>
              <span style={badgeStyle}>{getShopPaymentStatusLabel(order.payment_status)}</span>
              {order.cash_entry_id && <span style={badgeStyle}>Kassa gebucht</span>}
            </div>
            <p style={mutedTextStyle}>
              Datum: <strong>{order.order_date || '-'}</strong>
              <br />
              Kaufer: <strong>{getBuyerLabel(order, member)}</strong>
              <br />
              Zahlung: <strong>{getShopPaymentMethodLabel(order.payment_method)}</strong> - Ausgabe:{' '}
              <strong>{getDeliveryMethodLabel(order.delivery_method)}</strong>
              <br />
              Rabatt: <strong>{formatAmount(order.discount_cents)}</strong> - Versand:{' '}
              <strong>{formatAmount(order.shipping_cost_cents)}</strong> - Gesamt:{' '}
              <strong>{formatAmount(order.total_cents)}</strong>
            </p>
            <ShopOrderItemsList orderItems={orderItems} />
            {(order.notes || order.internal_notes) && (
              <p style={mutedTextStyle}>
                Hinweis: {order.notes || '-'}
                <br />
                Intern: {order.internal_notes || '-'}
              </p>
            )}
            {canManageMerch() && (
              <button onClick={() => editShopOrder(order)} style={buttonStyle}>
                Bestellung bearbeiten
              </button>
            )}
            {canDeleteOpenOrder && (
              <button
                onClick={() => deleteShopOrder(order)}
                disabled={shopOrderDeletingId === order.id}
                style={{
                  ...buttonStyle,
                  marginLeft: 8,
                  background: '#8b1e1e',
                  color: '#ffffff',
                  borderColor: '#8b1e1e',
                }}
              >
                {shopOrderDeletingId === order.id ? 'Löschen...' : 'Löschen'}
              </button>
            )}
          </div>
        )
      })}
    </>
  )
}

function ShopOrderItemsList({ orderItems }) {
  if (orderItems.length === 0) {
    return <p style={mutedTextStyle}>Keine Positionen geladen.</p>
  }

  return (
    <div style={{ marginTop: 10 }}>
      {orderItems.map((item) => {
        const variantLabel = [item.variant_name, item.size, item.color, item.sku].filter(Boolean).join(' / ')

        return (
          <div key={item.id} style={{ borderTop: `1px solid ${colors.border}`, paddingTop: 8, marginTop: 8 }}>
            <strong>{item.item_number ? `${item.item_number} - ${item.item_name}` : item.item_name}</strong>
            <br />
            {variantLabel || 'Variante'} - Menge: {item.quantity}
            <br />
            Einzelpreis: {formatAmount(item.unit_price_cents)} - Summe: {formatAmount(item.total_cents)}
          </div>
        )
      })}
    </div>
  )
}

function getShopOrderStatusLabel(status) {
  if (status === 'new') return 'Neu'
  if (status === 'processing') return 'In Bearbeitung'
  if (status === 'ready_for_pickup') return 'Bereit zur Abholung'
  if (status === 'shipped') return 'Versendet'
  if (status === 'completed') return 'Abgeschlossen'
  if (status === 'cancelled') return 'Storniert'
  return status || '-'
}

function getShopPaymentStatusLabel(status) {
  if (status === 'open') return 'Offen'
  if (status === 'partially_paid') return 'Teilweise bezahlt'
  if (status === 'paid') return 'Bezahlt'
  if (status === 'refunded') return 'RÃ¼ckerstattet'
  if (status === 'cancelled') return 'Storniert'
  return status || '-'
}

function getShopPaymentMethodLabel(paymentMethod) {
  if (paymentMethod === 'pending') return 'Ausstehend'
  if (paymentMethod === 'bar') return 'Bar'
  if (paymentMethod === 'ueberweisung') return 'Ueberweisung'
  if (paymentMethod === 'vereinskonto') return 'Vereinskonto'
  if (paymentMethod === 'sonstiges') return 'Sonstiges'
  return paymentMethod || '-'
}

function getDeliveryMethodLabel(deliveryMethod) {
  if (deliveryMethod === 'pickup') return 'Abholung'
  if (deliveryMethod === 'shipping') return 'Versand'
  if (deliveryMethod === 'mixed') return 'Abholung und Versand'
  return deliveryMethod || '-'
}

function MerchSalesList({
  merchSales,
  merchSaleItems,
  merchVariants,
  merchItems,
  invoices,
  members,
  events,
  canManageMerch,
  merchSaleCancellingId,
  cancelMerchSale,
  openMerchSaleInvoice,
  sendMerchSaleInvoice,
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
        const invoice = invoices.find((item) => item.id === sale.invoice_id)

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
            {sale.invoice_id && (
              <>
                <br />
                Rechnung:{' '}
                <strong>{invoice?.invoice_number || sale.invoice_id}</strong>
                {invoice?.status === 'storniert' && (
                  <>
                    {' '}
                    <strong style={{ color: colors.red }}>storniert</strong>
                  </>
                )}
                {!invoice && (
                  <>
                    {' '}
                    <span style={mutedTextStyle}>nicht geladen</span>
                  </>
                )}
              </>
            )}
            <MerchSaleItemsList
              saleItems={saleItems}
              merchVariants={merchVariants}
              merchItems={merchItems}
            />
            {sale.invoice_id && (
              <>
                <br />
                <button onClick={() => openMerchSaleInvoice(sale)} style={secondaryButtonStyle}>
                  Rechnung oeffnen
                </button>
                <button
                  onClick={() => sendMerchSaleInvoice(sale)}
                  disabled={invoice?.status === 'storniert' || (invoice && !invoice.customer_email)}
                  style={secondaryButtonStyle}
                >
                  Rechnung senden
                </button>
              </>
            )}
            {canManageMerch() && sale.status === 'completed' && (
              <>
                <br />
                {sale.invoice_id && (
                  <>
                    <span style={mutedTextStyle}>
                      Beim Storno werden Rechnung, Kassa und Bestand gemeinsam storniert.
                    </span>
                    <br />
                  </>
                )}
                <button
                  onClick={() => cancelMerchSale(sale)}
                  disabled={merchSaleCancellingId === sale.id}
                  style={{ ...secondaryButtonStyle, borderColor: '#7f1d1d', color: '#7f1d1d' }}
                >
                  {merchSaleCancellingId === sale.id ? 'Storniert...' : 'Verkauf stornieren'}
                </button>
              </>
            )}
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
