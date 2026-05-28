export function getCashAmountCents(entry) {
  const amount = Number(entry?.amount ?? 0)
  return Number.isFinite(amount) ? Math.round(Math.abs(amount) * 100) : 0
}

export function isValidCashEntry(entry) {
  return Boolean(
    entry
      && !entry.is_cancelled
      && (entry.type === 'einnahme' || entry.type === 'ausgabe')
      && getCashAmountCents(entry) > 0
  )
}

export function getCashEntrySignedCents(entry, { includeOpening = true } = {}) {
  if (!isValidCashEntry(entry)) return 0
  if (!includeOpening && entry.is_opening) return 0

  const amountCents = getCashAmountCents(entry)
  return entry.type === 'einnahme' ? amountCents : -amountCents
}

export function getCashEntrySignedAmount(entry, options) {
  return getCashEntrySignedCents(entry, options) / 100
}

export function getCashBalance(cashEntries, options) {
  const balanceCents = cashEntries.reduce(
    (sum, entry) => sum + getCashEntrySignedCents(entry, options),
    0
  )

  return balanceCents / 100
}

export function getCashBalanceForYear(year, cashEntries) {
  return getCashBalance(
    cashEntries.filter((entry) => String(entry.entry_year || '') === String(year))
  )
}

export function getAmountByType(type) {
  if (type === 'vollmitglied') return 70
  if (type === 'foerdermitglied') return 40
  if (type === 'probejahr') return 40
  if (type === 'ehrenmitglied') return 0
  return 0
}

export function getOpenFeesCount(fees, getMemberById) {
  return fees.filter((fee) => {
    const member = getMemberById(fee.member_id)
    return !member?.is_test && !fee.paid && Number(fee.amount || 0) > 0
  }).length
}

export function getOpenFeesTotal(fees, getMemberById) {
  return fees
    .filter((fee) => {
      const member = getMemberById(fee.member_id)
      return !member?.is_test && !fee.paid && Number(fee.amount || 0) > 0
    })
    .reduce((sum, fee) => sum + Number(fee.amount || 0), 0)
}

export function getIncomeTotal(cashEntries) {
  return cashEntries.reduce((sum, entry) => {
    if (!isValidCashEntry(entry) || entry.is_opening || entry.type !== 'einnahme') return sum
    return sum + getCashAmountCents(entry)
  }, 0) / 100
}

export function getExpenseTotal(cashEntries) {
  return cashEntries.reduce((sum, entry) => {
    if (!isValidCashEntry(entry) || entry.is_opening || entry.type !== 'ausgabe') return sum
    return sum + getCashAmountCents(entry)
  }, 0) / 100
}

export function getCommercialDashboardData({
  sponsors = [],
  sponsorContracts = [],
  merchSales = [],
  merchSaleItems = [],
  merchVariants = [],
  merchItems = [],
  selectedCashYear,
  today = new Date(),
}) {
  const startOfToday = new Date(today)
  startOfToday.setHours(0, 0, 0, 0)

  const expiringUntil = new Date(startOfToday)
  expiringUntil.setDate(startOfToday.getDate() + 30)

  const activeSponsors = sponsors.filter((sponsor) => sponsor.status === 'active')
  const activeContracts = sponsorContracts.filter((contract) => contract.status === 'active')
  const expiringContracts = activeContracts
    .filter((contract) => {
      if (!contract.ends_on) return false

      const endsOn = new Date(contract.ends_on)
      endsOn.setHours(0, 0, 0, 0)

      return endsOn >= startOfToday && endsOn <= expiringUntil
    })
    .sort((a, b) => new Date(a.ends_on) - new Date(b.ends_on))

  const sponsorshipContractVolumeCents = activeContracts.reduce(
    (sum, contract) => sum + Number(contract.amount_cents || 0),
    0
  )

  const selectedYear = selectedCashYear === 'alle' ? null : String(selectedCashYear || '')
  const completedSales = merchSales.filter((sale) => {
    if (sale.status !== 'completed') return false
    if (!selectedYear) return true
    return String(sale.sale_date || '').slice(0, 4) === selectedYear
  })
  const completedSaleIds = new Set(completedSales.map((sale) => sale.id))
  const completedSaleItems = merchSaleItems.filter((item) => completedSaleIds.has(item.merch_sale_id))
  const merchRevenueCents = completedSales.reduce((sum, sale) => sum + Number(sale.total_cents || 0), 0)
  const merchQuantitySold = completedSaleItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
  const lowStockVariants = merchVariants
    .filter((variant) => {
      const item = merchItems.find((candidate) => candidate.id === variant.merch_item_id)
      return (
        variant.status === 'active'
        && item?.status === 'active'
        && Number(variant.stock_quantity || 0) <= Number(variant.reorder_level || 0)
      )
    })
    .sort((a, b) => Number(a.stock_quantity || 0) - Number(b.stock_quantity || 0))

  const topMerchItemsById = {}

  completedSaleItems.forEach((saleItem) => {
    const variant = merchVariants.find((candidate) => candidate.id === saleItem.merch_variant_id)
    const merchItem = merchItems.find((candidate) => candidate.id === variant?.merch_item_id)

    if (!merchItem) return

    if (!topMerchItemsById[merchItem.id]) {
      topMerchItemsById[merchItem.id] = {
        id: merchItem.id,
        name: merchItem.name,
        quantity: 0,
        revenueCents: 0,
      }
    }

    topMerchItemsById[merchItem.id].quantity += Number(saleItem.quantity || 0)
    topMerchItemsById[merchItem.id].revenueCents += Number(saleItem.total_cents || 0)
  })

  return {
    activeSponsorsCount: activeSponsors.length,
    activeContractsCount: activeContracts.length,
    expiringContracts,
    sponsorshipContractVolumeCents,
    merchRevenueCents,
    merchQuantitySold,
    lowStockVariants,
    topMerchItems: Object.values(topMerchItemsById).sort((a, b) => b.revenueCents - a.revenueCents),
  }
}

