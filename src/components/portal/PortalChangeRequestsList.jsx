import { cardStyle, headingStyle, mutedTextStyle } from '../../styles/appStyles'

export function PortalChangeRequestsList({ getMyMemberChangeRequests }) {
  const requests = getMyMemberChangeRequests()

  return (
    <>
      <h3 style={headingStyle}>Meine Änderungsanträge</h3>

      {requests.length === 0 && <p style={mutedTextStyle}>Keine Änderungsanträge vorhanden.</p>}

      {requests.slice(0, 5).map((request) => (
        <div key={request.id} style={cardStyle}>
          <strong>Status: {request.status}</strong>
          <br />
          Erstellt: {request.created_at ? new Date(request.created_at).toLocaleString('de-AT') : '-'}
          <br />
          Geändert: {Object.keys(request.requested_data || {}).join(', ')}
          {request.review_note && (
            <>
              <br />
              Notiz: {request.review_note}
            </>
          )}
        </div>
      ))}
    </>
  )
}
