import { getResponseTemplate } from './responseTemplates.js'
import {
  compactLines,
  formatAmount,
  formatDate,
  formatFallback,
  formatLink,
  formatList,
  getRecordCount,
} from './responseFormatter.js'

function resolveIntentId(intent) {
  if (typeof intent === 'string') return intent

  return intent?.intent || intent?.id || 'UNKNOWN'
}

function resolveOptions(intentOrOptions, context, toolResult, personality) {
  const isOptionsObject = intentOrOptions
    && typeof intentOrOptions === 'object'
    && (
      Object.hasOwn(intentOrOptions, 'context')
      || Object.hasOwn(intentOrOptions, 'toolResult')
      || Object.hasOwn(intentOrOptions, 'personality')
    )

  if (isOptionsObject) {
    return intentOrOptions
  }

  return {
    intent: intentOrOptions,
    context,
    toolResult,
    personality,
  }
}

function getDataRows(toolResult) {
  const data = toolResult?.data

  if (Array.isArray(data)) return data
  if (data && typeof data === 'object') return [data]

  return []
}

function formatSuggestions(suggestions) {
  return formatList(suggestions, (suggestion) => suggestion, { limit: suggestions.length })
}

function composeEventsMessage(template, rows) {
  const nextEvent = rows[0]
  if (!nextEvent) return compactLines([template.intro, template.body, template.outro, formatSuggestions(template.followUpSuggestions)])

  const title = formatFallback(nextEvent.title, 'ein Event')
  const date = formatDate(nextEvent.starts_at || nextEvent.event_date)
  const location = nextEvent.location ? `Ort: ${nextEvent.location}` : null
  const registration = nextEvent.registration_status === 'open' ? 'Anmeldung ist moeglich.' : null

  return compactLines([
    `${template.intro} ${title}${date ? ` am ${date}` : ''}.`,
    location,
    registration,
    'Moechtest du',
    formatSuggestions(template.followUpSuggestions),
  ])
}

function composeShopMessage(template, rows) {
  const count = rows.length
  const itemList = formatList(rows, (item) => {
    const price = formatAmount(item.display_price_cents)
    return compactLines([formatFallback(item.title, 'Fanartikel'), price ? `ab ${price}` : null]).replace('\n', ' - ')
  }, { limit: 5 })

  return compactLines([
    `Im Shop sind aktuell ${count} Artikel verfuegbar.`,
    itemList,
    template.outro,
  ])
}

function composeSponsorsMessage(template, rows) {
  const sponsorList = formatList(rows, (sponsor) => {
    const website = formatLink(sponsor.website)
    return compactLines([formatFallback(sponsor.name, 'Sponsor'), website]).replace('\n', ' - ')
  }, { limit: 5 })

  return compactLines([
    rows.length > 0 ? template.intro : template.body,
    sponsorList,
    template.outro,
  ])
}

function composeMediaMessage(template, rows) {
  const mediaList = formatList(rows, (item) => {
    const date = formatDate(item.publication_date)
    const link = formatLink(item.external_url)
    return compactLines([formatFallback(item.title, 'Beitrag'), date, link]).replace(/\n/g, ' - ')
  }, { limit: 5 })

  return compactLines([
    rows.length > 0 ? template.intro : template.body,
    mediaList,
    template.outro,
  ])
}

function composeGeneralMessage(template, rows) {
  const stats = rows[0]
  if (!stats) return compactLines([template.intro, template.body, template.outro])

  return compactLines([
    template.intro,
    formatList([
      `${stats.active_members ?? 0} aktive Mitglieder`,
      `${stats.upcoming_events ?? 0} kommende Events`,
      `${stats.public_sponsors ?? 0} Sponsoren`,
      `${stats.public_shop_items ?? 0} Shop-Artikel`,
    ]),
    template.outro,
  ])
}

function composeTemplateMessage(intentId, template, rows) {
  if (intentId === 'EVENTS') return composeEventsMessage(template, rows)
  if (intentId === 'SHOP') return composeShopMessage(template, rows)
  if (intentId === 'SPONSORS') return composeSponsorsMessage(template, rows)
  if (intentId === 'MEDIA') return composeMediaMessage(template, rows)
  if (intentId === 'GENERAL') return composeGeneralMessage(template, rows)

  return compactLines([template.intro, template.body, template.outro])
}

export function composeResponse(intentOrOptions, context, toolResult, personality) {
  const options = resolveOptions(intentOrOptions, context, toolResult, personality)
  const intentId = resolveIntentId(options.intent)
  const template = getResponseTemplate(intentId)
  const rows = getDataRows(options.toolResult)
  const toolSucceeded = options.toolResult ? Boolean(options.toolResult.success) : true
  const message = toolSucceeded
    ? composeTemplateMessage(intentId, template, rows)
    : compactLines([template.intro, template.body])

  return {
    success: toolSucceeded,
    message,
    followUps: template.followUpSuggestions,
    source: options.toolResult?.tool || 'template',
    metadata: {
      intent: intentId,
      title: template.title,
      recordCount: options.toolResult?.metadata?.recordCount ?? getRecordCount(options.toolResult?.data),
      toolSuccess: options.toolResult?.success ?? null,
      reason: options.toolResult?.reason || options.toolResult?.metadata?.reason || null,
      personality: options.personality?.name || null,
      timestamp: new Date().toISOString(),
    },
  }
}
