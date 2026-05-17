import { buttonStyle, cardStyle, colors, secondaryButtonStyle } from '../../styles/appStyles'

export function InvoiceList({
  getFilteredInvoices,
  getInvoiceCustomerAddress,
  getItemsForInvoice,
  getMemberById,
  exportInvoicePdf,
  archiveInvoicePdf,
  openArchivedInvoice,
  sendInvoiceEmail,
  markInvoicePaid,
  createCancellationInvoice,
  cancelInvoice,
  deleteInvoice,
  canManageCash,
  isAdmin,
}) {
  return (
    <>
      {getFilteredInvoices().map((invoice) => (
        <div
          key={invoice.id}
          style={{
            ...cardStyle,
            borderLeft: `6px solid ${invoice.status === 'bezahlt' ? colors.successText : invoice.status === 'storniert' ? colors.red : colors.blue}`,
          }}
        >
          <strong>{invoice.invoice_number}</strong> · {invoice.customer_name}
          {invoice.customer_id ? ' · gespeicherter Kunde' : ''}
          {(invoice.is_test || getMemberById(invoice.member_id)?.is_test) && (
            <>
              {' '}
              <strong style={{ color: colors.red }}>TEST</strong>
            </>
          )}
          <br />
          Datum: {invoice.issue_date || '-'} · Fällig: {invoice.due_date || '-'}
          <br />
          Status: {invoice.status || '-'} · Typ: {invoice.invoice_type || 'rechnung'} · Betrag:{' '}
          <strong>{Number(invoice.total_amount || 0).toFixed(2)} €</strong>
          <br />
          Archiv: {invoice.pdf_url ? 'PDF gespeichert' : 'noch nicht gespeichert'} · Mahnungen:{' '}
          {Number(invoice.reminder_count || 0)}
          <br />
          Letzte Mahnung: {invoice.last_reminder_at ? new Date(invoice.last_reminder_at).toLocaleString('de-AT') : '-'}
          <br />
          E-Mail: {invoice.customer_email || '-'}
          <br />
          Adresse: {getInvoiceCustomerAddress(invoice)}
          <br />
          Notizen: {invoice.notes || '-'}
          {invoice.membership_fee_id && (
            <>
              <br />
              <strong>Mitgliedsbeitrag-Rechnung</strong>
            </>
          )}

          {getItemsForInvoice(invoice.id).length > 0 && (
            <>
              <h4>Positionen</h4>
              {getItemsForInvoice(invoice.id).map((item) => (
                <div key={item.id}>
                  {item.description} · {Number(item.quantity || 0)} × {Number(item.unit_price || 0).toFixed(2)} € ={' '}
                  <strong>{Number(item.total_price || 0).toFixed(2)} €</strong>
                </div>
              ))}
            </>
          )}

          <button onClick={() => exportInvoicePdf(invoice)} style={buttonStyle}>
            Rechnung PDF
          </button>

          <button onClick={() => archiveInvoicePdf(invoice)} style={secondaryButtonStyle}>
            Im Archiv speichern
          </button>

          {invoice.pdf_url && (
            <button onClick={() => openArchivedInvoice(invoice)} style={secondaryButtonStyle}>
              Archiv-PDF öffnen
            </button>
          )}

          {invoice.customer_email && (
            <button onClick={() => sendInvoiceEmail(invoice, false)} style={secondaryButtonStyle}>
              Rechnung per E-Mail senden
            </button>
          )}

          {invoice.customer_email && invoice.status === 'offen' && (
            <button onClick={() => sendInvoiceEmail(invoice, true)} style={secondaryButtonStyle}>
              Zahlungserinnerung senden
            </button>
          )}

          {invoice.status === 'offen' && (canManageCash() || isAdmin()) && (
            <button onClick={() => markInvoicePaid(invoice)} style={secondaryButtonStyle}>
              Als bezahlt markieren
            </button>
          )}

          {invoice.status !== 'storniert' && isAdmin() && (
            <>
              <button
                onClick={() => createCancellationInvoice(invoice)}
                style={{ ...secondaryButtonStyle, borderColor: colors.red, color: colors.red }}
              >
                Stornorechnung erstellen
              </button>

              <button
                onClick={() => cancelInvoice(invoice)}
                style={{ ...secondaryButtonStyle, borderColor: colors.red, color: colors.red }}
              >
                Nur Status stornieren
              </button>
            </>
          )}

          {isAdmin() && (
            <button
              onClick={() => deleteInvoice(invoice)}
              style={{ ...secondaryButtonStyle, borderColor: '#7f1d1d', color: '#7f1d1d' }}
            >
              Rechnung löschen
            </button>
          )}
        </div>
      ))}
    </>
  )
}
