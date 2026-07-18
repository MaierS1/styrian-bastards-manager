import { useRef, useState } from 'react'
import {
  buttonStyle,
  cardStyle,
  colors,
  inputStyle,
  isMobile,
  mutedTextStyle,
  secondaryButtonStyle,
} from '../../styles/appStyles'
import { uploadCashReceipt } from '../../services/cash/receiptUploadService'

const MAX_FILES = 50
const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024
const ACCEPTED_EXTENSIONS = new Set(['pdf', 'jpg', 'jpeg', 'png', 'webp'])
const ACCEPTED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
])
const FILE_INPUT_ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp'

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes)) return '-'

  const megabytes = bytes / (1024 * 1024)

  if (megabytes >= 1) {
    return `${megabytes.toFixed(1)} MB`
  }

  return `${(bytes / 1024).toFixed(0)} KB`
}

function getFileExtension(fileName) {
  return String(fileName || '')
    .split('.')
    .pop()
    .toLowerCase()
}

function getFileKey(file) {
  return [
    file.name,
    file.size,
    file.lastModified,
    file.type,
  ].join('|')
}

function validateReceiptFile(file) {
  const extension = getFileExtension(file.name)
  const hasAcceptedExtension = ACCEPTED_EXTENSIONS.has(extension)
  const hasAcceptedType = ACCEPTED_MIME_TYPES.has(file.type)

  if (!hasAcceptedExtension && !hasAcceptedType) {
    return 'Ungültiger Dateityp. Erlaubt sind PDF, JPG, JPEG, PNG und WEBP.'
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return 'Datei ist größer als 15 MB.'
  }

  return ''
}

function createUploadItem(file, index, existingCount) {
  const validationError = validateReceiptFile(file)

  return {
    id: `${Date.now()}-${existingCount + index}-${file.name}`,
    fileKey: getFileKey(file),
    file,
    name: file.name,
    size: file.size,
    type: file.type || getFileExtension(file.name).toUpperCase(),
    status: validationError ? 'Fehler' : 'Bereit',
    error: validationError,
    storagePath: '',
  }
}

function getStatusStyle(status) {
  if (status === 'Hochgeladen') {
    return { color: colors.successText, fontWeight: 800 }
  }

  if (status === 'Fehler') {
    return { color: colors.dangerText, fontWeight: 800 }
  }

  if (status === 'Lädt hoch') {
    return { color: colors.infoText, fontWeight: 800 }
  }

  return { color: colors.text, fontWeight: 800 }
}

