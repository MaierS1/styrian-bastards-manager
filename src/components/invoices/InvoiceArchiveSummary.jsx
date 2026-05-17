import { cardStyle, colors, mutedTextStyle, secondaryButtonStyle } from '../../styles/appStyles'

export function InvoiceArchiveSummary({ invoices, getOverdueInvoices, sendInvoiceEmail }) {
  const overdueInvoices = getOverdueInvoices()

  return (
    <>
      <div style={{ ...cardStyle, borderTop: `6px solid ${colors.blue}` }}>
        <strong style={{ color: colors.black }}>Rechnungsarchiv & Zahlungserinnerungen</strong>
        <br />
        Archivierte PDFs: {invoices.filter((invoice) => invoice.pdf_url).length}
        <br />
        Überfällige offene Rechnungen: <strong>{overdueInvoices.length}</strong>
        <br />
        <span style={mutedTextStyle}>
          PDFs können im Supabase Storage gespeichert, geöffnet und per E-Mail versendet werden.
        </span>
      </div>

      {overdueInvoices.length > 0 && (
        <div style={{ ...cardStyle, background: '#fffbeb', borderColor: '#f59e0b' }}>
          <strong style={{ color: '#92400e' }}>Überfällige Rechnungen</strong>
          {overdueInvoices.slice(0, 5).map((invoice) => (
            <div key={invoice.id} style={{ marginTop: 8 }}>
              {invoice.invoice_number} · {invoice.customer_name} · fällig seit {invoice.due_date}
              {invoice.customer_email && (
                <button onClick={() => sendInvoiceEmail(invoice, true)} style={secondaryButtonStyle}>
                  Zahlungserinnerung senden
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  )
}
