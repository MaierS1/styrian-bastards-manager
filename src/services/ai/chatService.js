import { ContextBuilder } from './contextBuilder.js'
import { detectIntent } from './intentRouter.js'
import { selectTool } from './intentToolMapper.js'
import { executeTool } from './toolExecutor.js'
import { composeResponse } from './responseComposer.js'
import { Personality } from './personality.js'
import {
  createConversation,
  getConversation,
  updateConversation,
} from './conversationManager.js'

function isDevelopment() {
  return import.meta.env?.DEV === true
}

function getRecordCount(data) {
  if (Array.isArray(data)) return data.length
  if (data && typeof data === 'object') return 1

  return 0
}

function formatToolExecution(toolResult) {
  return {
    executed: Boolean(toolResult?.metadata?.executed),
    success: Boolean(toolResult?.success),
    recordCount: toolResult?.metadata?.recordCount ?? getRecordCount(toolResult?.data),
    executionTime: toolResult?.metadata?.executionTime ?? 0,
  }
}

function logDevelopmentRun({ intent, selectedTool, startedAt }) {
  if (!isDevelopment()) return

  console.info('[ai/chatService] Processed chat message', {
    intent: intent.intent,
    tool: selectedTool.toolId,
    runtime: Number((performance.now() - startedAt).toFixed(2)),
  })
}

function normalizeText(value) {
  if (typeof value !== 'string') return ''

  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function isContextualFollowUp(message) {
  const normalizedMessage = normalizeText(message)
  if (!normalizedMessage) return false

  return [
    'wo',
    'wann',
    'details',
    'anmeldung',
    'anfahrt',
    'es',
    'dort',
    'statt',
  ].some((keyword) => normalizedMessage.split(' ').includes(keyword))
}

function resolveIntentWithConversation(message, detectedIntent, conversation) {
  if (detectedIntent.intent !== 'UNKNOWN') return detectedIntent
  if (!conversation?.currentIntent || !isContextualFollowUp(message)) return detectedIntent

  return {
    ...detectedIntent,
    intent: conversation.currentIntent,
    confidence: 0.5,
    matchedKeywords: ['conversation_context'],
  }
}

export async function processChatMessage({
  message,
  sessionId = null,
  userRole = 'Visitor',
  conversationHistory = [],
} = {}) {
  const startedAt = performance.now()
  const conversation = getConversation(sessionId) || createConversation({ sessionId, userRole })
  const context = ContextBuilder({
    message,
    sessionId: conversation.sessionId,
    userRole,
    conversation: conversationHistory,
    conversationState: conversation,
  })
  const detectedIntent = detectIntent(message, context)
  const intent = resolveIntentWithConversation(message, detectedIntent, conversation)
  const selectedTool = selectTool(intent, context)
  const toolResult = selectedTool.toolId
    ? await executeTool(selectedTool.toolId, context)
    : null
  const response = composeResponse({
    intent,
    context,
    conversationState: conversation,
    selectedTool,
    toolResult,
    personality: Personality,
  })
  const updatedConversation = updateConversation(conversation, {
    userRole,
    currentIntent: intent.intent,
    lastTool: selectedTool.toolId,
    lastResponse: response,
    topics: [intent.intent],
    incrementMessageCount: true,
    contextEntry: {
      message,
      intent: intent.intent,
      selectedTool,
      toolResult,
      response,
      timestamp: new Date().toISOString(),
    },
  })
  const runtime = Number((performance.now() - startedAt).toFixed(2))

  logDevelopmentRun({ intent, selectedTool, startedAt })

  return {
    success: response.success,
    intent,
    selectedTool,
    response,
    metadata: {
      sessionId: updatedConversation.sessionId,
      userRole: context.userRole,
      conversation: updatedConversation,
      toolExecution: formatToolExecution(toolResult),
      toolResult,
      runtime,
      timestamp: new Date().toISOString(),
    },
  }
}
