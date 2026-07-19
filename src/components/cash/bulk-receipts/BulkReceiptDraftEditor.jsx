import {
  colors,
  inputStyle,
} from '../../../styles/appStyles'
import { BULK_RECEIPT_STATUSES, BULK_RECEIPT_STATUS_LABELS } from '../../../services/cash/bulkReceiptTypes'

export function BulkReceiptDraftEditor({
  draft,
  status,
  events,
  categories,
  paymentMethods,
  canEditDraft,
  onChange,
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 10,
        marginTop: 10,
      }}
    >
      <label>
        Belegdatum
        <input
          type="date"
          value={draft.date}
          onChange={(event) => onChange(draft.id, 'date', event.target.value)}
          style={inputStyle}
          disabled={!canEditDraft}
        />
      </label>

      <label>
        Typ
        <select
          value={draft.type}
          onChange={(event) => onChange(draft.id, 'type', event.target.value)}
          style={inputStyle}
          disabled={!canEditDraft}
        >
          <option value="einnahme">Einnahme</option>
          <option value="ausgabe">Ausgabe</option>
        </select>
      </label>

      <label>
        Kategorie
        <select
          value={draft.category}
          onChange={(event) => onChange(draft.id, 'category', event.target.value)}
          style={inputStyle}
          disabled={!canEditDraft}
        >
          {categories.map((category) => (
            <option key={category.value} value={category.value}>
              {category.label}
            </option>
          ))}
        </select>
      </label>

      <label>
        Zahlungsart
        <select
          value={draft.paymentMethod}
          onChange={(event) => onChange(draft.id, 'paymentMethod', event.target.value)}
          style={inputStyle}
          disabled={!canEditDraft}
        >
          {paymentMethods.map((paymentMethod) => (
            <option key={paymentMethod.value} value={paymentMethod.value}>
              {paymentMethod.label}
            </option>
          ))}
        </select>
      </label>

      <label>
        Event-Zuordnung
        <select
          value={draft.eventId}
          onChange={(event) => onChange(draft.id, 'eventId', event.target.value)}
          style={inputStyle}
          disabled={!canEditDraft}
        >
          <option value="">Keinem Event zuordnen</option>
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.name} · {event.event_date}
            </option>
          ))}
        </select>
      </label>

      <label>
        Betrag
        <input
          type="number"
          min="0"
          step="0.01"
          value={draft.amount}
          onChange={(event) => onChange(draft.id, 'amount', event.target.value)}
          style={inputStyle}
          disabled={!canEditDraft}
        />
      </label>

      <label style={{ gridColumn: '1 / -1' }}>
        Beschreibung
        <input
          value={draft.description}
          onChange={(event) => onChange(draft.id, 'description', event.target.value)}
          style={inputStyle}
          disabled={!canEditDraft}
        />
      </label>

      {status === BULK_RECEIPT_STATUS_LABELS[BULK_RECEIPT_STATUSES.READY] && (
        <p style={{ color: colors.successText, fontWeight: 800, gridColumn: '1 / -1' }}>
          Dieser Beleg ist lokal geprüft und kann verbucht werden.
        </p>
      )}
    </div>
  )
}
