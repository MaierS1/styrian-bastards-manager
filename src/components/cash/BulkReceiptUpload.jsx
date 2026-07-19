import { useCallback, useEffect, useRef, useState } from 'react'
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
import { analyzeCashReceipt } from '../../services/cash/receiptAnalysisService'
import { applyReceiptAnalysisToDraft } from '../../services/cash/receiptAnalysisMappingService'
import { useTaskQueue } from '../../services/tasks/useTaskQueue.ts'
import { BulkReceiptDraftItem } from './BulkReceiptDraftItem'

const MAX_FILES = 50
const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024
const BULK_RECEIPT_TASK_TYPE = 'bulk-receipt-upload-analysis'
const BULK_RECEIPT_CONCURRENCY = 3
const ACCEPTED_EXTENSIONS = new Set(['pdf', 'jpg', 'jpeg', 'png', 'webp'])
const ACCEPTED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
])
const FILE_INPUT_ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp'

const CASH_CATEGORIES = [
  { value: 'mitgliedsbeitrag', label: 'Mitgliedsbeitrag' },
  { value: 'pfandbecher', label: 'Pfandbecher' },
  { value: 'veranstaltung', label: 'Veranstaltung' },
  { value: 'fanartikel', label: 'Fanartikel' },
  { value: 'sonstiges', label: 'Sonstiges' },
]

const CASH_PAYMENT_METHODS = [
  { value: 'bar', label: 'Bar' },
  { value: 'ebanking', label: 'E-Banking' },
]

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

function validateDraft(draft) {
  const errors = []
  const amount = Number(String(draft.amount || '').replace(',', '.'))

  if (draft.uploadStatus !== 'uploaded') {
    errors.push('Upload ist noch nicht erfolgreich abgeschlossen.')
  }

  if (!draft.storagePath) {
    errors.push('Storage-Pfad fehlt.')
  }

  if (!draft.date) {
    errors.push('Belegdatum ist erforderlich.')
  }

  if (!draft.type) {
    errors.push('Typ ist erforderlich.')
  }

  if (!draft.category) {
    errors.push('Kategorie ist erforderlich.')
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    errors.push('Betrag muss größer als 0 sein.')
  }

  return errors
}

function getDraftStatus(draft) {
  if (draft.error || draft.uploadStatus === 'error') return 'Fehler'
  if (draft.taskStatus === 'waiting') return 'Wartet'
  if (draft.uploadStatus === 'uploading') return 'Wird hochgeladen'
  if (draft.analysisStatus === 'analyzing') return 'Wird analysiert'
  if (draft.uploadStatus !== 'uploaded') return 'Upload ausstehend'

  return draft.validationErrors.length === 0 ? 'Bereit zur Verbuchung' : 'Prüfung erforderlich'
}

function getStatusStyle(status) {
  if (status === 'Bereit zur Verbuchung') {
    return { color: colors.successText, fontWeight: 800 }
  }

  if (status === 'Fehler') {
    return { color: colors.dangerText, fontWeight: 800 }
  }

  if (status === 'Wird hochgeladen' || status === 'Wird analysiert') {
    return { color: colors.infoText, fontWeight: 800 }
  }

  return { color: colors.text, fontWeight: 800 }
}

function parseTaskProgressMessage(message) {
  const text = String(message || '')
  const [phase, ...details] = text.split('|')

  return {
    phase,
    storagePath: details.join('|'),
  }
}

function createDraft(file, index, existingCount) {
  const validationError = validateReceiptFile(file)
  const id = `${Date.now()}-${existingCount + index}-${file.name}`
  const draft = {
    id,
    fileKey: getFileKey(file),
    file,
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type || getFileExtension(file.name).toUpperCase(),
    storagePath: '',
    taskId: validationError ? '' : id,
    taskStatus: validationError ? 'error' : 'waiting',
    uploadStatus: validationError ? 'error' : 'pending',
    error: validationError,
    date: '',
    type: 'ausgabe',
    category: 'sonstiges',
    paymentMethod: 'bar',
    eventId: '',
    amount: '',
    description: '',
    validationErrors: [],
    analysisStatus: 'idle',
    analysisResult: null,
    analysisError: '',
    analysisWarnings: [],
    touchedFields: {},
    isExpanded: false,
  }

  return {
    ...draft,
    validationErrors: validationError ? [] : validateDraft(draft),
  }
}

function updateDraftValidation(draft) {
  return {
    ...draft,
    validationErrors: draft.error ? [] : validateDraft(draft),
  }
}

