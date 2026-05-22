import { cardStyle, colors, dashboardLabelStyle } from '../../styles/appStyles'

export function DashboardCommercialOverview({ commercialData }) {
  const topMerchItem = commercialData.topMerchItems[0]

  return (
    <div style={{ ...cardStyle, borderTop: `6px solid ${colors.navy}` }}>
      <strong style={dashboardLabelStyle}>Sponsoring & Fanartikel</strong>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginTop: 14 }}>
        <div style={cardStyle}>
          <strong>Sponsoring</strong>
          <br />
          Aktive Sponsoren: <strong>{commercialData.activeSponsorsCount}</strong>
          <br />
          Aktive Verträge: <strong>{commercialData.activeContractsCount}</strong>
          <br />
          Auslaufende Verträge: <strong>{commercialData.expiringContracts.length}</strong>
          <br />
          Vertragsvolumen: <strong>{formatAmount(commercialData.sponsorshipContractVolumeCents)}</strong>
        </div>

        <div style={cardStyle}>
          <strong>Fanartikel</strong>
          <br />
          Umsatz: <strong>{formatAmount(commercialData.merchRevenueCents)}</strong>
          <br />
          Verkaufte Stueck: <strong>{commercialData.merchQuantitySold}</strong>
          <br />
          Niedriger Bestand: <strong>{commercialData.lowStockVariants.length}</strong>
          <br />
          Top-Artikel:{' '}
          <strong>
            {topMerchItem ? `${topMerchItem.name || 'Fanartikel'} (${topMerchItem.quantity} Stk.)` : '-'}
          </strong>
        </div>
      </div>
    </div>
  )
}

function formatAmount(amountCents) {
  return `${(Number(amountCents || 0) / 100).toFixed(2)} EUR`
}
