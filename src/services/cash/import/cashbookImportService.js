import { supabase } from '../../../lib/supabase'

function normalizeCsvKey(key) {
  return key
    .trim()
    .toLowerCase()
    .replace('ä', 'ae')
    .replace('ö', 'oe')
    .replace('ü', 'ue')
    .replace('ß', 'ss')
    .replace(/[^a-z0-9]/g, '')
}

function getCsvValue(row, keys) {
  const normalizedRow = {}

  Object.keys(row).forEach((key) => {
    normalizedRow[normalizeCsvKey(key)] = row[key]
  })

  for (const key of keys) {
    const normalizedKey = normalizeCsvKey(key)

    if (normalizedRow[normalizedKey] !== undefined) {
      return String(normalizedRow[normalizedKey] || '').trim()
    }
  }

  return ''
}

function parseCsvLine(line, separator) {
  const result = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    const nextChar = line[i + 1]

    if (char === '"' && nextChar === '"') {
      current += '"'
      i += 1
    } else if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === separator && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }

  result.push(current)
  return result
}

function parseEuroAmount(value) {
  const cleaned = String(value || '')
    .trim()
    .replace('€', '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.')

  const amount = Number(cleaned)

  if (!Number.isFinite(amount) || amount === 0) {
    return null
  }

  return Math.abs(amount)
}

function normalizeCashDate(value) {
  const text = String(value || '').trim()

  if (!text || text === '-') return ''

  const parts = text.split('.')

  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0')
    const month = parts[1].padStart(2, '0')
    const year = parts[2]

    return `${year}-${month}-${day}`
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text
  }

  return ''
}

function getCashCategoryFromText(value) {
  const text = String(value || '').toLowerCase()

  if (text.includes('mitglied') || text.includes('beitrag')) return 'mitgliedsbeitrag'
  if (text.includes('pfand')) return 'pfandbecher'
  if (text.includes('turnier') || text.includes('event') || text.includes('veranstaltung')) return 'veranstaltung'
  if (text.includes('shirt') || text.includes('fanartikel') || text.includes('merch')) return 'fanartikel'

  return 'sonstiges'
}

function normalizeCashType(value) {
  const text = String(value || '').toLowerCase()

  if (text.includes('aus')) return 'ausgabe'
  if (text.includes('ein')) return 'einnahme'

  return ''
}

function cashbookRowToEntries(row, cashEventId) {
  const rawDate = normalizeCashDate(getCsvValue(row, ['datum']))
  const description = getCsvValue(row, ['bezeichnung', 'beschreibung', 'description'])
  const date = rawDate || (description.toLowerCase().includes('übertrag') || description.toLowerCase().includes('uebertrag') ? row.__month_start : '')
  const note = getCsvValue(row, ['anmerkung', 'notiz', 'notes'])
  const number = getCsvValue(row, ['nummer', 'belegnummer'])
  const lowerDescription = description.toLowerCase()
  const isOpening = lowerDescription.includes('übertrag vorjahr') || lowerDescription.includes('uebertrag vorjahr')
  const isCarryForward = lowerDescription.includes('übertrag vormonat') || lowerDescription.includes('uebertrag vormonat')
  const importedEntries = []

  if (isCarryForward) return importedEntries
  if (!date || !description) return importedEntries

  const options = [
    {
      amount: parseEuroAmount(getCsvValue(row, ['einnahme e-banking', 'einnahme ebanking', 'einnahme bank'])),
      type: 'einnahme',
      payment: 'E-Banking',
      payment_method: 'ebanking',
    },
    {
      amount: parseEuroAmount(getCsvValue(row, ['ausgabe e-banking', 'ausgabe ebanking', 'ausgabe bank'])),
      type: 'ausgabe',
      payment: 'E-Banking',
      payment_method: 'ebanking',
    },
    {
      amount: parseEuroAmount(getCsvValue(row, ['einnahme bar'])),
      type: 'einnahme',
      payment: 'Bar',
      payment_method: 'bar',
    },
    {
      amount: parseEuroAmount(getCsvValue(row, ['ausgabe bar'])),
      type: 'ausgabe',
      payment: 'Bar',
      payment_method: 'bar',
    },
    {
      amount: parseEuroAmount(getCsvValue(row, ['betrag'])),
      type: normalizeCashType(getCsvValue(row, ['typ', 'type'])),
      payment: getCsvValue(row, ['zahlungsart', 'payment']) || '',
    },
  ]

  options.forEach((option) => {
    if (!option.amount || !option.type) return

    const fullDescription = [
      description,
      note ? `Anmerkung: ${note}` : '',
      number ? `Nr.: ${number}` : '',
      option.payment ? `Zahlungsart: ${option.payment}` : '',
    ]
      .filter(Boolean)
      .join(' | ')

    importedEntries.push({
      entry_date: date,
      type: option.type,
      category: getCashCategoryFromText(`${description} ${note}`),
      amount: option.amount,
      description: fullDescription,
      receipt_url: null,
      event_id: cashEventId || null,
      payment_method: option.payment_method || 'bar',
      entry_year: Number(String(date).slice(0, 4)),
      is_opening: isOpening,
    })
  })

  return importedEntries
}

