import {
  buttonStyle,
  colors,
  mutedTextStyle,
  secondaryButtonStyle,
} from '../../../styles/appStyles'

export function BulkReceiptToolbar({
  fileInputRef,
  fileInputAccept,
  isBusy,
  isDragging,
  hasDrafts,
  canBookDrafts,
  isPosting,
  onAddFiles,
  onDragOver,
  onDragLeave,
  onDrop,
  onBookReadyDrafts,
  onReset,
}) {
  const compact = hasDrafts

  return (
    <div style={toolbarRootStyle}>
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        style={{
          border: `2px dashed ${isDragging ? colors.blue : colors.border}`,
          borderRadius: compact ? 12 : 16,
          padding: compact ? 16 : 28,
          background: isDragging ? colors.infoBg : colors.offWhite,
          textAlign: 'center',
          cursor: isBusy ? 'not-allowed' : 'pointer',
          opacity: isBusy ? 0.72 : 1,
          transition: 'border-color 120ms ease, background 120ms ease, padding 120ms ease',
          width: '100%',
          maxWidth: '100%',
          boxSizing: 'border-box',
        }}
        role="button"
        tabIndex={0}
        onClick={() => {
          if (!isBusy) fileInputRef.current?.click()
        }}
        onKeyDown={(event) => {
          if (!isBusy && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault()
            fileInputRef.current?.click()
          }
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: compact ? 42 : 58,
            height: compact ? 42 : 58,
            margin: '0 auto 10px',
            borderRadius: 14,
            border: `2px solid ${colors.blue}`,
            display: 'grid',
            placeItems: 'center',
            color: colors.blue,
            fontWeight: 900,
            fontSize: compact ? 18 : 24,
            background: colors.white,
          }}
        >
          <UploadIcon size={compact ? 24 : 32} />
        </div>
        <strong style={{ display: 'block', fontSize: compact ? 18 : 22, color: colors.black }}>
          Belege hierher ziehen
        </strong>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            if (!isBusy) fileInputRef.current?.click()
          }}
          style={{ ...toolbarButtonStyle(secondaryButtonStyle), marginTop: 10 }}
          disabled={isBusy}
        >
          oder Dateien auswählen
        </button>
        <p style={{ ...mutedTextStyle, marginTop: 8 }}>
          PDF, JPG, JPEG, PNG, WEBP · maximal 50 Dateien · maximal 15 MB pro Datei
        </p>

        {!hasDrafts && (
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 14 }}>
            <StepPill number="1" text="Belege auswählen" />
            <StepPill number="2" text="automatisch analysieren lassen" />
            <StepPill number="3" text="Angaben prüfen und verbuchen" />
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={fileInputAccept}
        onChange={onAddFiles}
        style={{ display: 'none' }}
      />

      {hasDrafts && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            alignItems: 'center',
            paddingTop: 2,
            width: '100%',
            maxWidth: '100%',
            boxSizing: 'border-box',
          }}
        >
          <button type="button" onClick={() => fileInputRef.current?.click()} style={toolbarButtonStyle(secondaryButtonStyle)} disabled={isBusy}>
            Dateien hinzufügen
          </button>
          <button type="button" onClick={onReset} style={toolbarButtonStyle(secondaryButtonStyle)} disabled={isBusy || !hasDrafts}>
            Liste zurücksetzen
          </button>
          <button
            type="button"
            onClick={onBookReadyDrafts}
            style={toolbarButtonStyle(buttonStyle)}
            disabled={!canBookDrafts}
            title={canBookDrafts ? 'Geprüfte Belege als Kassa-Einträge speichern.' : 'Mindestens ein geprüfter Beleg ist erforderlich.'}
          >
            {isPosting ? 'Belege werden verbucht...' : 'Geprüfte Belege verbuchen'}
          </button>
        </div>
      )}
    </div>
  )
}

const toolbarRootStyle = {
  display: 'grid',
  gap: 12,
  width: '100%',
  maxWidth: '100%',
  boxSizing: 'border-box',
}

function toolbarButtonStyle(baseStyle) {
  return {
    ...baseStyle,
    margin: 0,
    width: 'auto',
    maxWidth: '100%',
    boxSizing: 'border-box',
  }
}

function UploadIcon({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 16V4" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M7 9l5-5 5 5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 20h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  )
}

function StepPill({ number, text }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '5px 9px',
        borderRadius: 999,
        background: colors.white,
        border: `1px solid ${colors.border}`,
        color: colors.text,
        fontSize: 13,
        fontWeight: 800,
        maxWidth: '100%',
        boxSizing: 'border-box',
      }}
    >
      <span style={{ color: colors.blue }}>{number}</span>
      {text}
    </span>
  )
}
