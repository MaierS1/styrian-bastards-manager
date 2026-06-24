import { IntentDefinitions } from './intentDefinitions.js'

const INTENT_KEYWORDS = {
  GENERAL: ['verein', 'info', 'hilfe', 'frage', 'bastards'],
  EVENTS: ['event', 'events', 'termin', 'termine', 'veranstaltung', 'veranstaltungen', 'anmeldung', 'anmelden', 'cornhole'],
  MEMBERSHIP: ['mitglied', 'mitglieder', 'beitritt', 'beitreten', 'mitgliedschaft', 'aufnehmen', 'aufnahme'],
  SHOP: ['shop', 'fanartikel', 'merch', 'hoodie', 'hoodies', 'shirt', 'shirts', 't-shirt', 'tshirts', 'kaufen'],
  SPONSORS: ['sponsor', 'sponsoren', 'partner', 'partnern', 'unterstuetzer', 'unterstützer'],
  MEDIA: ['presse', 'news', 'artikel', 'medien', 'bericht', 'berichte'],
  CONTACT: ['kontakt', 'mail', 'email', 'e-mail', 'telefon', 'anrufen', 'adresse'],
  FEES: ['beitrag', 'beitraege', 'beiträge', 'mitgliedsbeitrag', 'mitgliedsbeitraege', 'gebuehr', 'gebühr', 'zahlung'],
  PROFILE: ['profil', 'daten', 'adresse', 'telefonnummer', 'emailadresse', 'aendern', 'ändern'],
  DOCUMENTS: ['statuten', 'formular', 'formulare', 'protokoll', 'protokolle', 'dokument', 'dokumente'],
}

const INTENT_PHRASES = {
  MEMBERSHIP: ['mitglied werden', 'ich möchte mitglied werden', 'ich moechte mitglied werden'],
  FEES: ['mein beitrag', 'meine beitraege', 'meine beiträge', 'offener beitrag', 'offene beitraege', 'offene beiträge'],
}

function normalizeText(value) {
  if (typeof value !== 'string') return ''

  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function getTokens(normalizedMessage) {
  if (!normalizedMessage) return []

  return normalizedMessage.split(' ').filter(Boolean)
}

function getKeywordMatches(intentId, normalizedMessage, tokens) {
  const keywords = INTENT_KEYWORDS[intentId] || []
  const tokenSet = new Set(tokens)

  return keywords.filter((keyword) => {
    const normalizedKeyword = normalizeText(keyword)
    return tokenSet.has(normalizedKeyword) || normalizedMessage.includes(normalizedKeyword)
  })
}

function getPhraseMatches(intentId, normalizedMessage) {
  const phrases = INTENT_PHRASES[intentId] || []

  return phrases.filter((phrase) => normalizedMessage.includes(normalizeText(phrase)))
}

function calculateConfidence({ keywordMatches, phraseMatches, tokenCount }) {
  if (keywordMatches.length === 0 && phraseMatches.length === 0) return 0

  const keywordScore = keywordMatches.length * 0.35
  const phraseScore = phraseMatches.length * 0.45
  const densityScore = tokenCount > 0 ? Math.min(keywordMatches.length / tokenCount, 0.3) : 0

  return Math.min(0.99, Number((keywordScore + phraseScore + densityScore).toFixed(2)))
}

export function matchIntent(message, intentDefinition) {
  const normalizedMessage = normalizeText(message)
  const tokens = getTokens(normalizedMessage)
  const keywordMatches = getKeywordMatches(intentDefinition.id, normalizedMessage, tokens)
  const phraseMatches = getPhraseMatches(intentDefinition.id, normalizedMessage)
  const matchedKeywords = [...new Set([...keywordMatches, ...phraseMatches])]
  const confidence = calculateConfidence({
    keywordMatches,
    phraseMatches,
    tokenCount: tokens.length,
  })

  return {
    intent: intentDefinition.id,
    confidence,
    matchedKeywords,
    suggestedTool: intentDefinition.defaultTool,
    requiresRole: intentDefinition.allowedRoles[0] || null,
    priority: intentDefinition.priority,
    meetsThreshold: confidence >= intentDefinition.confidenceThreshold,
  }
}

export function matchIntents(message, intentDefinitions = IntentDefinitions) {
  return intentDefinitions
    .filter((intentDefinition) => intentDefinition.id !== 'UNKNOWN')
    .map((intentDefinition) => matchIntent(message, intentDefinition))
    .filter((match) => match.meetsThreshold)
    .sort((firstMatch, secondMatch) => {
      if (secondMatch.confidence !== firstMatch.confidence) {
        return secondMatch.confidence - firstMatch.confidence
      }

      return secondMatch.priority - firstMatch.priority
    })
}
