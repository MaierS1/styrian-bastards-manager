import { ContextBuilder } from './contextBuilder.js'
import { Personality } from './personality.js'
import { PromptBuilder } from './promptBuilder.js'
import { getEnabledTools } from './toolRegistry.js'
import { executeTool } from './toolExecutor.js'

export function handleChatRequest(request = {}) {
  const context = ContextBuilder(request)
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
  const toolResults = []
  const prompt = PromptBuilder({
    context,
    personality: Personality,
    toolResults,
  })

  return {
    ok: true,
    provider: null,
    message: 'AI Gateway foundation ready. No AI provider configured.',
    debug: {
      request,
      context,
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
