import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const receiptsBucket = 'receipts'
const receiptsPathPrefix = 'cash/'
const maxFileSizeBytes = 15 * 1024 * 1024
const allowedMimeTypes = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
])

type AnalyzeCashReceiptRequest = {
  storagePath?: unknown
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return errorResponse('METHOD_NOT_ALLOWED', 'Nur POST ist erlaubt.', 405)
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return errorResponse('CONFIGURATION_ERROR', 'Server secrets fehlen.', 500)
    }

    const authHeader = req.headers.get('Authorization') || ''

    if (!authHeader.startsWith('Bearer ')) {
      return errorResponse('UNAUTHENTICATED', 'Nicht angemeldet.', 401)
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    })

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser()

    if (userError || !user) {
      return errorResponse('UNAUTHENTICATED', 'Benutzer konnte nicht geprueft werden.', 401)
    }

    const { data: canManageCash, error: permissionError } = await userClient.rpc('can_manage_cash')

    if (permissionError) {
      return errorResponse('PERMISSION_CHECK_FAILED', 'Kassa-Berechtigung konnte nicht geprueft werden.', 500)
    }

    if (canManageCash !== true) {
      return errorResponse('FORBIDDEN', 'Keine Berechtigung fuer Kassa.', 403)
    }

    const body = await req.json().catch(() => null) as AnalyzeCashReceiptRequest | null

    if (!body || typeof body !== 'object') {
      return errorResponse('INVALID_JSON', 'Request Body muss gueltiges JSON sein.', 400)
    }

    const storagePath = normalizeStoragePath(body.storagePath)

    if (!storagePath) {
      return errorResponse('INVALID_STORAGE_PATH', 'storagePath ist erforderlich.', 400)
    }

    if (!isAllowedReceiptPath(storagePath)) {
      return errorResponse('INVALID_STORAGE_PATH', 'Nur Belege unter cash/ duerfen analysiert werden.', 400)
    }

    const { data: fileBlob, error: downloadError } = await adminClient.storage
      .from(receiptsBucket)
      .download(storagePath)

    if (downloadError || !fileBlob) {
      return errorResponse('RECEIPT_NOT_FOUND', 'Beleg wurde im Storage nicht gefunden.', 404)
    }

    const mimeType = normalizeMimeType(fileBlob.type)

    if (!allowedMimeTypes.has(mimeType)) {
      return errorResponse('UNSUPPORTED_MEDIA_TYPE', 'Dateityp wird nicht unterstuetzt.', 415)
    }

    const fileBytes = await fileBlob.arrayBuffer()

    if (fileBytes.byteLength > maxFileSizeBytes) {
      return errorResponse('FILE_TOO_LARGE', 'Belegdatei ist groesser als 15 MiB.', 413)
    }

    return jsonResponse({
      success: true,
      analysis: {
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
      },
      warnings: [
        {
          code: 'PROVIDER_NOT_CONFIGURED',
          message: 'Receipt analysis provider is not configured yet.',
        },
      ],
    })
  } catch (_error) {
    return errorResponse('INTERNAL_ERROR', 'Beleganalyse konnte nicht verarbeitet werden.', 500)
  }
})

function normalizeStoragePath(value: unknown) {
  return typeof value === 'string' ? value.trim().replace(/^\/+/, '') : ''
}

function normalizeMimeType(value: string) {
  return String(value || '').split(';')[0].trim().toLowerCase()
}

function isAllowedReceiptPath(storagePath: string) {
  if (!storagePath.startsWith(receiptsPathPrefix)) return false
  if (storagePath.includes('..')) return false
  if (storagePath.includes('\\')) return false
  if (/^https?:\/\//i.test(storagePath)) return false
  if (storagePath.length <= receiptsPathPrefix.length) return false

  return true
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json; charset=utf-8',
    },
  })
}

function errorResponse(code: string, message: string, status: number) {
  return jsonResponse({
    success: false,
    error: {
      code,
      message,
    },
  }, status)
}
