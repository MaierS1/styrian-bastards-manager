import { buttonStyle, cardStyle, colors, mutedTextStyle, secondaryButtonStyle } from '../../styles/appStyles'
import { QRCodeCanvas } from 'qrcode.react'

export function InventoryList({
  inventoryItems,
  getFilteredInventoryItems,
  getInventoryTotalValue,
  getInventoryQrValue,
  showInventoryQr,
  setShowInventoryQr,
  exportInventoryLabelPdf,
  editInventoryItem,
  retireInventoryItem,
  deleteInventoryItem,
  canManageMembers,
  isAdmin,
}) {
  const filteredItems = getFilteredInventoryItems()

  return (
    <>
      <p>
        Angezeigt: <strong>{filteredItems.length}</strong> von {inventoryItems.length} Inventar-Einträgen
        <br />
        Wert der angezeigten aktiven Einträge:{' '}
        <strong>{getInventoryTotalValue(filteredItems).toFixed(2)} €</strong>
      </p>

      {filteredItems.map((item) => (
        <div
          key={item.id}
          style={{
            ...cardStyle,
            borderLeft: `6px solid ${item.status === 'aktiv' ? colors.blue : item.status === 'ausgemustert' ? colors.muted : colors.red}`,
            opacity: item.status === 'ausgemustert' ? 0.72 : 1,
          }}
        >
          <strong>
            {item.inventory_number} · {item.name}
          </strong>
          <br />
          Kategorie: {item.category || '-'} · Standort: {item.location || '-'}
          <br />
          Verantwortlich: {item.responsible || '-'}
          <br />
          Zustand: {item.condition || '-'} · Status: {item.status || '-'}
          <br />
          Letzte Prüfung: {item.last_check_date || '-'} · Prüfstatus: {item.check_status || '-'}
          <br />
          Seriennummer: {item.serial_number || '-'} · Wert: {item.value ? `${Number(item.value).toFixed(2)} €` : '-'}
          <br />
          Notizen: {item.notes || '-'}

          <br />

          <button onClick={() => setShowInventoryQr(showInventoryQr === item.id ? null : item.id)} style={secondaryButtonStyle}>
            QR-Code
          </button>

          <button onClick={() => exportInventoryLabelPdf(item)} style={secondaryButtonStyle}>
            Etikett PDF
          </button>

          {(canManageMembers() || isAdmin()) && (
            <button onClick={() => editInventoryItem(item)} style={buttonStyle}>
              Bearbeiten
            </button>
          )}

          {isAdmin() && item.status !== 'ausgemustert' && (
            <button
              onClick={() => retireInventoryItem(item)}
              style={{ ...secondaryButtonStyle, borderColor: colors.red, color: colors.red }}
            >
              Ausmustern
            </button>
          )}

          {isAdmin() && (
            <button
              onClick={() => deleteInventoryItem(item)}
              style={{ ...secondaryButtonStyle, borderColor: '#7f1d1d', color: '#7f1d1d' }}
            >
              Inventar löschen
            </button>
          )}

          {showInventoryQr === item.id && (
            <div style={{ marginTop: 12 }}>
              <QRCodeCanvas value={getInventoryQrValue(item)} size={170} />
              <p style={mutedTextStyle}>{getInventoryQrValue(item)}</p>
            </div>
          )}
        </div>
      ))}
    </>
  )
}
