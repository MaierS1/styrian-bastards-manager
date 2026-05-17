import { cardStyle, colors, dashboardLabelStyle, dashboardNumberStyle } from '../../styles/appStyles'

export function InventoryOverviewCards({ inventoryItems, getInventoryTotalValue }) {
  return (
    <div style={{ width: '100%', boxSizing: 'border-box', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 15 }}>
      <div style={{ ...cardStyle, borderTop: `6px solid ${colors.black}` }}>
        <strong style={dashboardLabelStyle}>Inventar gesamt</strong>
        <h2 style={dashboardNumberStyle}>{inventoryItems.length}</h2>
      </div>

      <div style={{ ...cardStyle, borderTop: `6px solid ${colors.navy}` }}>
        <strong style={dashboardLabelStyle}>Gesamtwert</strong>
        <h2 style={dashboardNumberStyle}>{getInventoryTotalValue().toFixed(2)} €</h2>
      </div>

      <div style={{ ...cardStyle, borderTop: `6px solid ${colors.blue}` }}>
        <strong style={dashboardLabelStyle}>Aktiv</strong>
        <h2 style={dashboardNumberStyle}>{inventoryItems.filter((item) => item.status === 'aktiv').length}</h2>
      </div>

      <div style={{ ...cardStyle, borderTop: `6px solid ${colors.red}` }}>
        <strong style={dashboardLabelStyle}>Defekt / Reparatur</strong>
        <h2 style={dashboardNumberStyle}>
          {inventoryItems.filter((item) => ['defekt', 'reparatur'].includes(item.condition) || item.status === 'defekt').length}
        </h2>
      </div>
    </div>
  )
}
