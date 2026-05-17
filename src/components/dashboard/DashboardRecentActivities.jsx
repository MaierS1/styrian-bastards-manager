import { cardStyle } from '../../styles/appStyles'

export function DashboardRecentActivities({ cashEntries, documents }) {
  return (
    <div style={cardStyle}>
      <strong>Letzte Aktivitäten</strong>
      <br />

      <u>Kassa:</u>
      {cashEntries.slice(0, 3).map((entry) => (
        <div key={entry.id}>
          {entry.entry_date} · {entry.amount} €
        </div>
      ))}

      <br />

      <u>Dokumente:</u>
      {documents.slice(0, 3).map((document) => (
        <div key={document.id}>
          {document.title}
        </div>
      ))}
    </div>
  )
}
