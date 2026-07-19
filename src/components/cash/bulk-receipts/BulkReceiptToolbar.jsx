import {
  buttonStyle,
  colors,
  inputStyle,
  mutedTextStyle,
  secondaryButtonStyle,
} from '../../../styles/appStyles'

export function BulkReceiptToolbar({
  fileInputRef,
  fileInputAccept,
  isBusy,
  isDragging,
  hasDrafts,
  hasUploadableFiles,
  canBookDrafts,
  isPosting,
  onAddFiles,
  onDragOver,
  onDragLeave,
  onDrop,
  onStartUpload,
  onBookReadyDrafts,
  onReset,
}) {
  return (
    <>
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        style={{
          ...inputStyle,
          marginBottom: 12,
          borderStyle: 'dashed',
          borderColor: isDragging ? colors.blue : colors.border,
          background: isDragging ? colors.infoBg : colors.white,
          textAlign: 'center',
          cursor: isBusy ? 'not-allowed' : 'pointer',
          opacity: isBusy ? 0.72 : 1,
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
        PDFs oder Bilder hier ablegen
        <br />
        <span style={mutedTextStyle}>PDF, JPG, JPEG, PNG, WEBP · maximal 50 Dateien · maximal 15 MB pro Datei</span>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={fileInputAccept}
        onChange={onAddFiles}
        style={{ display: 'none' }}
      />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <button type="button" onClick={() => fileInputRef.current?.click()} style={secondaryButtonStyle} disabled={isBusy}>
          Dateien hinzufügen
        </button>
        <button type="button" onClick={onReset} style={secondaryButtonStyle} disabled={isBusy || !hasDrafts}>
          Liste zurücksetzen
        </button>
        <button type="button" onClick={onStartUpload} style={buttonStyle} disabled={!hasUploadableFiles}>
          Upload starten
        </button>
        <button
          type="button"
          onClick={onBookReadyDrafts}
          style={buttonStyle}
          disabled={!canBookDrafts}
          title={canBookDrafts ? 'Geprüfte Belege als Kassa-Einträge speichern.' : 'Mindestens ein geprüfter Beleg ist erforderlich.'}
        >
          {isPosting ? 'Belege werden verbucht...' : 'Geprüfte Belege verbuchen'}
        </button>
      </div>
    </>
  )
}