export function getDashboardAlerts({
  members,
  documents,
  fees,
  cashEntries,
  selectedCashYear,
  hasOpeningForYear,
  getEntryYear,
  getUpcomingEvents,
  getTestMembers,
  getTestInvoices,
  getTestCashEntries,
  getCashBalance,
  getFee,
  getMemberById,
  commercialData,
}) {
  const alerts = []
  const openFeeMembers = members.filter((member) => {
    if (member.is_test) return false

    const fee = getFee(member.id)
    return fee && !fee.paid && Number(fee.amount || 0) > 0
  })
  const openFeeTotal = getOpenFeesTotal(fees, getMemberById)
  const currentBalance = getCashBalance()
  const upcomingEvents = getUpcomingEvents(14)
  const missingRequiredDocuments = []

  if (!documents.some((document) => document.category === 'statuten')) {
    missingRequiredDocuments.push('Statuten')
  }

  if (openFeeMembers.length > 0) {
    alerts.push({
      type: 'warning',
      title: 'Offene Mitgliedsbeiträge',
      message: `${openFeeMembers.length} Mitglieder haben offene Beiträge. Offene Summe: ${openFeeTotal.toFixed(2)} €.`,
    })
  }

  if (currentBalance < 200) {
    alerts.push({
      type: 'danger',
      title: 'Niedriger Kassastand',
      message: `Der aktuelle Kassastand liegt bei ${currentBalance.toFixed(2)} €. Bitte prüfen.`,
    })
  }

  if (upcomingEvents.length > 0) {
    alerts.push({
      type: 'info',
      title: 'Anstehende Events',
      message: `${upcomingEvents.length} Event(s) in den nächsten 14 Tagen. Nächstes Event: ${upcomingEvents[0].name} am ${upcomingEvents[0].event_date}.`,
    })
  }

  if (commercialData?.expiringContracts?.length > 0) {
    const nextContract = commercialData.expiringContracts[0]

    alerts.push({
      type: 'warning',
      title: 'Sponsor-Verträge laufen aus',
      message: `${commercialData.expiringContracts.length} aktive Sponsor-Verträge laufen in den nächsten 30 Tagen aus. Nächster Vertrag: ${nextContract.title || 'Ohne Titel'} bis ${nextContract.ends_on}.`,
    })
  }

  if (commercialData?.lowStockVariants?.length > 0) {
    const nextVariant = commercialData.lowStockVariants[0]

    alerts.push({
      type: 'warning',
      title: 'Niedriger Fanartikelbestand',
      message: `${commercialData.lowStockVariants.length} aktive Fanartikel-Variante(n) liegen am oder unter dem Mindestbestand. Niedrigster Bestand: ${Number(nextVariant.stock_quantity || 0)}.`,
    })
  }

  if (missingRequiredDocuments.length > 0) {
    alerts.push({
      type: 'warning',
      title: 'Wichtige Dokumente fehlen',
      message: `${missingRequiredDocuments.join(', ')} noch nicht im Dokumentenbereich hochgeladen.`,
    })
  }

  if (getTestMembers().length > 0 || getTestInvoices().length > 0 || getTestCashEntries().length > 0) {
    alerts.push({
      type: 'warning',
      title: 'Testdaten vorhanden',
      message: `${getTestMembers().length} Testmitglied(er), ${getTestInvoices().length} Testrechnung(en) und ${getTestCashEntries().length} Test-Kassa-Eintrag/Einträge vorhanden.`,
    })
  }

  if (!hasOpeningForYear(selectedCashYear) && selectedCashYear !== 'alle') {
    const previousYear = Number(selectedCashYear) - 1
    const hasPreviousYearEntries = cashEntries.some((entry) => getEntryYear(entry) === String(previousYear))

    if (hasPreviousYearEntries) {
      alerts.push({
        type: 'info',
        title: 'Jahresübertrag prüfen',
        message: `Für ${selectedCashYear} ist noch kein Übertrag Vorjahr vorhanden. Du kannst ihn aus ${previousYear} automatisch erstellen.`,
      })
    }
  }

  if (alerts.length === 0) {
    alerts.push({
      type: 'success',
      title: 'Alles im grünen Bereich',
      message: 'Keine dringenden Hinweise vorhanden.',
    })
  }

  return alerts
}

