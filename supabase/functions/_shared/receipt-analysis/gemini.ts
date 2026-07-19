import type {
  ReceiptAnalysis,
  ReceiptAnalysisField,
  ReceiptAnalysisInput,
  ReceiptAnalysisProvider,
  ReceiptAnalysisResult,
  ReceiptAnalysisWarning,
} from './types.ts'

const defaultGeminiModel = 'gemini-2.5-flash'
const requestTimeoutMs = 45_000

const fieldNames = [
  'documentType',
  'invoiceDate',
  'totalAmount',
  'currency',
  'merchantName',
  'invoiceNumber',
  'paymentMethod',
  'suggestedCashType',
  'suggestedCategory',
  'suggestedDescription',
] as const

type ReceiptAnalysisFieldName = typeof fieldNames[number]

const receiptAnalysisSchema = {
  type: 'OBJECT',
  required: [
    ...fieldNames,
    'warnings',
  ],
  properties: {
    documentType: fieldSchema(['receipt', 'invoice', 'credit_note', 'bank_statement', 'unknown']),
    invoiceDate: fieldSchema(),
    totalAmount: fieldSchema(null, 'NUMBER'),
    currency: fieldSchema(),
    merchantName: fieldSchema(),
    invoiceNumber: fieldSchema(),
    paymentMethod: fieldSchema(['bar', 'ebanking', 'karte', 'unknown']),
    suggestedCashType: fieldSchema(['einnahme', 'ausgabe', 'unknown']),
    suggestedCategory: fieldSchema(['mitgliedsbeitrag', 'pfandbecher', 'veranstaltung', 'fanartikel', 'sonstiges', 'unknown']),
    suggestedDescription: fieldSchema(),
    warnings: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        required: ['code', 'message'],
        properties: {
          code: { type: 'STRING' },
          message: { type: 'STRING' },
        },
      },
    },
  },
}

function fieldSchema(allowedValues: string[] | null = null, valueType = 'STRING') {
  const valueSchema: Record<string, unknown> = {
    anyOf: [
      { type: valueType },
      { type: 'NULL' },
    ],
  }

  if (allowedValues) {
    valueSchema.anyOf = [
      { type: 'STRING', enum: allowedValues },
      { type: 'NULL' },
    ]
  }

  return {
    type: 'OBJECT',
    required: ['value', 'confidence', 'sourceText'],
    properties: {
      value: valueSchema,
      confidence: {
        anyOf: [
          { type: 'NUMBER' },
          { type: 'NULL' },
        ],
      },
      sourceText: {
        anyOf: [
          { type: 'STRING' },
          { type: 'NULL' },
        ],
      },
    },
  }
}

export function createGeminiReceiptAnalysisProvider(apiKey: string): ReceiptAnalysisProvider {
  return {
    async analyze(input: ReceiptAnalysisInput) {
      const startedAt = performance.now()
      const model = getConfiguredGeminiModel()
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), requestTimeoutMs)

      try {
        const response = await fetch(buildGenerateContentUrl(model), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify(buildGenerateContentRequest(input)),
          signal: controller.signal,
        })

        if (!response.ok) {
          const errorMessage = await buildGeminiErrorMessage(response)

          logGeminiMetadata({
            durationMs: performance.now() - startedAt,
            fileSize: input.fileBytes.byteLength,
            mimeType: input.mimeType,
            model,
            errorCode: `HTTP_${response.status}`,
          })

          return failedAnalysis(errorMessage, model)
        }

        const data = await response.json().catch(() => null)
        const parsed = parseGeminiResponse(data, model)

        logGeminiMetadata({
          durationMs: performance.now() - startedAt,
          fileSize: input.fileBytes.byteLength,
          mimeType: input.mimeType,
          model,
          errorCode: parsed.ok ? null : parsed.errorCode,
        })

        return parsed.ok
          ? parsed.result
          : failedAnalysis(parsed.message, model)
      } catch (error) {
        const isTimeout = error instanceof DOMException && error.name === 'AbortError'

        logGeminiMetadata({
          durationMs: performance.now() - startedAt,
          fileSize: input.fileBytes.byteLength,
          mimeType: input.mimeType,
          model,
          errorCode: isTimeout ? 'TIMEOUT' : 'REQUEST_FAILED',
        })

        return failedAnalysis(isTimeout
          ? 'Gemini analysis timed out.'
          : 'Gemini analysis request failed.', model)
      } finally {
        clearTimeout(timeoutId)
      }
    },
  }
}

