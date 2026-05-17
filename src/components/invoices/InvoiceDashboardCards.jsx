import { cardStyle, colors, dashboardLabelStyle, dashboardNumberStyle } from '../../styles/appStyles'

export function InvoiceDashboardCards({ invoices }) {
  const openTotal = invoices
    .filter((invoice) => invoice.status === 'offen')
    .reduce((sum, invoice) => sum + Number(invoice.total_amount || 0), 0)

  const paidTotal = invoices
    .filter((invoice) => invoice.status === 'bezahlt')
    .reduce((sum, invoice) => sum + Number(invoice.total_amount || 0), 0)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 15 }}>
      <div style={{ ...cardStyle, borderTop: `6px solid ${colors.black}` }}>
        <strong style={dashboardLabelStyle}>Rechnungen</strong>
        <h2 style={dashboardNumberStyle}>{invoices.length}</h2>
      </div>

      <div style={{ ...cardStyle, borderTop: `6px solid ${colors.red}` }}>
        <strong style={dashboardLabelStyle}>Offen</strong>
        <h2 style={dashboardNumberStyle}>{openTotal.toFixed(2)} €</h2>
      </div>

      <div style={{ ...cardStyle, borderTop: `6px solid ${colors.blue}` }}>
        <strong style={dashboardLabelStyle}>Bezahlt</strong>
        <h2 style={dashboardNumberStyle}>{paidTotal.toFixed(2)} €</h2>
      </div>
    </div>
  )
}
