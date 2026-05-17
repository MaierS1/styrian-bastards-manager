import { buttonStyle, cardStyle, colors, dangerButtonStyle, headingStyle, inputStyle, isMobile, secondaryButtonStyle } from '../../styles/appStyles'

export function InvoiceForm({
  selectedInvoiceCustomerId,
  setSelectedInvoiceCustomerId,
  invoiceCustomers,
  getSelectedInvoiceCustomer,
  formatCustomerAddressFromFields,
  invoiceCustomerName,
  setInvoiceCustomerName,
  invoiceCustomerEmail,
  setInvoiceCustomerEmail,
  invoiceCustomerStreet,
  setInvoiceCustomerStreet,
  invoiceCustomerHouseNumber,
  setInvoiceCustomerHouseNumber,
  invoiceCustomerAddressAddition,
  setInvoiceCustomerAddressAddition,
  invoiceCustomerPostalCode,
  setInvoiceCustomerPostalCode,
  invoiceCustomerCity,
  setInvoiceCustomerCity,
  invoiceCustomerCountry,
  setInvoiceCustomerCountry,
  invoiceIssueDate,
  setInvoiceIssueDate,
  invoiceDueDate,
  setInvoiceDueDate,
  invoiceRows,
  updateInvoiceRow,
  addInvoiceRow,
  removeInvoiceRow,
  invoiceNotes,
  setInvoiceNotes,
  invoiceIsTest,
  setInvoiceIsTest,
  getInvoiceRowsTotal,
  getNextInvoiceNumber,
  createInvoice,
  resetInvoiceForm,
}) {
  return (
    <>
      <h3 style={headingStyle}>Neue Rechnung erstellen</h3>

      <select value={selectedInvoiceCustomerId} onChange={(e) => setSelectedInvoiceCustomerId(e.target.value)} style={inputStyle}>
        <option value="">Keinen gespeicherten Kunden auswählen</option>
        {invoiceCustomers.map((customer) => (
          <option key={customer.id} value={customer.id}>
            {customer.name} · {customer.city || '-'}
          </option>
        ))}
      </select>

      {selectedInvoiceCustomerId && (
        <div style={{ ...cardStyle, background: colors.infoBg, borderColor: colors.blue }}>
          Ausgewählter Kunde: <strong>{getSelectedInvoiceCustomer()?.name}</strong>
          <br />
          {formatCustomerAddressFromFields(getSelectedInvoiceCustomer() || {}) || '-'}
        </div>
      )}

      <input
        placeholder="Kunde / Rechnungsempfänger"
        value={invoiceCustomerName}
        onChange={(e) => setInvoiceCustomerName(e.target.value)}
        style={inputStyle}
      />

      <input
        placeholder="E-Mail"
        value={invoiceCustomerEmail}
        onChange={(e) => setInvoiceCustomerEmail(e.target.value)}
        style={inputStyle}
      />

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: 12 }}>
        <input
          placeholder="Straße"
          value={invoiceCustomerStreet}
          onChange={(e) => setInvoiceCustomerStreet(e.target.value)}
          style={inputStyle}
        />

        <input
          placeholder="Hausnummer"
          value={invoiceCustomerHouseNumber}
          onChange={(e) => setInvoiceCustomerHouseNumber(e.target.value)}
          style={inputStyle}
        />
      </div>

      <input
        placeholder="Adresszusatz, z.B. Top, Tür, Abteilung"
        value={invoiceCustomerAddressAddition}
        onChange={(e) => setInvoiceCustomerAddressAddition(e.target.value)}
        style={inputStyle}
      />

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 2fr 1fr', gap: 12 }}>
        <input
          placeholder="PLZ"
          value={invoiceCustomerPostalCode}
          onChange={(e) => setInvoiceCustomerPostalCode(e.target.value)}
          style={inputStyle}
        />

        <input
          placeholder="Ort"
          value={invoiceCustomerCity}
          onChange={(e) => setInvoiceCustomerCity(e.target.value)}
          style={inputStyle}
        />

        <input
          placeholder="Land"
          value={invoiceCustomerCountry}
          onChange={(e) => setInvoiceCustomerCountry(e.target.value)}
          style={inputStyle}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(220px, 1fr))', gap: 12 }}>
        <div>
          <label style={{ fontWeight: 800, color: colors.black }}>Rechnungsdatum</label>
          <input
            type="date"
            value={invoiceIssueDate}
            onChange={(e) => setInvoiceIssueDate(e.target.value)}
            style={inputStyle}
          />
        </div>

        <div>
          <label style={{ fontWeight: 800, color: colors.black }}>Fällig bis</label>
          <input
            type="date"
            value={invoiceDueDate}
            onChange={(e) => setInvoiceDueDate(e.target.value)}
            style={inputStyle}
          />
        </div>
      </div>

      <h3 style={headingStyle}>Positionen</h3>

      {invoiceRows.map((row, index) => (
        <div key={index} style={cardStyle}>
          <input
            placeholder="Beschreibung"
            value={row.description}
            onChange={(e) => updateInvoiceRow(index, 'description', e.target.value)}
            style={inputStyle}
          />

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(160px, 1fr))', gap: 12 }}>
            <input
              type="number"
              placeholder="Menge"
              value={row.quantity}
              onChange={(e) => updateInvoiceRow(index, 'quantity', e.target.value)}
              style={inputStyle}
            />

            <input
              type="number"
              placeholder="Einzelpreis"
              value={row.unit_price}
              onChange={(e) => updateInvoiceRow(index, 'unit_price', e.target.value)}
              style={inputStyle}
            />

            <div style={{ ...cardStyle, marginBottom: 0 }}>
              Summe: <strong>{(Number(row.quantity || 0) * Number(row.unit_price || 0)).toFixed(2)} €</strong>
            </div>
          </div>

          {invoiceRows.length > 1 && (
            <button onClick={() => removeInvoiceRow(index)} style={dangerButtonStyle}>
              Position entfernen
            </button>
          )}
        </div>
      ))}

      <button onClick={addInvoiceRow} style={secondaryButtonStyle}>
        Position hinzufügen
      </button>

      <input
        placeholder="Notizen"
        value={invoiceNotes}
        onChange={(e) => setInvoiceNotes(e.target.value)}
        style={inputStyle}
      />

      <label style={{ display: 'block', marginBottom: 12, fontWeight: 800, color: colors.black }}>
        <input
          type="checkbox"
          checked={invoiceIsTest}
          onChange={(e) => setInvoiceIsTest(e.target.checked)}
          style={{ marginRight: 8 }}
        />
        Testrechnung erstellen
      </label>

      {invoiceIsTest && (
        <div style={{ ...cardStyle, background: colors.infoBg, borderColor: colors.blue }}>
          <strong style={{ color: colors.infoText }}>Testrechnung</strong>
          <br />
          Diese Rechnung wird mit TEST gekennzeichnet und erzeugt beim Bezahlt-Markieren keine Kassa-Einnahme.
        </div>
      )}

      <div style={{ ...cardStyle, background: colors.infoBg, borderColor: colors.blue }}>
        <strong>Rechnungssumme: {getInvoiceRowsTotal().toFixed(2)} €</strong>
        <br />
        Nächste Rechnungsnummer: {getNextInvoiceNumber(Number(String(invoiceIssueDate || new Date().getFullYear()).slice(0, 4)), invoiceIsTest)}
      </div>

      <button onClick={createInvoice} style={buttonStyle}>
        Rechnung erstellen
      </button>

      <button onClick={resetInvoiceForm} style={secondaryButtonStyle}>
        Formular leeren
      </button>
    </>
  )
}
