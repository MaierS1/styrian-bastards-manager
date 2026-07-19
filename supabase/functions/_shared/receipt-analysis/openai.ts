import type {
  ReceiptAnalysis,
  ReceiptAnalysisField,
  ReceiptAnalysisInput,
  ReceiptAnalysisProvider,
  ReceiptAnalysisResult,
  ReceiptAnalysisWarning,
} from './types.ts'

const openAiResponsesUrl = 'https://api.openai.com/v1/responses'
const defaultOpenAiModel = 'gpt-5-mini'
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
  type: 'object',
  additionalProperties: false,
  required: [
    ...fieldNames,
    'warnings',
  ],
  properties: {
    documentType: fieldSchema(['receipt', 'invoice', 'credit_note', 'bank_statement', 'unknown']),
    invoiceDate: fieldSchema(),
    totalAmount: fieldSchema(null, ['number', 'null']),
    currency: fieldSchema(),
    merchantName: fieldSchema(),
    invoiceNumber: fieldSchema(),
    paymentMethod: fieldSchema(['bar', 'ebanking', 'karte', 'unknown']),
    suggestedCashType: fieldSchema(['einnahme', 'ausgabe', 'unknown']),
    suggestedCategory: fieldSchema(['mitgliedsbeitrag', 'pfandbecher', 'veranstaltung', 'fanartikel', 'sonstiges', 'unknown']),
    suggestedDescription: fieldSchema(),
    warnings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['code', 'message'],
        properties: {
          code: { type: 'string' },
          message: { type: 'string' },
        },
      },
    },
  },
}

function fieldSchema(allowedValues: string[] | null = null, valueType: string[] = ['string', 'null']) {
  const valueSchema: Record<string, unknown> = { type: valueType }

  if (allowedValues) {
    valueSchema.enum = [...allowedValues, null]
  }

  return {
    type: 'object',
    additionalProperties: false,
    required: ['value', 'confidence', 'sourceText'],
    properties: {
      value: valueSchema,
      confidence: {
        type: ['number', 'null'],
        minimum: 0,
        maximum: 1,
      },
      sourceText: {
        type: ['string', 'null'],
      },
    },
  }
}

export function createOpenAiReceiptAnalysisProvider(apiKey: string): ReceiptAnalysisProvider {
  return {
    async analyze(input: ReceiptAnalysisInput) {
      const startedAt = performance.now()
      const model = getConfiguredOpenAiModel()
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), requestTimeoutMs)

      try {
        const response = await fetch(openAiResponsesUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(buildResponsesRequest(input, model)),
          signal: controller.signal,
        })

        if (!response.ok) {
          const errorMessage = await buildOpenAiErrorMessage(response)

          logOpenAiMetadata({
            durationMs: performance.now() - startedAt,
            fileSize: input.fileBytes.byteLength,
            mimeType: input.mimeType,
            model,
            errorCode: `HTTP_${response.status}`,
          })

          return failedAnalysis(errorMessage, model)
        }

        const data = await response.json().catch(() => null)
        const parsed = parseOpenAiResponse(data)

        logOpenAiMetadata({
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

        logOpenAiMetadata({
          durationMs: performance.now() - startedAt,
          fileSize: input.fileBytes.byteLength,
          mimeType: input.mimeType,
          model,
          errorCode: isTimeout ? 'TIMEOUT' : 'REQUEST_FAILED',
        })

        return failedAnalysis(isTimeout
          ? 'OpenAI analysis timed out.'
          : 'OpenAI analysis request failed.', model)
      } finally {
        clearTimeout(timeoutId)
      }
    },
  }
}

function getConfiguredOpenAiModel() {
  return Deno.env.get('OPENAI_RECEIPT_MODEL')?.trim() || defaultOpenAiModel
}

