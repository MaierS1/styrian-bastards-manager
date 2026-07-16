export const APP_ROLES = [
  'super_admin',
  'administrator',
  'vorstand',
  'kassier',
  'schriftfuehrer',
  'rechnungspruefer',
  'mitglied',
]

export const LEGACY_APP_ROLES = ['admin', 'members', 'cashier', 'checkin', 'readonly']

export const DEFAULT_APP_ROLE = 'mitglied'

export const ALLOWED_APP_ROLES = [...APP_ROLES, ...LEGACY_APP_ROLES]

export const PERMISSION_ACTIONS = ['view', 'create', 'edit', 'delete']

export const MODULES = [
  'mitglieder',
  'beitraege',
  'kassa',
  'rechnungen',
  'dokumente',
  'events',
  'shop',
  'sponsoren',
  'medien_presse',
  'homepage',
  'inventar',
  'einkauf',
  'backup',
  'systemeinstellungen',
]

export const MEMBER_TYPES = [
  ['vollmitglied', 'Vollmitglied'],
  ['foerdermitglied', 'Foerdermitglied'],
  ['ehrenmitglied', 'Ehrenmitglied'],
  ['probejahr', 'Probejahr'],
]

export const CLUB_FUNCTIONS = [
  ['keine', 'Keine'],
  ['obmann', 'Obmann'],
  ['obmann_stv', 'Obmann-Stv.'],
  ['kassier', 'Kassier'],
  ['kassier_stv', 'Kassier-Stv.'],
  ['schriftfuehrer', 'Schriftfuehrer'],
  ['schriftfuehrer_stv', 'Schriftfuehrer-Stv.'],
  ['rechnungspruefer', 'Rechnungspruefer'],
  ['vorstandsmitglied', 'Vorstandsmitglied'],
]

export const APP_ROLE_OPTIONS = [
  ['super_admin', 'Vollzugriff'],
  ['administrator', 'Verwaltung'],
  ['vorstand', 'Vorstand'],
  ['kassier', 'Finanzen'],
  ['schriftfuehrer', 'Schriftfuehrung'],
  ['rechnungspruefer', 'Finanzpruefung'],
  ['mitglied', 'Mitgliederbereich'],
]

export const MODULE_LABELS = {
  mitglieder: 'Mitgliederverwaltung',
  beitraege: 'Beitraege',
  kassa: 'Kassa',
  rechnungen: 'Rechnungen',
  dokumente: 'Dokumente',
  events: 'Events',
  shop: 'Shop & Fanartikel',
  sponsoren: 'Sponsoren',
  medien_presse: 'Media Center',
  homepage: 'Homepage-Freigaben',
  inventar: 'Inventar',
  einkauf: 'Einkauf & Preisvergleich',
  backup: 'Backup',
  systemeinstellungen: 'Systemeinstellungen',
}

const ALL_PERMISSIONS = Object.fromEntries(
  MODULES.map((module) => [module, PERMISSION_ACTIONS])
)

const ROLE_PERMISSIONS = {
  super_admin: ALL_PERMISSIONS,
  administrator: ALL_PERMISSIONS,
  vorstand: {
    mitglieder: ['view', 'create', 'edit'],
    beitraege: ['view'],
    kassa: ['view'],
    rechnungen: ['view'],
    dokumente: ['view', 'create', 'edit'],
    events: ['view', 'create', 'edit', 'delete'],
    shop: ['view'],
    sponsoren: ['view', 'create', 'edit'],
    medien_presse: ['view', 'create', 'edit'],
    homepage: ['view', 'create', 'edit'],
    inventar: ['view', 'create', 'edit'],
    einkauf: ['view', 'create', 'edit'],
  },
  kassier: {
    mitglieder: ['view'],
    beitraege: ['view', 'create', 'edit'],
    kassa: ['view', 'create', 'edit', 'delete'],
    rechnungen: ['view', 'create', 'edit'],
    shop: ['view', 'create', 'edit'],
    einkauf: ['view', 'create', 'edit'],
  },
  schriftfuehrer: {
    mitglieder: ['view', 'create', 'edit'],
    dokumente: ['view', 'create', 'edit'],
    events: ['view', 'create', 'edit'],
    sponsoren: ['view', 'create', 'edit'],
    medien_presse: ['view', 'create', 'edit'],
    homepage: ['view', 'create', 'edit'],
    inventar: ['view', 'create', 'edit'],
  },
  rechnungspruefer: {
    beitraege: ['view'],
    kassa: ['view'],
    rechnungen: ['view'],
  },
  mitglied: {
    events: ['view'],
    dokumente: ['view'],
  },
}

