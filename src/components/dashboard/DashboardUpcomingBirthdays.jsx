import { cardStyle, colors, dashboardLabelStyle, mutedTextStyle, secondaryButtonStyle } from '../../styles/appStyles'

function formatBirthdayDate(value) {
  if (!value) return '-'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10)

  return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.`
}

function formatDaysUntil(daysUntil) {
  if (daysUntil === 0) return 'heute'
  if (daysUntil === 1) return 'in 1 Tag'
  return `in ${Number(daysUntil || 0)} Tagen`
}

export function DashboardUpcomingBirthdays({ birthdays, onNavigate }) {
  const safeBirthdays = Array.isArray(birthdays) ? birthdays : []

  return (
    <div style={{ ...cardStyle, borderTop: `6px solid ${colors.blue}` }}>
      <strong style={dashboardLabelStyle}>Naechste Geburtstage</strong>

      {safeBirthdays.length === 0 ? (
        <p style={{ ...mutedTextStyle, marginTop: 12, marginBottom: 0 }}>Keine bevorstehenden Geburtstage</p>
      ) : (
        <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
          {safeBirthdays.slice(0, 5).map((birthday, index) => {
            const birthdayItem = birthday || {}
            const age = birthdayItem.age !== null && birthdayItem.age !== undefined ? ` (${birthdayItem.age})` : ''

            return (
              <button
                key={birthdayItem.id || index}
                type="button"
                onClick={() => onNavigate?.('members')}
                style={{
                  ...cardStyle,
                  marginBottom: 0,
                  boxShadow: 'none',
                  borderLeft: `5px solid ${colors.blue}`,
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <strong>
                  {formatBirthdayDate(birthdayItem.nextBirthdayDate || birthdayItem.birthdate)} {birthdayItem.name || 'Mitglied'}{age}
                </strong>
                <div style={mutedTextStyle}>{formatDaysUntil(birthdayItem.daysUntil)}</div>
              </button>
            )
          })}
        </div>
      )}

      <button
        type="button"
        onClick={() => onNavigate?.('members')}
        style={{ ...secondaryButtonStyle, width: 'auto', marginTop: 12 }}
      >
        Alle Geburtstage anzeigen
      </button>
    </div>
  )
}
