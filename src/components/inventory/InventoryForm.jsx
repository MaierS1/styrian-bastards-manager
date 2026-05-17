import { buttonStyle, headingStyle, inputStyle, secondaryButtonStyle } from '../../styles/appStyles'

export function InventoryForm({
  inventoryEditingId,
  inventoryNumber,
  setInventoryNumber,
  inventoryName,
  setInventoryName,
  inventoryCategory,
  setInventoryCategory,
  inventoryResponsible,
  setInventoryResponsible,
  inventoryLocation,
  setInventoryLocation,
  inventoryPurchaseDate,
  setInventoryPurchaseDate,
  inventoryCondition,
  setInventoryCondition,
  inventoryStatus,
  setInventoryStatus,
  inventoryLastCheckDate,
  setInventoryLastCheckDate,
  inventoryCheckStatus,
  setInventoryCheckStatus,
  inventorySerialNumber,
  setInventorySerialNumber,
  inventoryValue,
  setInventoryValue,
  inventoryNotes,
  setInventoryNotes,
  getNextInventoryNumber,
  saveInventoryItem,
  resetInventoryForm,
}) {
  return (
    <>
      <h3 style={headingStyle}>{inventoryEditingId ? 'Inventar bearbeiten' : 'Inventar anlegen'}</h3>

      <input
        placeholder={`Inventar-Nr. leer lassen für ${getNextInventoryNumber()}`}
        value={inventoryNumber}
        onChange={(e) => setInventoryNumber(e.target.value)}
        style={inputStyle}
      />

      <input
        placeholder="Bezeichnung"
        value={inventoryName}
        onChange={(e) => setInventoryName(e.target.value)}
        style={inputStyle}
      />

      <input
        placeholder="Kategorie, z.B. Event, Technik, Gastro"
        value={inventoryCategory}
        onChange={(e) => setInventoryCategory(e.target.value)}
        style={inputStyle}
      />

      <input
        placeholder="Verantwortlich"
        value={inventoryResponsible}
        onChange={(e) => setInventoryResponsible(e.target.value)}
        style={inputStyle}
      />

      <input
        placeholder="Standort"
        value={inventoryLocation}
        onChange={(e) => setInventoryLocation(e.target.value)}
        style={inputStyle}
      />

      <input
        type="date"
        value={inventoryPurchaseDate}
        onChange={(e) => setInventoryPurchaseDate(e.target.value)}
        style={inputStyle}
      />

      <select value={inventoryCondition} onChange={(e) => setInventoryCondition(e.target.value)} style={inputStyle}>
        <option value="neu">Neu</option>
        <option value="gut">Gut</option>
        <option value="gebraucht">Gebraucht</option>
        <option value="schlecht">Schlecht</option>
        <option value="reparatur">Reparatur</option>
        <option value="defekt">Defekt</option>
      </select>

      <select value={inventoryStatus} onChange={(e) => setInventoryStatus(e.target.value)} style={inputStyle}>
        <option value="aktiv">Aktiv</option>
        <option value="verliehen">Verliehen</option>
        <option value="defekt">Defekt</option>
        <option value="ausgemustert">Ausgemustert</option>
      </select>

      <input
        type="date"
        value={inventoryLastCheckDate}
        onChange={(e) => setInventoryLastCheckDate(e.target.value)}
        style={inputStyle}
      />

      <input
        placeholder="Prüfstatus, z.B. OK"
        value={inventoryCheckStatus}
        onChange={(e) => setInventoryCheckStatus(e.target.value)}
        style={inputStyle}
      />

      <input
        placeholder="Seriennummer"
        value={inventorySerialNumber}
        onChange={(e) => setInventorySerialNumber(e.target.value)}
        style={inputStyle}
      />

      <input
        type="number"
        placeholder="Wert"
        value={inventoryValue}
        onChange={(e) => setInventoryValue(e.target.value)}
        style={inputStyle}
      />

      <input
        placeholder="Notizen"
        value={inventoryNotes}
        onChange={(e) => setInventoryNotes(e.target.value)}
        style={inputStyle}
      />

      <button onClick={saveInventoryItem} style={buttonStyle}>
        {inventoryEditingId ? 'Änderungen speichern' : 'Inventar speichern'}
      </button>

      {inventoryEditingId && (
        <button onClick={resetInventoryForm} style={secondaryButtonStyle}>
          Bearbeiten abbrechen
        </button>
      )}
    </>
  )
}
