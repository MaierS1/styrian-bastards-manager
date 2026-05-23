import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import QRCode from 'qrcode'
import { generateInvoicePdf } from '../../lib/invoiceGenerator'

export async function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = String(reader.result || '')
      resolve(result.split(',')[1] || '')
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export async function buildInvoicePdfBlob({ invoice, member, items, isTest, isCancelled }) {
  const result = await generateInvoicePdf({
    invoice,
    member,
    items,
    isTest,
    isCancelled,
    download: false,
    returnBlob: true,
  })

  return result
}

export async function exportInvoicePdf({ invoice, member, items, isTest, isCancelled }) {
  await generateInvoicePdf({
    invoice,
    member,
    items,
    isTest,
    isCancelled,
    download: true,
  })
}

export function exportMembersPdf({ filteredMembers, getRoleLabel }) {
  const doc = new jsPDF()

  doc.text('Styrian Bastards - Mitgliederliste', 14, 15)

  autoTable(doc, {
    startY: 25,
    head: [['Nr.', 'Name', 'Art', 'Funktion', 'Status', 'E-Mail', 'Telefon', 'Adresse', 'Geburtsdatum', 'Größe']],
    body: filteredMembers.map((m) => [
      m.member_number || '',
      `${m.first_name || ''} ${m.last_name || ''}`,
      m.member_type || '',
      getRoleLabel(m.role || 'mitglied'),
      m.status || '',
      m.email || '',
      m.phone || '',
      `${m.street || ''}, ${m.postal_code || ''} ${m.city || ''}`,
      m.birthdate || '',
      m.clothing_size || '',
    ]),
  })

  doc.save('styrian-bastards-mitgliederliste.pdf')
}

export function exportCashPdf({ filteredCash, getCashBalance, getIncomeTotal, getExpenseTotal, getPaymentMethodLabel, getPaymentMethod, getEventNameById, getInvoiceById }) {
  const doc = new jsPDF()

  doc.text('Styrian Bastards - Kassabuch', 14, 15)
  doc.text(`Kassastand: ${getCashBalance().toFixed(2)} EUR`, 14, 23)
  doc.text(`Einnahmen: ${getIncomeTotal().toFixed(2)} EUR`, 14, 31)
  doc.text(`Ausgaben: ${getExpenseTotal().toFixed(2)} EUR`, 14, 39)

  autoTable(doc, {
    startY: 48,
    head: [['Belegnr.', 'Datum', 'Typ', 'Zahlungsart', 'Event', 'Rechnung', 'Kategorie', 'Beschreibung', 'Betrag', 'Status']],
    body: filteredCash.map((e) => [
      e.receipt_number || '',
      e.entry_date || '',
      e.type || '',
      getPaymentMethodLabel(getPaymentMethod(e)),
      getEventNameById(e.event_id) || '-',
      e.invoice_id ? getInvoiceById(e.invoice_id)?.invoice_number || '-' : '-',
      e.category || '',
      e.description || '',
      `${Number(e.amount || 0).toFixed(2)} EUR`,
      e.is_cancelled ? `STORNIERT: ${e.cancellation_reason || ''}` : 'OK',
    ]),
  })

  doc.save('styrian-bastards-kassabuch.pdf')
}

export function exportDetailedCashbookPdf({ summary, getCashBalance, getCashMonthLabel }) {
  const doc = new jsPDF()

  doc.text('Styrian Bastards - Kassabuch Detailübersicht', 14, 15)
  doc.text(`Kassastand: ${getCashBalance().toFixed(2)} EUR`, 14, 23)

  autoTable(doc, {
    startY: 32,
    head: [[
      'Monat',
      'Übertrag Bank netto',
      'Übertrag Bar netto',
      'Einnahme Bank',
      'Ausgabe Bank',
      'Einnahme Bar',
      'Ausgabe Bar',
      'Einnahmen gesamt',
      'Ausgaben gesamt',
      'Differenz',
      'Saldo',
    ]],
    body: summary.map((month) => [
      getCashMonthLabel(month.monthKey),
      `${month.openingBank.toFixed(2)} EUR`,
      `${month.openingCash.toFixed(2)} EUR`,
      `${month.incomeBank.toFixed(2)} EUR`,
      `${month.expenseBank.toFixed(2)} EUR`,
      `${month.incomeCash.toFixed(2)} EUR`,
      `${month.expenseCash.toFixed(2)} EUR`,
      `${month.totalIncome.toFixed(2)} EUR`,
      `${month.totalExpense.toFixed(2)} EUR`,
      `${month.monthMovement.toFixed(2)} EUR`,
      `${month.runningBalance.toFixed(2)} EUR`,
    ]),
  })

  doc.save('styrian-bastards-kassabuch-detail.pdf')
}

