import { getUnknownIntent, IntentDefinitions } from './intentDefinitions.js'
import { matchIntents } from './intentMatchers.js'

function buildIntentResult(match) {
  return {
    intent: match.intent,
    confidence: match.confidence,
    matchedKeywords: match.matchedKeywords,
    suggestedTool: match.suggestedTool,
    requiresRole: match.requiresRole,
  }
}

export function detectIntent(message, context = {}) {
  const candidateMessage = typeof message === 'string' ? message : context?.message || ''
  const matches = matchIntents(candidateMessage, IntentDefinitions)
  const bestMatch = matches[0]

  if (!bestMatch) {
    const unknownIntent = getUnknownIntent()

    return buildIntentResult({
      intent: unknownIntent.id,
      confidence: 0,
      matchedKeywords: [],
      suggestedTool: unknownIntent.defaultTool,
      requiresRole: unknownIntent.allowedRoles[0] || null,
    })
  }

  return buildIntentResult(bestMatch)
}
