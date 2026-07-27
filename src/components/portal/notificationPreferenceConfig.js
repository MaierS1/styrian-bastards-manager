export const notificationCategoryLabels = {
  event: 'Events',
  invoice: 'Rechnungen',
  membership_fee: 'Mitgliedsbeitraege',
  shop: 'Shop',
  sponsor: 'Sponsoren',
  document: 'Dokumente',
  press: 'Presse',
  news: 'News',
  financing: 'Vorfinanzierungen',
  cash: 'Kassa',
  member: 'Mitglieder',
  club_news: 'Vereinsinfos',
  system: 'System',
}

export const notificationPreferenceConfig = [
  preference('event', 'Events', 'Benachrichtigungen zu Events, Aenderungen, Warteliste und Erinnerungen.'),
  preference('invoice', 'Rechnungen', 'Benachrichtigungen zu Rechnungen, Zahlungen, Storno und Faelligkeit.', true),
  preference('membership_fee', 'Mitgliedsbeitraege', 'Benachrichtigungen zu faelligen, bezahlten und gemahnten Beitraegen.', true),
  preference('shop', 'Shop', 'Benachrichtigungen zu Shop-Bestellungen und Statusaenderungen.'),
  preference('sponsor', 'Sponsoren', 'Benachrichtigungen zu Sponsoren, Vertraegen und Zahlungen.'),
  preference('document', 'Dokumente', 'Benachrichtigungen zu veroeffentlichten Dokumenten.'),
  preference('press', 'Presse', 'Benachrichtigungen zu veroeffentlichten Presseartikeln.'),
  preference('news', 'News', 'Benachrichtigungen zu neuen Vereinsnews.'),
  preference('financing', 'Vorfinanzierungen', 'Benachrichtigungen zu Vorfinanzierungen und Rueckzahlungen.', true),
  preference('cash', 'Kassa', 'Benachrichtigungen zu vorbereiteten Kassa-Grenzwertmeldungen.', true),
  preference('member', 'Mitglieder', 'Benachrichtigungen zu Mitgliedsantraegen und Statusaenderungen.', true),
  preference('club_news', 'Vereinsinfos', 'Allgemeine Informationen aus dem Verein.'),
  preference('system', 'Konto und Sicherheit', 'Pflichthinweise zu Portalzugang, Konto und Sicherheit.', true),
]

export const requiredNotificationTypes = new Set(
  notificationPreferenceConfig
    .filter((preferenceItem) => preferenceItem.required)
    .map((preferenceItem) => preferenceItem.notification_type)
)

function preference(category, label, description, required = false) {
  return {
    notification_type: category,
    category,
    label,
    description,
    required,
  }
}
