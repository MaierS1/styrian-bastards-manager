import { supabase } from '../../lib/supabase.js'
import { formatToolResult } from './toolResultFormatter.js'

const PUBLIC_TOOL_RPC_PARAMETERS = {
  get_public_events: undefined,
  get_public_sponsors: undefined,
  get_public_media_items: {
    p_category: null,
    p_limit: 50,
    p_featured_only: false,
  },
  get_public_merch_items: undefined,
  get_public_home_stats: undefined,
}

function isDevelopment() {
  return import.meta.env?.DEV === true
}

function getRecordCount(data) {
  if (Array.isArray(data)) return data.length
  if (data && typeof data === 'object') return 1

  return 0
}

function logDevelopmentError(toolId, error) {
  if (!isDevelopment()) return

  console.error('[ai/publicToolExecutor] Public tool execution failed', {
    toolId,
    error,
  })
}

function formatPublicToolResult({ toolId, success, data = null, metadata = {}, reason = null }) {
  const formattedResult = formatToolResult({
    tool: toolId,
    success,
    data,
    metadata: {
      ...metadata,
      executed: true,
      recordCount: getRecordCount(data),
      reason,
    },
  })

  if (!success) {
    return {
      ...formattedResult,
      reason,
    }
  }

  return formattedResult
}

export async function executePublicTool(toolId) {
  const startedAt = performance.now()

  if (!Object.prototype.hasOwnProperty.call(PUBLIC_TOOL_RPC_PARAMETERS, toolId)) {
    const executionTime = Number((performance.now() - startedAt).toFixed(2))

    return formatPublicToolResult({
      toolId,
      success: false,
      metadata: {
        executionTime,
      },
      reason: 'Unsupported public tool',
    })
  }

  try {
    const rpcParameters = PUBLIC_TOOL_RPC_PARAMETERS[toolId]
    const { data, error } = await supabase.rpc(toolId, rpcParameters)
    const executionTime = Number((performance.now() - startedAt).toFixed(2))

    if (error) {
      logDevelopmentError(toolId, error)

      return formatPublicToolResult({
        toolId,
        success: false,
        metadata: {
          executionTime,
          errorCode: error.code || null,
        },
        reason: error.message || 'Public RPC failed',
      })
    }

    return formatPublicToolResult({
      toolId,
      success: true,
      data,
      metadata: {
        executionTime,
      },
    })
  } catch (error) {
    const executionTime = Number((performance.now() - startedAt).toFixed(2))
    const reason = error instanceof Error ? error.message : 'Public tool execution failed'

    logDevelopmentError(toolId, error)

    return formatPublicToolResult({
      toolId,
      success: false,
      metadata: {
        executionTime,
      },
      reason,
    })
  }
}
