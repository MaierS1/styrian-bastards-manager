export const MAX_RECIPIENTS = 100
export const MAX_SYSTEM_RECIPIENTS = 500
export const MAX_TITLE_LENGTH = 160
export const MAX_MESSAGE_LENGTH = 4000
export const MAX_TYPE_LENGTH = 80
export const MAX_METADATA_BYTES = 8192
export const MAX_IDEMPOTENCY_KEY_LENGTH = 180
export const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024

export const SUPPORTED_CHANNELS = ['in_app', 'email']
export const KNOWN_CHANNELS = ['in_app', 'email', 'push']
export const ALLOWED_PRIORITIES = ['low', 'normal', 'high', 'critical']
export const ALLOWED_CATEGORIES = ['event', 'membership_fee', 'invoice', 'document', 'club_news', 'board', 'system', 'backup']

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const SAFE_PATH_PATTERN = /^\/[A-Za-z0-9/_?=&.#%:-]*$/

const ALLOWED_KEYS = new Set([
  'type',
  'category',
  'title',
  'message',
  'channels',
  'recipient_user_id',
  'recipient_member_id',
  'recipient_event_registration_id',
  'recipient_invoice_id',
  'recipient_user_ids',
  'recipient_member_ids',
  'recipient_event_registration_ids',
  'recipient_invoice_ids',
  'system_wide',
  'source',
  'url',
  'priority',
  'scheduled_at',
  'idempotency_key',
  'metadata',
  'attachments',
])

const ALLOWED_SOURCE_KEYS = new Set(['module', 'entity_type', 'entity_id'])

export function validateDispatchPayload(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return invalid(400, 'Ungueltiger Request Body.')
  }

  const unknownKeys = Object.keys(body).filter((key) => !ALLOWED_KEYS.has(key))
  if (unknownKeys.length > 0) return invalid(400, 'Unerwartete Request-Felder.')

  const type = normalizeText(body.type)
  const title = normalizeText(body.title)
  const message = normalizeText(body.message)
  const category = normalizeText(body.category || 'system')
  const priority = normalizeText(body.priority || 'normal')
  const channels = Array.isArray(body.channels) ? body.channels.map(normalizeText) : []
  const url = body.url == null ? null : normalizeText(body.url)
  const idempotencyKey = body.idempotency_key == null ? null : normalizeText(body.idempotency_key)
  const scheduledAt = body.scheduled_at == null ? null : normalizeText(body.scheduled_at)
  const systemWide = body.system_wide === true

  if (!type || type.length > MAX_TYPE_LENGTH) return invalid(400, 'type ist erforderlich.')
  if (!title || title.length > MAX_TITLE_LENGTH) return invalid(400, 'title ist erforderlich.')
  if (!message || message.length > MAX_MESSAGE_LENGTH) return invalid(400, 'message ist erforderlich.')
  if (!ALLOWED_CATEGORIES.includes(category)) return invalid(400, 'Ungueltige Kategorie.')
  if (!ALLOWED_PRIORITIES.includes(priority)) return invalid(400, 'Ungueltige Prioritaet.')
  if (channels.length === 0) return invalid(400, 'channels ist erforderlich.')

  const unknownChannels = channels.filter((channel) => !KNOWN_CHANNELS.includes(channel))
  if (unknownChannels.length > 0) return invalid(422, 'Unbekannter Benachrichtigungskanal.')

  const unsupportedChannels = channels.filter((channel) => !SUPPORTED_CHANNELS.includes(channel))
  if (unsupportedChannels.length > 0) return invalid(422, 'Dieser Kanal ist im V1-MVP noch nicht unterstuetzt.')

  if (new Set(channels).size !== channels.length) return invalid(400, 'channels darf keine Duplikate enthalten.')

  if (url && !isSafeInternalUrl(url)) return invalid(400, 'Ungueltige URL.')
  if (idempotencyKey && idempotencyKey.length > MAX_IDEMPOTENCY_KEY_LENGTH) {
    return invalid(400, 'idempotency_key ist zu lang.')
  }
  if (scheduledAt && Number.isNaN(new Date(scheduledAt).getTime())) {
    return invalid(400, 'scheduled_at ist ungueltig.')
  }

  const sourceResult = validateSource(body.source)
  if (!sourceResult.ok) return sourceResult

  const metadata = body.metadata == null ? {} : body.metadata
  if (!isPlainObject(metadata)) return invalid(400, 'metadata ist ungueltig.')
  if (jsonByteSize(metadata) > MAX_METADATA_BYTES) return invalid(400, 'metadata ist zu gross.')

  const attachmentResult = validateAttachments(body.attachments)
  if (!attachmentResult.ok) return attachmentResult

  const recipientResult = normalizeRecipients(body)
  if (!recipientResult.ok) return recipientResult

  const targetDefinitions = [
    recipientResult.recipientUserIds.length > 0,
    recipientResult.recipientMemberIds.length > 0,
    recipientResult.recipientEventRegistrationIds.length > 0,
    recipientResult.recipientInvoiceIds.length > 0,
    systemWide,
  ].filter(Boolean).length

  if (targetDefinitions === 0) return invalid(400, 'Mindestens eine Empfaengerdefinition ist erforderlich.')
  if (targetDefinitions > 1) return invalid(400, 'Nur eine Empfaengerart pro Request ist erlaubt.')
  if (systemWide && body.system_wide !== true) return invalid(400, 'system_wide muss boolean sein.')

  const explicitRecipientCount = recipientResult.recipientUserIds.length
    + recipientResult.recipientMemberIds.length
    + recipientResult.recipientEventRegistrationIds.length
    + recipientResult.recipientInvoiceIds.length
  if (explicitRecipientCount > MAX_RECIPIENTS) return invalid(429, 'Zu viele Empfaenger.')

  return {
    ok: true,
    value: {
      type,
      category,
      title,
      message,
      channels,
      recipientUserIds: recipientResult.recipientUserIds,
      recipientMemberIds: recipientResult.recipientMemberIds,
      recipientEventRegistrationIds: recipientResult.recipientEventRegistrationIds,
      recipientInvoiceIds: recipientResult.recipientInvoiceIds,
      systemWide,
      source: sourceResult.value,
      url,
      priority,
      scheduledAt,
      idempotencyKey,
      metadata,
      attachments: attachmentResult.value,
    },
  }
}

