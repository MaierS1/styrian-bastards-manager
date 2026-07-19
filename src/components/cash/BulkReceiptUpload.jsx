import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  cardStyle,
  colors,
  isMobile,
  mutedTextStyle,
} from '../../styles/appStyles'
import { uploadCashReceipt } from '../../services/cash/receiptUploadService'
import { analyzeCashReceipt } from '../../services/cash/receiptAnalysisService'
import { applyReceiptAnalysisToDraft } from '../../services/cash/receiptAnalysisMappingService'
import {
  BULK_RECEIPT_CONCURRENCY,
  BULK_RECEIPT_FILE_LIMITS,
  BULK_RECEIPT_STATUSES,
  BULK_RECEIPT_TASK_TYPE,
} from '../../services/cash/bulkReceiptTypes'
import {
  applyBulkReceiptDraftFieldChange,
  confirmBulkReceiptDraftReview,
  createBulkReceiptDraft,
  getBulkReceiptFileKey,
} from '../../services/cash/bulkReceiptDraftService'
import { updateBulkReceiptDraftValidation } from '../../services/cash/bulkReceiptValidationService'
import { useTaskQueue } from '../../services/tasks/useTaskQueue.ts'
import { BulkReceiptToolbar } from './bulk-receipts/BulkReceiptToolbar'
import { BulkReceiptSummary } from './bulk-receipts/BulkReceiptSummary'
import { BulkReceiptDraftList } from './bulk-receipts/BulkReceiptDraftList'
import {
  getBulkReceiptProgress,
  getBulkReceiptQueueState,
  getBulkReceiptSummary,
  toggleSingleExpandedDraft,
} from './bulk-receipts/bulkReceiptUiUtils'

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

  const readyToPostCount = drafts.filter((draft) => draft.status === BULK_RECEIPT_STATUSES.READY).length
  const summary = useMemo(() => getBulkReceiptSummary(drafts), [drafts])
  const progress = useMemo(() => getBulkReceiptProgress(drafts), [drafts])
  const queueState = useMemo(() => getBulkReceiptQueueState(summary), [summary])
  const isBusy = isPosting
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
          reviewConfirmed: false,
          reviewRequired: false,
          reviewMessage: '',
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

  function handleInputChange(event) {
    addFiles(event.target.files)
    event.target.value = ''
  }

  const updateDraft = useCallback((draftId, field, value) => {
    if (isBusy) return

    setDrafts((currentDrafts) => currentDrafts.map((draft) => (
      draft.id === draftId ? applyBulkReceiptDraftFieldChange(draft, field, value) : draft
    )))
  }, [isBusy])

  const cancelDraftTask = useCallback((draft) => {
    if (!draft?.taskId) return

    queue.cancel(draft.taskId)
    queuedTaskIdsRef.current.delete(draft.taskId)
  }, [queue])

  const removeDraft = useCallback((draftId) => {
    if (isBusy) return

    const draft = drafts.find((currentDraft) => currentDraft.id === draftId)
    cancelDraftTask(draft)
    setDrafts((currentDrafts) => currentDrafts.filter((currentDraft) => currentDraft.id !== draftId))
  }, [cancelDraftTask, drafts, isBusy])

  const toggleDraft = useCallback((draftId) => {
    if (isBusy) return

    setDrafts((currentDrafts) => toggleSingleExpandedDraft(currentDrafts, draftId))
  }, [isBusy])

  const resetDrafts = useCallback(() => {
    drafts.forEach(cancelDraftTask)
    setDrafts([])
    setLimitMessage('')
    setBookingMessage('')
  }, [cancelDraftTask, drafts])

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

  function analyzeDraft(draftId) {
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
          reviewConfirmed: false,
          reviewRequired: false,
          reviewMessage: '',
        }
        : currentDraft
    )))

    enqueueReceiptTask({
      ...draft,
      taskId,
    })
  }

  const confirmDraftReview = useCallback((draftId) => {
    if (isBusy) return

    setDrafts((currentDrafts) => currentDrafts.map((draft) => (
      draft.id === draftId ? confirmBulkReceiptDraftReview(draft) : draft
    )))
  }, [isBusy])

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
    <div style={{ ...cardStyle, borderTop: `6px solid ${colors.blue}`, display: 'grid', gap: 16 }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1fr) auto auto',
          gap: 14,
          alignItems: 'center',
          paddingBottom: 4,
        }}
      >
        <div>
          <strong style={{ display: 'block', color: colors.black, fontSize: 24, lineHeight: 1.15 }}>
            Bulk-Belegupload
          </strong>
          <p style={{ ...mutedTextStyle, marginTop: 6 }}>
            Belege gesammelt hochladen, automatisch analysieren und nach Prüfung verbuchen.
          </p>
        </div>
        <div
          aria-live="polite"
          style={{
            border: `1px solid ${colors.border}`,
            borderRadius: 12,
            padding: '10px 14px',
            background: colors.offWhite,
            minWidth: isMobile ? 'auto' : 180,
          }}
        >
          <span style={{ ...mutedTextStyle, display: 'block', fontSize: 12 }}>Queue-Zustand</span>
          <strong style={{ color: colors.blue }}>{queueState}</strong>
        </div>
        <div
          style={{
            border: `1px solid ${colors.border}`,
            borderRadius: 12,
            padding: '10px 14px',
            background: colors.white,
            textAlign: isMobile ? 'left' : 'right',
            minWidth: isMobile ? 'auto' : 120,
          }}
        >
          <span style={{ ...mutedTextStyle, display: 'block', fontSize: 12 }}>Gesamt</span>
          <strong style={{ color: colors.black, fontSize: 22 }}>{summary.total}</strong>
        </div>
      </div>

      <BulkReceiptToolbar
        fileInputRef={fileInputRef}
        fileInputAccept={FILE_INPUT_ACCEPT}
        isBusy={isBusy}
        isDragging={isDragging}
        hasDrafts={drafts.length > 0}
        canBookDrafts={canBookDrafts}
        isPosting={isPosting}
        onAddFiles={handleInputChange}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onBookReadyDrafts={bookReadyDrafts}
        onReset={resetDrafts}
      />

      {limitMessage && (
        <p style={{ color: colors.dangerText }}>{limitMessage}</p>
      )}

      {bookingMessage && (
        <p style={{ color: bookingMessage.includes('konnten nicht') ? colors.dangerText : colors.successText, fontWeight: 800 }}>
          {bookingMessage}
        </p>
      )}

      <BulkReceiptSummary summary={summary} progress={progress} />

      <BulkReceiptDraftList
        drafts={drafts}
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
        onConfirmReview={confirmDraftReview}
      />
    </div>
  )
}