function getConfiguredGeminiModel() {
  return Deno.env.get('GEMINI_RECEIPT_MODEL')?.trim() || defaultGeminiModel
}

function buildGenerateContentUrl(model: string) {
  const normalizedModel = model.replace(/^models\//, '')
  const encodedModel = encodeURIComponent(normalizedModel)

  return `https://generativelanguage.googleapis.com/v1beta/models/${encodedModel}:generateContent`
}

function buildGenerateContentRequest(input: ReceiptAnalysisInput) {
  return {
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: buildPrompt(),
          },
          {
            inline_data: {
              mime_type: input.mimeType,
              data: arrayBufferToBase64(input.fileBytes),
            },
          },
        ],
      },
    ],
    generationConfig: {
      response_mime_type: 'application/json',
      response_schema: receiptAnalysisSchema,
      temperature: 0,
      maxOutputTokens: 2000,
    },
  }
}

function buildPrompt() {
  return [
    'Analyze this Austrian/German cash receipt, invoice, or payment document for bookkeeping review.',
    'Return only valid JSON matching the configured schema. Do not include markdown or explanatory text.',
    'Do not hallucinate. If a value is not explicitly visible or safely inferable, set value, confidence, and sourceText to null.',
    'Use ISO date format YYYY-MM-DD for invoiceDate.',
    'Use a decimal point for totalAmount.',
    'Use ISO 4217 currency codes such as EUR.',
    'Confidence must be a number between 0 and 1.',
    'Do not add fields not present in the schema.',
    'Use suggestedCashType only as einnahme or ausgabe when clear; otherwise unknown or null.',
    'Use suggestedCategory only from mitgliedsbeitrag, pfandbecher, veranstaltung, fanartikel, sonstiges, unknown, or null.',
    'Use paymentMethod only from bar, ebanking, karte, unknown, or null.',
    'Warnings should describe ambiguity, low readability, missing fields, multiple documents, or unsupported content.',
  ].join('\n')
}

function parseGeminiResponse(data: unknown, model: string):
  | { ok: true; result: ReceiptAnalysisResult }
  | { ok: false; errorCode: string; message: string } {
  const outputText = extractGeminiText(data)

  if (!outputText) {
    return {
      ok: false,
      errorCode: 'EMPTY_RESPONSE',
      message: 'Gemini analysis returned no JSON content.',
    }
  }

  try {
    const parsed = JSON.parse(outputText)
    const normalized = normalizeAnalysisResult(parsed, model)

    return {
      ok: true,
      result: normalized,
    }
  } catch {
    return {
      ok: false,
      errorCode: 'INVALID_JSON',
      message: 'Gemini analysis returned invalid JSON.',
    }
  }
}

function extractGeminiText(data: unknown) {
  if (!data || typeof data !== 'object') return ''

  const record = data as Record<string, unknown>
  const candidates = Array.isArray(record.candidates) ? record.candidates : []
  const textParts: string[] = []

  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'object') continue

    const candidateRecord = candidate as Record<string, unknown>
    const content = candidateRecord.content

    if (!content || typeof content !== 'object') continue

    const contentRecord = content as Record<string, unknown>
    const parts = Array.isArray(contentRecord.parts) ? contentRecord.parts : []

    for (const part of parts) {
      if (!part || typeof part !== 'object') continue

      const partRecord = part as Record<string, unknown>

      if (typeof partRecord.text === 'string') {
        textParts.push(partRecord.text)
      }
    }
  }

  return textParts.join('\n').trim()
}

function normalizeAnalysisResult(value: unknown, model: string): ReceiptAnalysisResult {
  if (!value || typeof value !== 'object') {
    throw new Error('Invalid analysis payload.')
  }

  const record = value as Record<string, unknown>
  const analysis = emptyAnalysis() as Record<ReceiptAnalysisFieldName, ReceiptAnalysisField<number | string> | null>

  for (const fieldName of fieldNames) {
    if (!(fieldName in record)) {
      throw new Error('Missing analysis field.')
    }

    analysis[fieldName] = normalizeField(record[fieldName], fieldName)
  }

  return {
    analysis: analysis as ReceiptAnalysis,
    warnings: normalizeWarnings(record.warnings),
    metadata: {
      provider: 'gemini',
      model,
    },
  }
}

