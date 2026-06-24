import { ContextBuilder } from './contextBuilder.js'
import { Personality } from './personality.js'
import { PromptBuilder } from './promptBuilder.js'
import { getEnabledTools } from './toolRegistry.js'

export function handleChatRequest(request = {}) {
  const context = ContextBuilder(request)
  const tools = getEnabledTools()
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
      prompt,
      toolResults,
    },
  }
}
