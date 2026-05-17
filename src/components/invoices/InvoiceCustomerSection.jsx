import { buttonStyle, cardStyle, colors, headingStyle, inputStyle, isMobile, secondaryButtonStyle } from '../../styles/appStyles'

export function InvoiceCustomerSection({
  editingCustomerId,
  customerName,
  setCustomerName,
  customerEmail,
  setCustomerEmail,
  customerStreet,
  setCustomerStreet,
  customerHouseNumber,
  setCustomerHouseNumber,
  customerAddressAddition,
  setCustomerAddressAddition,
  customerPostalCode,
  setCustomerPostalCode,
  customerCity,
  setCustomerCity,
  customerCountry,
  setCustomerCountry,
  customerNotes,
  setCustomerNotes,
  saveInvoiceCustomer,
  resetCustomerForm,
  customerSearch,
  setCustomerSearch,
  getFilteredInvoiceCustomers,
  selectInvoiceCustomer,
  editInvoiceCustomer,
  deleteInvoiceCustomer,
  formatCustomerAddressFromFields,
  isAdmin,
}) {
  return (
    <>
      <h3 style={headingStyle}>Kunden</h3>

      <div style={cardStyle}>
        <h4>{editingCustomerId ? 'Kunde bearbeiten' : 'Neuen Kunden anlegen'}</h4>

        <input
          placeholder="Kundenname / Firma / Verein"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          style={inputStyle}
        />

        <input
          placeholder="E-Mail"
          value={customerEmail}
          onChange={(e) => setCustomerEmail(e.target.value)}
          style={inputStyle}
        />

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: 12 }}>
          <input
            placeholder="Straße"
            value={customerStreet}
            onChange={(e) => setCustomerStreet(e.target.value)}
            style={inputStyle}
          />

          <input
            placeholder="Hausnummer"
            value={customerHouseNumber}
            onChange={(e) => setCustomerHouseNumber(e.target.value)}
            style={inputStyle}
          />
        </div>

        <input
          placeholder="Adresszusatz, z.B. Tür, Top, Abteilung"
          value={customerAddressAddition}
          onChange={(e) => setCustomerAddressAddition(e.target.value)}
          style={inputStyle}
        />

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 2fr 1fr', gap: 12 }}>
          <input
            placeholder="PLZ"
            value={customerPostalCode}
            onChange={(e) => setCustomerPostalCode(e.target.value)}
            style={inputStyle}
          />

          <input
            placeholder="Ort"
            value={customerCity}
            onChange={(e) => setCustomerCity(e.target.value)}
            style={inputStyle}
          />

          <input
            placeholder="Land"
            value={customerCountry}
            onChange={(e) => setCustomerCountry(e.target.value)}
            style={inputStyle}
          />
        </div>

        <input
          placeholder="Kundennotiz"
          value={customerNotes}
          onChange={(e) => setCustomerNotes(e.target.value)}
          style={inputStyle}
        />

        <button onClick={saveInvoiceCustomer} style={buttonStyle}>
          {editingCustomerId ? 'Kunde speichern' : 'Kunde anlegen'}
        </button>

        {editingCustomerId && (
          <button onClick={resetCustomerForm} style={secondaryButtonStyle}>
            Bearbeiten abbrechen
          </button>
        )}
      </div>

      <input
        placeholder="Kunden suchen..."
        value={customerSearch}
        onChange={(e) => setCustomerSearch(e.target.value)}
        style={inputStyle}
      />

      {getFilteredInvoiceCustomers().slice(0, 8).map((customer) => (
        <div key={customer.id} style={cardStyle}>
          <strong>{customer.name}</strong>
          <br />
          {customer.email || '-'}
          <br />
          {formatCustomerAddressFromFields(customer) || '-'}
          <br />

          <button onClick={() => selectInvoiceCustomer(customer.id)} style={secondaryButtonStyle}>
            Für Rechnung auswählen
          </button>

          <button onClick={() => editInvoiceCustomer(customer)} style={buttonStyle}>
            Kunde bearbeiten
          </button>

          {isAdmin() && (
            <button
              onClick={() => deleteInvoiceCustomer(customer)}
              style={{ ...secondaryButtonStyle, borderColor: colors.red, color: colors.red }}
            >
              Kunde löschen
            </button>
          )}
        </div>
      ))}
    </>
  )
}