function getDaysUntil(dateValue, today = new Date()) {
  if (!dateValue) return null

  const startOfToday = new Date(today)
  startOfToday.setHours(0, 0, 0, 0)

  const targetDate = new Date(dateValue)
  targetDate.setHours(0, 0, 0, 0)

  return Math.ceil((targetDate - startOfToday) / (1000 * 60 * 60 * 24))
}

function isBlank(value) {
  return String(value || '').trim().length === 0
}

function getPublicIssueLabel(entity, fields) {
  const missingFields = fields.filter(([field]) => isBlank(entity?.[field])).map(([, label]) => label)
  return missingFields.join(', ')
}

function createCockpitTask({
  id,
  priority,
  area,
  title,
  message,
  count = 0,
  amount = null,
  dueDate = null,
  targetPage = 'dashboard',
  items = [],
}) {
  return {
    id,
    priority,
    area,
    title,
    message,
    count,
    amount,
    dueDate,
    targetPage,
    items,
  }
}

export function getDashboardCockpitTasks({
  members = [],
  fees = [],
  invoices = [],
  events = [],
  mediaItems = [],
  sponsors = [],
  sponsorContracts = [],
  merchItems = [],
  merchVariants = [],
  getMemberById,
  getFee,
  getCashBalance,
  getUpcomingEvents,
  isInvoiceOverdue,
  commercialData,
  today = new Date(),
}) {
  const tasks = []
  const currentBalance = Number(getCashBalance?.() || 0)
  const openInvoices = invoices.filter((invoice) => invoice.status === 'offen' && !invoice.is_test)
  const overdueInvoices = openInvoices.filter((invoice) => isInvoiceOverdue?.(invoice))
  const pendingInvoices = openInvoices.filter((invoice) => !overdueInvoices.some((candidate) => candidate.id === invoice.id))
  const pendingInvoiceTotal = pendingInvoices.reduce((sum, invoice) => sum + Number(invoice.total_amount || 0), 0)
  const overdueInvoiceTotal = overdueInvoices.reduce((sum, invoice) => sum + Number(invoice.total_amount || 0), 0)
  const openFeeMembers = members.filter((member) => {
    if (member.is_test) return false

    const fee = getFee?.(member.id)
    return fee && !fee.paid && Number(fee.amount || 0) > 0
  })
  const openFeesTotal = getOpenFeesTotal(fees, getMemberById)
  const upcomingEvents = getUpcomingEvents?.(14) || []
  const next30DayEvents = getUpcomingEvents?.(30) || []
  const laterEvents = next30DayEvents.filter((event) => !upcomingEvents.some((candidate) => candidate.id === event.id))
  const activeContracts = sponsorContracts.filter((contract) => contract.status === 'active')
  const criticalContracts = activeContracts
    .filter((contract) => {
      const daysUntil = getDaysUntil(contract.ends_on, today)
      return daysUntil !== null && daysUntil >= 0 && daysUntil <= 7
    })
    .sort((a, b) => new Date(a.ends_on) - new Date(b.ends_on))
  const expiringContracts = (commercialData?.expiringContracts || [])
    .filter((contract) => !criticalContracts.some((candidate) => candidate.id === contract.id))
  const activeMerchVariants = merchVariants.filter((variant) => {
    const item = merchItems.find((candidate) => candidate.id === variant.merch_item_id)
    return variant.status === 'active' && item?.status === 'active'
  })
  const emptyStockVariants = activeMerchVariants.filter((variant) => Number(variant.stock_quantity || 0) <= 0)
  const lowStockVariants = (commercialData?.lowStockVariants || [])
    .filter((variant) => !emptyStockVariants.some((candidate) => candidate.id === variant.id))
  const draftMediaItems = mediaItems.filter((item) => item.status === 'draft')
  const scheduledMediaItems = mediaItems.filter((item) => {
    if (item.status !== 'published' || !item.published_at) return false
    return new Date(item.published_at) > today
  })

  if (currentBalance < 0) {
    tasks.push(createCockpitTask({
      id: 'cash-negative-balance',
      priority: 'critical',
      area: 'cash',
      title: 'Kassastand negativ',
      message: `Der aktuelle Kassastand liegt bei ${currentBalance.toFixed(2)} EUR.`,
      amount: currentBalance,
      targetPage: 'cash',
    }))
  } else if (currentBalance < 200) {
    tasks.push(createCockpitTask({
      id: 'cash-low-balance',
      priority: 'important',
      area: 'cash',
      title: 'Kassastand niedrig',
      message: `Der aktuelle Kassastand liegt bei ${currentBalance.toFixed(2)} EUR.`,
      amount: currentBalance,
      targetPage: 'cash',
    }))
  }

  if (overdueInvoices.length > 0) {
    tasks.push(createCockpitTask({
      id: 'invoices-overdue',
      priority: 'critical',
      area: 'invoices',
      title: 'Rechnungen ueberfaellig',
      message: `${overdueInvoices.length} offene Rechnung(en) sind ueberfaellig. Summe: ${overdueInvoiceTotal.toFixed(2)} EUR.`,
      count: overdueInvoices.length,
      amount: overdueInvoiceTotal,
      dueDate: overdueInvoices[0]?.due_date || null,
      targetPage: 'invoices',
      items: overdueInvoices,
    }))
  }

  if (pendingInvoices.length > 0) {
    tasks.push(createCockpitTask({
      id: 'invoices-open',
      priority: 'important',
      area: 'invoices',
      title: 'Offene Rechnungen',
      message: `${pendingInvoices.length} Rechnung(en) sind offen. Summe: ${pendingInvoiceTotal.toFixed(2)} EUR.`,
      count: pendingInvoices.length,
      amount: pendingInvoiceTotal,
      targetPage: 'invoices',
      items: pendingInvoices,
    }))
  }

  if (openFeeMembers.length > 0) {
    tasks.push(createCockpitTask({
      id: 'fees-open',
      priority: 'important',
      area: 'fees',
      title: 'Offene Mitgliedsbeitraege',
      message: `${openFeeMembers.length} Mitglied(er) haben offene Beitraege. Summe: ${openFeesTotal.toFixed(2)} EUR.`,
      count: openFeeMembers.length,
      amount: openFeesTotal,
      targetPage: 'members',
      items: openFeeMembers,
    }))
  }

  if (emptyStockVariants.length > 0) {
    tasks.push(createCockpitTask({
      id: 'merch-empty-stock',
      priority: 'critical',
      area: 'merch',
      title: 'Fanartikel ausverkauft',
      message: `${emptyStockVariants.length} aktive Variante(n) haben keinen Bestand mehr.`,
      count: emptyStockVariants.length,
      targetPage: 'merch',
      items: emptyStockVariants,
    }))
  }

  if (lowStockVariants.length > 0) {
    tasks.push(createCockpitTask({
      id: 'merch-low-stock',
      priority: 'important',
      area: 'merch',
      title: 'Fanartikelbestand niedrig',
      message: `${lowStockVariants.length} aktive Variante(n) liegen am oder unter dem Mindestbestand.`,
      count: lowStockVariants.length,
      targetPage: 'merch',
      items: lowStockVariants,
    }))
  }

  if (criticalContracts.length > 0) {
    tasks.push(createCockpitTask({
      id: 'sponsors-contracts-critical',
      priority: 'critical',
      area: 'sponsors',
      title: 'Sponsorvertraege laufen bald aus',
      message: `${criticalContracts.length} aktive Vertrag(e) laufen innerhalb von 7 Tagen aus.`,
      count: criticalContracts.length,
      dueDate: criticalContracts[0]?.ends_on || null,
      targetPage: 'sponsors',
      items: criticalContracts,
    }))
  }

  if (expiringContracts.length > 0) {
    tasks.push(createCockpitTask({
      id: 'sponsors-contracts-expiring',
      priority: 'important',
      area: 'sponsors',
      title: 'Sponsorvertraege pruefen',
      message: `${expiringContracts.length} aktive Vertrag(e) laufen innerhalb von 30 Tagen aus.`,
      count: expiringContracts.length,
      dueDate: expiringContracts[0]?.ends_on || null,
      targetPage: 'sponsors',
      items: expiringContracts,
    }))
  }

  if (upcomingEvents.length > 0) {
    tasks.push(createCockpitTask({
      id: 'events-upcoming',
      priority: 'important',
      area: 'events',
      title: 'Bevorstehende Events',
      message: `${upcomingEvents.length} Event(s) in den naechsten 14 Tagen.`,
      count: upcomingEvents.length,
      dueDate: upcomingEvents[0]?.event_date || null,
      targetPage: 'events',
      items: upcomingEvents,
    }))
  }

  if (laterEvents.length > 0) {
    tasks.push(createCockpitTask({
      id: 'events-next-30-days',
      priority: 'info',
      area: 'events',
      title: 'Events im Blick behalten',
      message: `${laterEvents.length} weitere Event(s) stehen in den naechsten 30 Tagen an.`,
      count: laterEvents.length,
      dueDate: laterEvents[0]?.event_date || null,
      targetPage: 'events',
      items: laterEvents,
    }))
  }

  if (draftMediaItems.length > 0) {
    tasks.push(createCockpitTask({
      id: 'media-drafts',
      priority: 'important',
      area: 'media',
      title: 'Medien- und Presse-Entwuerfe',
      message: `${draftMediaItems.length} Beitrag/Beitraege sind noch Entwurf.`,
      count: draftMediaItems.length,
      targetPage: 'media',
      items: draftMediaItems,
    }))
  }

  if (scheduledMediaItems.length > 0) {
    tasks.push(createCockpitTask({
      id: 'media-scheduled',
      priority: 'info',
      area: 'media',
      title: 'Geplante Medienbeitraege',
      message: `${scheduledMediaItems.length} veroeffentlichte Beitrag/Beitraege sind fuer spaeter terminiert.`,
      count: scheduledMediaItems.length,
      dueDate: scheduledMediaItems[0]?.published_at || null,
      targetPage: 'media',
      items: scheduledMediaItems,
    }))
  }

  const publicEventIssues = events
    .filter((event) => event.is_public)
    .map((event) => ({
      entity: event,
      issue: getPublicIssueLabel(event, [
        ['public_title', 'Titel'],
        ['public_description', 'Beschreibung'],
      ]),
    }))
    .filter((item) => item.issue)

  const publicMerchIssues = merchItems
    .filter((item) => item.is_public && item.status === 'active')
    .map((item) => ({
      entity: item,
      issue: getPublicIssueLabel(item, [
        ['public_title', 'Titel'],
        ['public_description', 'Beschreibung'],
        ['public_image_alt', 'Bild-Alt-Text'],
      ]),
    }))
    .filter((item) => item.issue)

  const publicSponsorIssues = sponsors
    .filter((sponsor) => sponsor.is_public && sponsor.status === 'active')
    .map((sponsor) => ({
      entity: sponsor,
      issue: getPublicIssueLabel(sponsor, [
        ['public_description', 'Beschreibung'],
      ]),
    }))
    .filter((item) => item.issue)

  const publicMediaIssues = mediaItems
    .filter((item) => item.is_public && item.status === 'published')
    .map((item) => ({
      entity: item,
      issue: getPublicIssueLabel(item, [
        ['title', 'Titel'],
        ['summary', 'Kurzbeschreibung'],
        ['content', 'Inhalt'],
        ['image_alt', 'Bild-Alt-Text'],
      ]),
    }))
    .filter((item) => item.issue)

  const hiddenPublicMerchVariants = merchItems
    .filter((item) => item.is_public && item.status === 'active')
    .filter((item) => !merchVariants.some((variant) => (
      variant.merch_item_id === item.id
      && variant.is_public
      && ['active', 'sold_out'].includes(variant.status)
    )))

  if (publicEventIssues.length > 0) {
    tasks.push(createCockpitTask({
      id: 'public-events-missing-fields',
      priority: 'critical',
      area: 'public',
      title: 'Oeffentliche Events unvollstaendig',
      message: `${publicEventIssues.length} oeffentliche Event(s) brauchen Pflicht- oder Anzeigefelder.`,
      count: publicEventIssues.length,
      targetPage: 'events',
      items: publicEventIssues.map((item) => ({ type: 'event', ...item })),
    }))
  }

  if (publicMerchIssues.length > 0 || hiddenPublicMerchVariants.length > 0) {
    tasks.push(createCockpitTask({
      id: 'public-merch-missing-fields',
      priority: 'critical',
      area: 'public',
      title: 'Oeffentliche Fanartikel unvollstaendig',
      message: `${publicMerchIssues.length + hiddenPublicMerchVariants.length} oeffentliche Fanartikel-Eintrag/Eintraege brauchen Pflichtfelder oder Varianten.`,
      count: publicMerchIssues.length + hiddenPublicMerchVariants.length,
      targetPage: 'merch',
      items: [
        ...publicMerchIssues.map((item) => ({ type: 'merch', ...item })),
        ...hiddenPublicMerchVariants.map((entity) => ({ type: 'merch_variant', entity, issue: 'Keine oeffentliche Variante' })),
      ],
    }))
  }

  if (publicSponsorIssues.length > 0) {
    tasks.push(createCockpitTask({
      id: 'public-sponsors-missing-fields',
      priority: 'critical',
      area: 'public',
      title: 'Oeffentliche Sponsoren unvollstaendig',
      message: `${publicSponsorIssues.length} oeffentliche Sponsor(en) brauchen Pflicht- oder Anzeigefelder.`,
      count: publicSponsorIssues.length,
      targetPage: 'sponsors',
      items: publicSponsorIssues.map((item) => ({ type: 'sponsor', ...item })),
    }))
  }

  if (publicMediaIssues.length > 0) {
    tasks.push(createCockpitTask({
      id: 'public-media-missing-fields',
      priority: 'critical',
      area: 'public',
      title: 'Oeffentliche Medienbeitraege unvollstaendig',
      message: `${publicMediaIssues.length} oeffentliche Medienbeitrag/Medienbeitraege brauchen Pflicht- oder Anzeigefelder.`,
      count: publicMediaIssues.length,
      targetPage: 'media',
      items: publicMediaIssues.map((item) => ({ type: 'media', ...item })),
    }))
  }

  const priorityOrder = { critical: 0, important: 1, info: 2 }
  const areaOrder = {
    cash: 0,
    invoices: 1,
    fees: 2,
    merch: 3,
    sponsors: 4,
    events: 5,
    media: 6,
    public: 7,
  }

  return tasks.sort((a, b) => {
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
    if (priorityDiff !== 0) return priorityDiff

    if (a.dueDate && b.dueDate) return new Date(a.dueDate) - new Date(b.dueDate)
    if (a.dueDate) return -1
    if (b.dueDate) return 1

    return areaOrder[a.area] - areaOrder[b.area]
  })
}

