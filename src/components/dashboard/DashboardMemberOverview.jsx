import { cardStyle, colors, dashboardLabelStyle, mutedTextStyle } from '../../styles/appStyles'
import { DashboardStats } from './DashboardStats'

const euroFormatter = new Intl.NumberFormat('de-AT', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

function formatEuro(value) {
  return `${euroFormatter.format(Number(value || 0))} €`
}

function MetricCard({ value, label, detail, borderColor }) {
  return (
    <div style={{ ...cardStyle, marginBottom: 0, borderTop: `6px solid ${borderColor}` }}>
      <div style={{ fontSize: 32, lineHeight: 1, fontWeight: 900, color: colors.black }}>
        {value}
      </div>
      <div style={{ ...dashboardLabelStyle, marginTop: 10, fontSize: 13 }}>{label}</div>
      {detail && <div style={{ ...mutedTextStyle, marginTop: 6, marginBottom: 0 }}>{detail}</div>}
    </div>
  )
}

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
      <div style={{ width: '100%', boxSizing: 'border-box', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12 }}>
        <MetricCard
          value={Number(activeMembersCount || 0)}
          label="Aktive Mitglieder"
          detail="Status: aktiv"
          borderColor={colors.blue}
        />

        <MetricCard
          value={Number(newMembersCount || 0)}
          label="Neue Mitglieder"
          detail="Zuletzt 30 Tage"
          borderColor={colors.red}
        />

        <MetricCard
          value={formatEuro(openFeesTotal)}
          label="Offene Beiträge"
          detail={`${Number(openFeesCount || 0)} Beiträge offen`}
          borderColor={colors.navy}
        />

        <MetricCard
          value={Number(testMembersCount || 0)}
          label="Testdaten"
          detail="Testmitglieder vorhanden"
          borderColor={colors.black}
        />
      </div>

      <DashboardStats memberTypeStats={safeMemberTypeStats} feeStats={safeFeeStats} getStatsMax={safeGetStatsMax} />
    </div>
  )
}
