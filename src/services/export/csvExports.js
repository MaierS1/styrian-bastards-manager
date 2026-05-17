export function downloadTextFile(filename, content, mimeType = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function csvEscape(value) {
  const text = String(value ?? '')
  return `"${text.replace(/"/g, '""')}"`
}

export function rowsToCsv(headers, rows) {
  const headerLine = headers.map(csvEscape).join(';')
  const bodyLines = rows.map((row) => headers.map((header) => csvEscape(row[header])).join(';'))

  return [headerLine, ...bodyLines].join('\n')
}

export function exportMembersCsv({
  members,
  getFee,
  getRoleLabel,
  getAppRoleLabel,
  downloadTextFile: downloadTextFileFn = downloadTextFile,
  rowsToCsv: rowsToCsvFn = rowsToCsv,
}) {
  const rows = members.map((member) => {
    const fee = getFee(member.id)

    return {
      Mitgliedsnummer: member.member_number || '',
      Vorname: member.first_name || '',
      Nachname: member.last_name || '',
      Email: member.email || '',
      Telefon: member.phone || '',
      Mitgliedsart: member.member_type || '',
      Vereinsfunktion: getRoleLabel(member.role || 'mitglied'),
      AppRecht: getAppRoleLabel(member.app_role || 'readonly'),
      Status: member.status || '',
      Strasse: member.street || '',
      PLZ: member.postal_code || '',
      Ort: member.city || '',
      Geburtsdatum: member.birthdate || '',
      Kleidergroesse: member.clothing_size || '',
      Beitrag2026: fee ? Number(fee.amount || 0).toFixed(2) : '',
      BeitragBezahlt: fee ? (fee.paid ? 'ja' : 'nein') : '',
      Zahlungsdatum: fee?.paid_at || '',
      Zahlungsart: fee?.payment_method || '',
    }
  })

  const headers = [
    'Mitgliedsnummer',
    'Vorname',
    'Nachname',
    'Email',
    'Telefon',
    'Mitgliedsart',
    'Vereinsfunktion',
    'AppRecht',
    'Status',
    'Strasse',
    'PLZ',
    'Ort',
    'Geburtsdatum',
    'Kleidergroesse',
    'Beitrag2026',
    'BeitragBezahlt',
    'Zahlungsdatum',
    'Zahlungsart',
  ]

  downloadTextFileFn('styrian-bastards-mitglieder.csv', rowsToCsvFn(headers, rows), 'text/csv;charset=utf-8')
}

export function exportCashCsv({
  filteredCashEntries,
  selectedCashYear,
  getEntryYear,
  getPaymentMethodLabel,
  getPaymentMethod,
  getEventNameById,
  getInvoiceById,
  downloadTextFile: downloadTextFileFn = downloadTextFile,
  rowsToCsv: rowsToCsvFn = rowsToCsv,
}) {
  const rows = filteredCashEntries.map((entry) => ({
    Belegnummer: entry.receipt_number || '',
    Datum: entry.entry_date || '',
    Jahr: getEntryYear(entry),
    Typ: entry.type || '',
    Zahlungsart: getPaymentMethodLabel(getPaymentMethod(entry)),
    Kategorie: entry.is_opening ? 'Übertrag' : entry.category || '',
    Event: getEventNameById(entry.event_id) || '',
    Rechnung: entry.invoice_id ? getInvoiceById(entry.invoice_id)?.invoice_number || entry.invoice_id : '',
    Betrag: Number(entry.amount || 0).toFixed(2),
    Beschreibung: entry.description || '',
    Beleg: entry.receipt_url || '',
    Uebertrag: entry.is_opening ? 'ja' : 'nein',
    Storniert: entry.is_cancelled ? 'ja' : 'nein',
    StornoGrund: entry.cancellation_reason || '',
  }))

  const headers = [
    'Belegnummer',
    'Datum',
    'Jahr',
    'Typ',
    'Zahlungsart',
    'Kategorie',
    'Event',
    'Rechnung',
    'Betrag',
    'Beschreibung',
    'Beleg',
    'Uebertrag',
    'Storniert',
    'StornoGrund',
  ]

  downloadTextFileFn(`styrian-bastards-kassabuch-${selectedCashYear}.csv`, rowsToCsvFn(headers, rows), 'text/csv;charset=utf-8')
}

export function exportTaxAdvisorCsv({
  filteredCashEntries,
  selectedCashYear,
  getEntryYear,
  getPaymentMethodLabel,
  getPaymentMethod,
  getEventNameById,
  downloadTextFile: downloadTextFileFn = downloadTextFile,
  rowsToCsv: rowsToCsvFn = rowsToCsv,
}) {
  const rows = filteredCashEntries
    .filter((entry) => !entry.is_opening)
    .map((entry) => ({
      Datum: entry.entry_date || '',
      Jahr: getEntryYear(entry),
      Belegnummer: entry.receipt_number || '',
      Einnahme: entry.type === 'einnahme' ? Number(entry.amount || 0).toFixed(2) : '',
      Ausgabe: entry.type === 'ausgabe' ? Number(entry.amount || 0).toFixed(2) : '',
      Zahlungsart: getPaymentMethodLabel(getPaymentMethod(entry)),
      Kategorie: entry.category || '',
      Event: getEventNameById(entry.event_id) || '',
      Beschreibung: entry.description || '',
      Belegpfad: entry.receipt_url || '',
      Storniert: entry.is_cancelled ? 'ja' : 'nein',
      StornoGrund: entry.cancellation_reason || '',
    }))

  const headers = [
    'Datum',
    'Jahr',
    'Belegnummer',
    'Einnahme',
    'Ausgabe',
    'Zahlungsart',
    'Kategorie',
    'Event',
    'Beschreibung',
    'Belegpfad',
    'Storniert',
    'StornoGrund',
  ]

  downloadTextFileFn(
    `styrian-bastards-steuerberater-${selectedCashYear}.csv`,
    rowsToCsvFn(headers, rows),
    'text/csv;charset=utf-8'
  )
}

export function exportTaxAdvisorProCsv({
  filteredCashEntries,
  selectedCashYear,
  getEntryYear,
  getCashEntrySignedAmount,
  getPaymentMethodLabel,
  getPaymentMethod,
  getEventNameById,
  downloadTextFile: downloadTextFileFn = downloadTextFile,
  rowsToCsv: rowsToCsvFn = rowsToCsv,
}) {
  const rows = filteredCashEntries
    .filter((entry) => !entry.is_opening)
    .map((entry) => ({
      Belegnummer: entry.receipt_number || '',
      Datum: entry.entry_date || '',
      Jahr: getEntryYear(entry),
      Monat: String(entry.entry_date || '').slice(5, 7),
      Typ: entry.type || '',
      Einnahme: entry.type === 'einnahme' && !entry.is_cancelled ? Number(entry.amount || 0).toFixed(2) : '',
      Ausgabe: entry.type === 'ausgabe' && !entry.is_cancelled ? Number(entry.amount || 0).toFixed(2) : '',
      BetragNettoFuerAuswertung: entry.is_cancelled ? '0.00' : getCashEntrySignedAmount(entry).toFixed(2),
      Zahlungsart: getPaymentMethodLabel(getPaymentMethod(entry)),
      Kategorie: entry.category || '',
      Event: getEventNameById(entry.event_id) || '',
      Beschreibung: entry.description || '',
      BelegVorhanden: entry.receipt_url ? 'ja' : 'nein',
      Belegpfad: entry.receipt_url || '',
      Storniert: entry.is_cancelled ? 'ja' : 'nein',
      StorniertAm: entry.cancelled_at || '',
      StornoGrund: entry.cancellation_reason || '',
    }))

  const headers = [
    'Belegnummer',
    'Datum',
    'Jahr',
    'Monat',
    'Typ',
    'Einnahme',
    'Ausgabe',
    'BetragNettoFuerAuswertung',
    'Zahlungsart',
    'Kategorie',
    'Event',
    'Beschreibung',
    'BelegVorhanden',
    'Belegpfad',
    'Storniert',
    'StorniertAm',
    'StornoGrund',
  ]

  downloadTextFileFn(
    `styrian-bastards-steuerberater-pro-${selectedCashYear}.csv`,
    rowsToCsvFn(headers, rows),
    'text/csv;charset=utf-8'
  )
}

export function exportCategorySummaryCsv({
  categorySummary,
  selectedCashYear,
  downloadTextFile: downloadTextFileFn = downloadTextFile,
  rowsToCsv: rowsToCsvFn = rowsToCsv,
}) {
  const rows = categorySummary.map((item) => ({
    Kategorie: item.category,
    Einnahmen: item.income.toFixed(2),
    Ausgaben: item.expense.toFixed(2),
    Ergebnis: item.balance.toFixed(2),
    Buchungen: item.count,
  }))

  const headers = ['Kategorie', 'Einnahmen', 'Ausgaben', 'Ergebnis', 'Buchungen']

  downloadTextFileFn(
    `styrian-bastards-kategorien-${selectedCashYear}.csv`,
    rowsToCsvFn(headers, rows),
    'text/csv;charset=utf-8'
  )
}

export function exportExcelStyleCashbookCsv({
  summary,
  getCashMonthLabel,
  getPaymentMethod,
  getEventNameById,
  selectedCashYear,
  downloadTextFile: downloadTextFileFn = downloadTextFile,
  rowsToCsv: rowsToCsvFn = rowsToCsv,
}) {
  const rows = []

  summary.forEach((month) => {
    rows.push({
      Monat: getCashMonthLabel(month.monthKey),
      Nummer: '',
      Datum: '',
      Bezeichnung: '',
      Kuerzel: '',
      EinnahmeEBanking: '',
      AusgabeEBanking: '',
      EinnahmeBar: '',
      AusgabeBar: '',
      Anmerkung: '',
    })

    month.entries
      .sort((a, b) => String(a.entry_date || '').localeCompare(String(b.entry_date || '')))
      .forEach((entry) => {
        const paymentMethod = getPaymentMethod(entry)
        const amount = Number(entry.amount || 0).toFixed(2)

        rows.push({
          Monat: '',
          Nummer: entry.receipt_number || '',
          Datum: entry.entry_date || '',
          Bezeichnung: entry.description || '',
          Kuerzel: entry.is_opening ? 'Übertrag' : entry.category || '',
          EinnahmeEBanking: entry.type === 'einnahme' && paymentMethod === 'ebanking' ? amount : '',
          AusgabeEBanking: entry.type === 'ausgabe' && paymentMethod === 'ebanking' ? amount : '',
          EinnahmeBar: entry.type === 'einnahme' && paymentMethod === 'bar' ? amount : '',
          AusgabeBar: entry.type === 'ausgabe' && paymentMethod === 'bar' ? amount : '',
          Anmerkung: entry.is_cancelled ? `STORNIERT: ${entry.cancellation_reason || ''}` : getEventNameById(entry.event_id) || '',
        })
      })

    rows.push({
      Monat: 'Summen einzeln',
      Nummer: '',
      Datum: '',
      Bezeichnung: '',
      Kuerzel: '',
      EinnahmeEBanking: (month.openingBankIncome + month.incomeBank).toFixed(2),
      AusgabeEBanking: (month.openingBankExpense + month.expenseBank).toFixed(2),
      EinnahmeBar: (month.openingCashIncome + month.incomeCash).toFixed(2),
      AusgabeBar: (month.openingCashExpense + month.expenseCash).toFixed(2),
      Anmerkung: '',
    })

    rows.push({
      Monat: 'Einnahmen gesamt',
      Nummer: month.totalIncomeWithOpening.toFixed(2),
      Datum: '',
      Bezeichnung: '',
      Kuerzel: '',
      EinnahmeEBanking: 'Summe E-Banking',
      AusgabeEBanking: '',
      EinnahmeBar: 'Summe Bar',
      AusgabeBar: '',
      Anmerkung: '',
    })

    rows.push({
      Monat: 'Ausgaben gesamt',
      Nummer: month.totalExpenseWithOpening.toFixed(2),
      Datum: '',
      Bezeichnung: '',
      Kuerzel: '',
      EinnahmeEBanking: month.openingBank.toFixed(2),
      AusgabeEBanking: '',
      EinnahmeBar: month.openingCash.toFixed(2),
      AusgabeBar: '',
      Anmerkung: '',
    })

    rows.push({
      Monat: 'Differenz',
      Nummer: month.differenceWithOpening.toFixed(2),
      Datum: '',
      Bezeichnung: '',
      Kuerzel: '',
      EinnahmeEBanking: '',
      AusgabeEBanking: '',
      EinnahmeBar: '',
      AusgabeBar: '',
      Anmerkung: '',
    })
  })

  const headers = [
    'Monat',
    'Nummer',
    'Datum',
    'Bezeichnung',
    'Kuerzel',
    'EinnahmeEBanking',
    'AusgabeEBanking',
    'EinnahmeBar',
    'AusgabeBar',
    'Anmerkung',
  ]

  downloadTextFileFn(
    `styrian-bastards-kassabuch-excel-style-${selectedCashYear}.csv`,
    rowsToCsvFn(headers, rows),
    'text/csv;charset=utf-8'
  )
}

export function exportEventsCsv({
  events,
  getEventIncomeTotal,
  getEventExpenseTotal,
  getEventBalance,
  downloadTextFile: downloadTextFileFn = downloadTextFile,
  rowsToCsv: rowsToCsvFn = rowsToCsv,
}) {
  const rows = events.map((event) => ({
    Name: event.name || '',
    Datum: event.event_date || '',
    Ort: event.location || '',
    Status: event.status || '',
    Notizen: event.notes || '',
    Einnahmen: getEventIncomeTotal(event.id).toFixed(2),
    Ausgaben: getEventExpenseTotal(event.id).toFixed(2),
    Ergebnis: getEventBalance(event.id).toFixed(2),
  }))

  const headers = ['Name', 'Datum', 'Ort', 'Status', 'Notizen', 'Einnahmen', 'Ausgaben', 'Ergebnis']

  downloadTextFileFn('styrian-bastards-events.csv', rowsToCsvFn(headers, rows), 'text/csv;charset=utf-8')
}

export function exportCheckinsCsv({
  eventCheckins,
  getMemberName,
  downloadTextFile: downloadTextFileFn = downloadTextFile,
  rowsToCsv: rowsToCsvFn = rowsToCsv,
}) {
  const rows = eventCheckins.map((checkin) => ({
    Event: checkin.event_name || '',
    Mitglied: getMemberName(checkin.member_id),
    Datum: checkin.checkin_date || '',
    Uhrzeit: checkin.checkin_time ? new Date(checkin.checkin_time).toLocaleTimeString('de-AT') : '',
  }))

  const headers = ['Event', 'Mitglied', 'Datum', 'Uhrzeit']

  downloadTextFileFn('styrian-bastards-checkins.csv', rowsToCsvFn(headers, rows), 'text/csv;charset=utf-8')
}

export function exportDocumentsCsv({
  documents,
  downloadTextFile: downloadTextFileFn = downloadTextFile,
  rowsToCsv: rowsToCsvFn = rowsToCsv,
}) {
  const rows = documents.map((document) => ({
    Titel: document.title || '',
    Kategorie: document.category || '',
    Datum: document.document_date || '',
    Beschreibung: document.description || '',
    Datei: document.file_name || document.file_path || '',
    Pfad: document.file_path || '',
    MimeType: document.mime_type || '',
  }))

  const headers = ['Titel', 'Kategorie', 'Datum', 'Beschreibung', 'Datei', 'Pfad', 'MimeType']

  downloadTextFileFn('styrian-bastards-dokumente.csv', rowsToCsvFn(headers, rows), 'text/csv;charset=utf-8')
}

export function exportFullBackupJson({
  selectedCashYear,
  members,
  fees,
  cashEntries,
  events,
  eventCheckins,
  documents,
  auditLogs,
  inventoryItems,
  invoices,
  invoiceItems,
  invoiceCustomers,
  downloadTextFile: downloadTextFileFn = downloadTextFile,
}) {
  const backup = {
    exported_at: new Date().toISOString(),
    selected_cash_year: selectedCashYear,
    members,
    membership_fees: fees,
    cash_entries: cashEntries,
    events,
    event_checkins: eventCheckins,
    documents,
    audit_logs: auditLogs,
    inventory_items: inventoryItems,
    invoices,
    invoice_items: invoiceItems,
    invoice_customers: invoiceCustomers,
  }

  downloadTextFileFn(
    `styrian-bastards-backup-${new Date().toISOString().slice(0, 10)}.json`,
    JSON.stringify(backup, null, 2),
    'application/json;charset=utf-8'
  )
}

export function exportAuditLogsCsv({
  auditLogs,
  downloadTextFile: downloadTextFileFn = downloadTextFile,
  rowsToCsv: rowsToCsvFn = rowsToCsv,
}) {
  const rows = auditLogs.map((log) => ({
    Datum: log.created_at || '',
    Benutzer: log.user_email || '',
    Aktion: log.action || '',
    Tabelle: log.table_name || '',
    Datensatz: log.record_id || '',
    Vorher: JSON.stringify(log.old_data || {}),
    Nachher: JSON.stringify(log.new_data || {}),
  }))

  const headers = ['Datum', 'Benutzer', 'Aktion', 'Tabelle', 'Datensatz', 'Vorher', 'Nachher']

  downloadTextFileFn('styrian-bastards-audit-log.csv', rowsToCsvFn(headers, rows), 'text/csv;charset=utf-8')
}

export function exportInventoryCsv({
  filteredInventoryItems,
  getInventoryQrValue,
  downloadTextFile: downloadTextFileFn = downloadTextFile,
  rowsToCsv: rowsToCsvFn = rowsToCsv,
}) {
  const rows = filteredInventoryItems.map((item) => ({
    InventarNr: item.inventory_number || '',
    Bezeichnung: item.name || '',
    Kategorie: item.category || '',
    Verantwortlich: item.responsible || '',
    Standort: item.location || '',
    Anschaffungsdatum: item.purchase_date || '',
    Zustand: item.condition || '',
    Status: item.status || '',
    LetztePruefung: item.last_check_date || '',
    Pruefstatus: item.check_status || '',
    QRURL: getInventoryQrValue(item),
    EtikettZeile1: item.label_line_1 || 'STYRIAN BASTARDS',
    EtikettZeile2: item.label_line_2 || 'VEREINSEIGENTUM',
    EtikettZeile3: item.label_line_3 || `Inv.-Nr.: ${item.inventory_number || ''}`,
    EtikettZeile4: item.label_line_4 || item.name || '',
    Notizen: item.notes || '',
  }))

  const headers = [
    'InventarNr',
    'Bezeichnung',
    'Kategorie',
    'Verantwortlich',
    'Standort',
    'Anschaffungsdatum',
    'Zustand',
    'Status',
    'LetztePruefung',
    'Pruefstatus',
    'QRURL',
    'EtikettZeile1',
    'EtikettZeile2',
    'EtikettZeile3',
    'EtikettZeile4',
    'Notizen',
  ]

  downloadTextFileFn('styrian-bastards-inventar.csv', rowsToCsvFn(headers, rows), 'text/csv;charset=utf-8')
}

export function exportInvoicesCsv({
  filteredInvoices,
  getInvoiceCustomerAddress,
  downloadTextFile: downloadTextFileFn = downloadTextFile,
  rowsToCsv: rowsToCsvFn = rowsToCsv,
}) {
  const rows = filteredInvoices.map((invoice) => ({
    Rechnungsnummer: invoice.invoice_number || '',
    Kunde: invoice.customer_name || '',
    Email: invoice.customer_email || '',
    KundenID: invoice.customer_id || '',
    Straße: invoice.customer_street || '',
    Hausnummer: invoice.customer_house_number || '',
    Zusatz: invoice.customer_address_addition || '',
    PLZ: invoice.customer_postal_code || '',
    Ort: invoice.customer_city || '',
    Land: invoice.customer_country || '',
    Adresse: getInvoiceCustomerAddress(invoice),
    Datum: invoice.issue_date || '',
    Faellig: invoice.due_date || '',
    Betrag: Number(invoice.total_amount || 0).toFixed(2),
    Testrechnung: invoice.is_test ? 'ja' : 'nein',
    Status: invoice.status || '',
    Typ: invoice.invoice_type || 'rechnung',
    ArchivPDF: invoice.pdf_url || '',
    EMailGesendet: invoice.emailed_at || '',
    LetzteMahnung: invoice.last_reminder_at || '',
    Mahnungen: Number(invoice.reminder_count || 0),
    BezahltAm: invoice.paid_at || '',
    StorniertAm: invoice.cancelled_at || '',
    StornoGrund: invoice.cancellation_reason || '',
    MitgliedID: invoice.member_id || '',
    MitgliedsbeitragID: invoice.membership_fee_id || '',
    Notizen: invoice.notes || '',
  }))

  const headers = [
    'Rechnungsnummer',
    'Kunde',
    'Email',
    'KundenID',
    'Straße',
    'Hausnummer',
    'Zusatz',
    'PLZ',
    'Ort',
    'Land',
    'Adresse',
    'Datum',
    'Faellig',
    'Betrag',
    'Testrechnung',
    'Status',
    'Typ',
    'ArchivPDF',
    'EMailGesendet',
    'LetzteMahnung',
    'Mahnungen',
    'BezahltAm',
    'StorniertAm',
    'StornoGrund',
    'MitgliedID',
    'MitgliedsbeitragID',
    'Notizen',
  ]

  downloadTextFileFn('styrian-bastards-rechnungen.csv', rowsToCsvFn(headers, rows), 'text/csv;charset=utf-8')
}
