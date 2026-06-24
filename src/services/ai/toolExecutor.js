import { ToolRegistry } from './toolRegistry.js'
import { formatToolResult } from './toolResultFormatter.js'
import { executePublicTool } from './publicToolExecutor.js'
import { roleAllowed, toolEnabled, toolExists } from './toolValidators.js'

function buildExecutionResult({ toolId, success, data = null, metadata = {} }) {
  const formattedResult = formatToolResult({
    tool: toolId,
    success,
    data,
    metadata,
  })

  return {
    ...formattedResult,
    executed: false,
    reason: metadata.reason || 'Tool execution not implemented yet',
  }
}

function isPublicTool(toolId) {
  return typeof toolId === 'string' && toolId.startsWith('get_public_')
}

export async function executeTool(toolId, context = {}, parameters = {}) {
  if (!toolExists(toolId)) {
    return buildExecutionResult({
      toolId,
      success: false,
      metadata: {
        executed: false,
        reason: 'Tool not found',
      },
    })
  }

  const tool = ToolRegistry.find((registryTool) => registryTool.id === toolId)

  if (!toolEnabled(toolId)) {
    return buildExecutionResult({
      toolId,
      success: false,
      metadata: {
        executed: false,
        reason: 'Tool disabled',
      },
    })
  }

  if (!roleAllowed(tool, context)) {
    return buildExecutionResult({
      toolId,
      success: false,
      metadata: {
        executed: false,
        reason: 'Role not allowed',
        requiredRole: tool.requiredRole,
        userRole: context?.userRole || 'Visitor',
      },
    })
  }

  if (isPublicTool(toolId)) {
    return executePublicTool(toolId)
  }

  return buildExecutionResult({
    toolId: tool.id,
    success: true,
    data: {
      parameters,
    },
    metadata: {
      executed: false,
      reason: 'Tool execution not implemented yet',
      repository: tool.repository,
      rpcName: tool.rpcName,
    },
  })
}
