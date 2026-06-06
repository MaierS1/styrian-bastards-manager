import { cardStyle, colors, dashboardLabelStyle, mutedTextStyle } from '../../styles/appStyles'
import { DashboardStats } from './DashboardStats'

export function DashboardMemberOverview({
  activeMembersCount,
  newMembersCount,
  openFeesCount,
  openFeesTotal,
  testMembersCount,
  memberTypeStats,
  feeStats,
  getStatsMax,
}) {
  const safeMemberTypeStats = Array.isArray(memberTypeStats) ? memberTypeStats : []
  const safeFeeStats = Array.isArray(feeStats) ? feeStats : []
  const safeGetStatsMax = typeof getStatsMax === 'function' ? getStatsMax : () => 1

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ width: '100%', boxSizing: 'border-box', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        <div style={{ ...cardStyle, marginBottom: 0, borderTop: `6px solid ${colors.blue}` }}>
          <strong style={dashboardLabelStyle}>Aktive Mitglieder</strong>
          <h2 style={{ marginTop: 10, marginBottom: 0 }}>{activeMembersCount}</h2>
          <p style={{ ...mutedTextStyle, marginTop: 6, marginBottom: 0 }}>Status: aktiv</p>
        </div>

        <div style={{ ...cardStyle, marginBottom: 0, borderTop: `6px solid ${colors.red}` }}>
          <strong style={dashboardLabelStyle}>Neue Mitglieder</strong>
          <h2 style={{ marginTop: 10, marginBottom: 0 }}>{newMembersCount}</h2>
          <p style={{ ...mutedTextStyle, marginTop: 6, marginBottom: 0 }}>Zuletzt 30 Tage</p>
        </div>

        <div style={{ ...cardStyle, marginBottom: 0, borderTop: `6px solid ${colors.navy}` }}>
          <strong style={dashboardLabelStyle}>Offene Beiträge</strong>
          <h2 style={{ marginTop: 10, marginBottom: 0 }}>{openFeesCount}</h2>
          <p style={{ ...mutedTextStyle, marginTop: 6, marginBottom: 0 }}>{openFeesTotal.toFixed(2)} EUR offen</p>
        </div>

        <div style={{ ...cardStyle, marginBottom: 0, borderTop: `6px solid ${colors.black}` }}>
          <strong style={dashboardLabelStyle}>Testdaten</strong>
          <h2 style={{ marginTop: 10, marginBottom: 0 }}>{testMembersCount}</h2>
          <p style={{ ...mutedTextStyle, marginTop: 6, marginBottom: 0 }}>Testmitglieder vorhanden</p>
        </div>
      </div>

        <DashboardStats memberTypeStats={safeMemberTypeStats} feeStats={safeFeeStats} getStatsMax={safeGetStatsMax} />
      </div>
  )
}
