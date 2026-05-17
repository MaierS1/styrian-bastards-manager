import { headingStyle, inputStyle } from '../../styles/appStyles'

export function InventoryFilters({
  inventorySearch,
  setInventorySearch,
  inventoryCategoryFilter,
  setInventoryCategoryFilter,
  inventoryStatusFilter,
  setInventoryStatusFilter,
  inventorySortBy,
  setInventorySortBy,
  inventorySortDirection,
  setInventorySortDirection,
  getInventoryCategories,
}) {
  return (
    <>
      <h3 style={headingStyle}>Inventar Suche & Filter</h3>

      <input
        placeholder="Inventar suchen..."
        value={inventorySearch}
        onChange={(e) => setInventorySearch(e.target.value)}
        style={inputStyle}
      />

      <select value={inventoryCategoryFilter} onChange={(e) => setInventoryCategoryFilter(e.target.value)} style={inputStyle}>
        <option value="alle">Alle Kategorien</option>
        {getInventoryCategories().map((category) => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </select>

      <select value={inventoryStatusFilter} onChange={(e) => setInventoryStatusFilter(e.target.value)} style={inputStyle}>
        <option value="alle">Alle Status</option>
        <option value="aktiv">Aktiv</option>
        <option value="verliehen">Verliehen</option>
        <option value="defekt">Defekt</option>
        <option value="ausgemustert">Ausgemustert</option>
      </select>

      <div style={{ width: '100%', boxSizing: 'border-box', display: 'grid', gridTemplateColumns: 'repeat(2, minmax(220px, 1fr))', gap: 12 }}>
        <select value={inventorySortBy} onChange={(e) => setInventorySortBy(e.target.value)} style={inputStyle}>
          <option value="inventory_number">Sortieren nach Inventar-Nr.</option>
          <option value="name">Sortieren nach Bezeichnung</option>
          <option value="category">Sortieren nach Kategorie</option>
          <option value="location">Sortieren nach Standort</option>
          <option value="responsible">Sortieren nach Verantwortlich</option>
          <option value="condition">Sortieren nach Zustand</option>
          <option value="status">Sortieren nach Status</option>
          <option value="purchase_date">Sortieren nach Anschaffungsdatum</option>
          <option value="last_check_date">Sortieren nach letzter Prüfung</option>
          <option value="value">Sortieren nach Wert</option>
        </select>

        <select value={inventorySortDirection} onChange={(e) => setInventorySortDirection(e.target.value)} style={inputStyle}>
          <option value="asc">Aufsteigend</option>
          <option value="desc">Absteigend</option>
        </select>
      </div>
    </>
  )
}
