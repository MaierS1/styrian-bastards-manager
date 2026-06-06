import {
  buttonStyle,
  colors,
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
  documentShowInMemberArea,
  setDocumentShowInMemberArea,
  documentMembersOnly,
  setDocumentMembersOnly,
  documentMemberAreaCategory,
  setDocumentMemberAreaCategory,
  documentSortOrder,
  setDocumentSortOrder,
  documentIsActive,
  setDocumentIsActive,
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

      <h4 style={subHeadingStyle}>Mitgliederbereich</h4>
      <p style={hintStyle}>
        Neue Dokumente sind standardmaessig nicht im Mitgliederbereich sichtbar. Aktiviere die
        Freigabe nur fuer Dokumente, die eingeloggte Mitglieder sehen duerfen.
      </p>

      <label style={checkboxLabelStyle}>
        <input
          type="checkbox"
          checked={documentShowInMemberArea}
          onChange={(e) => setDocumentShowInMemberArea(e.target.checked)}
        />
        Im Mitgliederbereich anzeigen
      </label>

      <label style={checkboxLabelStyle}>
        <input
          type="checkbox"
          checked={documentMembersOnly}
          onChange={(e) => setDocumentMembersOnly(e.target.checked)}
        />
        Nur fuer Mitglieder
      </label>

      <input
        placeholder="Kategorie fuer Mitgliederbereich"
        value={documentMemberAreaCategory}
        onChange={(e) => setDocumentMemberAreaCategory(e.target.value)}
        style={inputStyle}
      />

      <input
        type="number"
        min="0"
        step="1"
        placeholder="Sortierung"
        value={documentSortOrder}
        onChange={(e) => setDocumentSortOrder(e.target.value)}
        style={inputStyle}
      />

      <label style={checkboxLabelStyle}>
        <input
          type="checkbox"
          checked={documentIsActive}
          onChange={(e) => setDocumentIsActive(e.target.checked)}
        />
        Aktiv
      </label>

      <button onClick={uploadDocument} style={buttonStyle}>
        Dokument hochladen
      </button>

      <button onClick={resetDocumentForm} style={secondaryButtonStyle}>
        Formular leeren
      </button>
    </>
  )
}

const subHeadingStyle = {
  margin: '14px 0 8px',
  color: colors.black,
}

const hintStyle = {
  marginTop: 0,
  marginBottom: 12,
  color: colors.muted,
  lineHeight: 1.5,
}

const checkboxLabelStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  margin: '8px 0',
  color: colors.text,
  fontWeight: 700,
}
