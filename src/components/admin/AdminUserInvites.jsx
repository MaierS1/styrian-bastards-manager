import { buttonStyle, cardStyle, headingStyle, mutedTextStyle, sectionStyle } from '../../styles/appStyles'

export function AdminUserInvites({
  members,
  getAppRoleLabel,
  inviteMemberUser,
  invitingMemberId,
}) {
  return (
    <section style={sectionStyle}>
      <h2 style={headingStyle}>Benutzerverwaltung</h2>

      <p style={mutedTextStyle}>
        Hier kannst du für Mitglieder einen App-Zugang per E-Mail-Einladung erstellen.
        Der Benutzer wird automatisch mit dem Mitglied verknüpft.
      </p>

      <h3 style={headingStyle}>Mitglieder ohne Login</h3>

      {members.filter((member) => !member.auth_user_id).length === 0 && (
        <p style={mutedTextStyle}>Alle Mitglieder sind bereits mit einem Login verknüpft.</p>
      )}

      {members
        .filter((member) => !member.auth_user_id)
        .map((member) => (
          <div key={member.id} style={cardStyle}>
            <strong>
              {member.first_name || ''} {member.last_name || ''}
            </strong>
            <br />
            E-Mail: {member.email || '-'}
            <br />
            Aktuelles App-Recht: {getAppRoleLabel(member.app_role || 'readonly')}
            <br />

            <button
              onClick={() => inviteMemberUser(member)}
              style={buttonStyle}
              disabled={invitingMemberId === member.id || !member.email}
            >
              {invitingMemberId === member.id ? 'Einladung läuft...' : 'Einladung senden'}
            </button>
          </div>
        ))}

      <h3 style={headingStyle}>Verknüpfte Benutzer</h3>

      {members
        .filter((member) => member.auth_user_id)
        .map((member) => (
          <div key={member.id} style={cardStyle}>
            <strong>
              {member.first_name || ''} {member.last_name || ''}
            </strong>
            <br />
            E-Mail: {member.email || '-'}
            <br />
            App-Recht: {getAppRoleLabel(member.app_role || 'readonly')}
            <br />
            Auth User ID: {member.auth_user_id}
          </div>
        ))}
    </section>
  )
}
