import { useState } from 'react'
import {
  buttonStyle,
  cardStyle,
  colors,
  headingStyle,
  inputStyle,
  mutedTextStyle,
  secondaryButtonStyle,
} from '../../styles/appStyles'

export function DocumentsList({
  documents,
  isAdmin,
  canManageDocuments,
  openDocument,
  deleteDocument,
  saveDocumentMemberAreaSettings,
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
          Mitgliederbereich: {document.show_in_member_area ? 'sichtbar' : 'nicht sichtbar'} -{' '}
          {document.members_only !== false ? 'nur Mitglieder' : 'nicht Mitglieder-only'} -{' '}
          {document.is_active !== false ? 'aktiv' : 'inaktiv'}
          <br />

          <button onClick={() => openDocument(document.file_path)} style={buttonStyle}>
            Oeffnen / Download
          </button>

          {isAdmin() && (
            <button
              onClick={() => deleteDocument(document)}
              style={{ ...secondaryButtonStyle, borderColor: '#b91c1c', color: '#b91c1c' }}
            >
              Dokument loeschen
            </button>
          )}

          {canManageDocuments() && (
            <DocumentMemberAreaSettings
              document={document}
              saveDocumentMemberAreaSettings={saveDocumentMemberAreaSettings}
            />
          )}
        </div>
      ))}
    </>
  )
}

function DocumentMemberAreaSettings({ document, saveDocumentMemberAreaSettings }) {
  const [showInMemberArea, setShowInMemberArea] = useState(Boolean(document.show_in_member_area))
  const [membersOnly, setMembersOnly] = useState(document.members_only !== false)
  const [memberAreaCategory, setMemberAreaCategory] = useState(document.member_area_category || '')
  const [sortOrder, setSortOrder] = useState(String(document.sort_order ?? 0))
  const [isActive, setIsActive] = useState(document.is_active !== false)
  const [saving, setSaving] = useState(false)

  async function saveSettings() {
    const parsedSortOrder = Number.parseInt(sortOrder, 10)

    if (Number.isNaN(parsedSortOrder) || parsedSortOrder < 0) {
      alert('Sortierung muss eine positive ganze Zahl sein.')
      return
    }

    setSaving(true)
    try {
      await saveDocumentMemberAreaSettings(document, {
        show_in_member_area: showInMemberArea,
        members_only: membersOnly,
        member_area_category: memberAreaCategory.trim() || null,
        sort_order: parsedSortOrder,
        is_active: isActive,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={settingsStyle}>
      <strong>Mitgliederbereich</strong>

      <label style={checkboxLabelStyle}>
        <input
          type="checkbox"
          checked={showInMemberArea}
          onChange={(event) => setShowInMemberArea(event.target.checked)}
        />
        Im Mitgliederbereich anzeigen
      </label>

      <label style={checkboxLabelStyle}>
        <input
          type="checkbox"
          checked={membersOnly}
          onChange={(event) => setMembersOnly(event.target.checked)}
        />
        Nur fuer Mitglieder
      </label>

      <input
        placeholder="Kategorie fuer Mitgliederbereich"
        value={memberAreaCategory}
        onChange={(event) => setMemberAreaCategory(event.target.value)}
        style={inputStyle}
      />

      <input
        type="number"
        min="0"
        step="1"
        placeholder="Sortierung"
        value={sortOrder}
        onChange={(event) => setSortOrder(event.target.value)}
        style={inputStyle}
      />

      <label style={checkboxLabelStyle}>
        <input
          type="checkbox"
          checked={isActive}
          onChange={(event) => setIsActive(event.target.checked)}
        />
        Aktiv
      </label>

      <button onClick={saveSettings} disabled={saving} style={secondaryButtonStyle}>
        {saving ? 'Einstellungen werden gespeichert...' : 'Mitgliederbereich speichern'}
      </button>
    </div>
  )
}

const settingsStyle = {
  marginTop: 12,
  paddingTop: 12,
  borderTop: `1px solid ${colors.border}`,
}

const checkboxLabelStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  margin: '8px 0',
  color: colors.text,
  fontWeight: 700,
}
