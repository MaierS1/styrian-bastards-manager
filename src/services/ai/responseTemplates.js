export const ResponseTemplates = {
  EVENTS: {
    title: 'Events',
    intro: 'Das naechste Event ist',
    body: 'Aktuell habe ich keine passenden Eventdetails gefunden.',
    outro: 'Moechtest du mehr dazu wissen?',
    followUpSuggestions: ['Details', 'Anmeldung', 'Anfahrt'],
  },
  SHOP: {
    title: 'Shop',
    intro: 'Im Shop sind aktuell Artikel verfuegbar.',
    body: 'Aktuell habe ich keine Shopdetails gefunden.',
    outro: 'Moechtest du dir bestimmte Fanartikel ansehen?',
    followUpSuggestions: ['Hoodies', 'T-Shirts', 'Verfuegbarkeit'],
  },
  SPONSORS: {
    title: 'Sponsoren',
    intro: 'Das sind aktuelle Sponsoren und Partner.',
    body: 'Aktuell habe ich keine Sponsorendetails gefunden.',
    outro: 'Moechtest du mehr ueber eine Partnerschaft wissen?',
    followUpSuggestions: ['Partner werden', 'Sponsorendetails', 'Kontakt'],
  },
  MEDIA: {
    title: 'Presse',
    intro: 'Hier sind aktuelle Presse- und Medienbeitraege.',
    body: 'Aktuell habe ich keine Medienbeitraege gefunden.',
    outro: 'Moechtest du einen Beitrag oeffnen?',
    followUpSuggestions: ['News', 'Presseartikel', 'Medienarchiv'],
  },
  GENERAL: {
    title: 'Allgemein',
    intro: 'Ich helfe dir gerne rund um die Styrian Bastards.',
    body: 'Frag mich gerne nach Events, Shop, Sponsoren, Medien oder Mitgliedschaft.',
    outro: 'Womit soll ich dir helfen?',
    followUpSuggestions: ['Events', 'Shop', 'Mitgliedschaft'],
  },
  UNKNOWN: {
    title: 'Unklar',
    intro: 'Das habe ich leider nicht verstanden.',
    body: 'Formuliere deine Frage bitte etwas anders.',
    outro: 'Ich kann dir rund um Verein, Events, Shop und Mitgliedschaft helfen.',
    followUpSuggestions: ['Events', 'Shop', 'Kontakt'],
  },
  MEMBERSHIP: {
    title: 'Mitgliedschaft',
    intro: 'Zur Mitgliedschaft kann ich dir grundsaetzliche Informationen geben.',
    body: 'Fuer den Beitritt helfen Fragen zu Ablauf, Beitrag und Kontakt weiter.',
    outro: 'Moechtest du wissen, wie du Mitglied wirst?',
    followUpSuggestions: ['Beitritt', 'Mitgliedsbeitrag', 'Kontakt'],
  },
  CONTACT: {
    title: 'Kontakt',
    intro: 'Ich helfe dir gerne beim Kontakt zum Verein.',
    body: 'Frag nach Mail, Telefon oder einer konkreten Ansprechperson.',
    outro: 'Wen moechtest du erreichen?',
    followUpSuggestions: ['E-Mail', 'Telefon', 'Ansprechperson'],
  },
  DOCUMENTS: {
    title: 'Dokumente',
    intro: 'Dokumente sind fuer die AI-Auskunft vorbereitet.',
    body: 'Statuten, Formulare und Protokolle sind als Tool-Anbindung geplant.',
    outro: 'Moechtest du nach einem bestimmten Dokument fragen?',
    followUpSuggestions: ['Statuten', 'Formulare', 'Protokolle'],
  },
  FEES: {
    title: 'Beitraege',
    intro: 'Zu Beitraegen kann ich ohne Mitgliedsdaten nur allgemein helfen.',
    body: 'Persoenliche Beitragsdaten sind nur fuer berechtigte Mitglieder vorgesehen.',
    outro: 'Moechtest du allgemeine Infos zur Mitgliedschaft?',
    followUpSuggestions: ['Mitgliedsbeitrag', 'Mitgliedschaft', 'Kontakt'],
  },
  PROFILE: {
    title: 'Profil',
    intro: 'Profilinformationen sind fuer berechtigte Mitglieder vorgesehen.',
    body: 'Ohne Mitgliedskontext gebe ich keine persoenlichen Daten aus.',
    outro: 'Moechtest du wissen, welche Profildaten gepflegt werden koennen?',
    followUpSuggestions: ['Profil anzeigen', 'Daten aendern', 'Kontakt'],
  },
}

export function getResponseTemplate(intentId) {
  return ResponseTemplates[intentId] || ResponseTemplates.UNKNOWN
}
