import { cardStyle, headingStyle, mutedTextStyle, secondaryButtonStyle, sectionStyle } from '../../styles/appStyles'

export function AdminAuditLog({
  auditLogs,
  exportAuditLogsCsv,
}) {
  return (
    <section style={sectionStyle}>
      <h2 style={headingStyle}>Audit Log</h2>

      <p style={mutedTextStyle}>
        Zeigt die letzten 100 protokollierten Änderungen. Der vollständige Export ist über „Audit Log CSV“ möglich.
      </p>

      <button onClick={exportAuditLogsCsv} style={secondaryButtonStyle}>
        Audit Log CSV
      </button>

      {auditLogs.length === 0 && <p style={mutedTextStyle}>Noch keine Audit-Logs vorhanden.</p>}

      {auditLogs.slice(0, 20).map((log) => (
        <div key={log.id} style={cardStyle}>
          <strong>{log.action}</strong> · {log.table_name}
          <br />
          {log.created_at ? new Date(log.created_at).toLocaleString('de-AT') : '-'} · {log.user_email || '-'}
          <br />
          Datensatz: {log.record_id || '-'}
        </div>
      ))}
    </section>
  )
}
