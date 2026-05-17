import {
  buttonStyle,
  cardStyle,
  headingStyle,
  mutedTextStyle,
  secondaryButtonStyle,
} from '../../styles/appStyles'

export function DocumentsList({
  documents,
  isAdmin,
  openDocument,
  deleteDocument,
}) {
  return (
    <>
      <h3 style={headingStyle}>Dokumentenliste</h3>

      {documents.length === 0 && <p style={mutedTextStyle}>Noch keine Dokumente vorhanden.</p>}

      {documents.map((document) => (
        <div key={document.id} style={cardStyle}>
          <strong>{document.title}</strong>
          <br />
          Kategorie: {document.category}
          <br />
          Datum: {document.document_date || '-'}
          <br />
          Datei: {document.file_name || document.file_path}
          <br />
          Beschreibung: {document.description || '-'}
          <br />

          <button onClick={() => openDocument(document.file_path)} style={buttonStyle}>
            Öffnen / Download
          </button>

          {isAdmin() && (
            <button
              onClick={() => deleteDocument(document)}
              style={{ ...secondaryButtonStyle, borderColor: '#b91c1c', color: '#b91c1c' }}
            >
              Dokument löschen
            </button>
          )}
        </div>
      ))}
    </>
  )
}
