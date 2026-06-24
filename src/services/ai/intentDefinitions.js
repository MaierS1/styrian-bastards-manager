const PUBLIC_ROLES = ['Visitor', 'Member', 'Check-in', 'Eventmanager', 'Admin', 'System']
const MEMBER_ROLES = ['Member', 'Check-in', 'Eventmanager', 'Admin', 'System']
export const IntentDefinitions = [
  {
    id: 'GENERAL',
    description: 'Allgemeine Fragen zum Verein oder zur Plattform.',
    priority: 10,
    allowedRoles: PUBLIC_ROLES,
    defaultTool: null,
    confidenceThreshold: 0.45,
  },
  {
    id: 'EVENTS',
    description: 'Fragen zu Events, Terminen, Veranstaltungen und Anmeldungen.',
    priority: 90,
    allowedRoles: PUBLIC_ROLES,
    defaultTool: 'get_public_events',
    confidenceThreshold: 0.4,
  },
  {
    id: 'MEMBERSHIP',
    description: 'Fragen zu Mitgliedschaft, Beitritt und Mitglied werden.',
    priority: 80,
    allowedRoles: PUBLIC_ROLES,
    defaultTool: null,
    confidenceThreshold: 0.4,
  },
  {
    id: 'SHOP',
    description: 'Fragen zu Shop, Fanartikeln und Merch.',
    priority: 70,
    allowedRoles: PUBLIC_ROLES,
    defaultTool: 'get_public_merch_items',
    confidenceThreshold: 0.4,
  },
  {
    id: 'SPONSORS',
    description: 'Fragen zu Sponsoren und Partnern.',
    priority: 70,
    allowedRoles: PUBLIC_ROLES,
    defaultTool: 'get_public_sponsors',
    confidenceThreshold: 0.4,
  },
  {
    id: 'MEDIA',
    description: 'Fragen zu Presse, News, Artikeln und Medien.',
    priority: 70,
    allowedRoles: PUBLIC_ROLES,
    defaultTool: 'get_public_media_items',
    confidenceThreshold: 0.4,
  },
  {
    id: 'CONTACT',
    description: 'Fragen zu Kontakt, Mail, Telefon und Erreichbarkeit.',
    priority: 60,
    allowedRoles: PUBLIC_ROLES,
    defaultTool: null,
    confidenceThreshold: 0.4,
  },
  {
    id: 'FEES',
    description: 'Fragen zu Beitraegen, offenen Zahlungen und Mitgliedsgebuehren.',
    priority: 95,
    allowedRoles: MEMBER_ROLES,
    defaultTool: null,
    confidenceThreshold: 0.4,
  },
  {
    id: 'PROFILE',
    description: 'Fragen zum eigenen Profil und zu persoenlichen Mitgliedsdaten.',
    priority: 65,
    allowedRoles: MEMBER_ROLES,
    defaultTool: null,
    confidenceThreshold: 0.4,
  },
  {
    id: 'DOCUMENTS',
    description: 'Fragen zu Dokumenten, Statuten, Formularen und Protokollen.',
    priority: 75,
    allowedRoles: PUBLIC_ROLES,
    defaultTool: null,
    confidenceThreshold: 0.4,
  },
  {
    id: 'UNKNOWN',
    description: 'Keine passende Benutzerabsicht erkannt.',
    priority: 0,
    allowedRoles: [],
    defaultTool: null,
    confidenceThreshold: 1,
  },
]

export function getIntentDefinition(intentId) {
  return IntentDefinitions.find((intent) => intent.id === intentId) || getUnknownIntent()
}

export function getUnknownIntent() {
  return IntentDefinitions.find((intent) => intent.id === 'UNKNOWN')
}
