import { cardStyle, colors, dashboardLabelStyle } from '../../styles/appStyles'

export function PortalProfileCards({ currentMember, getRoleLabel, currentMemberFee }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 15 }}>
      <div style={{ ...cardStyle, borderTop: `6px solid ${colors.black}` }}>
        <strong style={dashboardLabelStyle}>Meine Daten</strong>
        <br />
        {currentMember.first_name} {currentMember.last_name}
        <br />
        {currentMember.email || '-'}
        <br />
        {currentMember.phone || '-'}
        <br />
        Mitgliedsnummer: {currentMember.member_number || '-'}
      </div>

      <div style={{ ...cardStyle, borderTop: `6px solid ${colors.blue}` }}>
        <strong style={dashboardLabelStyle}>Mitgliedschaft</strong>
        <br />
        Art: {currentMember.member_type || '-'}
        <br />
        Funktion: {getRoleLabel(currentMember.role || 'mitglied')}
        <br />
        Status: {currentMember.status || '-'}
      </div>

      <div style={{ ...cardStyle, borderTop: `6px solid ${currentMemberFee?.paid ? colors.successText : colors.red}` }}>
        <strong style={dashboardLabelStyle}>Mein Beitrag 2026</strong>
        <br />
        Betrag: {currentMemberFee ? `${Number(currentMemberFee.amount || 0).toFixed(2)} €` : '-'}
        <br />
        Status: {currentMemberFee?.paid ? 'bezahlt' : 'offen'}
        <br />
        Zahlungsdatum: {currentMemberFee?.paid_at || '-'}
      </div>
    </div>
  )
}