function normalizeField(value: unknown, fieldName: ReceiptAnalysisFieldName): ReceiptAnalysisField<number | string> {
  if (!value || typeof value !== 'object') {
    throw new Error('Invalid analysis field.')
  }

  const record = value as Record<string, unknown>
  const rawValue = record.value
  const confidence = typeof record.confidence === 'number'
    ? Math.max(0, Math.min(1, record.confidence))
    : null
  const sourceText = typeof record.sourceText === 'string' && record.sourceText.trim()
    ? record.sourceText.trim()
    : null

  if (fieldName === 'totalAmount') {
    return {
      value: typeof rawValue === 'number' && Number.isFinite(rawValue) ? rawValue : null,
      confidence,
      sourceText,
    }
  }

  return {
    value: typeof rawValue === 'string' && rawValue.trim() ? rawValue.trim() : null,
    confidence,
    sourceText,
  }
}

function normalizeWarnings(value: unknown): ReceiptAnalysisWarning[] {
  if (!Array.isArray(value)) return []

  return value
    .map((warning) => {
      if (!warning || typeof warning !== 'object') return null

      const record = warning as Record<string, unknown>
      const code = typeof record.code === 'string' ? record.code.trim() : ''
      const message = typeof record.message === 'string' ? record.message.trim() : ''

      return code && message ? { code, message } : null
    })
    .filter((warning): warning is ReceiptAnalysisWarning => Boolean(warning))
}

async function buildGeminiErrorMessage(response: Response) {
  const fallbackMessage = `Gemini analysis failed with HTTP ${response.status}.`
  const errorBody = await response.json().catch(() => null)

  if (!errorBody || typeof errorBody !== 'object') {
    return fallbackMessage
  }

  const record = errorBody as Record<string, unknown>
  const error = record.error

  if (!error || typeof error !== 'object') {
    return fallbackMessage
  }

  const errorRecord = error as Record<string, unknown>
  const code = typeof errorRecord.code === 'string' ? errorRecord.code.trim() : ''
  const status = typeof errorRecord.status === 'string' ? errorRecord.status.trim() : ''
  const message = typeof errorRecord.message === 'string' ? errorRecord.message.trim() : ''
  const errorCode = code || status

  if (errorCode && message) return `Gemini analysis failed: ${errorCode}. ${message}`
  if (message) return `Gemini analysis failed: ${message}`
  if (errorCode) return `Gemini analysis failed: ${errorCode}.`

  return fallbackMessage
}

function failedAnalysis(message: string, model: string): ReceiptAnalysisResult {
  return {
    analysis: nullAnalysis(),
    warnings: [
      {
        code: 'GEMINI_ANALYSIS_FAILED',
        message,
      },
    ],
    metadata: {
      provider: 'gemini',
      model,
    },
  }
}

function nullAnalysis(): ReceiptAnalysis {
  return {
    documentType: null,
    invoiceDate: null,
    totalAmount: null,
    currency: null,
    merchantName: null,
    invoiceNumber: null,
    paymentMethod: null,
    suggestedCashType: null,
    suggestedCategory: null,
    suggestedDescription: null,
  }
}

function emptyAnalysis(): ReceiptAnalysis {
  return {
    documentType: emptyField(),
    invoiceDate: emptyField(),
    totalAmount: emptyField<number>(),
    currency: emptyField(),
    merchantName: emptyField(),
    invoiceNumber: emptyField(),
    paymentMethod: emptyField(),
    suggestedCashType: emptyField(),
    suggestedCategory: emptyField(),
    suggestedDescription: emptyField(),
  }
}

function emptyField<T = string>(): ReceiptAnalysisField<T> {
  return {
    value: null,
    confidence: null,
    sourceText: null,
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer)
  const chunkSize = 0x8000
  let binary = ''

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, offset + chunkSize)
    binary += String.fromCharCode(...chunk)
  }

  return btoa(binary)
}

function logGeminiMetadata(metadata: {
  durationMs: number
  fileSize: number
  mimeType: string
  model: string
  errorCode: string | null
}) {
  console.info('receipt_analysis_gemini', {
    provider: 'gemini',
    model: metadata.model,
    durationMs: Number(metadata.durationMs.toFixed(0)),
    fileSize: metadata.fileSize,
    mimeType: metadata.mimeType,
    errorCode: metadata.errorCode,
  })
}
