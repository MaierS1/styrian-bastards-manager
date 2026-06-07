import { cardStyle, colors, dashboardLabelStyle, mutedTextStyle, secondaryButtonStyle } from '../../styles/appStyles'

function formatAmount(amountCents) {
  return `${(Number(amountCents || 0) / 100).toFixed(2)} EUR`
}

function formatDate(value) {
  return value ? String(value).slice(0, 10) : '-'
}

function MerchStatus({ safeData, lowStockVariants, topMerchItem, onNavigate }) {
  return (
    <div style={{ ...cardStyle, borderTop: `6px solid ${colors.blue}` }}>
      <strong style={dashboardLabelStyle}>Fanartikel/Shop-Status</strong>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginTop: 14 }}>
        <div style={cardStyle}>
          <strong>Fanartikel</strong>
          <br />
          Umsatz: <strong>{formatAmount(safeData.merchRevenueCents)}</strong>
          <br />
          Verkaufte Stueck: <strong>{safeData.merchQuantitySold || 0}</strong>
          <br />
          Niedriger Bestand: <strong>{lowStockVariants.length}</strong>
          <br />
          Top-Artikel:{' '}
          <strong>
            {topMerchItem ? `${topMerchItem.name || 'Fanartikel'} (${topMerchItem.quantity} Stk.)` : '-'}
          </strong>
        </div>

        <div style={cardStyle}>
          <strong>Niedriger Bestand</strong>
          <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
            {lowStockVariants.slice(0, 3).map((variant, index) => {
              const variantItem = variant || {}

              return (
                <div key={variantItem.id || index} style={{ paddingBottom: 8, borderBottom: `1px solid ${colors.border}` }}>
                  <strong>{variantItem.name || 'Fanartikel'}</strong>
                  <div style={mutedTextStyle}>Bestand: {Number(variantItem.stock_quantity || 0)}</div>
                </div>
              )
            })}
          </div>

          {lowStockVariants.length > 3 && (
            <button
              type="button"
              onClick={() => onNavigate?.('merch')}
              style={{ ...secondaryButtonStyle, width: 'auto', marginTop: 10 }}
            >
              Alle anzeigen
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function SponsorsStatus({ safeData, expiringContracts, onNavigate }) {
  return (
    <div style={{ ...cardStyle, borderTop: `6px solid ${colors.navy}` }}>
      <strong style={dashboardLabelStyle}>Sponsoren-Status</strong>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginTop: 14 }}>
        <div style={cardStyle}>
          <strong>Aktive Sponsoren</strong>
          <br />
          <strong>{safeData.activeSponsorsCount || 0}</strong>
          <br />
          Aktive Vertraege: <strong>{safeData.activeContractsCount || 0}</strong>
          <br />
          Vertragsvolumen: <strong>{formatAmount(safeData.sponsorshipContractVolumeCents)}</strong>
        </div>

        <div style={cardStyle}>
          <strong>Laufende Vertraege</strong>
          <br />
          Auslaufend in 30 Tagen: <strong>{expiringContracts.length}</strong>
          <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
            {expiringContracts.slice(0, 3).map((contract, index) => {
              const contractItem = contract || {}

              return (
                <div key={contractItem.id || index} style={{ paddingBottom: 8, borderBottom: `1px solid ${colors.border}` }}>
                  <strong>{contractItem.title || 'Ohne Titel'}</strong>
                  <div style={mutedTextStyle}>bis {formatDate(contractItem.ends_on)}</div>
                </div>
              )
            })}
          </div>

          {expiringContracts.length > 3 && (
            <button
              type="button"
              onClick={() => onNavigate?.('sponsors')}
              style={{ ...secondaryButtonStyle, width: 'auto', marginTop: 10 }}
            >
              Alle anzeigen
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export function DashboardCommercialOverview({ commercialData, onNavigate, section = 'all' }) {
  const safeData = commercialData || {}
  const topMerchItems = Array.isArray(safeData.topMerchItems) ? safeData.topMerchItems : []
  const expiringContracts = Array.isArray(safeData.expiringContracts) ? safeData.expiringContracts : []
  const lowStockVariants = Array.isArray(safeData.lowStockVariants) ? safeData.lowStockVariants : []
  const topMerchItem = topMerchItems[0] || null
  const showMerch = section === 'all' || section === 'merch'
  const showSponsors = section === 'all' || section === 'sponsors'

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {showMerch && (
        <MerchStatus
          safeData={safeData}
          lowStockVariants={lowStockVariants}
          topMerchItem={topMerchItem}
          onNavigate={onNavigate}
        />
      )}
      {showSponsors && (
        <SponsorsStatus
          safeData={safeData}
          expiringContracts={expiringContracts}
          onNavigate={onNavigate}
        />
      )}
    </div>
  )
}