export function parseCashbookTextWithMonths(rawText) {
  const cleaned = String(rawText || '').replace(/^\uFEFF/, '').trim()
  if (!cleaned) return []

  const lines = cleaned.split(/\r?\n/).filter((line) => line.trim())
  if (lines.length < 2) return []

  const separator = lines[0].includes(';') ? ';' : ','
  const headers = parseCsvLine(lines[0], separator).map((header) => header.trim())

  const monthNumbers = {
    'jänner': '01',
    jaenner: '01',
    januar: '01',
    februar: '02',
    'märz': '03',
    maerz: '03',
    april: '04',
    mai: '05',
    juni: '06',
    juli: '07',
    august: '08',
    september: '09',
    oktober: '10',
    november: '11',
    dezember: '12',
  }

  let currentMonthDate = ''

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line, separator)
    const row = {}

    headers.forEach((header, index) => {
      row[header] = values[index] || ''
    })

    const firstCell = String(values[0] || '').trim()
    const monthMatch = firstCell.match(/^([A-Za-zÄÖÜäöüß]+)\s+(\d{4})$/)

    if (monthMatch) {
      const monthName = monthMatch[1]
        .toLowerCase()
        .replace('ä', 'ae')
        .replace('ö', 'oe')
        .replace('ü', 'ue')
        .replace('ß', 'ss')

      const month = monthNumbers[monthName]
      const year = monthMatch[2]

      if (month) {
        currentMonthDate = `${year}-${month}-01`
      }
    }

    row.__month_start = currentMonthDate
    return row
  })
}

export function parseCashbookEntries(rawText, cashEventId) {
  return parseCashbookTextWithMonths(rawText).flatMap((row) => cashbookRowToEntries(row, cashEventId))
}

export async function importCashbookRowsService({
  canManageCash,
  cashbookRows,
  cashEntries,
  cashbookFileName,
  isCashMonthClosed,
  getEntryYear,
  createAuditLog,
  setCashbookRows,
  setCashbookFileName,
  loadCashEntries,
  alertFn = alert,
}) {
  if (!canManageCash()) return alertFn('Keine Berechtigung für Kassa.')

  if (cashbookRows.length === 0) {
    alertFn('Bitte zuerst eine Kassabuch-CSV auswählen.')
    return
  }

  const blockedRows = cashbookRows.filter((row) => {
    const year = Number(row.entry_year || String(row.entry_date || '').slice(0, 4))
    const month = Number(String(row.entry_date || '').slice(5, 7))
    return isCashMonthClosed(year, month)
  })

  if (blockedRows.length > 0) {
    alertFn('Import abgebrochen: Mindestens ein Eintrag liegt in einem bereits abgeschlossenen Monat.')
    return
  }

  const yearCounters = {}

  cashEntries.forEach((entry) => {
    const year = getEntryYear(entry)
    const receiptNumber = String(entry.receipt_number || '')
    const numberPart = Number(receiptNumber.replace(`${year}-`, ''))

    if (receiptNumber.startsWith(`${year}-`) && Number.isFinite(numberPart)) {
      yearCounters[year] = Math.max(yearCounters[year] || 0, numberPart)
    }
  })

  const rowsWithReceiptNumbers = [...cashbookRows]
    .sort((a, b) => String(a.entry_date || '').localeCompare(String(b.entry_date || '')))
    .map((row) => {
      const year = String(row.entry_year || String(row.entry_date || '').slice(0, 4) || new Date().getFullYear())
      yearCounters[year] = (yearCounters[year] || 0) + 1

      return {
        ...row,
        entry_year: Number(year),
        receipt_number: row.receipt_number || `${year}-${String(yearCounters[year]).padStart(3, '0')}`,
        is_cancelled: false,
      }
    })

  const { error } = await supabase
    .from('cash_entries')
    .insert(rowsWithReceiptNumbers)

  if (error) return alertFn(error.message)

  await createAuditLog('bulk_import', 'cash_entries', null, null, {
    count: rowsWithReceiptNumbers.length,
    file: cashbookFileName,
  })

  setCashbookRows([])
  setCashbookFileName('')
  await loadCashEntries()

  alertFn('Kassabuch wurde importiert.')
}
