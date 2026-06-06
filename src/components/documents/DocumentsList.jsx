import { useEffect, useState } from 'react'
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
          <div style={badgeRowStyle}>
            <StatusBadge
              active={Boolean(document.show_in_member_area)}
              label={document.show_in_member_area ? 'Mitgliederbereich' : 'Nicht im Mitgliederbereich'}
            />
            <StatusBadge
              active={document.members_only !== false}
              label={document.members_only !== false ? 'Nur Mitglieder' : 'Nicht Mitglieder-only'}
            />
            <StatusBadge
              active={document.is_active !== false}
              label={document.is_active !== false ? 'Aktiv' : 'Inaktiv'}
            />
          </div>
          Kategorie im Mitgliederbereich: {document.member_area_category || '-'}
          <br />
          Sortierung im Mitgliederbereich: {document.sort_order ?? 0}
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

  useEffect(() => {
    setShowInMemberArea(Boolean(document.show_in_member_area))
    setMembersOnly(document.members_only !== false)
    setMemberAreaCategory(document.member_area_category || '')
    setSortOrder(String(document.sort_order ?? 0))
    setIsActive(document.is_active !== false)
  }, [
    document.show_in_member_area,
    document.members_only,
    document.member_area_category,
    document.sort_order,
    document.is_active,
  ])

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
      <strong>Freigabe fuer den Mitgliederbereich bearbeiten</strong>
      <p style={hintStyle}>
        Standardmaessig werden Dokumente nicht im Mitgliederbereich angezeigt. Aktiviere die Freigabe
        nur fuer Dokumente, die eingeloggte Mitglieder sehen duerfen.
      </p>

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

function StatusBadge({ active, label }) {
  return (
    <span style={active ? activeBadgeStyle : inactiveBadgeStyle}>
      {label}
    </span>
  )
}

const badgeRowStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 8,
  margin: '10px 0 6px',
}

const badgeBaseStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  borderRadius: 999,
  padding: '3px 9px',
  fontSize: 13,
  fontWeight: 800,
}

const activeBadgeStyle = {
  ...badgeBaseStyle,
  background: colors.successBg,
  color: colors.successText,
}

const inactiveBadgeStyle = {
  ...badgeBaseStyle,
  background: colors.dangerBg,
  color: colors.dangerText,
}

const settingsStyle = {
  marginTop: 12,
  padding: 14,
  border: `2px solid ${colors.border}`,
  borderRadius: 10,
  background: colors.offWhite,
}

const hintStyle = {
  ...mutedTextStyle,
  marginTop: 6,
  marginBottom: 12,
}

const checkboxLabelStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  margin: '8px 0',
  color: colors.text,
  fontWeight: 700,
}
