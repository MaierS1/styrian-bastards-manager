import { hasPermission } from '../../utils/permissions.js'

export const DEFAULT_NOTIFICATION_CHANNELS = ['in_app', 'email', 'push']
export const AVAILABLE_NOTIFICATION_CHANNELS = ['in_app', 'email', 'push']
export const PREPARED_NOTIFICATION_CHANNELS = []

export const NOTIFICATION_CATEGORIES = {
  event: 'event',
  invoice: 'invoice',
  membershipFee: 'membership_fee',
  shop: 'shop',
  sponsor: 'sponsor',
  document: 'document',
  press: 'press',
  news: 'news',
  financing: 'financing',
  cash: 'cash',
  member: 'member',
}

export const DOMAIN_NOTIFICATION_TEMPLATES = {
  event_created: template({
    category: NOTIFICATION_CATEGORIES.event,
    title: 'Event erstellt: {name}',
    message: 'Das Event {name} wurde fuer {date} angelegt.',
    priority: 'normal',
    icon: 'calendar-plus',
    deepLink: '/events',
    module: 'events',
    action: 'view',
    defaultChannels: ['in_app', 'email'],
  }),
  event_updated: template({
    category: NOTIFICATION_CATEGORIES.event,
    title: 'Event geaendert: {name}',
    message: 'Das Event {name} wurde aktualisiert.',
    priority: 'normal',
    icon: 'calendar-clock',
    deepLink: '/events',
    module: 'events',
    action: 'view',
    defaultChannels: ['in_app'],
  }),
  event_moved: template({
    category: NOTIFICATION_CATEGORIES.event,
    title: 'Event verschoben: {name}',
    message: 'Das Event {name} wurde auf {date} verschoben.',
    priority: 'high',
    icon: 'calendar-clock',
    deepLink: '/events',
    module: 'events',
    action: 'view',
    defaultChannels: ['in_app', 'email'],
  }),
  event_cancelled: template({
    category: NOTIFICATION_CATEGORIES.event,
    title: 'Event abgesagt: {name}',
    message: 'Das Event {name} wurde abgesagt.',
    priority: 'high',
    icon: 'calendar-x',
    deepLink: '/events',
    module: 'events',
    action: 'view',
    defaultChannels: ['in_app', 'email'],
  }),
  event_full: template({
    category: NOTIFICATION_CATEGORIES.event,
    title: 'Event voll: {name}',
    message: 'Alle regulaeren Plaetze fuer {name} sind belegt.',
    priority: 'high',
    icon: 'users',
    deepLink: '/events',
    module: 'events',
    action: 'edit',
    defaultChannels: ['in_app'],
  }),
  event_waitlist_enabled: template({
    category: NOTIFICATION_CATEGORIES.event,
    title: 'Warteliste aktiviert: {name}',
    message: 'Fuer {name} wurde die Warteliste aktiviert.',
    priority: 'normal',
    icon: 'list-plus',
    deepLink: '/events',
    module: 'events',
    action: 'edit',
    defaultChannels: ['in_app'],
  }),
  event_registration_deadline_reached: template({
    category: NOTIFICATION_CATEGORIES.event,
    title: 'Anmeldeschluss erreicht: {name}',
    message: 'Der Anmeldeschluss fuer {name} ist erreicht.',
    priority: 'normal',
    icon: 'timer',
    deepLink: '/events',
    module: 'events',
    action: 'edit',
    defaultChannels: ['in_app'],
  }),
  invoice_created: template({
    category: NOTIFICATION_CATEGORIES.invoice,
    title: 'Rechnung erstellt: {invoice_number}',
    message: 'Rechnung {invoice_number} fuer {customer_name} wurde erstellt.',
    priority: 'normal',
    icon: 'file-text',
    deepLink: '/invoices',
    module: 'rechnungen',
    action: 'view',
    defaultChannels: ['in_app'],
  }),
  invoice_paid: template({
    category: NOTIFICATION_CATEGORIES.invoice,
    title: 'Rechnung bezahlt: {invoice_number}',
    message: 'Rechnung {invoice_number} wurde als bezahlt markiert.',
    priority: 'normal',
    icon: 'badge-check',
    deepLink: '/invoices',
    module: 'rechnungen',
    action: 'view',
    defaultChannels: ['in_app'],
  }),
  invoice_cancelled: template({
    category: NOTIFICATION_CATEGORIES.invoice,
    title: 'Rechnung storniert: {invoice_number}',
    message: 'Rechnung {invoice_number} wurde storniert.',
    priority: 'high',
    icon: 'file-x',
    deepLink: '/invoices',
    module: 'rechnungen',
    action: 'view',
    defaultChannels: ['in_app'],
  }),
  invoice_overdue: template({
    category: NOTIFICATION_CATEGORIES.invoice,
    title: 'Rechnung ueberfaellig: {invoice_number}',
    message: 'Rechnung {invoice_number} ist seit {due_date} ueberfaellig.',
    priority: 'high',
    icon: 'alarm-clock',
    deepLink: '/invoices',
    module: 'rechnungen',
    action: 'view',
    defaultChannels: ['in_app', 'email'],
  }),
  financing_liability_created: template({
    category: NOTIFICATION_CATEGORIES.financing,
    title: 'Vorfinanzierung angelegt',
    message: '{creditor_name} hat {amount} fuer {description} vorfinanziert.',
    priority: 'normal',
    icon: 'hand-coins',
    deepLink: '/financing',
    module: 'vorfinanzierungen',
    action: 'view',
    defaultChannels: ['in_app'],
  }),
  financing_liability_updated: template({
    category: NOTIFICATION_CATEGORIES.financing,
    title: 'Vorfinanzierung bearbeitet',
    message: 'Die Vorfinanzierung {description} wurde bearbeitet.',
    priority: 'normal',
    icon: 'edit',
    deepLink: '/financing',
    module: 'vorfinanzierungen',
    action: 'view',
    defaultChannels: ['in_app'],
  }),
  financing_liability_partial_repayment: template({
    category: NOTIFICATION_CATEGORIES.financing,
    title: 'Teilrueckzahlung verbucht',
    message: 'Fuer {description} wurde eine Rueckzahlung ueber {amount} verbucht.',
    priority: 'normal',
    icon: 'receipt',
    deepLink: '/financing',
    module: 'vorfinanzierungen',
    action: 'view',
    defaultChannels: ['in_app'],
  }),
  financing_liability_repaid: template({
    category: NOTIFICATION_CATEGORIES.financing,
    title: 'Vorfinanzierung vollstaendig zurueckbezahlt',
    message: '{description} ist vollstaendig zurueckbezahlt.',
    priority: 'normal',
    icon: 'badge-check',
    deepLink: '/financing',
    module: 'vorfinanzierungen',
    action: 'view',
    defaultChannels: ['in_app'],
  }),
  financing_liability_cancelled: template({
    category: NOTIFICATION_CATEGORIES.financing,
    title: 'Vorfinanzierung storniert',
    message: 'Die Vorfinanzierung {description} wurde storniert.',
    priority: 'high',
    icon: 'ban',
    deepLink: '/financing',
    module: 'vorfinanzierungen',
    action: 'view',
    defaultChannels: ['in_app'],
  }),
  financing_liability_overdue: template({
    category: NOTIFICATION_CATEGORIES.financing,
    title: 'Vorfinanzierung ueberfaellig',
    message: 'Die Vorfinanzierung {description} ist seit {due_date} faellig.',
    priority: 'high',
    icon: 'alarm-clock',
    deepLink: '/financing',
    module: 'vorfinanzierungen',
    action: 'view',
    defaultChannels: ['in_app', 'email'],
  }),
  member_application_received: template({
    category: NOTIFICATION_CATEGORIES.member,
    title: 'Mitgliedsantrag eingegangen',
    message: 'Ein Mitgliedsantrag von {member_name} ist eingegangen.',
    priority: 'normal',
    icon: 'user-plus',
    deepLink: '/members',
    module: 'mitglieder',
    action: 'edit',
    defaultChannels: ['in_app'],
  }),
  member_accepted: template({
    category: NOTIFICATION_CATEGORIES.member,
    title: 'Mitglied aufgenommen',
    message: '{member_name} wurde aufgenommen.',
    priority: 'normal',
    icon: 'user-check',
    deepLink: '/members',
    module: 'mitglieder',
    action: 'view',
    defaultChannels: ['in_app'],
  }),
  member_rejected: template({
    category: NOTIFICATION_CATEGORIES.member,
    title: 'Mitglied abgelehnt',
    message: '{member_name} wurde abgelehnt.',
    priority: 'normal',
    icon: 'user-x',
    deepLink: '/members',
    module: 'mitglieder',
    action: 'edit',
    defaultChannels: ['in_app'],
  }),
  member_deactivated: template({
    category: NOTIFICATION_CATEGORIES.member,
    title: 'Mitglied deaktiviert',
    message: '{member_name} wurde deaktiviert.',
    priority: 'normal',
    icon: 'user-minus',
    deepLink: '/members',
    module: 'mitglieder',
    action: 'edit',
    defaultChannels: ['in_app'],
  }),
  membership_fee_due: template({
    category: NOTIFICATION_CATEGORIES.membershipFee,
    title: 'Beitrag faellig',
    message: 'Der Mitgliedsbeitrag {period} ist faellig.',
    priority: 'high',
    icon: 'wallet',
    deepLink: '/fees',
    module: 'beitraege',
    action: 'view',
    defaultChannels: ['in_app', 'email'],
  }),
  membership_fee_paid: template({
    category: NOTIFICATION_CATEGORIES.membershipFee,
    title: 'Beitrag bezahlt',
    message: 'Der Mitgliedsbeitrag von {member_name} wurde bezahlt.',
    priority: 'normal',
    icon: 'badge-check',
    deepLink: '/fees',
    module: 'beitraege',
    action: 'view',
    defaultChannels: ['in_app'],
  }),
  membership_fee_reminder_created: template({
    category: NOTIFICATION_CATEGORIES.membershipFee,
    title: 'Mahnung erstellt',
    message: 'Fuer {member_name} wurde eine Beitragsmahnung erstellt.',
    priority: 'high',
    icon: 'mail-warning',
    deepLink: '/fees',
    module: 'beitraege',
    action: 'view',
    defaultChannels: ['in_app', 'email'],
  }),
  shop_order_received: template({
    category: NOTIFICATION_CATEGORIES.shop,
    title: 'Bestellung eingegangen',
    message: 'Shop-Bestellung {order_number} von {buyer_name} ist eingegangen.',
    priority: 'normal',
    icon: 'shopping-bag',
    deepLink: '/merch',
    module: 'shop',
    action: 'view',
    defaultChannels: ['in_app'],
  }),
  shop_order_paid: template({
    category: NOTIFICATION_CATEGORIES.shop,
    title: 'Bestellung bezahlt',
    message: 'Shop-Bestellung {order_number} wurde bezahlt.',
    priority: 'normal',
    icon: 'badge-check',
    deepLink: '/merch',
    module: 'shop',
    action: 'view',
    defaultChannels: ['in_app'],
  }),
  shop_order_shipped: template({
    category: NOTIFICATION_CATEGORIES.shop,
    title: 'Bestellung versendet',
    message: 'Shop-Bestellung {order_number} wurde versendet.',
    priority: 'normal',
    icon: 'truck',
    deepLink: '/merch',
    module: 'shop',
    action: 'view',
    defaultChannels: ['in_app'],
  }),
  shop_order_cancelled: template({
    category: NOTIFICATION_CATEGORIES.shop,
    title: 'Bestellung storniert',
    message: 'Shop-Bestellung {order_number} wurde storniert.',
    priority: 'high',
    icon: 'shopping-bag-x',
    deepLink: '/merch',
    module: 'shop',
    action: 'view',
    defaultChannels: ['in_app'],
  }),
  sponsor_created: template({
    category: NOTIFICATION_CATEGORIES.sponsor,
    title: 'Sponsor angelegt',
    message: 'Sponsor {sponsor_name} wurde angelegt.',
    priority: 'normal',
    icon: 'handshake',
    deepLink: '/sponsors',
    module: 'sponsoren',
    action: 'view',
    defaultChannels: ['in_app'],
  }),
  sponsorship_renewed: template({
    category: NOTIFICATION_CATEGORIES.sponsor,
    title: 'Sponsoring verlaengert',
    message: 'Sponsoring {contract_title} wurde verlaengert.',
    priority: 'normal',
    icon: 'refresh-cw',
    deepLink: '/sponsors',
    module: 'sponsoren',
    action: 'view',
    defaultChannels: ['in_app'],
  }),
  sponsorship_expiring: template({
    category: NOTIFICATION_CATEGORIES.sponsor,
    title: 'Sponsoring laeuft aus',
    message: 'Sponsoring {contract_title} laeuft am {ends_on} aus.',
    priority: 'high',
    icon: 'timer',
    deepLink: '/sponsors',
    module: 'sponsoren',
    action: 'view',
    defaultChannels: ['in_app'],
  }),
  sponsorship_payment_received: template({
    category: NOTIFICATION_CATEGORIES.sponsor,
    title: 'Sponsorzahlung eingegangen',
    message: 'Zahlung fuer Sponsoring {contract_title} ist eingegangen.',
    priority: 'normal',
    icon: 'badge-check',
    deepLink: '/sponsors',
    module: 'sponsoren',
    action: 'view',
    defaultChannels: ['in_app'],
  }),
  document_published: template({
    category: NOTIFICATION_CATEGORIES.document,
    title: 'Dokument veroeffentlicht',
    message: 'Das Dokument {title} wurde veroeffentlicht.',
    priority: 'normal',
    icon: 'file-check',
    deepLink: '/documents',
    module: 'dokumente',
    action: 'view',
    defaultChannels: ['in_app', 'email'],
  }),
  press_published: template({
    category: NOTIFICATION_CATEGORIES.press,
    title: 'Presseartikel veroeffentlicht',
    message: 'Der Presseartikel {title} wurde veroeffentlicht.',
    priority: 'normal',
    icon: 'newspaper',
    deepLink: '/media',
    module: 'medien_presse',
    action: 'view',
    defaultChannels: ['in_app'],
  }),
  news_published: template({
    category: NOTIFICATION_CATEGORIES.news,
    title: 'News veroeffentlicht',
    message: 'News veroeffentlicht: {title}',
    priority: 'normal',
    icon: 'megaphone',
    deepLink: '/media',
    module: 'events',
    action: 'view',
    defaultChannels: ['in_app', 'email'],
  }),
  cash_large_income: template({
    category: NOTIFICATION_CATEGORIES.cash,
    title: 'Grosse Einnahme',
    message: 'Eine groessere Einnahme wurde vorbereitet: {description}.',
    priority: 'normal',
    icon: 'trending-up',
    deepLink: '/cash',
    module: 'kassa',
    action: 'view',
    defaultChannels: ['in_app'],
  }),
  cash_large_expense: template({
    category: NOTIFICATION_CATEGORIES.cash,
    title: 'Grosse Ausgabe',
    message: 'Eine groessere Ausgabe wurde vorbereitet: {description}.',
    priority: 'normal',
    icon: 'trending-down',
    deepLink: '/cash',
    module: 'kassa',
    action: 'view',
    defaultChannels: ['in_app'],
  }),
}

