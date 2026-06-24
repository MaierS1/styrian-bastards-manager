export function ContextBuilder(request = {}) {
  return {
    message: request.message || null,
    userRole: request.userRole || 'public',
    sessionId: request.sessionId || null,
    intent: request.intent || null,
    conversation: Array.isArray(request.conversation) ? request.conversation : [],
    conversationState: request.conversationState || null,
    timestamp: new Date().toISOString(),
  }
}
