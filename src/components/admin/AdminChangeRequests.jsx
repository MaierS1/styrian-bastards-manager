import { buttonStyle, cardStyle, headingStyle, mutedTextStyle, secondaryButtonStyle, sectionStyle } from '../../styles/appStyles'

export function AdminChangeRequests({
  members,
  getPendingMemberChangeRequests,
  approveMemberChangeRequest,
  rejectMemberChangeRequest,
}) {
  return (
    <section style={sectionStyle}>
      <h2 style={headingStyle}>Mitgliedsdaten-Freigaben</h2>

      <p style={mutedTextStyle}>
        Mitglieder können Änderungswünsche einreichen. Hier kann der Vorstand/Admin diese prüfen und freigeben.
      </p>

      {getPendingMemberChangeRequests().length === 0 && (
        <p style={mutedTextStyle}>Keine offenen Änderungsanträge.</p>
      )}

      {getPendingMemberChangeRequests().map((request) => {
        const member = members.find((item) => item.id === request.member_id)
        const requestedData = request.requested_data || {}

        return (
          <div key={request.id} style={cardStyle}>
            <strong>
              {member ? `${member.first_name || ''} ${member.last_name || ''}` : request.member_id}
            </strong>
            <br />
            Eingereicht: {request.created_at ? new Date(request.created_at).toLocaleString('de-AT') : '-'}
            <br />

            <div style={{ overflowX: 'auto', marginTop: 10 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
                <thead>
                  <tr>
                    {['Feld', 'Aktuell', 'Neu'].map((header) => (
                      <th key={header} style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #d1d5db' }}>
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(requestedData).map((key) => (
                    <tr key={key}>
                      <td style={{ padding: 8, borderBottom: '1px solid #e5e7eb' }}>{key}</td>
                      <td style={{ padding: 8, borderBottom: '1px solid #e5e7eb' }}>{member?.[key] || '-'}</td>
                      <td style={{ padding: 8, borderBottom: '1px solid #e5e7eb' }}>
                        <strong>{requestedData[key] || '-'}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button onClick={() => approveMemberChangeRequest(request)} style={buttonStyle}>
              Genehmigen & übernehmen
            </button>

            <button
              onClick={() => rejectMemberChangeRequest(request)}
              style={{ ...secondaryButtonStyle, borderColor: '#c1121f', color: '#c1121f' }}
            >
              Ablehnen
            </button>
          </div>
        )
      })}
    </section>
  )
}