export function getDomainNotificationTemplate(type) {
  return DOMAIN_NOTIFICATION_TEMPLATES[type] || null
}

export async function notifyDomainEvent({
  type,
  targetId = null,
  targetType = null,
  variables = {},
  metadata = {},
  members = [],
  currentMember = null,
  createdBy = null,
  recipientMemberIds = null,
  dispatchNotification = null,
  channels = null,
}) {
  const notificationTemplate = getDomainNotificationTemplate(type)
  if (!notificationTemplate) {
    return { data: null, error: new Error(`Unbekannter Notification-Typ: ${type}`), skipped: true }
  }

  const recipients = Array.isArray(recipientMemberIds)
    ? uniqueTruthy(recipientMemberIds)
    : resolveRecipientMemberIds({
      members,
      module: notificationTemplate.module,
      action: notificationTemplate.action,
      excludeMemberId: null,
    })

  if (recipients.length === 0) {
    return { data: null, error: null, skipped: true, reason: 'no_recipients' }
  }

  const deepLink = buildDeepLink(notificationTemplate.deepLink, targetId)
  const effectiveChannels = resolveEffectiveTemplateChannels({
    requestedChannels: channels,
    defaultChannels: notificationTemplate.defaultChannels,
  })

  if (effectiveChannels.length === 0) {
    return { data: null, error: null, skipped: true, reason: 'no_supported_channels' }
  }

  const payload = {
    type,
    category: notificationTemplate.category,
    title: renderTemplate(notificationTemplate.title, variables),
    message: renderTemplate(notificationTemplate.message, variables),
    channels: effectiveChannels,
    recipient_member_ids: recipients,
    source: {
      module: notificationTemplate.module,
      entity_type: targetType || type,
      entity_id: targetId || '',
    },
    url: deepLink,
    priority: notificationTemplate.priority,
    idempotency_key: buildDomainIdempotencyKey({
      type,
      targetId,
      createdBy,
      variables,
    }),
    metadata: {
      ...metadata,
      target_type: targetType,
      target_id: targetId,
      created_by: createdBy || currentMember?.auth_user_id || null,
      created_by_member_id: currentMember?.id || null,
      created_at: new Date().toISOString(),
      deep_link: deepLink,
      icon: notificationTemplate.icon,
      default_channels: notificationTemplate.defaultChannels,
      prepared_channels: PREPARED_NOTIFICATION_CHANNELS,
    },
  }

  const dispatch = dispatchNotification || await loadDefaultDispatchNotification()
  return dispatch(payload)
}