export function BulkReceiptUpload() {
  const [items, setItems] = useState([])
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [limitMessage, setLimitMessage] = useState('')
  const fileInputRef = useRef(null)

  const readyCount = items.filter((item) => item.status === 'Bereit').length
  const uploadedCount = items.filter((item) => item.status === 'Hochgeladen').length
  const hasUploadableFiles = readyCount > 0 && !isUploading

  function addFiles(fileList) {
    if (isUploading) return

    const selectedFiles = Array.from(fileList || [])
    if (selectedFiles.length === 0) return

    setItems((currentItems) => {
      const availableSlots = Math.max(MAX_FILES - currentItems.length, 0)
      const existingKeys = new Set(currentItems.map((item) => item.fileKey))
      const newKeys = new Set()
      const uniqueFiles = []
      let duplicateCount = 0

      selectedFiles.forEach((file) => {
        const fileKey = getFileKey(file)

        if (existingKeys.has(fileKey) || newKeys.has(fileKey)) {
          duplicateCount += 1
          return
        }

        newKeys.add(fileKey)
        uniqueFiles.push(file)
      })

      const acceptedFiles = uniqueFiles.slice(0, availableSlots)
      const nextItems = acceptedFiles.map((file, index) => createUploadItem(file, index, currentItems.length))
      const messages = []

      if (duplicateCount > 0) {
        messages.push('Doppelt ausgewählte Dateien wurden nicht erneut hinzugefügt.')
      }

      if (uniqueFiles.length > availableSlots) {
        messages.push('Maximal 50 Dateien pro Upload-Vorgang erlaubt. Überzählige Dateien wurden nicht hinzugefügt.')
      }

      setLimitMessage(messages.join(' '))

      return [...currentItems, ...nextItems]
    })
  }

  function handleInputChange(event) {
    addFiles(event.target.files)
    event.target.value = ''
  }

  function handleDragOver(event) {
    event.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave(event) {
    event.preventDefault()
    setIsDragging(false)
  }

  function handleDrop(event) {
    event.preventDefault()
    setIsDragging(false)
    addFiles(event.dataTransfer.files)
  }

  async function startUpload() {
    if (!hasUploadableFiles) return

    setIsUploading(true)

    const uploadQueue = items.filter((item) => item.status === 'Bereit')

    for (const item of uploadQueue) {
      setItems((currentItems) => currentItems.map((currentItem) => (
        currentItem.id === item.id
          ? { ...currentItem, status: 'Lädt hoch', error: '' }
          : currentItem
      )))

      try {
        const storagePath = await uploadCashReceipt({ file: item.file })

        setItems((currentItems) => currentItems.map((currentItem) => (
          currentItem.id === item.id
            ? { ...currentItem, status: 'Hochgeladen', storagePath }
            : currentItem
        )))
      } catch (error) {
        setItems((currentItems) => currentItems.map((currentItem) => (
          currentItem.id === item.id
            ? { ...currentItem, status: 'Fehler', error: error.message || 'Upload fehlgeschlagen.' }
            : currentItem
        )))
      }
    }

    setIsUploading(false)
  }

  return (
    <div style={{ ...cardStyle, borderTop: `6px solid ${colors.blue}` }}>
      <strong style={{ display: 'block', marginBottom: 8 }}>Bulk-Belegupload</strong>
      <p style={mutedTextStyle}>
        Mehrere Belege können hier vorab in den Storage hochgeladen werden. Es wird noch kein Kassa-Eintrag erstellt.
      </p>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          ...inputStyle,
          marginBottom: 12,
          borderStyle: 'dashed',
          borderColor: isDragging ? colors.blue : colors.border,
          background: isDragging ? colors.infoBg : colors.white,
          textAlign: 'center',
          cursor: isUploading ? 'not-allowed' : 'pointer',
          opacity: isUploading ? 0.72 : 1,
        }}
        role="button"
        tabIndex={0}
        onClick={() => {
          if (!isUploading) fileInputRef.current?.click()
        }}
        onKeyDown={(event) => {
          if (!isUploading && (event.key === 'Enter' || event.key === ' ')) {
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
        accept={FILE_INPUT_ACCEPT}
        onChange={handleInputChange}
        style={{ display: 'none' }}
      />

      <button type="button" onClick={() => fileInputRef.current?.click()} style={secondaryButtonStyle} disabled={isUploading}>
        Dateien hinzufügen
      </button>
      <button
        type="button"
        onClick={() => {
          setItems([])
          setLimitMessage('')
        }}
        style={secondaryButtonStyle}
        disabled={isUploading || items.length === 0}
      >
        Alle entfernen
      </button>
      <button type="button" onClick={startUpload} style={buttonStyle} disabled={!hasUploadableFiles}>
        Upload starten
      </button>

      {items.length > 0 && (
        <>
          <p style={mutedTextStyle}>
            Ausgewählt: {items.length} · Bereit: {readyCount} · Hochgeladen: {uploadedCount}
          </p>

          {limitMessage && (
            <p style={{ color: colors.dangerText }}>{limitMessage}</p>
          )}

          <div style={{ display: 'grid', gap: 8 }}>
            {items.map((item) => (
              <div
                key={item.id}
                style={{
                  border: `1px solid ${colors.border}`,
                  borderRadius: 10,
                  padding: 10,
                  background: item.status === 'Fehler' ? colors.dangerBg : item.status === 'Hochgeladen' ? colors.successBg : colors.white,
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : 'minmax(220px, 1fr) 120px 160px 130px',
                  gap: 8,
                  alignItems: 'center',
                }}
              >
                <span style={{ fontWeight: 800, wordBreak: 'break-word' }}>{item.name}</span>
                <span>{formatFileSize(item.size)}</span>
                <span>{item.type || '-'}</span>
                <span style={getStatusStyle(item.status)}>{item.status}</span>
                {item.status === 'Lädt hoch' && (
                  <span style={{ ...mutedTextStyle, gridColumn: '1 / -1' }}>Upload läuft...</span>
                )}
                {item.storagePath && (
                  <span style={{ ...mutedTextStyle, gridColumn: '1 / -1', wordBreak: 'break-word' }}>
                    Gespeichert als: {item.storagePath}
                  </span>
                )}
                {item.error && (
                  <span style={{ color: colors.dangerText, gridColumn: '1 / -1' }}>{item.error}</span>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