export function getAlertStyle(type, colors) {
  if (type === 'danger') {
    return {
      background: colors.dangerBg,
      borderColor: colors.red,
      color: colors.dangerText,
    }
  }

  if (type === 'warning') {
    return {
      background: '#fffbeb',
      borderColor: '#f59e0b',
      color: '#92400e',
    }
  }

  if (type === 'info') {
    return {
      background: colors.infoBg,
      borderColor: colors.blue,
      color: colors.infoText,
    }
  }

  return {
    background: colors.successBg,
    borderColor: colors.successText,
    color: colors.successText,
  }
}

export function getMonthlyData(cashEntriesForSelectedYear) {
  const months = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']

  return months.map((month, index) => {
    const monthNumber = index + 1

    const income = cashEntriesForSelectedYear
      .filter((entry) => {
        if (!entry.entry_date) return false
        const date = new Date(entry.entry_date)
        return date.getMonth() + 1 === monthNumber && entry.type === 'einnahme' && !entry.is_cancelled
      })
      .reduce((sum, entry) => sum + getCashAmountCents(entry), 0) / 100

    const expense = cashEntriesForSelectedYear
      .filter((entry) => {
        if (!entry.entry_date) return false
        const date = new Date(entry.entry_date)
        return date.getMonth() + 1 === monthNumber && entry.type === 'ausgabe' && !entry.is_cancelled
      })
      .reduce((sum, entry) => sum + getCashAmountCents(entry), 0) / 100

    return { month, income, expense }
  })
}

