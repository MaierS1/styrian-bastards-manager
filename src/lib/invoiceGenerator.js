import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import QRCode from 'qrcode'

async function imageToBase64(url) {
  const response = await fetch(url)
  const blob = await response.blob()

  return await new Promise((resolve) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result)
    reader.readAsDataURL(blob)
  })
}

function formatEuro(value) {
  return `${Number(value || 0).toFixed(2)} €`
}

function getInvoiceDate(invoice) {
  return invoice.issue_date || invoice.invoice_date || '-'
}

function getInvoiceStatus(invoice) {
  if (invoice.status === 'bezahlt') return 'Bezahlt'
  if (invoice.status === 'storniert') return 'Storniert'
  if (invoice.status === 'offen') return 'Offen'
  return invoice.status || 'Offen'
}

function getCustomerLines(invoice, member) {
  if (member) {
    return [
      `${member.first_name || ''} ${member.last_name || ''}`.trim(),
      member.street || '',
      `${member.postal_code || ''} ${member.city || ''}`.trim(),
    ].filter((line) => line && line.trim())
  }

  return [
    invoice.customer_name || '',
    invoice.customer_address || '',
    invoice.customer_email ? `E-Mail: ${invoice.customer_email}` : '',
  ].filter((line) => line && String(line).trim())
}

