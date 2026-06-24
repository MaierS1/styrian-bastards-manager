import { ContextBuilder } from './contextBuilder.js'
import { Personality } from './personality.js'
import { PromptBuilder } from './promptBuilder.js'
import { getEnabledTools } from './toolRegistry.js'
import { executeTool } from './toolExecutor.js'
import { detectIntent } from './intentRouter.js'
import { selectTool } from './intentToolMapper.js'
import { composeResponse } from './responseComposer.js'

function getRecordCount(data) {
  if (Array.isArray(data)) return data.length
  if (data && typeof data === 'object') return 1

  return 0
}

function formatToolExecutionDebug(toolResult) {
  return {
    executed: Boolean(toolResult?.metadata?.executed),
    success: Boolean(toolResult?.success),
    recordCount: toolResult?.metadata?.recordCount ?? getRecordCount(toolResult?.data),
    executionTime: toolResult?.metadata?.executionTime ?? 0,
  }
}

export async function handleChatRequest(request = {}) {
  const context = ContextBuilder(request)
  const intent = detectIntent(request.message, context)
  const selectedTool = selectTool(intent, context)
  const promptContext = {
    ...context,
    intent,
    selectedTool,
  }
  const toolResults = []
  const tools = getEnabledTools()
  const toolExecutor = {
    ready: true,
    mode: 'mock',
    executeTool,
    availableTools: tools.map((tool) => ({
      id: tool.id,
      description: tool.description,
      requiredRole: tool.requiredRole,
      enabled: tool.enabled,
    })),
  }
  const selectedToolResult = selectedTool.toolId
    ? await toolExecutor.executeTool(selectedTool.toolId, context)
    : null
  if (selectedToolResult) {
    toolResults.push(selectedToolResult)
  }
  const toolExecution = formatToolExecutionDebug(selectedToolResult)
  const response = composeResponse({
    intent,
    context,
    toolResult: selectedToolResult,
    personality: Personality,
  })
  const prompt = PromptBuilder({
    context: {
      ...promptContext,
      response,
    },
    personality: Personality,
    toolResults,
  })

  return {
    ok: true,
    provider: null,
    message: response.message,
    response,
    debug: {
      request,
      context,
      intent,
      selectedTool,
      toolExecution,
      response,
      tools,
      toolExecutor: {
        ready: toolExecutor.ready,
        mode: toolExecutor.mode,
        availableTools: toolExecutor.availableTools,
      },
      prompt,
      toolResults,
    },
  }
}
