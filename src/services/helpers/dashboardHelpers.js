export function getCashBalanceForYear(year, cashEntries) {
  return cashEntries
    .filter((entry) => String(entry.entry_year || '') === String(year) && !entry.is_cancelled)
    .reduce((sum, entry) => {
      if (entry.is_opening) return sum
      return sum + (entry.type === 'ausgabe' ? -1 : 1) * Number(entry.amount || 0)
    }, 0)
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
  return cashEntries
    .filter((entry) => entry.type === 'einnahme' && !entry.is_opening && !entry.is_cancelled)
    .reduce((sum, entry) => sum + Number(entry.amount || 0), 0)
}

export function getExpenseTotal(cashEntries) {
  return cashEntries
    .filter((entry) => entry.type === 'ausgabe' && !entry.is_opening && !entry.is_cancelled)
    .reduce((sum, entry) => sum + Number(entry.amount || 0), 0)
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
      title: 'Sponsor-Vertraege laufen aus',
      message: `${commercialData.expiringContracts.length} aktive Sponsor-Vertrag/Vertraege laufen in den naechsten 30 Tagen aus. Naechster Vertrag: ${nextContract.title || 'Ohne Titel'} bis ${nextContract.ends_on}.`,
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
      .reduce((sum, entry) => sum + Number(entry.amount || 0), 0)

    const expense = cashEntriesForSelectedYear
      .filter((entry) => {
        if (!entry.entry_date) return false
        const date = new Date(entry.entry_date)
        return date.getMonth() + 1 === monthNumber && entry.type === 'ausgabe' && !entry.is_cancelled
      })
      .reduce((sum, entry) => sum + Number(entry.amount || 0), 0)

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
  const entries = cashEntriesForSelectedYear.filter((entry) => !entry.is_cancelled)
  const incomeEntries = entries.filter((entry) => entry.type === 'einnahme' && !entry.is_opening)
  const expenseEntries = entries.filter((entry) => entry.type === 'ausgabe' && !entry.is_opening)

  const incomeTotal = incomeEntries.reduce((sum, entry) => sum + Number(entry.amount || 0), 0)
  const expenseTotal = expenseEntries.reduce((sum, entry) => sum + Number(entry.amount || 0), 0)
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