export function getDashboardMonthlyMax(monthlyData) {
  const values = monthlyData.flatMap((item) => [item.income, item.expense])
  return Math.max(...values, 1)
}

export function getDashboardBarHeight(value, monthlyMax) {
  return `${Math.max((value / monthlyMax) * 130, 4)}px`
}

export function getMemberTypeStats(members) {
  const types = [
    ['vollmitglied', 'Vollmitglieder'],
    ['foerdermitglied', 'Fördermitglieder'],
    ['ehrenmitglied', 'Ehrenmitglieder'],
    ['probejahr', 'Probejahr'],
  ]

  return types.map(([value, label]) => ({
    value,
    label,
    count: members.filter((member) => member.member_type === value).length,
  }))
}

export function getStatsMax(items) {
  return Math.max(...items.map((item) => item.count), 1)
}

export function getFeeStats(fees, getMemberById, colors) {
  const realFees = fees.filter((fee) => {
    const member = getMemberById(fee.member_id)
    return !member?.is_test
  })

  const paid = realFees.filter((fee) => fee.paid).length
  const open = realFees.filter((fee) => !fee.paid && Number(fee.amount || 0) > 0).length
  const free = realFees.filter((fee) => Number(fee.amount || 0) === 0).length

  return [
    { label: 'Bezahlt', count: paid, color: colors.blue },
    { label: 'Offen', count: open, color: colors.red },
    { label: 'Gratis', count: free, color: colors.black },
  ]
}