export function exportOpenFeesPdf({ openFees, getOpenFeesTotal, members }) {
  const doc = new jsPDF()

  doc.text('Styrian Bastards - Offene Mitgliedsbeiträge', 14, 15)
  doc.text(`Offene Summe: ${getOpenFeesTotal().toFixed(2)} EUR`, 14, 23)

  autoTable(doc, {
    startY: 32,
    head: [['Name', 'Mitgliedsart', 'Betrag', 'Status']],
    body: openFees.map((fee) => {
      const member = members.find((m) => m.id === fee.member_id)

      return [
        member ? `${member.first_name || ''} ${member.last_name || ''}` : 'Unbekannt',
        member?.member_type || '',
        `${Number(fee.amount || 0).toFixed(2)} EUR`,
        'offen',
      ]
    }),
  })

  doc.save('styrian-bastards-offene-beitraege.pdf')
}

export function exportCheckinsPdf({ todayCheckins, activeEventName, getTodayDate, getMemberName }) {
  const doc = new jsPDF()

  doc.text('Styrian Bastards - Anwesenheitsliste', 14, 15)
  doc.text(`Event: ${activeEventName || '-'}`, 14, 23)
  doc.text(`Datum: ${getTodayDate()}`, 14, 31)
  doc.text(`Check-ins: ${todayCheckins.length}`, 14, 39)

  autoTable(doc, {
    startY: 48,
    head: [['Name', 'Event', 'Datum', 'Uhrzeit']],
    body: todayCheckins.map((checkin) => [
      getMemberName(checkin.member_id),
      checkin.event_name || '',
      checkin.checkin_date || '',
      checkin.checkin_time ? new Date(checkin.checkin_time).toLocaleTimeString('de-AT') : '',
    ]),
  })

  doc.save(`anwesenheitsliste-${activeEventName || 'event'}-${getTodayDate()}.pdf`)
}

export function exportEventFinancePdf({ event, eventCheckinsForReport, eventCashEntries, income, expenses, balance, getMemberName }) {
  const doc = new jsPDF()

  doc.text('Styrian Bastards - Event Finanzbericht', 14, 15)
  doc.text(`Event: ${event.name || '-'}`, 14, 23)
  doc.text(`Datum: ${event.event_date || '-'}`, 14, 31)
  doc.text(`Ort: ${event.location || '-'}`, 14, 39)

  doc.text(`Einnahmen: ${income.toFixed(2)} EUR`, 14, 51)
  doc.text(`Ausgaben: ${expenses.toFixed(2)} EUR`, 14, 59)
  doc.text(`Ergebnis: ${balance.toFixed(2)} EUR`, 14, 67)
  doc.text(`Teilnehmer/Check-ins: ${eventCheckinsForReport.length}`, 14, 75)

  autoTable(doc, {
    startY: 85,
    head: [['Datum', 'Typ', 'Kategorie', 'Beschreibung', 'Betrag']],
    body: eventCashEntries.map((entry) => [
      entry.entry_date || '',
      entry.type || '',
      entry.category || '',
      entry.description || '',
      `${Number(entry.amount || 0).toFixed(2)} EUR`,
    ]),
  })

  const afterCashTableY = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : 120

  autoTable(doc, {
    startY: afterCashTableY,
    head: [['Teilnehmer', 'Check-in Datum', 'Uhrzeit']],
    body: eventCheckinsForReport.map((checkin) => [
      getMemberName(checkin.member_id),
      checkin.checkin_date || '',
      checkin.checkin_time ? new Date(checkin.checkin_time).toLocaleTimeString('de-AT') : '',
    ]),
  })

  doc.save(`event-finanzbericht-${event.name || 'event'}.pdf`)
}

