import { ContextBuilder } from './contextBuilder.js'
import { Personality } from './personality.js'
import { PromptBuilder } from './promptBuilder.js'
import { getEnabledTools } from './toolRegistry.js'
import { executeTool } from './toolExecutor.js'
import { detectIntent } from './intentRouter.js'

export function handleChatRequest(request = {}) {
  const context = ContextBuilder(request)
  const intent = detectIntent(request.message, context)
  const promptContext = {
    ...context,
    intent,
  }
  const toolResults = []
  const prompt = PromptBuilder({
    context: promptContext,
    personality: Personality,
    toolResults,
  })
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

  return {
    ok: true,
    provider: null,
    message: 'AI Gateway foundation ready. No AI provider configured.',
    debug: {
      request,
      context,
      intent,
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
