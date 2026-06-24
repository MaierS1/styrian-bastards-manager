import { createConversationState } from './conversationState.js'

const conversations = new Map()
const DEFAULT_CONTEXT_WINDOW_LIMIT = 10

function uniqueTopics(topics = []) {
  return [...new Set(topics.filter(Boolean))]
}

export function createConversation({ sessionId = null, userRole = 'Visitor' } = {}) {
  const conversation = createConversationState({ sessionId, userRole })
  conversations.set(conversation.sessionId, conversation)

  return conversation
}

export function getConversation(sessionId) {
  if (!sessionId) return null

  return conversations.get(sessionId) || null
}

export function trimConversation(conversation, limit = DEFAULT_CONTEXT_WINDOW_LIMIT) {
  if (!conversation) return null

  const contextWindow = Array.isArray(conversation.contextWindow)
    ? conversation.contextWindow.slice(-limit)
    : []

  const trimmedConversation = {
    ...conversation,
    contextWindow,
  }

  conversations.set(trimmedConversation.sessionId, trimmedConversation)

  return trimmedConversation
}

export function updateConversation(sessionIdOrConversation, updates = {}) {
  const existingConversation = typeof sessionIdOrConversation === 'string'
    ? getConversation(sessionIdOrConversation)
    : sessionIdOrConversation
  const conversation = existingConversation || createConversation({
    sessionId: typeof sessionIdOrConversation === 'string' ? sessionIdOrConversation : updates.sessionId,
    userRole: updates.userRole,
  })
  const currentIntent = updates.currentIntent ?? conversation.currentIntent
  const previousIntent = currentIntent !== conversation.currentIntent
    ? conversation.currentIntent
    : conversation.previousIntent
  const nextContextWindow = updates.contextEntry
    ? [...conversation.contextWindow, updates.contextEntry]
    : conversation.contextWindow
  const nextConversation = {
    ...conversation,
    updatedAt: new Date().toISOString(),
    userRole: updates.userRole ?? conversation.userRole,
    currentIntent,
    previousIntent,
    lastTool: updates.lastTool ?? conversation.lastTool,
    lastResponse: updates.lastResponse ?? conversation.lastResponse,
    topics: uniqueTopics([
      ...conversation.topics,
      ...(updates.topics || []),
      currentIntent,
    ]),
    messageCount: updates.incrementMessageCount
      ? conversation.messageCount + 1
      : conversation.messageCount,
    contextWindow: nextContextWindow,
  }

  return trimConversation(nextConversation, updates.contextWindowLimit || DEFAULT_CONTEXT_WINDOW_LIMIT)
}

export function resetConversation(sessionId) {
  if (!sessionId) return null

  conversations.delete(sessionId)

  return null
}