export function exportExcelStyleCashbookPdf({ summary, getCashBalance, getCashMonthLabel, selectedCashYear, getPaymentMethod, getEventNameById }) {
  const doc = new jsPDF('landscape')
  const summaryRows = []

  doc.text('Styrian Bastards - Kassabuch wie Excel', 14, 15)
  doc.text(`Jahr/Filter: ${selectedCashYear}`, 14, 23)
  doc.text(`Kassastand: ${getCashBalance().toFixed(2)} EUR`, 14, 31)

  summary.forEach((month) => {
    summaryRows.push([
      getCashMonthLabel(month.monthKey),
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      `${month.openingBank.toFixed(2)} EUR`,
      `${month.openingCash.toFixed(2)} EUR`,
      `${month.runningBalance.toFixed(2)} EUR`,
      '',
    ])

    month.entries
      .sort((a, b) => String(a.entry_date || '').localeCompare(String(b.entry_date || '')))
      .forEach((entry) => {
        const paymentMethod = getPaymentMethod(entry)
        const amount = Number(entry.amount || 0).toFixed(2)

        summaryRows.push([
          '',
          entry.receipt_number || '',
          entry.entry_date || '',
          entry.description || '',
          entry.is_opening ? 'Übertrag' : entry.category || '',
          !entry.is_opening && entry.type === 'einnahme' && paymentMethod === 'ebanking' ? `${amount} EUR` : '',
          !entry.is_opening && entry.type === 'ausgabe' && paymentMethod === 'ebanking' ? `${amount} EUR` : '',
          !entry.is_opening && entry.type === 'einnahme' && paymentMethod === 'bar' ? `${amount} EUR` : '',
          !entry.is_opening && entry.type === 'ausgabe' && paymentMethod === 'bar' ? `${amount} EUR` : '',
          entry.is_opening && paymentMethod === 'ebanking' ? `${month.openingBank.toFixed(2)} EUR` : '',
          entry.is_opening && paymentMethod === 'bar' ? `${month.openingCash.toFixed(2)} EUR` : '',
          '',
          entry.is_cancelled ? `STORNIERT: ${entry.cancellation_reason || ''}` : getEventNameById(entry.event_id) || '',
        ])
      })

    summaryRows.push([
      'Summen einzeln',
      '',
      '',
      '',
      '',
      `${month.incomeBank.toFixed(2)} EUR`,
      `${month.expenseBank.toFixed(2)} EUR`,
      `${month.incomeCash.toFixed(2)} EUR`,
      `${month.expenseCash.toFixed(2)} EUR`,
      `${month.openingBank.toFixed(2)} EUR`,
      `${month.openingCash.toFixed(2)} EUR`,
      `${month.runningBalance.toFixed(2)} EUR`,
      '',
    ])

    summaryRows.push([
      'Einnahmen gesamt',
      `${month.totalIncome.toFixed(2)} EUR`,
      '',
      '',
      '',
      'Summe E-Banking',
      '',
      'Summe Bar',
      '',
      '',
      '',
      '',
      '',
    ])

    summaryRows.push([
      'Ausgaben gesamt',
      `${month.totalExpense.toFixed(2)} EUR`,
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
    ])

    summaryRows.push([
      'Differenz',
      `${month.monthMovement.toFixed(2)} EUR`,
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      `${month.runningBalance.toFixed(2)} EUR`,
      '',
    ])
  })

  autoTable(doc, {
    startY: 40,
    head: [[
      'Monat',
      'Nummer',
      'Datum',
      'Bezeichnung',
      'Kuerzel',
      'Einnahme E-Banking',
      'Ausgabe E-Banking',
      'Einnahme Bar',
      'Ausgabe Bar',
      'Übertrag Bank netto',
      'Übertrag Bar netto',
      'Saldo',
      'Anmerkung',
    ]],
    body: summaryRows,
    styles: { fontSize: 6 },
    headStyles: { fillColor: [5, 5, 5] },
  })

  doc.save(`styrian-bastards-kassabuch-excel-style-${selectedCashYear}.pdf`)
}

