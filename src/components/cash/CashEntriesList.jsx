import {
  buttonStyle,
  cardStyle,
  colors,
  secondaryButtonStyle,
} from '../../styles/appStyles'

export function CashEntriesList({
  filteredCashEntries,
  getPaymentMethodLabel,
  getPaymentMethod,
  getTestCashEntries,
  isCashEntryMonthClosed,
  getInvoiceById,
  exportInvoicePdf,
  openReceipt,
  editCashEntry,
  deleteCashEntry,
}) {
  return (
    <>
        <h3 style={{ marginTop: 25 }}>Kassa-Einträge</h3>

        {filteredCashEntries.map((entry) => (
          <div
            key={entry.id}
            style={{
              ...cardStyle,
              background: entry.is_cancelled ? '#f3f4f6' : entry.type === 'einnahme' ? '#eefbea' : '#fff0f0',
              opacity: entry.is_cancelled ? 0.78 : 1,
            }}
          >
            <strong>
              {entry.type === 'einnahme' ? '+' : '-'} {Number(entry.amount).toFixed(2)} €
            </strong>
            <br />
            Belegnr.: {entry.receipt_number || '-'} · {entry.is_opening ? 'Übertrag' : entry.category} · {entry.entry_date} · {getPaymentMethodLabel(getPaymentMethod(entry))}
            {getTestCashEntries().some((testEntry) => testEntry.id === entry.id) && (
              <>
                {' '}· <strong style={{ color: colors.red }}>TEST</strong>
              </>
            )}
            {isCashEntryMonthClosed(entry) && (
              <>
                {' '}· <strong style={{ color: colors.successText }}>Monat abgeschlossen</strong>
              </>
            )}
            <br />
            {entry.description}
            {entry.is_cancelled && (
              <>
                <br />
                <strong style={{ color: colors.red }}>STORNIERT</strong>
                <br />
                Grund: {entry.cancellation_reason || '-'}
              </>
            )}

            {entry.invoice_id && getInvoiceById(entry.invoice_id) && (
              <>
                <br />
                Rechnung:{' '}
                <strong>{getInvoiceById(entry.invoice_id).invoice_number}</strong>
                <br />
                <button onClick={() => exportInvoicePdf(getInvoiceById(entry.invoice_id))} style={secondaryButtonStyle}>
                  Rechnung PDF öffnen
                </button>
              </>
            )}

            {entry.receipt_url && (
              <>
                <br />
                <button onClick={() => openReceipt(entry.receipt_url)} style={buttonStyle}>
                  Beleg öffnen
                </button>
              </>
            )}

            <br />
            {!isCashEntryMonthClosed(entry) && (
              <>
                <button onClick={() => editCashEntry(entry)} style={secondaryButtonStyle}>
                  Kassa-Eintrag bearbeiten
                </button>

                <button
                  onClick={() => deleteCashEntry(entry)}
                  style={{ ...secondaryButtonStyle, borderColor: '#b91c1c', color: '#b91c1c' }}
                >
                  Kassa-Eintrag stornieren
                </button>
              </>
            )}
          </div>
        ))}    </>
  )
}
