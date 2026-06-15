import { useEffect, useMemo, useState } from 'react'
import {
  buttonStyle,
  cardStyle,
  colors,
  dangerButtonStyle,
  headingStyle,
  inputStyle,
  mutedTextStyle,
  secondaryButtonStyle,
  sectionStyle,
} from '../../styles/appStyles'
import {
  deleteVirtualBastardKnowledgeRecord,
  fetchVirtualBastardKnowledge,
  saveVirtualBastardKnowledgeRecord,
  updateVirtualBastardKnowledgeFlags,
} from '../../services/repositories/virtualBastardKnowledgeRepository'

const emptyForm = {
  title: '',
  category: 'allgemein',
  answer: '',
  keywordsText: '',
  linksText: '[]',
  quickRepliesText: '',
  isActive: true,
  isPublic: true,
  sortOrder: '0',
}

const textareaStyle = {
  ...inputStyle,
  minHeight: 110,
  resize: 'vertical',
}

const checkboxLabelStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  color: colors.text,
  marginBottom: 10,
}

export function VirtualBastardKnowledgePage({ canManage, currentUserId }) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('alle')
  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    loadEntries()
  }, [])

  const categories = useMemo(() => {
    const values = new Set(entries.map((entry) => entry.category).filter(Boolean))
    return Array.from(values).sort((left, right) => left.localeCompare(right, 'de'))
  }, [entries])

  const filteredEntries = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return entries.filter((entry) => {
      const matchesCategory = categoryFilter === 'alle' || entry.category === categoryFilter
      const searchable = [
        entry.title,
        entry.category,
        entry.answer,
        ...(Array.isArray(entry.keywords) ? entry.keywords : []),
      ].join(' ').toLowerCase()

      return matchesCategory && (!normalizedSearch || searchable.includes(normalizedSearch))
    })
  }, [categoryFilter, entries, search])

  async function loadEntries() {
    setLoading(true)
    const { data, error } = await fetchVirtualBastardKnowledge()
    setLoading(false)

    if (error) {
      alert(error.message)
      return
    }

    setEntries(data || [])
  }

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function resetForm() {
    setEditingId(null)
    setForm(emptyForm)
  }

  function editEntry(entry) {
    setEditingId(entry.id)
    setForm({
      title: entry.title || '',
      category: entry.category || 'allgemein',
      answer: entry.answer || '',
      keywordsText: Array.isArray(entry.keywords) ? entry.keywords.join(', ') : '',
      linksText: JSON.stringify(entry.links || [], null, 2),
      quickRepliesText: Array.isArray(entry.quick_replies) ? entry.quick_replies.join(', ') : '',
      isActive: Boolean(entry.is_active),
      isPublic: Boolean(entry.is_public),
      sortOrder: String(entry.sort_order ?? 0),
    })
  }

  function buildPayload() {
    const title = form.title.trim()
    const category = form.category.trim()
    const answer = form.answer.trim()

    if (!title) throw new Error('Titel ist Pflicht.')
    if (!category) throw new Error('Kategorie ist Pflicht.')
    if (!answer) throw new Error('Antwort ist Pflicht.')

    const links = JSON.parse(form.linksText || '[]')
    if (!Array.isArray(links)) throw new Error('Links müssen ein JSON-Array sein.')

    links.forEach((link, index) => {
      if (!link || typeof link !== 'object' || !link.label || !link.href) {
        throw new Error(`Link ${index + 1} braucht label und href.`)
      }
    })

    const payload = {
      title,
      category,
      answer,
      keywords: splitList(form.keywordsText),
      links,
      quick_replies: splitList(form.quickRepliesText),
      is_active: form.isActive,
      is_public: form.isPublic,
      sort_order: Number.parseInt(form.sortOrder, 10) || 0,
      updated_by: currentUserId || null,
    }

    if (!editingId) payload.created_by = currentUserId || null

    return payload
  }

  async function saveEntry() {
    if (!canManage) return alert('Keine Berechtigung für Virtual-Bastard-Wissen.')
    if (saving) return

    let payload
    try {
      payload = buildPayload()
    } catch (error) {
      alert(error.message)
      return
    }

    setSaving(true)
    const { error } = await saveVirtualBastardKnowledgeRecord({ entryId: editingId, payload })
    setSaving(false)

    if (error) {
      alert(error.message)
      return
    }

    resetForm()
    await loadEntries()
    alert(editingId ? 'Wissenseintrag wurde aktualisiert.' : 'Wissenseintrag wurde angelegt.')
  }

  async function toggleFlag(entry, field) {
    if (!canManage) return

    const { error } = await updateVirtualBastardKnowledgeFlags(entry.id, {
      [field]: !entry[field],
      updated_by: currentUserId || null,
    })

    if (error) {
      alert(error.message)
      return
    }

    await loadEntries()
  }

  async function deactivateEntry(entry) {
    if (!canManage) return

    const { error } = await updateVirtualBastardKnowledgeFlags(entry.id, {
      is_active: false,
      updated_by: currentUserId || null,
    })

    if (error) {
      alert(error.message)
      return
    }

    await loadEntries()
  }

  async function deleteEntry(entry) {
    if (!canManage) return
    if (deletingId) return

    const confirmed = window.confirm(
      `Wissenseintrag wirklich löschen?\n\n${entry.title || ''}\n\nDeaktivieren ist meist sicherer.`
    )
    if (!confirmed) return

    setDeletingId(entry.id)
    const { error } = await deleteVirtualBastardKnowledgeRecord(entry.id)
    setDeletingId(null)

    if (error) {
      alert(error.message)
      return
    }

    await loadEntries()
  }

  if (!canManage) {
    return (
      <section style={sectionStyle}>
        <h2 style={headingStyle}>Virtual Bastard Wissen</h2>
        <div style={{ ...cardStyle, borderLeft: `6px solid ${colors.red}` }}>
          Keine Berechtigung. Dieser Bereich ist für Admin und Vorstand vorgesehen.
        </div>
      </section>
    )
  }

  return (
    <section style={sectionStyle}>
      <h2 style={headingStyle}>Virtual Bastard Wissen</h2>
      <p style={mutedTextStyle}>
        Pflege nur öffentliche Vereinsinformationen. Keine personenbezogenen Daten, keine internen Details und keine
        verbindlichen Zusagen eintragen.
      </p>

      <div style={{ ...cardStyle, borderLeft: `6px solid ${colors.blue}` }}>
        <h3 style={headingStyle}>{editingId ? 'Wissenseintrag bearbeiten' : 'Wissenseintrag anlegen'}</h3>

        <input
          placeholder="Titel"
          value={form.title}
          onChange={(event) => updateForm('title', event.target.value)}
          style={inputStyle}
        />

        <input
          placeholder="Kategorie"
          value={form.category}
          onChange={(event) => updateForm('category', event.target.value)}
          style={inputStyle}
        />

        <textarea
          placeholder="Antwort"
          value={form.answer}
          onChange={(event) => updateForm('answer', event.target.value)}
          style={{ ...textareaStyle, minHeight: 150 }}
        />

        <input
          placeholder="Keywords, mit Komma getrennt"
          value={form.keywordsText}
          onChange={(event) => updateForm('keywordsText', event.target.value)}
          style={inputStyle}
        />

        <textarea
          placeholder='Links als JSON, z. B. [{"label":"FAQ","href":"/faq.html"}]'
          value={form.linksText}
          onChange={(event) => updateForm('linksText', event.target.value)}
          style={textareaStyle}
        />

        <input
          placeholder="Quick Replies, mit Komma getrennt"
          value={form.quickRepliesText}
          onChange={(event) => updateForm('quickRepliesText', event.target.value)}
          style={inputStyle}
        />

        <input
          type="number"
          placeholder="Sortierung"
          value={form.sortOrder}
          onChange={(event) => updateForm('sortOrder', event.target.value)}
          style={inputStyle}
        />

        <label style={checkboxLabelStyle}>
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(event) => updateForm('isActive', event.target.checked)}
          />
          Aktiv
        </label>

        <label style={checkboxLabelStyle}>
          <input
            type="checkbox"
            checked={form.isPublic}
            onChange={(event) => updateForm('isPublic', event.target.checked)}
          />
          Öffentlich sichtbar
        </label>

        <button type="button" onClick={saveEntry} disabled={saving} style={buttonStyle}>
          {saving ? 'Wird gespeichert...' : editingId ? 'Eintrag speichern' : 'Eintrag anlegen'}
        </button>

        {editingId && (
          <button type="button" onClick={resetForm} style={secondaryButtonStyle}>
            Bearbeiten abbrechen
          </button>
        )}
      </div>

      <div style={{ ...cardStyle, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        <input
          placeholder="Suche"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          style={{ ...inputStyle, marginBottom: 0 }}
        />

        <select
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
          style={{ ...inputStyle, marginBottom: 0 }}
        >
          <option value="alle">Alle Kategorien</option>
          {categories.map((category) => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>
      </div>

      <p>
        Wissenseinträge: <strong>{filteredEntries.length}</strong>
        {loading ? ' - wird geladen...' : ''}
      </p>

      {filteredEntries.length === 0 && !loading && (
        <p style={mutedTextStyle}>Keine passenden Wissenseinträge gefunden.</p>
      )}

      {filteredEntries.map((entry) => (
        <KnowledgeCard
          key={entry.id}
          entry={entry}
          deletingId={deletingId}
          onEdit={editEntry}
          onToggleFlag={toggleFlag}
          onDeactivate={deactivateEntry}
          onDelete={deleteEntry}
        />
      ))}
    </section>
  )
}

function KnowledgeCard({ entry, deletingId, onEdit, onToggleFlag, onDeactivate, onDelete }) {
  return (
    <div
      style={{
        ...cardStyle,
        borderLeft: `6px solid ${entry.is_active && entry.is_public ? colors.blue : colors.muted}`,
        opacity: entry.is_active ? 1 : 0.72,
      }}
    >
      <strong>{entry.title}</strong>
      <br />
      Kategorie: {entry.category || '-'} - Sortierung: {entry.sort_order ?? 0}
      <br />
      Aktiv: {entry.is_active ? 'Ja' : 'Nein'} - Öffentlich: {entry.is_public ? 'Ja' : 'Nein'}
      <br />
      Keywords: {Array.isArray(entry.keywords) && entry.keywords.length ? entry.keywords.join(', ') : '-'}
      <br />
      Antwort: {entry.answer}
      <br />
      Links: {Array.isArray(entry.links) ? entry.links.length : 0} - Quick Replies: {Array.isArray(entry.quick_replies) ? entry.quick_replies.length : 0}
      <br />

      <button type="button" onClick={() => onEdit(entry)} style={buttonStyle}>
        Bearbeiten
      </button>
      <button type="button" onClick={() => onToggleFlag(entry, 'is_active')} style={secondaryButtonStyle}>
        {entry.is_active ? 'Deaktivieren' : 'Aktivieren'}
      </button>
      <button type="button" onClick={() => onToggleFlag(entry, 'is_public')} style={secondaryButtonStyle}>
        {entry.is_public ? 'Privat setzen' : 'Öffentlich setzen'}
      </button>
      <button type="button" onClick={() => onDeactivate(entry)} style={secondaryButtonStyle}>
        Nur deaktivieren
      </button>
      <button
        type="button"
        onClick={() => onDelete(entry)}
        disabled={deletingId === entry.id}
        style={dangerButtonStyle}
      >
        {deletingId === entry.id ? 'Wird gelöscht...' : 'Löschen'}
      </button>
    </div>
  )
}

function splitList(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}