function buildResponsesRequest(input: ReceiptAnalysisInput, model: string) {
  return {
    model,
    input: [
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: buildPrompt(),
          },
          buildFileInput(input),
        ],
      },
    ],
    reasoning: {
      effort: 'low',
    },
    text: {
      format: {
        type: 'json_schema',
        name: 'receipt_analysis',
        strict: true,
        schema: receiptAnalysisSchema,
      },
    },
    max_output_tokens: 2000,
  }
}

function buildFileInput(input: ReceiptAnalysisInput) {
  const base64 = arrayBufferToBase64(input.fileBytes)

  if (input.mimeType.startsWith('image/')) {
    return {
      type: 'input_image',
      image_url: `data:${input.mimeType};base64,${base64}`,
      detail: 'high',
    }
  }

  return {
    type: 'input_file',
    filename: input.fileName || 'receipt.pdf',
    file_data: `data:${input.mimeType};base64,${base64}`,
  }
}

function buildPrompt() {
  return [
    'Analyze this Austrian/German cash receipt, invoice, or payment document for bookkeeping review.',
    'Return only valid JSON matching the provided schema. Do not include markdown or explanatory text.',
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

function parseOpenAiResponse(data: unknown):
  | { ok: true; result: ReceiptAnalysisResult }
  | { ok: false; errorCode: string; message: string } {
  const outputText = extractOutputText(data)

  if (!outputText) {
    return {
      ok: false,
      errorCode: 'EMPTY_RESPONSE',
      message: 'OpenAI analysis returned no JSON content.',
    }
  }

  try {
    const parsed = JSON.parse(outputText)
    const normalized = normalizeAnalysisResult(parsed)

    return {
      ok: true,
      result: normalized,
    }
  } catch {
    return {
      ok: false,
      errorCode: 'INVALID_JSON',
      message: 'OpenAI analysis returned invalid JSON.',
    }
  }
}

function extractOutputText(data: unknown) {
  if (!data || typeof data !== 'object') return ''

  const record = data as Record<string, unknown>

  if (typeof record.output_text === 'string') {
    return record.output_text.trim()
  }

  const output = Array.isArray(record.output) ? record.output : []
  const textParts: string[] = []

  for (const item of output) {
    if (!item || typeof item !== 'object') continue
    const itemRecord = item as Record<string, unknown>
    const content = Array.isArray(itemRecord.content) ? itemRecord.content : []

    for (const contentItem of content) {
      if (!contentItem || typeof contentItem !== 'object') continue

      const contentRecord = contentItem as Record<string, unknown>

      if (typeof contentRecord.text === 'string') {
        textParts.push(contentRecord.text)
      }
    }
  }

  return textParts.join('\n').trim()
}

function normalizeAnalysisResult(value: unknown): ReceiptAnalysisResult {
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
      provider: 'openai',
      model: getConfiguredOpenAiModel(),
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

async function buildOpenAiErrorMessage(response: Response) {
  const fallbackMessage = `OpenAI analysis failed with HTTP ${response.status}.`
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
  const message = typeof errorRecord.message === 'string' ? errorRecord.message.trim() : ''

  if (code && message) return `OpenAI analysis failed: ${code}. ${message}`
  if (message) return `OpenAI analysis failed: ${message}`
  if (code) return `OpenAI analysis failed: ${code}.`

  return fallbackMessage
}

function failedAnalysis(message: string, model: string): ReceiptAnalysisResult {
  return {
    analysis: nullAnalysis(),
    warnings: [
      {
        code: 'OPENAI_ANALYSIS_FAILED',
        message,
      },
    ],
    metadata: {
      provider: 'openai',
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

function logOpenAiMetadata(metadata: {
  durationMs: number
  fileSize: number
  mimeType: string
  model: string
  errorCode: string | null
}) {
  console.info('receipt_analysis_openai', {
    provider: 'openai',
    model: metadata.model,
    durationMs: Number(metadata.durationMs.toFixed(0)),
    fileSize: metadata.fileSize,
    mimeType: metadata.mimeType,
    errorCode: metadata.errorCode,
  })
}
