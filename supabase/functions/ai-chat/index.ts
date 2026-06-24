import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from './cors.ts'
import {
  processChatMessage,
  setPublicToolRpcClient,
} from '../../../src/services/ai/index.js'

type ChatRequest = {
  message?: unknown
  sessionId?: unknown
  conversationHistory?: unknown
  clientVersion?: unknown
  source?: unknown
  locale?: unknown
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}

function errorResponse(code: string, message: string, status = 400) {
  return jsonResponse({
    success: false,
    error: {
      code,
      message,
    },
  }, status)
}

function normalizeString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function validateRequest(body: ChatRequest) {
  const message = normalizeString(body.message)

  if (!message) {
    return {
      ok: false as const,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'message ist erforderlich.',
      },
    }
  }

  return {
    ok: true as const,
    value: {
      message,
      sessionId: normalizeString(body.sessionId) || null,
      conversationHistory: Array.isArray(body.conversationHistory) ? body.conversationHistory : [],
      clientVersion: normalizeString(body.clientVersion) || null,
      source: normalizeString(body.source) || 'website',
      locale: normalizeString(body.locale) || 'de-AT',
    },
  }
}

function formatSelectedTool(selectedTool: unknown) {
  if (!selectedTool || typeof selectedTool !== 'object') return null

  return 'toolId' in selectedTool
    ? (selectedTool as { toolId?: string | null }).toolId || null
    : null
}

Deno.serve(async (req) => {
  const startedAt = performance.now()

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return errorResponse('METHOD_NOT_ALLOWED', 'Nur POST ist erlaubt.', 405)
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')

    if (!supabaseUrl || !anonKey) {
      return errorResponse('CONFIGURATION_ERROR', 'Supabase Function Secrets fehlen.', 500)
    }

    const body = await req.json().catch(() => null) as ChatRequest | null
    if (!body || typeof body !== 'object') {
      return errorResponse('INVALID_JSON', 'Request Body muss gueltiges JSON sein.', 400)
    }

    const validation = validateRequest(body)
    if (!validation.ok) {
      return errorResponse(validation.error.code, validation.error.message, 400)
    }

    const supabase = createClient(supabaseUrl, anonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    setPublicToolRpcClient(supabase)

    const result = await processChatMessage({
      message: validation.value.message,
      sessionId: validation.value.sessionId,
      userRole: 'Visitor',
      conversationHistory: validation.value.conversationHistory,
    })
    const executionTime = Number((performance.now() - startedAt).toFixed(2))

    return jsonResponse({
      success: result.success,
      response: {
        message: result.response.message,
        followUps: result.response.followUps || [],
        suggestedActions: result.response.suggestedActions || [],
        confidence: result.response.confidence || 0,
        sources: result.response.sources || [],
        metadata: {
          ...(result.response.metadata || {}),
          clientVersion: validation.value.clientVersion,
          source: validation.value.source,
          locale: validation.value.locale,
          sessionId: result.metadata.sessionId,
        },
      },
      intent: result.intent.intent,
      selectedTool: formatSelectedTool(result.selectedTool),
      executionTime,
    })
  } catch (_error) {
    return errorResponse('INTERNAL_ERROR', 'AI Chat konnte nicht verarbeitet werden.', 500)
  }
})