export async function exportAllMemberCardsPdf({ filteredMembers, getMemberQrValue }) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const membersToPrint = filteredMembers
  const cardWidth = 85
  const cardHeight = 54
  const marginX = 15
  const marginY = 12
  const gapX = 10
  const gapY = 3
  const columns = 2
  const rowsPerPage = 5
  const cardsPerPage = columns * rowsPerPage

  for (let index = 0; index < membersToPrint.length; index += 1) {
    if (index > 0 && index % cardsPerPage === 0) {
      doc.addPage()
    }

    const member = membersToPrint[index]
    const indexOnPage = index % cardsPerPage
    const column = indexOnPage % columns
    const row = Math.floor(indexOnPage / columns)

    const x = marginX + column * (cardWidth + gapX)
    const y = marginY + row * (cardHeight + gapY)

    const qrDataUrl = await QRCode.toDataURL(getMemberQrValue(member), {
      width: 300,
      margin: 1,
    })

    doc.setFillColor(5, 5, 5)
    doc.roundedRect(x, y, cardWidth, cardHeight, 3, 3, 'F')
    doc.setFillColor(193, 18, 31)
    doc.rect(x, y, 4, cardHeight, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(13)
    doc.text('STYRIAN BASTARDS', x + 8, y + 9)
    doc.setFontSize(8)
    doc.text('Mitgliedsausweis', x + 8, y + 15)
    doc.setFontSize(12)
    doc.text(`${member.first_name || ''} ${member.last_name || ''}`, x + 8, y + 27, { maxWidth: 48 })
    doc.setFontSize(7)
    doc.text(`Art: ${member.member_type || '-'}`, x + 8, y + 35)
    doc.text(`Status: ${member.status || '-'}`, x + 8, y + 40)
    doc.text(`Nr.: ${member.member_number || member.id.slice(0, 8)}`, x + 8, y + 45)
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(x + 58, y + 15, 22, 22, 1.5, 1.5, 'F')
    doc.addImage(qrDataUrl, 'PNG', x + 59, y + 16, 20, 20)
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(6)
    doc.text('QR-Code zur Prüfung', x + 57, y + 43)
  }

  doc.save('styrian-bastards-mitgliedsausweise-visitenkarten.pdf')
}

export async function exportMemberCardPdf(member, getMemberQrValue) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [86, 54],
  })

  const qrDataUrl = await QRCode.toDataURL(getMemberQrValue(member), {
    width: 300,
    margin: 1,
  })

  doc.setFillColor(0, 0, 0)
  doc.rect(0, 0, 86, 54, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(14)
  doc.text('Styrian Bastards', 6, 9)
  doc.setFontSize(9)
  doc.text('Mitgliedsausweis', 6, 15)
  doc.setFontSize(12)
  doc.text(`${member.first_name || ''} ${member.last_name || ''}`, 6, 25)
  doc.setFontSize(8)
  doc.text(`Art: ${member.member_type || '-'}`, 6, 32)
  doc.text(`Status: ${member.status || '-'}`, 6, 37)
  doc.text(`Nr.: ${member.member_number || member.id.slice(0, 8)}`, 6, 42)
  doc.setFillColor(255, 255, 255)
  doc.rect(55, 12, 26, 26, 'F')
  doc.addImage(qrDataUrl, 'PNG', 56, 13, 24, 24)
  doc.setFontSize(6)
  doc.text('QR-Code zur Prüfung', 55, 44)
  doc.save(`mitgliedsausweis-${member.first_name || 'mitglied'}-${member.last_name || ''}.pdf`)
}