export function requiresCommunicationCreate(payload) {
  return payload.systemWide
    || payload.recipientUserIds.length + payload.recipientMemberIds.length + payload.recipientEventRegistrationIds.length + payload.recipientInvoiceIds.length > 1
    || ['high', 'critical'].includes(payload.priority)
}

export function buildTargetType(payload) {
  if (payload.systemWide) return 'system'
  if (payload.recipientUserIds.length === 1) return 'user'
  if (payload.recipientMemberIds.length === 1) return 'member'
  if (payload.recipientEventRegistrationIds.length === 1) return 'event_registration'
  if (payload.recipientInvoiceIds.length === 1) return 'invoice'
  return 'explicit'
}

export function buildTargetPayload(payload) {
  return {
    recipient_user_ids: payload.recipientUserIds,
    recipient_member_ids: payload.recipientMemberIds,
    recipient_event_registration_ids: payload.recipientEventRegistrationIds,
    recipient_invoice_ids: payload.recipientInvoiceIds,
    system_wide: payload.systemWide,
  }
}

export function buildStableIdempotencyKey(payload) {
  const source = payload.source || {}
  return [
    payload.type,
    payload.category,
    source.module || '',
    source.entity_type || '',
    source.entity_id || '',
    payload.channels.join(','),
    payload.recipientUserIds.join(','),
    payload.recipientMemberIds.join(','),
    payload.recipientEventRegistrationIds.join(','),
    payload.recipientInvoiceIds.join(','),
    payload.systemWide ? 'system' : '',
  ].join('|')
}

function normalizeRecipients(body) {
  const recipientUserIds = []
  const recipientMemberIds = []
  const recipientEventRegistrationIds = []
  const recipientInvoiceIds = []

  if (body.recipient_user_id !== undefined) {
    const id = normalizeText(body.recipient_user_id)
    if (!UUID_PATTERN.test(id)) return invalid(400, 'recipient_user_id ist ungueltig.')
    recipientUserIds.push(id)
  }

  if (body.recipient_member_id !== undefined) {
    const id = normalizeText(body.recipient_member_id)
    if (!UUID_PATTERN.test(id)) return invalid(400, 'recipient_member_id ist ungueltig.')
    recipientMemberIds.push(id)
  }

  if (body.recipient_event_registration_id !== undefined) {
    const id = normalizeText(body.recipient_event_registration_id)
    if (!UUID_PATTERN.test(id)) return invalid(400, 'recipient_event_registration_id ist ungueltig.')
    recipientEventRegistrationIds.push(id)
  }

  if (body.recipient_invoice_id !== undefined) {
    const id = normalizeText(body.recipient_invoice_id)
    if (!UUID_PATTERN.test(id)) return invalid(400, 'recipient_invoice_id ist ungueltig.')
    recipientInvoiceIds.push(id)
  }

  if (body.recipient_user_ids !== undefined) {
    if (!Array.isArray(body.recipient_user_ids)) return invalid(400, 'recipient_user_ids ist ungueltig.')
    for (const value of body.recipient_user_ids) {
      const id = normalizeText(value)
      if (!UUID_PATTERN.test(id)) return invalid(400, 'recipient_user_ids enthaelt ungueltige IDs.')
      recipientUserIds.push(id)
    }
  }

  if (body.recipient_member_ids !== undefined) {
    if (!Array.isArray(body.recipient_member_ids)) return invalid(400, 'recipient_member_ids ist ungueltig.')
    for (const value of body.recipient_member_ids) {
      const id = normalizeText(value)
      if (!UUID_PATTERN.test(id)) return invalid(400, 'recipient_member_ids enthaelt ungueltige IDs.')
      recipientMemberIds.push(id)
    }
  }

  if (body.recipient_event_registration_ids !== undefined) {
    if (!Array.isArray(body.recipient_event_registration_ids)) return invalid(400, 'recipient_event_registration_ids ist ungueltig.')
    for (const value of body.recipient_event_registration_ids) {
      const id = normalizeText(value)
      if (!UUID_PATTERN.test(id)) return invalid(400, 'recipient_event_registration_ids enthaelt ungueltige IDs.')
      recipientEventRegistrationIds.push(id)
    }
  }

  if (body.recipient_invoice_ids !== undefined) {
    if (!Array.isArray(body.recipient_invoice_ids)) return invalid(400, 'recipient_invoice_ids ist ungueltig.')
    for (const value of body.recipient_invoice_ids) {
      const id = normalizeText(value)
      if (!UUID_PATTERN.test(id)) return invalid(400, 'recipient_invoice_ids enthaelt ungueltige IDs.')
      recipientInvoiceIds.push(id)
    }
  }

  return {
    ok: true,
    recipientUserIds: [...new Set(recipientUserIds)],
    recipientMemberIds: [...new Set(recipientMemberIds)],
    recipientEventRegistrationIds: [...new Set(recipientEventRegistrationIds)],
    recipientInvoiceIds: [...new Set(recipientInvoiceIds)],
  }
}