export async function generateInvoicePdf({
  invoice,
  member = null,
  items = [],
  isTest = false,
  isCancelled = false,
}) {
  const doc = new jsPDF('p', 'mm', 'a4')
  const pageWidth = doc.internal.pageSize.getWidth()

  let logo = null

  try {
    logo = await imageToBase64('/styrian-bastards-logo.png')
  } catch {
    logo = null
  }

  const normalizedItems = items.map((item) => ({
    description: item.description || '',
    quantity: Number(item.quantity || 0),
    unit_price: Number(item.unit_price || 0),
    total:
      item.total !== undefined
        ? Number(item.total || 0)
        : item.total_price !== undefined
          ? Number(item.total_price || 0)
          : Number(item.quantity || 0) * Number(item.unit_price || 0),
  }))

  const total = normalizedItems.reduce((sum, item) => sum + Number(item.total || 0), 0)
  const invoiceNumber = invoice.invoice_number || 'SB'
  const qrText = `${window.location.origin}${window.location.pathname}?invoice=${encodeURIComponent(invoiceNumber)}`
  const qrCode = await QRCode.toDataURL(qrText)

  doc.setFillColor(255, 255, 255)
  doc.rect(0, 0, 210, 297, 'F')

  if (logo) {
    doc.addImage(logo, 'PNG', 15, 10, 34, 34)
  } else {
    doc.setFillColor(0, 0, 0)
    doc.roundedRect(15, 10, 34, 34, 2, 2, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(8)
    doc.text('STYRIAN', 32, 25, { align: 'center' })
    doc.text('BASTARDS', 32, 31, { align: 'center' })
  }

  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(17)
  doc.text('Styrian Bastards Eishockey-Fanclub', 55, 17)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)

  const clubData = [
    'Marburger Straße 12/2/13',
    '8042 Graz',
    'E-Mail: mailatbastards@gmail.com',
    'ZVR: noch nicht bekannt',
  ]

  let y = 25

  clubData.forEach((line) => {
    doc.text(line, 55, y)
    y += 5
  })

  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.4)
  doc.line(15, 50, 195, 50)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(24)
  doc.text('RECHNUNG', 15, 64)

  if (isTest || invoice.is_test) {
    doc.setTextColor(193, 18, 31)
    doc.setFontSize(31)
    doc.setFont('helvetica', 'bold')
    doc.text('TESTRECHNUNG', 48, 150, { angle: 35 })
  }

  if (isCancelled || invoice.status === 'storniert') {
    doc.setTextColor(160, 0, 0)
    doc.setFontSize(40)
    doc.setFont('helvetica', 'bold')
    doc.text('STORNIERT', 58, 168, { angle: 35 })
  }

  doc.setTextColor(0, 0, 0)

  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Rechnung an', 15, 80)

  doc.setFont('helvetica', 'normal')
  const customerLines = getCustomerLines(invoice, member)

  y = 87

  customerLines.forEach((line) => {
    doc.text(String(line), 15, y, { maxWidth: 85 })
    y += 5
  })

  const infoX = 125
  const valueX = 190

  doc.setFont('helvetica', 'bold')
  doc.text('Rechnungsnummer:', infoX, 80)
  doc.text('Rechnungsdatum:', infoX, 87)
  doc.text('Fällig bis:', infoX, 94)
  doc.text('Status:', infoX, 101)

  doc.setFont('helvetica', 'normal')
  doc.text(invoiceNumber, valueX, 80, { align: 'right' })
  doc.text(getInvoiceDate(invoice), valueX, 87, { align: 'right' })
  doc.text(invoice.due_date || '-', valueX, 94, { align: 'right' })
  doc.text(getInvoiceStatus(invoice), valueX, 101, { align: 'right' })

  if (invoice.membership_fee_id) {
    doc.setFont('helvetica', 'bold')
    doc.text('Art:', infoX, 108)
    doc.setFont('helvetica', 'normal')
    doc.text('Mitgliedsbeitrag', valueX, 108, { align: 'right' })
  }

  autoTable(doc, {
    startY: 118,
    head: [['Beschreibung', 'Menge', 'Einzelpreis', 'Gesamt']],
    body: normalizedItems.map((item) => [
      item.description,
      String(item.quantity),
      formatEuro(item.unit_price),
      formatEuro(item.total),
    ]),
    theme: 'grid',
    headStyles: {
      fillColor: [0, 0, 0],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 10,
      cellPadding: 4,
    },
    columnStyles: {
      0: { cellWidth: 88 },
      1: { halign: 'right', cellWidth: 24 },
      2: { halign: 'right', cellWidth: 32 },
      3: { halign: 'right', cellWidth: 32 },
    },
  })

  const tableEndY = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : 165

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text(`Gesamtsumme: ${formatEuro(total)}`, 190, tableEndY, { align: 'right' })

  doc.setFontSize(11)
  doc.text('Zahlungsinformationen', 15, tableEndY + 20)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)

  const paymentLines = [
    'Bitte den Rechnungsbetrag unter Angabe der Rechnungsnummer überweisen.',
    '',
    'Empfänger: Styrian Bastards Eishockey-Fanclub',
    'IBAN: wird noch eingefügt',
    `Verwendungszweck: ${invoiceNumber}`,
  ]

  y = tableEndY + 28

  paymentLines.forEach((line) => {
    doc.text(line, 15, y)
    y += 5
  })

  doc.addImage(qrCode, 'PNG', 153, tableEndY + 18, 32, 32)
  doc.setFontSize(7)
  doc.text('Rechnung / Verwendungszweck', 169, tableEndY + 54, { align: 'center' })

  doc.setFont('helvetica', 'italic')
  doc.setFontSize(9)

  const taxLines = [
    'Gemäß § 6 Abs. 1 Z 27 UStG umsatzsteuerbefreit (Kleinunternehmerregelung).',
    'Es wird keine Umsatzsteuer ausgewiesen.',
  ]

  y += 8

  taxLines.forEach((line) => {
    doc.text(line, 15, y, { maxWidth: 170 })
    y += 4
  })

  if (invoice.cancellation_reason) {
    y += 6
    doc.setTextColor(160, 0, 0)
    doc.setFont('helvetica', 'bold')
    doc.text(`Storno-Grund: ${invoice.cancellation_reason}`, 15, y, { maxWidth: 170 })
    doc.setTextColor(0, 0, 0)
  }

  if (invoice.notes) {
    y += 7
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text(`Notiz: ${invoice.notes}`, 15, y, { maxWidth: 170 })
  }

  doc.setDrawColor(0, 0, 0)
  doc.line(15, 280, 195, 280)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(
    'Styrian Bastards Eishockey-Fanclub · Marburger Straße 12/2/13 · 8042 Graz',
    pageWidth / 2,
    285,
    { align: 'center' }
  )
  doc.text('mailatbastards@gmail.com · ZVR: noch nicht bekannt', pageWidth / 2, 289, {
    align: 'center',
  })

  doc.save(`Rechnung_${invoiceNumber}.pdf`)
}