export function exportInventoryPdf({ filteredInventoryItems }) {
  const doc = new jsPDF('landscape')
  const items = filteredInventoryItems

  doc.text('Styrian Bastards - Inventarliste', 14, 15)

  autoTable(doc, {
    startY: 25,
    head: [['Inventar-Nr.', 'Bezeichnung', 'Kategorie', 'Verantwortlich', 'Standort', 'Zustand', 'Status', 'Prüfung']],
    body: items.map((item) => [
      item.inventory_number || '',
      item.name || '',
      item.category || '',
      item.responsible || '',
      item.location || '',
      item.condition || '',
      item.status || '',
      `${item.last_check_date || '-'} / ${item.check_status || '-'}`,
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [5, 5, 5] },
  })

  doc.save('styrian-bastards-inventar.pdf')
}

export async function exportInventoryLabelPdf(item, getInventoryQrValue) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [70, 36],
  })

  const qrDataUrl = await QRCode.toDataURL(getInventoryQrValue(item), {
    width: 220,
    margin: 1,
  })

  doc.setFillColor(255, 255, 255)
  doc.rect(0, 0, 70, 36, 'F')
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(8)
  doc.text(item.label_line_1 || 'STYRIAN BASTARDS', 4, 6)
  doc.setFontSize(7)
  doc.text(item.label_line_2 || 'VEREINSEIGENTUM', 4, 11)
  doc.text(item.label_line_3 || `Inv.-Nr.: ${item.inventory_number || ''}`, 4, 16)
  doc.text(item.label_line_4 || item.name || '', 4, 21, { maxWidth: 42 })
  doc.addImage(qrDataUrl, 'PNG', 48, 5, 17, 17)
  doc.setFontSize(6)
  doc.text(item.inventory_number || '', 50, 27)
  doc.save(`etikett-${item.inventory_number || 'inventar'}.pdf`)
}

export async function exportInventoryLabelsPdf({ filteredInventoryItems, getInventoryQrValue }) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const items = filteredInventoryItems

  // A4 Hochformat: 210 x 297 mm
  // 2 Spalten x 8 Reihen = 16 Etiketten pro Seite
  const pageWidth = 210
  const pageHeight = 297
  const marginX = 10
  const marginY = 10
  const gapX = 6
  const gapY = 4
  const columns = 2
  const rowsPerPage = 8
  const labelsPerPage = columns * rowsPerPage

  const labelWidth = (pageWidth - marginX * 2 - gapX) / 2
  const labelHeight = (pageHeight - marginY * 2 - gapY * (rowsPerPage - 1)) / rowsPerPage

  for (let index = 0; index < items.length; index += 1) {
    if (index > 0 && index % labelsPerPage === 0) {
      doc.addPage()
    }

    const item = items[index]
    const indexOnPage = index % labelsPerPage
    const column = indexOnPage % columns
    const row = Math.floor(indexOnPage / columns)

    const x = marginX + column * (labelWidth + gapX)
    const y = marginY + row * (labelHeight + gapY)

    const qrDataUrl = await QRCode.toDataURL(getInventoryQrValue(item), {
      width: 180,
      margin: 1,
    })

    doc.setFillColor(255, 255, 255)
    doc.roundedRect(x, y, labelWidth, labelHeight, 2, 2, 'F')
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(8)
    doc.text(item.label_line_1 || 'STYRIAN BASTARDS', x + 3, y + 6)
    doc.setFontSize(7)
    doc.text(item.label_line_2 || 'VEREINSEIGENTUM', x + 3, y + 10)
    doc.text(item.label_line_3 || `Inv.-Nr.: ${item.inventory_number || ''}`, x + 3, y + 14)
    doc.text(item.label_line_4 || item.name || '', x + 3, y + 18, { maxWidth: labelWidth - 28 })
    doc.addImage(qrDataUrl, 'PNG', x + labelWidth - 20, y + 4, 16, 16)
    doc.setFontSize(6)
    doc.text('Scannen für Inventar-Info', x + 3, y + labelHeight - 3)
  }

  doc.save('styrian-bastards-inventaretiketten.pdf')
}
