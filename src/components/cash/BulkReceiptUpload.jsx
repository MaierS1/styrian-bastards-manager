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
import {
  BULK_RECEIPT_CONCURRENCY,
  BULK_RECEIPT_FILE_LIMITS,
  BULK_RECEIPT_STATUSES,
  BULK_RECEIPT_STATUS_LABELS,
  BULK_RECEIPT_TASK_TYPE,
} from '../../services/cash/bulkReceiptTypes'
import {
  applyBulkReceiptDraftFieldChange,
  createBulkReceiptDraft,
  getBulkReceiptFileKey,
} from '../../services/cash/bulkReceiptDraftService'
import { updateBulkReceiptDraftValidation } from '../../services/cash/bulkReceiptValidationService'
import { useTaskQueue } from '../../services/tasks/useTaskQueue.ts'
import { BulkReceiptDraftItem } from './BulkReceiptDraftItem'

const MAX_FILES = BULK_RECEIPT_FILE_LIMITS.maxFiles
const FILE_INPUT_ACCEPT = BULK_RECEIPT_FILE_LIMITS.fileInputAccept

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

function getDraftStatus(draft) {
  return BULK_RECEIPT_STATUS_LABELS[draft.status] || 'Upload ausstehend'
}

function getStatusStyle(status) {
  if (status === BULK_RECEIPT_STATUS_LABELS[BULK_RECEIPT_STATUSES.READY]) {
    return { color: colors.successText, fontWeight: 800 }
  }

  if (status === BULK_RECEIPT_STATUS_LABELS[BULK_RECEIPT_STATUSES.ERROR]) {
    return { color: colors.dangerText, fontWeight: 800 }
  }

  if (
    status === BULK_RECEIPT_STATUS_LABELS[BULK_RECEIPT_STATUSES.UPLOADING]
    || status === BULK_RECEIPT_STATUS_LABELS[BULK_RECEIPT_STATUSES.ANALYZING]
  ) {
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

function updateDraftValidation(draft) {
  return updateBulkReceiptDraftValidation(draft)
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

  const pendingCount = drafts.filter((draft) => draft.status === BULK_RECEIPT_STATUSES.WAITING).length
  const uploadedCount = drafts.filter((draft) => draft.uploadStatus === 'uploaded').length
  const readyToPostCount = drafts.filter((draft) => draft.status === BULK_RECEIPT_STATUSES.READY).length
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
        message: draft.storagePath ? BULK_RECEIPT_STATUSES.ANALYZING : BULK_RECEIPT_STATUSES.WAITING,
      },
    })
  }, [enqueue])

  useEffect(() => registerWorker(BULK_RECEIPT_TASK_TYPE, async (payload, context) => {
    let storagePath = String(payload.storagePath || '').trim()

    if (!storagePath) {
      context.reportProgress({ current: 10, message: BULK_RECEIPT_STATUSES.UPLOADING })
      storagePath = await uploadCashReceipt({ file: payload.file })
    }

    if (context.signal.aborted) {
      throw new Error('Task wurde abgebrochen.')
    }

    context.reportProgress({ current: 55, message: `${BULK_RECEIPT_STATUSES.ANALYZING}|${storagePath}` })
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
      if (draft.status === BULK_RECEIPT_STATUSES.WAITING && !draft.error) {
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
            status: draft.storagePath ? BULK_RECEIPT_STATUSES.ANALYZING : BULK_RECEIPT_STATUSES.UPLOADING,
            taskStatus: draft.storagePath ? BULK_RECEIPT_STATUSES.ANALYZING : BULK_RECEIPT_STATUSES.UPLOADING,
            uploadStatus: draft.storagePath ? 'uploaded' : 'uploading',
            analysisStatus: draft.storagePath ? 'analyzing' : 'idle',
            uploadError: '',
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
            status: phase === BULK_RECEIPT_STATUSES.UPLOADING
              ? BULK_RECEIPT_STATUSES.UPLOADING
              : BULK_RECEIPT_STATUSES.ANALYZING,
            taskStatus: phase === BULK_RECEIPT_STATUSES.UPLOADING
              ? BULK_RECEIPT_STATUSES.UPLOADING
              : BULK_RECEIPT_STATUSES.ANALYZING,
            uploadStatus: phase === BULK_RECEIPT_STATUSES.UPLOADING ? 'uploading' : 'uploaded',
            analysisStatus: phase === BULK_RECEIPT_STATUSES.ANALYZING ? 'analyzing' : draft.analysisStatus,
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
          status: BULK_RECEIPT_STATUSES.ANALYZING,
          taskStatus: BULK_RECEIPT_STATUSES.ANALYZING,
          uploadStatus: 'uploaded',
          storagePath: event.task.result?.storagePath || draft.storagePath,
          uploadError: '',
          error: '',
          analysisStatus: 'completed',
          analysisResult: result.analysis,
          analysisError: '',
          analysisWarnings: result.warnings,
          isExpanded: true,
        }, result)

        return updateDraftValidation(mappedDraft)
      }))
      return
    }

    if (event.name === 'task:failed') {
      setDrafts((currentDrafts) => currentDrafts.map((draft) => (
        draft.id === draftId
          ? updateDraftValidation({
            ...draft,
            status: BULK_RECEIPT_STATUSES.ERROR,
            taskStatus: BULK_RECEIPT_STATUSES.ERROR,
            uploadStatus: draft.storagePath ? 'uploaded' : 'error',
            analysisStatus: draft.storagePath ? 'error' : draft.analysisStatus,
            uploadError: draft.storagePath ? draft.uploadError : event.task.error?.message || 'Upload fehlgeschlagen.',
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
        const fileKey = getBulkReceiptFileKey(file)

        if (existingKeys.has(fileKey) || newKeys.has(fileKey)) {
          duplicateCount += 1
          return
        }

        newKeys.add(fileKey)
        uniqueFiles.push(file)
      })

      const acceptedFiles = uniqueFiles.slice(0, availableSlots)
      const nextDrafts = acceptedFiles.map((file, index) => createBulkReceiptDraft(file, index, currentDrafts.length))
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

    setDrafts((currentDrafts) => currentDrafts.map((draft) => (
      draft.id === draftId ? applyBulkReceiptDraftFieldChange(draft, field, value) : draft
    )))
  }

  function cancelDraftTask(draft) {
    if (!draft?.taskId) return

    queue.cancel(draft.taskId)
    queuedTaskIdsRef.current.delete(draft.taskId)
  }

  function removeDraft(draftId) {
    if (isBusy) return

    cancelDraftTask(drafts.find((draft) => draft.id === draftId))
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
      .filter((draft) => draft.status === BULK_RECEIPT_STATUSES.WAITING && !draft.error)
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
          status: BULK_RECEIPT_STATUSES.ANALYZING,
          taskStatus: BULK_RECEIPT_STATUSES.ANALYZING,
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

    const readyDrafts = drafts.filter((draft) => draft.status === BULK_RECEIPT_STATUSES.READY)

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
            ? updateDraftValidation({
              ...draft,
              status: BULK_RECEIPT_STATUSES.ERROR,
              taskStatus: BULK_RECEIPT_STATUSES.ERROR,
              error,
              isExpanded: true,
            })
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
          drafts.forEach(cancelDraftTask)
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
