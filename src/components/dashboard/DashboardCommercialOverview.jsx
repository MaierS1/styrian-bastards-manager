import { cardStyle, colors, dashboardLabelStyle, mutedTextStyle, secondaryButtonStyle } from '../../styles/appStyles'

function formatAmount(amountCents) {
  return `${(Number(amountCents || 0) / 100).toFixed(2)} EUR`
}

function formatDate(value) {
  return value ? String(value).slice(0, 10) : '-'
}

export function DashboardCommercialOverview({ commercialData, onNavigate }) {
  const topMerchItem = commercialData.topMerchItems[0]

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ ...cardStyle, borderTop: `6px solid ${colors.navy}` }}>
        <strong style={dashboardLabelStyle}>Sponsoren-Status</strong>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginTop: 14 }}>
          <div style={cardStyle}>
            <strong>Aktive Sponsoren</strong>
            <br />
            <strong>{commercialData.activeSponsorsCount}</strong>
            <br />
            Aktive Verträge: <strong>{commercialData.activeContractsCount}</strong>
            <br />
            Vertragsvolumen: <strong>{formatAmount(commercialData.sponsorshipContractVolumeCents)}</strong>
          </div>

          <div style={cardStyle}>
            <strong>Laufende Verträge</strong>
            <br />
            Auslaufend in 30 Tagen: <strong>{commercialData.expiringContracts.length}</strong>
            <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
              {commercialData.expiringContracts.slice(0, 3).map((contract) => (
                <div key={contract.id} style={{ paddingBottom: 8, borderBottom: `1px solid ${colors.border}` }}>
                  <strong>{contract.title || 'Ohne Titel'}</strong>
                  <div style={mutedTextStyle}>bis {formatDate(contract.ends_on)}</div>
                </div>
              ))}
            </div>

            {commercialData.expiringContracts.length > 3 && (
              <button type="button" onClick={() => onNavigate?.('sponsors')} style={{ ...secondaryButtonStyle, width: 'auto', marginTop: 10 }}>
                Alle anzeigen
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={{ ...cardStyle, borderTop: `6px solid ${colors.blue}` }}>
        <strong style={dashboardLabelStyle}>Fanartikel/Shop-Status</strong>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginTop: 14 }}>
          <div style={cardStyle}>
            <strong>Fanartikel</strong>
            <br />
            Umsatz: <strong>{formatAmount(commercialData.merchRevenueCents)}</strong>
            <br />
            Verkaufte Stück: <strong>{commercialData.merchQuantitySold}</strong>
            <br />
            Niedriger Bestand: <strong>{commercialData.lowStockVariants.length}</strong>
            <br />
            Top-Artikel:{' '}
            <strong>
              {topMerchItem ? `${topMerchItem.name || 'Fanartikel'} (${topMerchItem.quantity} Stk.)` : '-'}
            </strong>
          </div>

          <div style={cardStyle}>
            <strong>Niedriger Bestand</strong>
            <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
              {commercialData.lowStockVariants.slice(0, 3).map((variant) => (
                <div key={variant.id} style={{ paddingBottom: 8, borderBottom: `1px solid ${colors.border}` }}>
                  <strong>{variant.name || 'Fanartikel'}</strong>
                  <div style={mutedTextStyle}>Bestand: {Number(variant.stock_quantity || 0)}</div>
                </div>
              ))}
            </div>

            {commercialData.lowStockVariants.length > 3 && (
              <button type="button" onClick={() => onNavigate?.('merch')} style={{ ...secondaryButtonStyle, width: 'auto', marginTop: 10 }}>
                Alle anzeigen
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
