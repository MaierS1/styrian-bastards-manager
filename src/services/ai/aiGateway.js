import { processChatMessage } from './chatService.js'

export async function handleChatRequest(request = {}) {
  const result = await processChatMessage({
    message: request.message,
    sessionId: request.sessionId,
    userRole: request.userRole,
    conversationHistory: request.conversationHistory || request.conversation,
  })

  return {
    ok: result.success,
    provider: null,
    message: result.response.message,
    response: result.response,
    debug: {
      request,
      intent: result.intent,
      selectedTool: result.selectedTool,
      toolExecution: result.metadata.toolExecution,
      response: result.response,
      metadata: result.metadata,
    },
  }
}