function validateSource(source) {
  if (source == null) return { ok: true, value: {} }
  if (!isPlainObject(source)) return invalid(400, 'source ist ungueltig.')

  const unknownKeys = Object.keys(source).filter((key) => !ALLOWED_SOURCE_KEYS.has(key))
  if (unknownKeys.length > 0) return invalid(400, 'source enthaelt unerwartete Felder.')

  const value = {
    module: source.module == null ? null : normalizeText(source.module),
    entity_type: source.entity_type == null ? null : normalizeText(source.entity_type),
    entity_id: source.entity_id == null ? null : normalizeText(source.entity_id),
  }

  for (const item of Object.values(value)) {
    if (item && item.length > 120) return invalid(400, 'source ist zu lang.')
  }

  return { ok: true, value }
}

function validateAttachments(attachments) {
  if (attachments === undefined) return { ok: true, value: [] }
  if (!Array.isArray(attachments)) return invalid(400, 'attachments ist ungueltig.')
  if (attachments.length > 1) return invalid(400, 'Nur ein Anhang ist erlaubt.')

  const result = []
  for (const attachment of attachments) {
    if (!isPlainObject(attachment)) return invalid(400, 'attachment ist ungueltig.')

    const unknownKeys = Object.keys(attachment).filter((key) => !['filename', 'contentBase64', 'contentType'].includes(key))
    if (unknownKeys.length > 0) return invalid(400, 'attachment enthaelt unerwartete Felder.')

    const filename = normalizeText(attachment.filename)
    const contentBase64 = normalizeText(attachment.contentBase64)
    const contentType = normalizeText(attachment.contentType).toLowerCase()

    if (contentType !== 'application/pdf') return invalid(400, 'Nur PDF-Anhaenge sind erlaubt.')
    if (!isSafePdfFilename(filename)) return invalid(400, 'Ungueltiger PDF-Dateiname.')

    const pdfValidation = validatePdfBase64(contentBase64)
    if (!pdfValidation.ok) return pdfValidation

    result.push({
      filename,
      contentBase64,
      contentType,
      bytes: pdfValidation.bytes,
    })
  }

  return { ok: true, value: result }
}

function validatePdfBase64(value) {
  if (!value) return invalid(400, 'PDF ist erforderlich.')
  if (value.startsWith('data:')) return invalid(400, 'PDF muss als reiner Base64-Inhalt uebergeben werden.')
  if (/\s/.test(value) || value.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) {
    return invalid(400, 'PDF ist kein gueltiger Base64-Inhalt.')
  }

  const padding = value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0
  const bytes = Math.floor((value.length * 3) / 4) - padding
  if (bytes <= 0) return invalid(400, 'PDF ist leer.')
  if (bytes > MAX_ATTACHMENT_BYTES) return invalid(400, 'PDF ist zu gross.')
  if (!hasPdfSignature(value)) return invalid(400, 'PDF-Signatur ist ungueltig.')

  return { ok: true, bytes }
}

function hasPdfSignature(value) {
  try {
    const prefix = atob(value.slice(0, 16))
    return prefix.startsWith('%PDF-')
  } catch {
    return false
  }
}

function isSafePdfFilename(value) {
  return /^[A-Za-z0-9._ -]+\.pdf$/i.test(value)
    && value.length <= 140
    && !value.includes('..')
    && !/[\\/\0\r\n]/.test(value)
}

function isSafeInternalUrl(value) {
  const lower = value.toLowerCase()
  return SAFE_PATH_PATTERN.test(value)
    && !lower.startsWith('//')
    && !lower.includes('javascript:')
    && !lower.includes('data:')
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function jsonByteSize(value) {
  return new TextEncoder().encode(JSON.stringify(value)).length
}

function normalizeText(value) {
  return String(value || '').trim()
}

function invalid(status, error) {
  return { ok: false, status, error }
}
