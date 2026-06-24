const MEMBER_TOOL_IDS = ['get_fee_status', 'get_member_profile']

const INTENT_TOOL_MAPPING = {
  EVENTS: {
    toolId: 'get_public_events',
    reason: 'matched intent default tool',
    confidence: 0.9,
  },
  MEMBERSHIP: {
    toolId: null,
    reason: 'informational',
    confidence: 0.8,
  },
  SHOP: {
    toolId: 'get_public_merch_items',
    reason: 'matched intent default tool',
    confidence: 0.9,
  },
  SPONSORS: {
    toolId: 'get_public_sponsors',
    reason: 'matched intent default tool',
    confidence: 0.9,
  },
  MEDIA: {
    toolId: 'get_public_media_items',
    reason: 'matched intent default tool',
    confidence: 0.9,
  },
  GENERAL: {
    toolId: 'get_public_home_stats',
    reason: 'matched intent default tool',
    confidence: 0.75,
  },
  DOCUMENTS: {
    toolId: null,
    reason: 'planned',
    confidence: 0.7,
  },
  FEES: {
    toolId: 'get_fee_status',
    reason: 'member role required',
    confidence: 0.85,
  },
  PROFILE: {
    toolId: 'get_member_profile',
    reason: 'member role required',
    confidence: 0.85,
  },
  UNKNOWN: {
    toolId: null,
    reason: 'unknown intent',
    confidence: 0,
  },
}

function normalizeRole(role) {
  if (!role || typeof role !== 'string') return 'Visitor'

  const normalizedRole = role.trim().toLowerCase()

  if (normalizedRole === 'member' || normalizedRole === 'members') return 'Member'
  if (normalizedRole === 'admin' || normalizedRole === 'system') return 'Admin'

  return 'Visitor'
}

function resolveIntentId(intent) {
  if (typeof intent === 'string') return intent

  return intent?.intent || intent?.id || 'UNKNOWN'
}

function resolveUserRole(intent, context = {}) {
  return context.userRole || intent?.userRole || intent?.context?.userRole || 'Visitor'
}

function canUseMemberTool(toolId, userRole) {
  if (!MEMBER_TOOL_IDS.includes(toolId)) return true

  return ['Member', 'Admin'].includes(normalizeRole(userRole))
}

export function selectTool(intent, context = {}) {
  const intentId = resolveIntentId(intent)
  const mapping = INTENT_TOOL_MAPPING[intentId] || INTENT_TOOL_MAPPING.UNKNOWN
  const userRole = resolveUserRole(intent, context)

  if (!mapping.toolId) {
    return {
      toolId: null,
      reason: mapping.reason,
      confidence: mapping.confidence,
    }
  }

  if (!canUseMemberTool(mapping.toolId, userRole)) {
    return {
      toolId: null,
      reason: 'role not allowed',
      confidence: mapping.confidence,
    }
  }

  return {
    toolId: mapping.toolId,
    reason: mapping.reason,
    confidence: mapping.confidence,
  }
}