export function resolveRecipientMemberIds({ members = [], module, action = 'view', excludeMemberId = null }) {
  return uniqueTruthy(
    members
      .filter((member) => member?.id)
      .filter((member) => !excludeMemberId || member.id !== excludeMemberId)
      .filter((member) => member.status === 'aktiv')
      .filter((member) => member.auth_user_id)
      .filter((member) => hasPermission(member, module, action))
      .map((member) => member.id)
  )
}

export function buildDomainIdempotencyKey({ type, targetId, createdBy, variables = {} }) {
  const version = variables.status || variables.payment_status || variables.updated_at || variables.created_at || variables.date || ''
  return ['domain', type, targetId || 'none', createdBy || 'system', version].join(':').slice(0, 180)
}

export function renderTemplate(value, variables = {}) {
  return String(value || '').replace(/\{([a-zA-Z0-9_]+)\}/g, (_match, key) => {
    const replacement = variables[key]
    if (replacement === undefined || replacement === null || replacement === '') return '-'
    return String(replacement)
  })
}

export function formatNotificationAmount(value) {
  return new Intl.NumberFormat('de-AT', {
    style: 'currency',
    currency: 'EUR',
  }).format(Number(value || 0))
}

export function getMemberDisplayName(member) {
  return `${member?.first_name || ''} ${member?.last_name || ''}`.trim()
    || member?.email
    || member?.id
    || 'Mitglied'
}

function template(config) {
  const defaultChannels = uniqueTruthy([
    ...(config.defaultChannels || DEFAULT_NOTIFICATION_CHANNELS),
    'push',
  ])

  return {
    ...config,
    defaultChannels,
  }
}

export function resolveEffectiveTemplateChannels({ requestedChannels = null, defaultChannels = DEFAULT_NOTIFICATION_CHANNELS }) {
  const allowedDefaults = uniqueTruthy(defaultChannels).filter((channel) => AVAILABLE_NOTIFICATION_CHANNELS.includes(channel))
  const requested = Array.isArray(requestedChannels) ? uniqueTruthy(requestedChannels) : allowedDefaults

  return requested
    .filter((channel) => allowedDefaults.includes(channel))
    .filter((channel) => AVAILABLE_NOTIFICATION_CHANNELS.includes(channel))
}

function buildDeepLink(basePath, targetId) {
  if (!basePath) return null
  if (!targetId) return basePath
  return `${basePath}?id=${encodeURIComponent(targetId)}`
}

function uniqueTruthy(values) {
  return [...new Set((values || []).filter(Boolean))]
}

async function loadDefaultDispatchNotification() {
  const module = await import('../communication/notificationService.js')
  return module.dispatchNotification
}
