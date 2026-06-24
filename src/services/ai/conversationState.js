function createSessionId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()

  return `session-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function createConversationState({ sessionId = null, userRole = 'Visitor' } = {}) {
  const timestamp = new Date().toISOString()

  return {
    sessionId: sessionId || createSessionId(),
    startedAt: timestamp,
    updatedAt: timestamp,
    userRole,
    currentIntent: null,
    previousIntent: null,
    lastTool: null,
    lastResponse: null,
    topics: [],
    messageCount: 0,
    contextWindow: [],
  }
}
