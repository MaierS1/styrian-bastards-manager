import { ToolRegistry } from './toolRegistry.js'

const ROLE_ORDER = ['Visitor', 'Member', 'Check-in', 'Eventmanager', 'Admin', 'System']

const ROLE_ALIASES = {
  public: 'Visitor',
  visitor: 'Visitor',
  readonly: 'Visitor',
  member: 'Member',
  members: 'Member',
  checkin: 'Check-in',
  'check-in': 'Check-in',
  eventmanager: 'Eventmanager',
  events: 'Eventmanager',
  admin: 'Admin',
  system: 'System',
}

function normalizeRole(role) {
  if (!role || typeof role !== 'string') return 'Visitor'

  const trimmedRole = role.trim()
  return ROLE_ALIASES[trimmedRole.toLowerCase()] || trimmedRole
}

function findTool(toolId, registry = ToolRegistry) {
  return registry.find((tool) => tool.id === toolId) || null
}

export function toolExists(toolId, registry = ToolRegistry) {
  return Boolean(findTool(toolId, registry))
}

export function toolEnabled(toolId, registry = ToolRegistry) {
  const tool = findTool(toolId, registry)
  return Boolean(tool?.enabled)
}

export function roleAllowed(toolOrRequiredRole, context = {}) {
  const requiredRole = normalizeRole(
    typeof toolOrRequiredRole === 'string' ? toolOrRequiredRole : toolOrRequiredRole?.requiredRole,
  )
  const userRole = normalizeRole(context?.userRole)
  const requiredIndex = ROLE_ORDER.indexOf(requiredRole)
  const userIndex = ROLE_ORDER.indexOf(userRole)

  if (requiredIndex === -1 || userIndex === -1) return false

  return userIndex >= requiredIndex
}
