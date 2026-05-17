import { buttonStyle, cardStyle, headingStyle, inputStyle, mutedTextStyle, secondaryButtonStyle } from '../../styles/appStyles'

export function InventoryCsvImport({
  handleInventoryCsvFile,
  inventoryCsvFileName,
  inventoryCsvRows,
  importInventoryRows,
  inventoryImporting,
  setInventoryCsvRows,
  setInventoryCsvFileName,
}) {
  return (
    <>
      <h3 style={headingStyle}>Inventar CSV Import</h3>

      <p style={mutedTextStyle}>
        Unterstützt deine bestehende Google-Sheets-Struktur mit Inventar-Nr., Bezeichnung,
        Kategorie, Verantwortlich, Standort, Prüfstatus und Etikett-Zeilen.
      </p>

      <input
        type="file"
        accept=".csv,text/csv"
        onChange={handleInventoryCsvFile}
        style={inputStyle}
      />

      {inventoryCsvFileName && (
        <p style={mutedTextStyle}>
          Datei: <strong>{inventoryCsvFileName}</strong>
        </p>
      )}

      {inventoryCsvRows.length > 0 && (
        <>
          <h3 style={headingStyle}>Vorschau: {inventoryCsvRows.length} Inventar-Einträge</h3>

          {inventoryCsvRows.slice(0, 5).map((item) => (
            <div key={item.inventory_number} style={cardStyle}>
              <strong>{item.inventory_number}</strong> · {item.name}
              <br />
              {item.category} · {item.location || '-'} · {item.status}
            </div>
          ))}

          <button onClick={importInventoryRows} style={buttonStyle} disabled={inventoryImporting}>
            {inventoryImporting ? 'Import läuft...' : 'Inventar importieren'}
          </button>

          <button
            onClick={() => {
              setInventoryCsvRows([])
              setInventoryCsvFileName('')
            }}
            style={secondaryButtonStyle}
            disabled={inventoryImporting}
          >
            Import abbrechen
          </button>
        </>
      )}
    </>
  )
}