const LEGACY_ROLE_PERMISSIONS = {
  admin: ALL_PERMISSIONS,
  members: {
    mitglieder: ['view', 'create', 'edit'],
    dokumente: ['view', 'create', 'edit'],
    events: ['view'],
    sponsoren: ['view', 'create', 'edit', 'delete'],
    medien_presse: ['view', 'create', 'edit', 'delete'],
    shop: ['view', 'create', 'edit', 'delete'],
    inventar: ['view', 'create', 'edit'],
  },
  cashier: {
    mitglieder: ['view'],
    beitraege: ['view', 'create', 'edit'],
    kassa: ['view', 'create', 'edit', 'delete'],
    rechnungen: ['view', 'create', 'edit'],
    shop: ['view', 'create', 'edit'],
    einkauf: ['view', 'create', 'edit'],
  },
  checkin: {
    events: ['view', 'create', 'edit'],
  },
  readonly: {
    events: ['view'],
    dokumente: ['view'],
  },
}

const BOARD_FUNCTIONS = [
  'obmann',
  'obmann_stv',
  'kassier',
  'kassier_stv',
  'schriftfuehrer',
  'schriftfuehrer_stv',
  'vorstandsmitglied',
]

export function getAppRole(member) {
  return member?.app_role || 'mitglied'
}

export function isAdminRole(role) {
  return ['admin', 'super_admin', 'administrator'].includes(role)
}

export function isSuperAdminRole(role) {
  return ['admin', 'super_admin'].includes(role)
}

export function getRolePermissions(role) {
  return ROLE_PERMISSIONS[role] || LEGACY_ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.mitglied
}

export function hasRolePermission(role, module, action = 'view') {
  const actions = getRolePermissions(role)?.[module] || []
  return actions.includes(action)
}

export function hasPermission(memberOrRole, module, action = 'view') {
  const role = typeof memberOrRole === 'string' ? memberOrRole : getAppRole(memberOrRole)
  return hasRolePermission(role, module, action)
}

export function canManageMembersRole(role) {
  return hasRolePermission(role, 'mitglieder', 'edit')
}

export function canManageCashRole(role) {
  return hasRolePermission(role, 'kassa', 'edit')
}

export function canUseCheckinRole(role) {
  return hasRolePermission(role, 'events', 'view')
}

export function canManageEventsRole(role) {
  return hasRolePermission(role, 'events', 'edit')
}

export function getEventPermissions(role) {
  return {
    canManage: canManageEventsRole(role),
    canCheckIn: canUseCheckinRole(role),
    canDelete: hasRolePermission(role, 'events', 'delete'),
  }
}

export function canManagePurchaseMember(member) {
  return hasPermission(member, 'einkauf', 'edit') || BOARD_FUNCTIONS.includes(member?.role)
}

export function isBoardFunction(role) {
  return BOARD_FUNCTIONS.includes(role)
}

export function getAppRoleLabel(value) {
  const labels = {
    super_admin: 'Vollzugriff',
    administrator: 'Verwaltung',
    vorstand: 'Vorstand',
    kassier: 'Finanzen',
    schriftfuehrer: 'Schriftfuehrung',
    rechnungspruefer: 'Finanzpruefung',
    mitglied: 'Mitgliederbereich',
    admin: 'Vollzugriff',
    members: 'Mitgliederverwaltung',
    cashier: 'Kassa',
    checkin: 'Check-in',
    readonly: 'Mitgliederbereich',
  }

  return labels[value] || 'Mitgliederbereich'
}

export function getModuleLabel(value) {
  return MODULE_LABELS[value] || value
}
