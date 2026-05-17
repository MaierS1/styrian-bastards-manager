export function getAppRole(member) {
  return member?.app_role || 'readonly'
}

export function isAdminRole(role) {
  return role === 'admin'
}

export function canManageMembersRole(role) {
  return ['admin', 'members'].includes(role)
}

export function canManageCashRole(role) {
  return ['admin', 'cashier'].includes(role)
}

export function canUseCheckinRole(role) {
  return ['admin', 'checkin'].includes(role)
}

export function canManageEventsRole(role) {
  return ['admin', 'checkin'].includes(role)
}

export function getAppRoleLabel(value) {
  const labels = {
    admin: 'Admin',
    members: 'Mitgliederverwaltung',
    cashier: 'Kassa',
    checkin: 'Check-in',
    readonly: 'Nur Lesen',
  }

  return labels[value] || 'Nur Lesen'
}
