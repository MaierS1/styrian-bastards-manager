import {
  colors,
  inputStyle,
  mutedTextStyle,
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
  const errorsByField = draft.validation?.errorsByField || {}

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {draft.validationErrors.length > 0 && (
        <div style={validationPanelStyle}>
          <strong style={{ display: 'block', marginBottom: 4 }}>Bitte prüfen</strong>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {draft.validationErrors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <section>
        <strong style={sectionTitleStyle}>Rechnungsdaten</strong>
        <div style={invoiceGridStyle}>
          <Field label="Datum" error={errorsByField.date}>
            <input
              type="date"
              value={draft.date}
              onChange={(event) => onChange(draft.id, 'date', event.target.value)}
              style={fieldInputStyle(errorsByField.date)}
              disabled={!canEditDraft}
              aria-invalid={Boolean(errorsByField.date)}
            />
          </Field>

          <Field label="Betrag" error={errorsByField.amount}>
            <input
              type="number"
              min="0"
              step="0.01"
              value={draft.amount}
              onChange={(event) => onChange(draft.id, 'amount', event.target.value)}
              style={fieldInputStyle(errorsByField.amount)}
              disabled={!canEditDraft}
              aria-invalid={Boolean(errorsByField.amount)}
            />
          </Field>

          <Field label="Typ" error={errorsByField.type}>
            <select
              value={draft.type}
              onChange={(event) => onChange(draft.id, 'type', event.target.value)}
              style={fieldInputStyle(errorsByField.type)}
              disabled={!canEditDraft}
              aria-invalid={Boolean(errorsByField.type)}
            >
              <option value="einnahme">Einnahme</option>
              <option value="ausgabe">Ausgabe</option>
            </select>
          </Field>

          <Field label="Kategorie" error={errorsByField.category}>
            <select
              value={draft.category}
              onChange={(event) => onChange(draft.id, 'category', event.target.value)}
              style={fieldInputStyle(errorsByField.category)}
              disabled={!canEditDraft}
              aria-invalid={Boolean(errorsByField.category)}
            >
              {categories.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Zahlungsart" error={errorsByField.paymentMethod}>
            <select
              value={draft.paymentMethod}
              onChange={(event) => onChange(draft.id, 'paymentMethod', event.target.value)}
              style={fieldInputStyle(errorsByField.paymentMethod)}
              disabled={!canEditDraft}
              aria-invalid={Boolean(errorsByField.paymentMethod)}
            >
              {paymentMethods.map((paymentMethod) => (
                <option key={paymentMethod.value} value={paymentMethod.value}>
                  {paymentMethod.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Event">
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
          </Field>
        </div>
      </section>

      <section>
        <strong style={sectionTitleStyle}>Beschreibung</strong>
        <Field label="Beschreibung" error={errorsByField.description}>
          <input
            value={draft.description}
            onChange={(event) => onChange(draft.id, 'description', event.target.value)}
            style={fieldInputStyle(errorsByField.description)}
            disabled={!canEditDraft}
            aria-invalid={Boolean(errorsByField.description)}
          />
        </Field>
      </section>

      {status === BULK_RECEIPT_STATUS_LABELS[BULK_RECEIPT_STATUSES.READY] && (
        <p style={{ color: colors.successText, fontWeight: 800, margin: 0 }}>
          Dieser Beleg ist lokal geprüft und kann verbucht werden.
        </p>
      )}
    </div>
  )
}

function Field({ label, error, children }) {
  return (
    <label style={{ display: 'grid', gap: 5 }}>
      <span style={{ color: colors.black, fontWeight: 800 }}>{label}</span>
      {children}
      {error && <span style={{ color: colors.dangerText, fontSize: 13 }}>{error}</span>}
      {!error && <span style={{ ...mutedTextStyle, fontSize: 12, minHeight: 16 }}> </span>}
    </label>
  )
}

const validationPanelStyle = {
  border: `1px solid ${colors.dangerText}`,
  borderRadius: 8,
  background: colors.dangerBg,
  color: colors.dangerText,
  padding: 10,
}

const sectionTitleStyle = {
  display: 'block',
  color: colors.black,
  marginBottom: 8,
}

const invoiceGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
  gap: 12,
}

function fieldInputStyle(error) {
  return {
    ...inputStyle,
    borderColor: error ? colors.dangerText : inputStyle.borderColor,
    background: error ? colors.dangerBg : inputStyle.background,
  }
}
