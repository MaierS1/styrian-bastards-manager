export const notificationCategoryLabels = {
  event: 'Events',
  membership_fee: 'Mitgliedsbeitraege',
  invoice: 'Rechnungen',
  document: 'Dokumente',
  club_news: 'Vereinsinfos',
  system: 'System',
}

export const notificationPreferenceConfig = [
  {
    notification_type: 'event_updates',
    category: 'event',
    label: 'Event-Updates',
    description: 'Hinweise zu Terminaenderungen, Treffpunkten und wichtigen Event-Infos.',
    required: false,
  },
  {
    notification_type: 'event_reminder',
    category: 'event',
    label: 'Event-Erinnerungen',
    description: 'Erinnerungen an kommende Termine im Mitgliederportal.',
    required: false,
  },
  {
    notification_type: 'membership_fee_due',
    category: 'membership_fee',
    label: 'Faellige Mitgliedsbeitraege',
    description: 'Pflichthinweise zu offenen oder faelligen Mitgliedsbeitraegen.',
    required: true,
  },
  {
    notification_type: 'invoice_available',
    category: 'invoice',
    label: 'Rechnungen und Zahlungen',
    description: 'Pflichthinweise zu bereitgestellten Rechnungen und zahlungsrelevanten Informationen.',
    required: true,
  },
  {
    notification_type: 'document_available',
    category: 'document',
    label: 'Neue Dokumente',
    description: 'Informationen zu neuen Dokumenten im Mitgliederbereich.',
    required: false,
  },
  {
    notification_type: 'club_news',
    category: 'club_news',
    label: 'Vereinsinfos',
    description: 'Allgemeine Informationen aus dem Verein.',
    required: false,
  },
  {
    notification_type: 'system_account',
    category: 'system',
    label: 'Konto und Sicherheit',
    description: 'Pflichthinweise zu Portalzugang, Konto und sicherheitsrelevanten Aenderungen.',
    required: true,
  },
]

export const requiredNotificationTypes = new Set(
  notificationPreferenceConfig
    .filter((preference) => preference.required)
    .map((preference) => preference.notification_type)
)
