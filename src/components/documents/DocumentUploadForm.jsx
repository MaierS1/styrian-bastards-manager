import {
  buttonStyle,
  headingStyle,
  inputStyle,
  secondaryButtonStyle,
} from '../../styles/appStyles'

export function DocumentUploadForm({
  documentTitle,
  setDocumentTitle,
  documentCategory,
  setDocumentCategory,
  documentDate,
  setDocumentDate,
  documentDescription,
  setDocumentDescription,
  setDocumentFile,
  uploadDocument,
  resetDocumentForm,
}) {
  return (
    <>
      <h3 style={headingStyle}>Dokument hochladen</h3>

      <input
        placeholder="Titel, z.B. Statuten 2026"
        value={documentTitle}
        onChange={(e) => setDocumentTitle(e.target.value)}
        style={inputStyle}
      />

      <select value={documentCategory} onChange={(e) => setDocumentCategory(e.target.value)} style={inputStyle}>
        <option value="statuten">Statuten</option>
        <option value="sitzung">Sitzung / Protokoll</option>
        <option value="bescheid">Bescheid</option>
        <option value="rechnung">Rechnung</option>
        <option value="vertrag">Vertrag</option>
        <option value="sonstiges">Sonstiges</option>
      </select>

      <input
        type="date"
        value={documentDate}
        onChange={(e) => setDocumentDate(e.target.value)}
        style={inputStyle}
      />

      <input
        placeholder="Beschreibung"
        value={documentDescription}
        onChange={(e) => setDocumentDescription(e.target.value)}
        style={inputStyle}
      />

      <input
        type="file"
        accept=".pdf,image/*,.doc,.docx,.xls,.xlsx,.csv"
        onChange={(e) => setDocumentFile(e.target.files[0])}
        style={inputStyle}
      />

      <button onClick={uploadDocument} style={buttonStyle}>
        Dokument hochladen
      </button>

      <button onClick={resetDocumentForm} style={secondaryButtonStyle}>
        Formular leeren
      </button>
    </>
  )
}