export function BulkReceiptUpload({ events = [], onBookDrafts }) {
  const [drafts, setDrafts] = useState([])
  const [isDragging, setIsDragging] = useState(false)
  const [isPosting, setIsPosting] = useState(false)
  const [limitMessage, setLimitMessage] = useState('')
  const [bookingMessage, setBookingMessage] = useState('')
  const fileInputRef = useRef(null)
  const queuedTaskIdsRef = useRef(new Set())
  const { queue, enqueue, registerWorker } = useTaskQueue({ concurrency: BULK_RECEIPT_CONCURRENCY })

  const pendingCount = drafts.filter((draft) => draft.uploadStatus === 'pending').length
  const uploadedCount = drafts.filter((draft) => draft.uploadStatus === 'uploaded').length
  const readyToPostCount = drafts.filter((draft) => getDraftStatus(draft) === 'Bereit zur Verbuchung').length
  const isBusy = isPosting
  const hasUploadableFiles = pendingCount > 0 && !isBusy
  const canBookDrafts = readyToPostCount > 0 && !isBusy && Boolean(onBookDrafts)

  const enqueueReceiptTask = useCallback((draft) => {
    if (!draft?.taskId || queuedTaskIdsRef.current.has(draft.taskId)) return

    queuedTaskIdsRef.current.add(draft.taskId)
    enqueue(BULK_RECEIPT_TASK_TYPE, {
      draftId: draft.id,
      file: draft.file,
      storagePath: draft.storagePath,
    }, {
      id: draft.taskId,
      maxAttempts: 1,
      progress: {
        current: 0,
        total: 100,
        message: draft.storagePath ? 'analyzing' : 'waiting',
      },
    })
  }, [enqueue])

  useEffect(() => registerWorker(BULK_RECEIPT_TASK_TYPE, async (payload, context) => {
    let storagePath = String(payload.storagePath || '').trim()

    if (!storagePath) {
      context.reportProgress({ current: 10, message: 'uploading' })
      storagePath = await uploadCashReceipt({ file: payload.file })
    }

    if (context.signal.aborted) {
      throw new Error('Task wurde abgebrochen.')
    }

    context.reportProgress({ current: 55, message: `analyzing|${storagePath}` })
    const analysisResult = await analyzeCashReceipt({ storagePath })

    if (context.signal.aborted) {
      throw new Error('Task wurde abgebrochen.')
    }

    context.reportProgress({ current: 100, message: 'completed' })

    return {
      draftId: payload.draftId,
      storagePath,
      analysisResult,
    }
  }), [registerWorker])

  useEffect(() => {
    drafts.forEach((draft) => {
      if (draft.uploadStatus === 'pending' && !draft.error) {
        enqueueReceiptTask(draft)
      }
    })
  }, [drafts, enqueueReceiptTask])

  useEffect(() => queue.on('*', (event) => {
    if (event.task.type !== BULK_RECEIPT_TASK_TYPE) return

    const draftId = event.task.payload?.draftId
    if (!draftId) return

    if (event.name === 'task:started') {
      setDrafts((currentDrafts) => currentDrafts.map((draft) => (
        draft.id === draftId
          ? updateDraftValidation({
            ...draft,
            taskStatus: 'running',
            uploadStatus: draft.storagePath ? 'uploaded' : 'uploading',
            analysisStatus: draft.storagePath ? 'analyzing' : 'idle',
            error: '',
            analysisError: '',
            analysisWarnings: [],
          })
          : draft
      )))
      return
    }

    if (event.name === 'task:progress') {
      const { phase, storagePath } = parseTaskProgressMessage(event.task.progress.message)

      setDrafts((currentDrafts) => currentDrafts.map((draft) => (
        draft.id === draftId
          ? updateDraftValidation({
            ...draft,
            taskStatus: 'running',
            uploadStatus: phase === 'uploading' ? 'uploading' : 'uploaded',
            analysisStatus: phase === 'analyzing' ? 'analyzing' : draft.analysisStatus,
            storagePath: storagePath || draft.storagePath,
          })
          : draft
      )))
      return
    }

    if (event.name === 'task:succeeded') {
      setDrafts((currentDrafts) => currentDrafts.map((draft) => {
        if (draft.id !== draftId) return draft

        const result = event.task.result?.analysisResult || {}
        const mappedDraft = applyReceiptAnalysisToDraft({
          ...draft,
          taskStatus: 'running',
          uploadStatus: 'uploaded',
          storagePath: event.task.result?.storagePath || draft.storagePath,
          error: '',
          analysisStatus: 'completed',
          analysisResult: result.analysis,
          analysisError: '',
          analysisWarnings: result.warnings,
          isExpanded: true,
        }, result)
        const validatedDraft = updateDraftValidation(mappedDraft)

        return {
          ...validatedDraft,
          taskStatus: validatedDraft.validationErrors.length === 0 ? 'ready' : 'needs_review',
        }
      }))
      return
    }

    if (event.name === 'task:failed') {
      setDrafts((currentDrafts) => currentDrafts.map((draft) => (
        draft.id === draftId
          ? updateDraftValidation({
            ...draft,
            taskStatus: 'error',
            uploadStatus: draft.storagePath ? 'uploaded' : 'error',
            analysisStatus: draft.storagePath ? 'error' : draft.analysisStatus,
            error: event.task.error?.message || 'Belegverarbeitung fehlgeschlagen.',
            analysisError: draft.storagePath ? event.task.error?.message || 'Beleganalyse fehlgeschlagen.' : draft.analysisError,
            isExpanded: true,
          })
          : draft
      )))
      return
    }

    if (event.name === 'task:cancelled') {
      queuedTaskIdsRef.current.delete(event.task.id)
    }
  }), [queue])

  function addFiles(fileList) {
    if (isBusy) return

    const selectedFiles = Array.from(fileList || [])
    if (selectedFiles.length === 0) return

    setDrafts((currentDrafts) => {
      const availableSlots = Math.max(MAX_FILES - currentDrafts.length, 0)
      const existingKeys = new Set(currentDrafts.map((draft) => draft.fileKey))
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
      const nextDrafts = acceptedFiles.map((file, index) => createDraft(file, index, currentDrafts.length))
      const messages = []

      if (duplicateCount > 0) {
        messages.push('Doppelt ausgewählte Dateien wurden nicht erneut hinzugefügt.')
      }

      if (uniqueFiles.length > availableSlots) {
        messages.push('Maximal 50 Dateien pro Upload-Vorgang erlaubt. Überzählige Dateien wurden nicht hinzugefügt.')
      }

      setLimitMessage(messages.join(' '))

      return [...currentDrafts, ...nextDrafts]
    })
  }

  function updateDraft(draftId, field, value) {
    if (isBusy) return

    setDrafts((currentDrafts) => currentDrafts.map((draft) => {
      if (draft.id !== draftId) return draft

      return updateDraftValidation({
        ...draft,
        [field]: value,
        touchedFields: {
          ...(draft.touchedFields || {}),
          [field]: true,
        },
        error: draft.uploadStatus === 'uploaded' ? '' : draft.error,
      })
    }))
  }

  function removeDraft(draftId) {
    if (isBusy) return

    const draft = drafts.find((currentDraft) => currentDraft.id === draftId)
    if (draft?.taskId) {
      queue.cancel(draft.taskId)
      queuedTaskIdsRef.current.delete(draft.taskId)
    }

    setDrafts((currentDrafts) => currentDrafts.filter((draft) => draft.id !== draftId))
  }

  function toggleDraft(draftId) {
    if (isBusy) return

    setDrafts((currentDrafts) => currentDrafts.map((draft) => (
      draft.id === draftId ? { ...draft, isExpanded: !draft.isExpanded } : draft
    )))
  }

  function setAllExpanded(isExpanded) {
    if (isBusy) return

    setDrafts((currentDrafts) => currentDrafts.map((draft) => ({
      ...draft,
      isExpanded,
    })))
  }

  function handleInputChange(event) {
    addFiles(event.target.files)
    event.target.value = ''
  }

  function handleDragOver(event) {
    event.preventDefault()
    if (!isBusy) setIsDragging(true)
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

    drafts
      .filter((draft) => draft.uploadStatus === 'pending' && !draft.error)
      .forEach(enqueueReceiptTask)
  }

  async function analyzeDraft(draftId) {
    const draft = drafts.find((currentDraft) => currentDraft.id === draftId)

    if (
      !draft
      || draft.uploadStatus !== 'uploaded'
      || !draft.storagePath
      || isPosting
    ) {
      return
    }

    const taskId = `${draft.id}-analysis-${Date.now()}`
    queuedTaskIdsRef.current.delete(draft.taskId)

    setDrafts((currentDrafts) => currentDrafts.map((currentDraft) => (
      currentDraft.id === draftId
        ? {
          ...currentDraft,
          taskId,
          taskStatus: 'waiting',
          analysisStatus: 'analyzing',
          analysisError: '',
          analysisWarnings: [],
        }
        : currentDraft
    )))

    enqueueReceiptTask({
      ...draft,
      taskId,
    })
  }

  async function bookReadyDrafts() {
    if (!canBookDrafts) return

    const readyDrafts = drafts.filter((draft) => getDraftStatus(draft) === 'Bereit zur Verbuchung')

    if (readyDrafts.length === 0) return

    setIsPosting(true)
    setBookingMessage('')

    try {
      const result = await onBookDrafts(readyDrafts)
      const bookedIds = new Set(result?.bookedIds || [])
      const errorsById = result?.errorsById || {}
      const errorCount = Object.keys(errorsById).length

      setDrafts((currentDrafts) => currentDrafts
        .filter((draft) => !bookedIds.has(draft.id))
        .map((draft) => {
          const error = errorsById[draft.id]

          return error
            ? updateDraftValidation({ ...draft, error, isExpanded: true })
            : draft
        }))

      setBookingMessage([
        bookedIds.size > 0 ? `${bookedIds.size} Beleg${bookedIds.size === 1 ? '' : 'e'} erfolgreich verbucht.` : '',
        errorCount > 0 ? `${errorCount} Beleg${errorCount === 1 ? '' : 'e'} konnten nicht verbucht werden.` : '',
      ].filter(Boolean).join(' '))
    } catch (error) {
      setBookingMessage(error.message || 'Verbuchung konnte nicht abgeschlossen werden.')
    } finally {
      setIsPosting(false)
    }
  }

  return (
    <div style={{ ...cardStyle, borderTop: `6px solid ${colors.blue}` }}>
      <strong style={{ display: 'block', marginBottom: 8 }}>Bulk-Belegupload</strong>
      <p style={mutedTextStyle}>
        Mehrere Belege können hier vorab in den Storage hochgeladen und lokal geprüft werden. Es wird noch kein Kassa-Eintrag erstellt.
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
        accept={FILE_INPUT_ACCEPT}
        onChange={handleInputChange}
        style={{ display: 'none' }}
      />

      <button type="button" onClick={() => fileInputRef.current?.click()} style={secondaryButtonStyle} disabled={isBusy}>
        Dateien hinzufügen
      </button>
      <button
        type="button"
        onClick={() => {
          drafts.forEach((draft) => {
            if (draft.taskId) {
              queue.cancel(draft.taskId)
              queuedTaskIdsRef.current.delete(draft.taskId)
            }
          })
          setDrafts([])
          setLimitMessage('')
          setBookingMessage('')
        }}
        style={secondaryButtonStyle}
        disabled={isBusy || drafts.length === 0}
      >
        Alle entfernen
      </button>
      <button type="button" onClick={startUpload} style={buttonStyle} disabled={!hasUploadableFiles}>
        Upload starten
      </button>
      <button
        type="button"
        onClick={bookReadyDrafts}
        style={buttonStyle}
        disabled={!canBookDrafts}
        title={canBookDrafts ? 'Geprüfte Belege als Kassa-Einträge speichern.' : 'Mindestens ein geprüfter Beleg ist erforderlich.'}
      >
        {isPosting ? 'Belege werden verbucht...' : 'Geprüfte Belege verbuchen'}
      </button>

      {drafts.length > 1 && (
        <>
          <button type="button" onClick={() => setAllExpanded(true)} style={secondaryButtonStyle} disabled={isBusy}>
            Alle Prüfmasken öffnen
          </button>
          <button type="button" onClick={() => setAllExpanded(false)} style={secondaryButtonStyle} disabled={isBusy}>
            Alle Prüfmasken schließen
          </button>
        </>
      )}

      {drafts.length > 0 && (
        <>
          <p style={mutedTextStyle}>
            Ausgewählt: {drafts.length} · Upload erfolgreich: {uploadedCount} · Bereit zur Verbuchung: {readyToPostCount}
          </p>

          {limitMessage && (
            <p style={{ color: colors.dangerText }}>{limitMessage}</p>
          )}

          {bookingMessage && (
            <p style={{ color: bookingMessage.includes('konnten nicht') ? colors.dangerText : colors.successText, fontWeight: 800 }}>
              {bookingMessage}
            </p>
          )}

          <div style={{ display: 'grid', gap: 8 }}>
            {drafts.map((draft) => {
              const status = getDraftStatus(draft)

              return (
                <BulkReceiptDraftItem
                  key={draft.id}
                  draft={draft}
                  status={status}
                  statusStyle={getStatusStyle(status)}
                  events={events}
                  categories={CASH_CATEGORIES}
                  paymentMethods={CASH_PAYMENT_METHODS}
                  disabled={isBusy}
                  isMobile={isMobile}
                  formatFileSize={formatFileSize}
                  analysisDisabled={isPosting}
                  onChange={updateDraft}
                  onRemove={removeDraft}
                  onToggle={toggleDraft}
                  onAnalyze={analyzeDraft}
                />
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
