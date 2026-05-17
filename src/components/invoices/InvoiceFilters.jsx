import { headingStyle, inputStyle, secondaryButtonStyle } from '../../styles/appStyles'

export function InvoiceFilters({
  invoiceSearch,
  setInvoiceSearch,
  invoiceStatusFilter,
  setInvoiceStatusFilter,
  invoiceTestFilter,
  setInvoiceTestFilter,
  exportInvoicesCsv,
  getFilteredInvoices,
  invoices,
}) {
  return (
    <>
      <h3 style={headingStyle}>Rechnungen suchen & filtern</h3>

      <input
        placeholder="Rechnung suchen..."
        value={invoiceSearch}
        onChange={(e) => setInvoiceSearch(e.target.value)}
        style={inputStyle}
      />

      <select value={invoiceStatusFilter} onChange={(e) => setInvoiceStatusFilter(e.target.value)} style={inputStyle}>
        <option value="alle">Alle Status</option>
        <option value="offen">Offen</option>
        <option value="bezahlt">Bezahlt</option>
        <option value="storniert">Storniert</option>
      </select>

      <select value={invoiceTestFilter} onChange={(e) => setInvoiceTestFilter(e.target.value)} style={inputStyle}>
        <option value="alle">Alle Rechnungen</option>
        <option value="echt">Nur echte Rechnungen</option>
        <option value="test">Nur Testrechnungen</option>
      </select>

      <button onClick={exportInvoicesCsv} style={secondaryButtonStyle}>
        Rechnungen CSV
      </button>

      <p>
        Angezeigt: <strong>{getFilteredInvoices().length}</strong> von {invoices.length} Rechnungen
      </p>
    </>
  )
}
