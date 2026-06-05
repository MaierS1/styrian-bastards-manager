import { useEffect, useState } from 'react'
import {
  buttonStyle,
  cardStyle,
  colors,
  headingStyle,
  inputStyle,
  mutedTextStyle,
  secondaryButtonStyle,
  sectionStyle,
} from '../../styles/appStyles'
import {
  deactivateMemberDocumentRecord,
  deleteMemberDocumentRecord,
  fetchMemberDocuments,
  saveMemberDocumentRecord,
} from '../../services/repositories/memberAreaRepository'

const emptyForm = {
  title: '',
  description: '',
  file_url: '',
  category: '',
  is_active: true,
  members_only: true,
  sort_order: '0',
}

export function MemberAreaPage({ canManageMemberArea }) {
  const [documents, setDocuments] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [actionId, setActionId] = useState(null)
  const [notice, setNotice] = useState('')
  const canManage = canManageMemberArea()

  useEffect(() => {
    loadDocuments()
  }, [])

  async function loadDocuments() {
    setLoading(true)
    try {
      const { data, error } = await fetchMemberDocuments()
      if (error) {
        setNotice(error.message)
        return
      }
      setDocuments(data || [])
    } finally {
      setLoading(false)
    }
  }

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function resetForm() {
    setEditingId(null)
    setForm(emptyForm)
    setNotice('')
  }

  function editDocument(document) {
    setEditingId(document.id)
    setForm({
      title: document.title || '',
      description: document.description || '',
      file_url: document.file_url || '',
      category: document.category || '',
      is_active: document.is_active !== false,
      members_only: document.members_only !== false,
      sort_order: String(document.sort_order ?? 0),
    })
    setNotice('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function saveDocument() {
    if (!canManage) return setNotice('Keine Berechtigung fuer den Mitgliederbereich.')
    if (saving) return

    const sortOrder = Number.parseInt(form.sort_order, 10)

    if (!form.title.trim()) return setNotice('Titel ist Pflicht.')
    if (!form.file_url.trim()) return setNotice('Datei-URL ist Pflicht.')
    if (Number.isNaN(sortOrder) || sortOrder < 0) return setNotice('Sortierung muss eine positive ganze Zahl sein.')

    setSaving(true)
    setNotice('')

    try {
      const { error } = await saveMemberDocumentRecord({
        editingId,
        payload: {
          title: form.title.trim(),
          description: form.description.trim() || null,
          file_url: form.file_url.trim(),
          category: form.category.trim() || null,
          is_active: form.is_active,
          members_only: form.members_only,
          sort_order: sortOrder,
        },
      })

      if (error) {
        setNotice(error.message)
        return
      }

      setNotice(editingId ? 'Dokument wurde aktualisiert.' : 'Dokument wurde angelegt.')
      resetForm()
      await loadDocuments()
    } finally {
      setSaving(false)
    }
  }

  async function deactivateDocument(document) {
    if (!canManage) return setNotice('Keine Berechtigung fuer den Mitgliederbereich.')
    if (!window.confirm('Dieses Dokument wirklich deaktivieren?')) return

    setActionId(document.id)
    setNotice('')

    try {
      const { error } = await deactivateMemberDocumentRecord(document.id)
      if (error) {
        setNotice(error.message)
        return
      }
      setNotice('Dokument wurde deaktiviert.')
      await loadDocuments()
    } finally {
      setActionId(null)
    }
  }

  async function deleteDocument(document) {
    if (!canManage) return setNotice('Keine Berechtigung fuer den Mitgliederbereich.')
    if (!window.confirm('Dieses Dokument wirklich loeschen?')) return

    setActionId(document.id)
    setNotice('')

    try {
      const { error } = await deleteMemberDocumentRecord(document.id)
      if (error) {
        setNotice(error.message)
        return
      }
      setNotice('Dokument wurde geloescht.')
      await loadDocuments()
    } finally {
      setActionId(null)
    }
  }

  return (
    <section style={sectionStyle}>
      <h2 style={headingStyle}>Mitgliederbereich</h2>

      {!canManage && (
        <p style={mutedTextStyle}>Keine Berechtigung fuer die Mitgliederbereich-Verwaltung.</p>
      )}

      {canManage && (
        <div style={cardStyle}>
          <h3 style={headingStyle}>{editingId ? 'Dokument bearbeiten' : 'Dokument anlegen'}</h3>

          <input
            placeholder="Titel"
            value={form.title}
            onChange={(event) => updateField('title', event.target.value)}
            style={inputStyle}
          />

          <textarea
            placeholder="Beschreibung"
            value={form.description}
            onChange={(event) => updateField('description', event.target.value)}
            style={textareaStyle}
          />

          <input
            placeholder="Datei-URL"
            value={form.file_url}
            onChange={(event) => updateField('file_url', event.target.value)}
            style={inputStyle}
          />

          <input
            placeholder="Kategorie"
            value={form.category}
            onChange={(event) => updateField('category', event.target.value)}
            style={inputStyle}
          />

          <input
            type="number"
            min="0"
            step="1"
            placeholder="Sortierung"
            value={form.sort_order}
            onChange={(event) => updateField('sort_order', event.target.value)}
            style={inputStyle}
          />

          <label style={checkboxLabelStyle}>
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(event) => updateField('is_active', event.target.checked)}
            />
            Aktiv
          </label>

          <label style={checkboxLabelStyle}>
            <input
              type="checkbox"
              checked={form.members_only}
              onChange={(event) => updateField('members_only', event.target.checked)}
            />
            Nur fuer Mitglieder
          </label>

          <button onClick={saveDocument} disabled={saving} style={buttonStyle}>
            {saving ? 'Dokument wird gespeichert...' : editingId ? 'Dokument speichern' : 'Dokument anlegen'}
          </button>

          {editingId && (
            <button onClick={resetForm} style={secondaryButtonStyle}>
              Bearbeiten abbrechen
            </button>
          )}
        </div>
      )}

      {notice && <p style={noticeStyle}>{notice}</p>}

      <p>
        Dokumente: <strong>{documents.length}</strong>
      </p>

      {loading && <p style={mutedTextStyle}>Dokumente werden geladen...</p>}
      {!loading && documents.length === 0 && <p style={mutedTextStyle}>Noch keine Mitglieder-Dokumente angelegt.</p>}

      {documents.map((document) => (
        <div key={document.id} style={{ ...cardStyle, opacity: document.is_active ? 1 : 0.68 }}>
          <strong>{document.title}</strong>
          <br />
          Kategorie: {document.category || '-'} - Sortierung: {document.sort_order ?? 0}
          <br />
          Status: {document.is_active ? 'aktiv' : 'inaktiv'} - Mitglieder-only: {document.members_only ? 'Ja' : 'Nein'}
          <br />
          Datei-URL: {document.file_url}
          <br />
          Beschreibung: {document.description || '-'}

          {canManage && (
            <>
              <br />
              <button onClick={() => editDocument(document)} style={buttonStyle}>
                Bearbeiten
              </button>
              {document.is_active && (
                <button
                  onClick={() => deactivateDocument(document)}
                  disabled={actionId === document.id}
                  style={secondaryButtonStyle}
                >
                  {actionId === document.id ? 'Dokument wird deaktiviert...' : 'Deaktivieren'}
                </button>
              )}
              <button
                onClick={() => deleteDocument(document)}
                disabled={actionId === document.id}
                style={{ ...secondaryButtonStyle, borderColor: '#7f1d1d', color: '#7f1d1d' }}
              >
                {actionId === document.id ? 'Dokument wird geloescht...' : 'Loeschen'}
              </button>
            </>
          )}
        </div>
      ))}
    </section>
  )
}

const textareaStyle = {
  ...inputStyle,
  minHeight: 88,
  resize: 'vertical',
}

const checkboxLabelStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  margin: '8px 0',
  color: colors.text,
  fontWeight: 700,
}

const noticeStyle = {
  ...cardStyle,
  background: '#eff6ff',
  color: '#1e3a8a',
}
