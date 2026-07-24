import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  buttonStyle,
  cardStyle,
  colors,
  dashboardLabelStyle,
  dangerButtonStyle,
  headingStyle,
  inputStyle,
  mutedTextStyle,
  secondaryButtonStyle,
  sectionStyle,
} from '../../styles/appStyles'
import {
  FINANCING_LIABILITY_CATEGORIES,
  FINANCING_LIABILITY_STATUS_LABELS,
  formatEuro,
  getOpenLiabilitiesSummary,
  validateLiabilityInput,
  validateRepaymentInput,
} from '../../services/financing/financingLiabilitiesCore'
import {
  cancelFinancingLiability,
  cancelFinancingLiabilityRepayment,
  createFinancingLiability,
  createFinancingLiabilityRepayment,
  fetchFinancingLiabilityBalances,
  fetchFinancingLiabilityRepayments,
} from '../../services/repositories/financingLiabilitiesRepository'

const today = () => new Date().toISOString().slice(0, 10)

const statusOptions = [
  ['alle', 'Alle'],
  ['open', 'Offen'],
  ['partially_paid', 'Teilweise bezahlt'],
  ['paid', 'Bezahlt'],
  ['cancelled', 'Storniert'],
]

export function FinancingLiabilitiesPage({ members = [], currentMember, canCreate, canEdit, canDelete, onLoaded }) {
  const [liabilities, setLiabilities] = useState([])
  const [repayments, setRepayments] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [statusFilter, setStatusFilter] = useState('alle')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('financed_at')
  const [form, setForm] = useState({
    creditor_member_id: '',
    creditor_name: '',
    original_amount: '',
    financed_at: today(),
    due_date: '',
    description: '',
    category: 'sonstiges',
    internal_note: '',
  })
  const [repaymentForm, setRepaymentForm] = useState({
    amount: '',
    paidAt: today(),
    paymentMethod: 'bar',
    description: '',
    note: '',
  })

  const selectedLiability = liabilities.find((liability) => liability.id === selectedId) || liabilities[0] || null
  const selectedRepayments = repayments.filter((repayment) => repayment.liability_id === selectedLiability?.id)
  const summary = getOpenLiabilitiesSummary(liabilities)

  const loadFinancingLiabilities = useCallback(async () => {
    setLoading(true)
    try {
      const [liabilityResult, repaymentResult] = await Promise.all([
        fetchFinancingLiabilityBalances(),
        fetchFinancingLiabilityRepayments(),
      ])

      if (liabilityResult.error) throw liabilityResult.error
      if (repaymentResult.error) throw repaymentResult.error

      const loadedLiabilities = liabilityResult.data || []
      setLiabilities(loadedLiabilities)
      setRepayments(repaymentResult.data || [])
      onLoaded?.(loadedLiabilities)
      setSelectedId((currentId) => currentId || loadedLiabilities[0]?.id || null)
    } catch (error) {
      alert(`Vorfinanzierungen konnten nicht geladen werden: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }, [onLoaded])

  useEffect(() => {
    loadFinancingLiabilities()
  }, [loadFinancingLiabilities])

  const filteredLiabilities = useMemo(() => {
    const term = search.trim().toLowerCase()

    return liabilities
      .filter((liability) => statusFilter === 'alle' || (liability.computed_status || liability.status) === statusFilter)
      .filter((liability) => {
        if (!term) return true
        return `${liability.creditor_name || ''} ${liability.description || ''}`.toLowerCase().includes(term)
      })
      .sort((a, b) => {
        if (sortBy === 'open_amount') return Number(b.open_amount || 0) - Number(a.open_amount || 0)
        if (sortBy === 'status') return String(a.computed_status || a.status).localeCompare(String(b.computed_status || b.status))
        return new Date(b.financed_at || 0) - new Date(a.financed_at || 0)
      })
  }, [liabilities, search, sortBy, statusFilter])

  function getMemberName(memberId) {
    const member = members.find((candidate) => candidate.id === memberId)
    return member ? `${member.first_name || ''} ${member.last_name || ''}`.trim() : ''
  }

  function resetForm() {
    setForm({
      creditor_member_id: '',
      creditor_name: '',
      original_amount: '',
      financed_at: today(),
      due_date: '',
      description: '',
      category: 'sonstiges',
      internal_note: '',
    })
  }

  async function handleCreateLiability(event) {
    event.preventDefault()
    if (!canCreate) return alert('Keine Berechtigung zum Anlegen von Vorfinanzierungen.')

    const selectedMemberName = getMemberName(form.creditor_member_id)
    const payload = {
      creditor_member_id: form.creditor_member_id || null,
      creditor_name: selectedMemberName || form.creditor_name.trim(),
      original_amount: Number(String(form.original_amount).replace(',', '.')),
      financed_at: form.financed_at,
      due_date: form.due_date || null,
      description: form.description.trim(),
      category: form.category,
      internal_note: form.internal_note.trim() || null,
      created_by_member_id: currentMember?.id || null,
    }
    const errors = validateLiabilityInput(payload)
    if (errors.length > 0) return alert(errors.join('\n'))

    setSaving(true)
    try {
      const { error } = await createFinancingLiability(payload)
      if (error) throw error
      resetForm()
      await loadFinancingLiabilities()
    } catch (error) {
      alert(`Vorfinanzierung konnte nicht gespeichert werden: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  async function handleRepayment(event) {
    event.preventDefault()
    if (!selectedLiability || !canEdit) return alert('Keine Berechtigung zum Erfassen von Rueckzahlungen.')

    const status = selectedLiability.computed_status || selectedLiability.status
    if (['paid', 'cancelled'].includes(status)) return alert('Diese Vorfinanzierung kann keine neue Rueckzahlung erhalten.')

    const amount = repaymentForm.amount || selectedLiability.open_amount
    const errors = validateRepaymentInput({
      amount,
      openAmount: selectedLiability.open_amount,
      paidAt: repaymentForm.paidAt,
    })
    if (errors.length > 0) return alert(errors.join('\n'))

    const confirmed = window.confirm(
      `Rueckzahlung erfassen?\nBetrag: ${formatEuro(Number(String(amount).replace(',', '.')))}\nKassabuchung: Ausgabe Vorfinanzierung`
    )
    if (!confirmed) return

    setSaving(true)
    try {
      const { error } = await createFinancingLiabilityRepayment({
        liabilityId: selectedLiability.id,
        amount: Number(String(amount).replace(',', '.')),
        paidAt: repaymentForm.paidAt,
        paymentMethod: repaymentForm.paymentMethod,
        description: repaymentForm.description || `Rueckzahlung Vorfinanzierung: ${selectedLiability.description}`,
        note: repaymentForm.note,
      })
      if (error) throw error

      setRepaymentForm({
        amount: '',
        paidAt: today(),
        paymentMethod: 'bar',
        description: '',
        note: '',
      })
      await loadFinancingLiabilities()
    } catch (error) {
      alert(`Rueckzahlung konnte nicht gespeichert werden: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  async function handleCancelLiability(liability) {
    if (!canDelete) return alert('Keine Berechtigung zum Stornieren.')
    const reason = window.prompt('Stornogrund fuer diese Vorfinanzierung')
    if (!reason?.trim()) return

    setSaving(true)
    try {
      const { error } = await cancelFinancingLiability(liability.id, reason.trim())
      if (error) throw error
      await loadFinancingLiabilities()
    } catch (error) {
      alert(`Vorfinanzierung konnte nicht storniert werden: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  async function handleCancelRepayment(repayment) {
    if (!canDelete) return alert('Keine Berechtigung zum Stornieren.')
    const reason = window.prompt('Stornogrund fuer diese Rueckzahlung')
    if (!reason?.trim()) return

    setSaving(true)
    try {
      const { error } = await cancelFinancingLiabilityRepayment(repayment.id, reason.trim())
      if (error) throw error
      await loadFinancingLiabilities()
    } catch (error) {
      alert(`Rueckzahlung konnte nicht storniert werden: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section style={sectionStyle}>
      <h2 style={headingStyle}>Vorfinanzierungen & Verbindlichkeiten</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <div style={cardStyle}><strong style={dashboardLabelStyle}>Offene Summe</strong><br />{formatEuro(summary.openTotal)}</div>
        <div style={cardStyle}><strong style={dashboardLabelStyle}>Offene Faelle</strong><br />{summary.openCount}</div>
        <div style={cardStyle}><strong style={dashboardLabelStyle}>Teilbezahlt</strong><br />{summary.partiallyPaidCount} Fall/Faelle</div>
        <div style={cardStyle}><strong style={dashboardLabelStyle}>Erledigt</strong><br />{summary.paidCount}</div>
      </div>

      {canCreate && (
        <form onSubmit={handleCreateLiability} style={{ ...cardStyle, borderTop: `6px solid ${colors.blue}` }}>
          <h3 style={headingStyle}>Vorfinanzierung anlegen</h3>
          <select value={form.creditor_member_id} onChange={(e) => setForm({ ...form, creditor_member_id: e.target.value })} style={inputStyle}>
            <option value="">Externen Glaeubiger erfassen</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>{`${member.first_name || ''} ${member.last_name || ''}`.trim() || member.email}</option>
            ))}
          </select>
          {!form.creditor_member_id && (
            <input value={form.creditor_name} onChange={(e) => setForm({ ...form, creditor_name: e.target.value })} placeholder="Glaeubigername" style={inputStyle} />
          )}
          <input value={form.original_amount} onChange={(e) => setForm({ ...form, original_amount: e.target.value })} placeholder="Betrag" inputMode="decimal" style={inputStyle} />
          <input type="date" value={form.financed_at} onChange={(e) => setForm({ ...form, financed_at: e.target.value })} style={inputStyle} />
          <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} style={inputStyle} />
          <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Beschreibung" style={inputStyle} />
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={inputStyle}>
            {FINANCING_LIABILITY_CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <textarea value={form.internal_note} onChange={(e) => setForm({ ...form, internal_note: e.target.value })} placeholder="Interne Notiz" style={inputStyle} />
          <button type="submit" style={buttonStyle} disabled={saving}>Speichern</button>
        </form>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Suche nach Glaeubiger oder Beschreibung" style={inputStyle} />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={inputStyle}>
          {statusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={inputStyle}>
          <option value="financed_at">Datum</option>
          <option value="open_amount">Offener Betrag</option>
          <option value="status">Status</option>
        </select>
      </div>

      <div style={cardStyle}>
        <h3 style={headingStyle}>Uebersicht</h3>
        {loading && <p style={mutedTextStyle}>Lade Vorfinanzierungen...</p>}
        {!loading && filteredLiabilities.length === 0 && <p style={mutedTextStyle}>Keine Vorfinanzierungen gefunden.</p>}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 820 }}>
            <thead>
              <tr>
                {['Datum', 'Glaeubiger', 'Beschreibung', 'Gesamt', 'Zurueckbezahlt', 'Offen', 'Status', 'Aktionen'].map((label) => (
                  <th key={label} style={{ textAlign: 'left', borderBottom: `2px solid ${colors.border}`, padding: 8 }}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredLiabilities.map((liability) => {
                const status = liability.computed_status || liability.status
                return (
                  <tr key={liability.id}>
                    <td style={{ padding: 8 }}>{liability.financed_at}</td>
                    <td style={{ padding: 8 }}>{liability.creditor_name}</td>
                    <td style={{ padding: 8 }}>{liability.description}</td>
                    <td style={{ padding: 8 }}>{formatEuro(liability.original_amount)}</td>
                    <td style={{ padding: 8 }}>{formatEuro(liability.repaid_amount)}</td>
                    <td style={{ padding: 8 }}>{formatEuro(liability.open_amount)}</td>
                    <td style={{ padding: 8 }}>{FINANCING_LIABILITY_STATUS_LABELS[status] || status}</td>
                    <td style={{ padding: 8 }}>
                      <button type="button" onClick={() => setSelectedId(liability.id)} style={secondaryButtonStyle}>Details</button>
                      {canDelete && status === 'open' && (
                        <button type="button" onClick={() => handleCancelLiability(liability)} style={dangerButtonStyle}>Stornieren</button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selectedLiability && (
        <div style={{ ...cardStyle, borderTop: `6px solid ${colors.red}` }}>
          <h3 style={headingStyle}>Detail</h3>
          <p><strong>{selectedLiability.creditor_name}</strong> - {selectedLiability.description}</p>
          <p>
            Gesamt {formatEuro(selectedLiability.original_amount)} · zurueckbezahlt {formatEuro(selectedLiability.repaid_amount)} · offen{' '}
            <strong>{formatEuro(selectedLiability.open_amount)}</strong>
          </p>
          <p>Status: <strong>{FINANCING_LIABILITY_STATUS_LABELS[selectedLiability.computed_status] || selectedLiability.computed_status}</strong></p>
          <p style={mutedTextStyle}>
            Angelegt: {selectedLiability.created_at ? new Date(selectedLiability.created_at).toLocaleString('de-AT') : '-'}
            {selectedLiability.updated_at ? ` · Aktualisiert: ${new Date(selectedLiability.updated_at).toLocaleString('de-AT')}` : ''}
          </p>
          {selectedLiability.internal_note && <p>Interne Notiz: {selectedLiability.internal_note}</p>}

          {canEdit && !['paid', 'cancelled'].includes(selectedLiability.computed_status || selectedLiability.status) && (
            <form onSubmit={handleRepayment} style={{ ...cardStyle, boxShadow: 'none' }}>
              <h4>Rueckzahlung erfassen</h4>
              <input value={repaymentForm.amount} onChange={(e) => setRepaymentForm({ ...repaymentForm, amount: e.target.value })} placeholder={`Standard: ${formatEuro(selectedLiability.open_amount)}`} inputMode="decimal" style={inputStyle} />
              <input type="date" value={repaymentForm.paidAt} onChange={(e) => setRepaymentForm({ ...repaymentForm, paidAt: e.target.value })} style={inputStyle} />
              <select value={repaymentForm.paymentMethod} onChange={(e) => setRepaymentForm({ ...repaymentForm, paymentMethod: e.target.value })} style={inputStyle}>
                <option value="bar">Bar</option>
                <option value="ebanking">E-Banking</option>
                <option value="ueberweisung">Ueberweisung</option>
                <option value="vereinskonto">Vereinskonto</option>
                <option value="sonstiges">Sonstiges</option>
              </select>
              <input value={repaymentForm.description} onChange={(e) => setRepaymentForm({ ...repaymentForm, description: e.target.value })} placeholder="Buchungstext" style={inputStyle} />
              <textarea value={repaymentForm.note} onChange={(e) => setRepaymentForm({ ...repaymentForm, note: e.target.value })} placeholder="Notiz" style={inputStyle} />
              <button type="submit" style={buttonStyle} disabled={saving}>Rueckzahlung speichern</button>
            </form>
          )}

          <h4>Rueckzahlungshistorie</h4>
          {selectedRepayments.length === 0 && <p style={mutedTextStyle}>Noch keine Rueckzahlungen erfasst.</p>}
          {selectedRepayments.map((repayment) => (
            <div key={repayment.id} style={cardStyle}>
              <strong>{formatEuro(repayment.amount)}</strong> am {repayment.paid_at}
              {repayment.cancelled_at && <span style={{ color: colors.red }}> · storniert</span>}
              <br />
              Kassa-Eintrag: {repayment.cash_entry_id}
              {repayment.note && <><br />Notiz: {repayment.note}</>}
              {canDelete && !repayment.cancelled_at && (
                <button type="button" onClick={() => handleCancelRepayment(repayment)} style={dangerButtonStyle}>Rueckzahlung stornieren</button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
