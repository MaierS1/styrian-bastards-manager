export function ContextBuilder(request = {}) {
  return {
    userRole: request.userRole || 'public',
    sessionId: request.sessionId || null,
    intent: request.intent || null,
    conversation: Array.isArray(request.conversation) ? request.conversation : [],
    timestamp: new Date().toISOString(),
  }
}