export function getFinanceDashboardData({
  cashEntriesForSelectedYear,
  fees,
  events,
  getMemberById,
  getEventIncomeTotal,
  getEventExpenseTotal,
  getEventBalance,
}) {
  const entries = cashEntriesForSelectedYear.filter((entry) => isValidCashEntry(entry))
  const incomeEntries = entries.filter((entry) => entry.type === 'einnahme' && !entry.is_opening)
  const expenseEntries = entries.filter((entry) => entry.type === 'ausgabe' && !entry.is_opening)

  const incomeTotal = incomeEntries.reduce((sum, entry) => sum + getCashAmountCents(entry), 0) / 100
  const expenseTotal = expenseEntries.reduce((sum, entry) => sum + getCashAmountCents(entry), 0) / 100
  const balance = incomeTotal - expenseTotal

  const openFees = fees.filter((fee) => {
    const member = getMemberById(fee.member_id)
    return !member?.is_test && !fee.paid && Number(fee.amount || 0) > 0
  })
  const openFeesTotal = openFees.reduce((sum, fee) => sum + Number(fee.amount || 0), 0)

  const eventSummaries = events
    .map((event) => ({
      id: event.id,
      name: event.name,
      date: event.event_date,
      income: getEventIncomeTotal(event.id),
      expense: getEventExpenseTotal(event.id),
      balance: getEventBalance(event.id),
    }))
    .filter((event) => event.income > 0 || event.expense > 0)
    .sort((a, b) => b.balance - a.balance)

  return {
    incomeTotal,
    expenseTotal,
    balance,
    openFeesCount: openFees.length,
    openFeesTotal,
    eventSummaries,
  }
}

export function getFinanceHealthStatus(data, colors) {
  if (data.balance < 0) return { label: 'Achtung: negatives Ergebnis', color: colors.red }
  if (data.openFeesTotal > 0) return { label: 'Offene Beiträge vorhanden', color: '#92400e' }
  return { label: 'Finanzen wirken stabil', color: colors.successText }
}
