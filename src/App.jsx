import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { QRCodeCanvas } from 'qrcode.react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import QRCode from 'qrcode'

const isMobile = window.innerWidth < 768

const pageStyle = {
  minHeight: '100vh',
  background: '#f3f4f6',
  color: '#111827',
}

const inputStyle = {
  display: 'block',
  width: '100%',
  maxWidth: 520,
  marginBottom: 12,
  padding: isMobile ? 15 : 12,
  fontSize: isMobile ? 17 : 16,
  lineHeight: 1.4,
  boxSizing: 'border-box',
  border: '1px solid #9ca3af',
  borderRadius: 8,
  background: '#ffffff',
  color: '#111827',
}

const buttonStyle = {
  padding: isMobile ? 15 : 12,
  fontSize: isMobile ? 17 : 15,
  fontWeight: 700,
  marginTop: 6,
  marginRight: isMobile ? 0 : 10,
  marginBottom: 8,
  width: isMobile ? '100%' : 'auto',
  cursor: 'pointer',
  border: '1px solid #111827',
  borderRadius: 8,
  background: '#111827',
  color: '#ffffff',
}

const secondaryButtonStyle = {
  ...buttonStyle,
  background: '#ffffff',
  color: '#111827',
}

const cardStyle = {
  border: '1px solid #d1d5db',
  padding: isMobile ? 16 : 16,
  marginBottom: 12,
  borderRadius: 12,
  background: '#ffffff',
  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  lineHeight: 1.6,
  fontSize: isMobile ? 16 : 15,
  color: '#111827',
}

const sectionStyle = {
  border: '1px solid #d1d5db',
  borderRadius: 14,
  padding: isMobile ? 16 : 24,
  marginBottom: 28,
  background: '#ffffff',
  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
}

const headingStyle = {
  color: '#111827',
  marginTop: 0,
  letterSpacing: '-0.02em',
}

const mutedTextStyle = {
  color: '#4b5563',
  lineHeight: 1.5,
}

export default function App() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [user, setUser] = useState(null)
  const [currentMember, setCurrentMember] = useState(null)

  const [members, setMembers] = useState([])
  const [fees, setFees] = useState([])
  const [cashEntries, setCashEntries] = useState([])
  const [eventCheckins, setEventCheckins] = useState([])
  const [events, setEvents] = useState([])
  const [documents, setDocuments] = useState([])

  const [selectedCashYear, setSelectedCashYear] = useState(String(new Date().getFullYear()))

  const [eventName, setEventName] = useState('Heimspiel')
  const [selectedEventId, setSelectedEventId] = useState('')
  const [newEventName, setNewEventName] = useState('')
  const [newEventDate, setNewEventDate] = useState(new Date().toISOString().slice(0, 10))
  const [newEventLocation, setNewEventLocation] = useState('')
  const [newEventNotes, setNewEventNotes] = useState('')

  const [offlineCashEntries, setOfflineCashEntries] = useState([])
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  const [editingId, setEditingId] = useState(null)
  const [showQR, setShowQR] = useState(null)
  const [scanning, setScanning] = useState(false)

  const [memberSearch, setMemberSearch] = useState('')
  const [memberStatusFilter, setMemberStatusFilter] = useState('alle')
  const [memberTypeFilter, setMemberTypeFilter] = useState('alle')
  const [roleFilter, setRoleFilter] = useState('alle')
  const [feeFilter, setFeeFilter] = useState('alle')

  const [cashSearch, setCashSearch] = useState('')
  const [cashTypeFilter, setCashTypeFilter] = useState('alle')
  const [cashCategoryFilter, setCashCategoryFilter] = useState('alle')

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [memberEmail, setMemberEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [memberType, setMemberType] = useState('vollmitglied')
  const [role, setRole] = useState('mitglied')
  const [appRole, setAppRole] = useState('readonly')
  const [street, setStreet] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [city, setCity] = useState('')
  const [birthdate, setBirthdate] = useState('')
  const [clothingSize, setClothingSize] = useState('')

  const [csvRows, setCsvRows] = useState([])
  const [csvImporting, setCsvImporting] = useState(false)
  const [csvFileName, setCsvFileName] = useState('')

  const [cashType, setCashType] = useState('einnahme')
  const [cashCategory, setCashCategory] = useState('sonstiges')
  const [cashPaymentMethod, setCashPaymentMethod] = useState('bar')
  const [cashEventId, setCashEventId] = useState('')
  const [cashAmount, setCashAmount] = useState('')
  const [cashDescription, setCashDescription] = useState('')
  const [receiptFile, setReceiptFile] = useState(null)
  const [editingCashId, setEditingCashId] = useState(null)

  const [cashbookRows, setCashbookRows] = useState([])
  const [cashbookFileName, setCashbookFileName] = useState('')
  const [cashbookImporting, setCashbookImporting] = useState(false)

  const [documentTitle, setDocumentTitle] = useState('')
  const [documentCategory, setDocumentCategory] = useState('sonstiges')
  const [documentDate, setDocumentDate] = useState('')
  const [documentDescription, setDocumentDescription] = useState('')
  const [documentFile, setDocumentFile] = useState(null)

  useEffect(() => {
    checkUser()

    const savedOffline = JSON.parse(localStorage.getItem('offlineCashEntries') || '[]')
    setOfflineCashEntries(savedOffline)

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    if (!scanning) return

    const scanner = new Html5QrcodeScanner('reader', {
      fps: 10,
      qrbox: 250,
    })

    scanner.render(
      (decodedText) => {
        const member = members.find((m) => m.member_number === decodedText || m.id === decodedText)

        if (member) {
          checkInMember(member)
          setScanning(false)
          scanner.clear().catch(() => {})
        } else {
          alert('Mitglied nicht gefunden.')
        }
      },
      () => {}
    )

    return () => {
      scanner.clear().catch(() => {})
    }
  }, [scanning, members])

  async function checkUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    setUser(user)

    if (user) {
      await loadCurrentMember(user.id)
      loadAll()
    }
  }

  async function loadCurrentMember(authUserId) {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('auth_user_id', authUserId)
      .maybeSingle()

    if (error) {
      alert(error.message)
      return
    }

    setCurrentMember(data)
  }

  async function loadAll() {
    await Promise.all([loadMembers(), loadFees(), loadCashEntries(), loadEventCheckins(), loadEvents(), loadDocuments()])
  }

  function getAppRole() {
    return currentMember?.app_role || 'readonly'
  }

  function isAdmin() {
    return getAppRole() === 'admin'
  }

  function canManageMembers() {
    return ['admin', 'members'].includes(getAppRole())
  }

  function canManageCash() {
    return ['admin', 'cashier'].includes(getAppRole())
  }

  function canUseCheckin() {
    return ['admin', 'checkin'].includes(getAppRole())
  }

  function canManageEvents() {
    return ['admin', 'checkin'].includes(getAppRole())
  }

  function getAppRoleLabel(value) {
    const labels = {
      admin: 'Admin',
      members: 'Mitgliederverwaltung',
      cashier: 'Kassa',
      checkin: 'Check-in',
      readonly: 'Nur Lesen',
    }

    return labels[value] || 'Nur Lesen'
  }

  async function login() {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return alert(error.message)
    checkUser()
  }

  async function logout() {
    await supabase.auth.signOut()
    setUser(null)
    setCurrentMember(null)
    setMembers([])
    setFees([])
    setCashEntries([])
    setEventCheckins([])
    setEvents([])
    setDocuments([])
    resetForm()
  }

  async function loadMembers() {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) return alert(error.message)
    setMembers(data || [])
  }

  async function loadFees() {
    const { data, error } = await supabase
      .from('membership_fees')
      .select('*')
      .eq('year', 2026)

    if (error) return alert(error.message)
    setFees(data || [])
  }

  async function loadCashEntries() {
    const { data, error } = await supabase
      .from('cash_entries')
      .select('*')
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) return alert(error.message)
    setCashEntries(data || [])
  }

  async function loadEventCheckins() {
    const { data, error } = await supabase
      .from('event_checkins')
      .select('*')
      .order('checkin_time', { ascending: false })

    if (error) return alert(error.message)
    setEventCheckins(data || [])
  }

  async function loadEvents() {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('event_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) return alert(error.message)

    const loadedEvents = data || []
    setEvents(loadedEvents)

    if (!selectedEventId && loadedEvents.length > 0) {
      setSelectedEventId(loadedEvents[0].id)
      setCashEventId(loadedEvents[0].id)
      setEventName(loadedEvents[0].name)
    }
  }

  async function loadDocuments() {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .order('document_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) return alert(error.message)
    setDocuments(data || [])
  }

  function getFee(memberId) {
    return fees.find((fee) => fee.member_id === memberId)
  }

  function getAvailableCashYears() {
    const years = new Set()

    getCashEntriesForSelectedYear().forEach((entry) => {
      if (entry.entry_year) years.add(String(entry.entry_year))
      else if (entry.entry_date) years.add(String(entry.entry_date).slice(0, 4))
    })

    if (years.size === 0) {
      years.add(String(new Date().getFullYear()))
    }

    return Array.from(years).sort((a, b) => Number(b) - Number(a))
  }

  function getEntryYear(entry) {
    return String(entry.entry_year || String(entry.entry_date || '').slice(0, 4))
  }

  function getCashEntriesForSelectedYear() {
    if (selectedCashYear === 'alle') return cashEntries
    return cashEntries.filter((entry) => getEntryYear(entry) === selectedCashYear)
  }


  function getAmountByType(type) {
    if (type === 'vollmitglied') return 70
    if (type === 'foerdermitglied') return 40
    return 0
  }

  function normalizeMemberType(value) {
    const normalized = String(value || '')
      .trim()
      .toLowerCase()
      .replace('ö', 'oe')
      .replace('ü', 'ue')
      .replace('ä', 'ae')
      .replace('ß', 'ss')

    if (normalized.includes('foerder')) return 'foerdermitglied'
    if (normalized.includes('förder')) return 'foerdermitglied'
    if (normalized.includes('ehren')) return 'ehrenmitglied'
    if (normalized.includes('probe')) return 'probejahr'
    if (normalized.includes('voll')) return 'vollmitglied'

    return 'vollmitglied'
  }

  function normalizeRole(value) {
    const normalized = String(value || '')
      .trim()
      .toLowerCase()
      .replace('ö', 'oe')
      .replace('ü', 'ue')
      .replace('ä', 'ae')
      .replace('ß', 'ss')
      .replace(/[^a-z0-9]/g, '')

    if (normalized.includes('obmannstv') || normalized.includes('obmannstellvertreter')) return 'obmann_stv'
    if (normalized === 'obmann') return 'obmann'
    if (normalized.includes('kassierstv') || normalized.includes('kassierstellvertreter')) return 'kassier_stv'
    if (normalized === 'kassier') return 'kassier'
    if (normalized.includes('schriftfuehrerstv') || normalized.includes('schriftfuehrerstellvertreter') || normalized.includes('schriftfuhrerstv')) return 'schriftfuehrer_stv'
    if (normalized.includes('schriftfuehrer') || normalized.includes('schriftfuhrer')) return 'schriftfuehrer'
    if (normalized.includes('beirat')) return 'beirat'
    if (normalized.includes('helfer')) return 'helfer'

    return 'mitglied'
  }

  function getRoleLabel(value) {
    const labels = {
      mitglied: 'Mitglied',
      obmann: 'Obmann',
      obmann_stv: 'Obmann-Stellvertreter',
      kassier: 'Kassier',
      kassier_stv: 'Kassier-Stellvertreter',
      schriftfuehrer: 'Schriftführer',
      schriftfuehrer_stv: 'Schriftführer-Stellvertreter',
      beirat: 'Beirat',
      helfer: 'Helfer',
    }

    return labels[value] || 'Mitglied'
  }

  function getCsvValue(row, keys) {
    const normalizedRow = {}

    Object.keys(row).forEach((key) => {
      const normalizedKey = key
        .trim()
        .toLowerCase()
        .replace('ä', 'ae')
        .replace('ö', 'oe')
        .replace('ü', 'ue')
        .replace('ß', 'ss')
        .replace(/[^a-z0-9]/g, '')

      normalizedRow[normalizedKey] = row[key]
    })

    for (const key of keys) {
      const normalizedKey = key
        .trim()
        .toLowerCase()
        .replace('ä', 'ae')
        .replace('ö', 'oe')
        .replace('ü', 'ue')
        .replace('ß', 'ss')
        .replace(/[^a-z0-9]/g, '')

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

  function parseCsvText(text) {
    const cleaned = text.replace(/^\uFEFF/, '').trim()
    if (!cleaned) return []

    const lines = cleaned.split(/\r?\n/).filter((line) => line.trim())
    if (lines.length < 2) return []

    const separator = lines[0].includes(';') ? ';' : ','
    const headers = parseCsvLine(lines[0], separator).map((header) => header.trim())

    return lines.slice(1).map((line) => {
      const values = parseCsvLine(line, separator)
      const row = {}

      headers.forEach((header, index) => {
        row[header] = values[index] || ''
      })

      return row
    })
  }

  function csvRowToMember(row) {
    const firstName = getCsvValue(row, ['vorname', 'first_name', 'firstname', 'first name'])
    const lastName = getCsvValue(row, ['nachname', 'last_name', 'lastname', 'last name'])
    const email = getCsvValue(row, ['email', 'e-mail', 'mail'])
    const phone = getCsvValue(row, ['telefon', 'phone', 'handy', 'mobil'])
    const memberType = normalizeMemberType(getCsvValue(row, ['mitgliedsart', 'member_type', 'mitgliedart', 'art']))
    const street = getCsvValue(row, ['strasse', 'straße', 'street', 'adresse'])
    const postalCode = getCsvValue(row, ['plz', 'postal_code', 'postcode', 'zip'])
    const city = getCsvValue(row, ['ort', 'city', 'stadt'])
    const birthdate = getCsvValue(row, ['geburtsdatum', 'birthdate', 'birthday', 'geburtstag'])
    const clothingSize = getCsvValue(row, ['kleidergroesse', 'kleidergröße', 'clothing_size', 'groesse', 'größe'])
    const role = normalizeRole(getCsvValue(row, ['rolle', 'funktion', 'vereinsfunktion', 'role']))

    return {
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      member_type: memberType,
      role,
      app_role: appRole,
      street,
      postal_code: postalCode,
      city,
      birthdate: birthdate || null,
      clothing_size: clothingSize,
      role,
      status: 'aktiv',
    }
  }

  function handleCsvFile(event) {
    const file = event.target.files?.[0]

    if (!file) {
      setCsvRows([])
      setCsvFileName('')
      return
    }

    setCsvFileName(file.name)

    const reader = new FileReader()

    reader.onload = () => {
      try {
        const rows = parseCsvText(String(reader.result || ''))
        const membersForPreview = rows
          .map(csvRowToMember)
          .filter((member) => member.first_name && member.last_name)

        setCsvRows(membersForPreview)

        if (membersForPreview.length === 0) {
          alert('Keine gültigen Mitglieder gefunden. Mindestens Vorname und Nachname müssen vorhanden sein.')
        }
      } catch (error) {
        alert(`CSV konnte nicht gelesen werden: ${error.message}`)
      }
    }

    reader.readAsText(file, 'UTF-8')
  }

  async function importCsvMembers() {
    if (!canManageMembers()) return alert('Keine Berechtigung für Mitglieder-Import.')

    if (csvRows.length === 0) {
      alert('Bitte zuerst eine CSV-Datei auswählen.')
      return
    }

    setCsvImporting(true)

    try {
      const existingKeys = new Set(
        members.map((member) =>
          `${String(member.first_name || '').trim().toLowerCase()}|${String(member.last_name || '').trim().toLowerCase()}|${String(member.email || '').trim().toLowerCase()}`
        )
      )

      const membersToInsert = csvRows.filter((member) => {
        const key = `${String(member.first_name || '').trim().toLowerCase()}|${String(member.last_name || '').trim().toLowerCase()}|${String(member.email || '').trim().toLowerCase()}`
        return !existingKeys.has(key)
      })

      if (membersToInsert.length === 0) {
        alert('Keine neuen Mitglieder gefunden. Möglicherweise sind alle bereits vorhanden.')
        return
      }

      const { data, error } = await supabase
        .from('members')
        .insert(membersToInsert)
        .select()

      if (error) return alert(error.message)

      const feeRows = (data || []).map((member) => ({
        member_id: member.id,
        year: 2026,
        amount: getAmountByType(member.member_type),
        paid: false,
        payment_method: 'bar',
      }))

      if (feeRows.length > 0) {
        const { error: feeError } = await supabase.from('membership_fees').insert(feeRows)
        if (feeError) return alert(feeError.message)
      }

      setCsvRows([])
      setCsvFileName('')
      await loadAll()

      alert(`${membersToInsert.length} Mitglieder wurden importiert.`)
    } finally {
      setCsvImporting(false)
    }
  }


  function getCashBalance() {
    return getCashEntriesForSelectedYear().reduce((sum, entry) => {
      const amount = Number(entry.amount || 0)

      if (entry.is_opening) {
        return entry.type === 'einnahme' ? sum + amount : sum - amount
      }

      return entry.type === 'einnahme' ? sum + amount : sum - amount
    }, 0)
  }

  function getPaymentMethod(entry) {
    if (entry.payment_method) return entry.payment_method

    const text = String(entry.description || '').toLowerCase()

    if (text.includes('e-banking') || text.includes('ebanking') || text.includes('bank')) return 'ebanking'
    if (text.includes('bar')) return 'bar'

    return 'bar'
  }

  function getPaymentMethodLabel(value) {
    if (value === 'ebanking') return 'E-Banking'
    if (value === 'bar') return 'Bar'
    return '-'
  }

  function getCashMonthKey(dateText) {
    if (!dateText) return 'ohne-datum'
    return String(dateText).slice(0, 7)
  }

  function getCashMonthLabel(monthKey) {
    if (monthKey === 'ohne-datum') return 'Ohne Datum'

    const [year, month] = monthKey.split('-')
    const names = [
      'Jänner',
      'Februar',
      'März',
      'April',
      'Mai',
      'Juni',
      'Juli',
      'August',
      'September',
      'Oktober',
      'November',
      'Dezember',
    ]

    return `${names[Number(month) - 1] || month} ${year}`
  }

  function getCashbookDetailedSummary() {
    const grouped = {}

    getCashEntriesForSelectedYear().forEach((entry) => {
      const monthKey = getCashMonthKey(entry.entry_date)

      if (!grouped[monthKey]) {
        grouped[monthKey] = {
          monthKey,
          year: String(entry.entry_year || String(entry.entry_date || '').slice(0, 4)),
          openingBankIncome: 0,
          openingBankExpense: 0,
          openingCashIncome: 0,
          openingCashExpense: 0,
          openingBank: 0,
          openingCash: 0,
          incomeBank: 0,
          expenseBank: 0,
          incomeCash: 0,
          expenseCash: 0,
          totalIncome: 0,
          totalExpense: 0,
          totalIncomeWithOpening: 0,
          totalExpenseWithOpening: 0,
          monthMovement: 0,
          differenceWithOpening: 0,
          runningBalance: 0,
          entries: [],
        }
      }

      const amount = Number(entry.amount || 0)
      const paymentMethod = getPaymentMethod(entry)

      if (entry.is_opening) {
        if (paymentMethod === 'ebanking') {
          if (entry.type === 'einnahme') grouped[monthKey].openingBankIncome += amount
          if (entry.type === 'ausgabe') grouped[monthKey].openingBankExpense += amount
        } else {
          if (entry.type === 'einnahme') grouped[monthKey].openingCashIncome += amount
          if (entry.type === 'ausgabe') grouped[monthKey].openingCashExpense += amount
        }

        grouped[monthKey].openingBank = grouped[monthKey].openingBankIncome - grouped[monthKey].openingBankExpense
        grouped[monthKey].openingCash = grouped[monthKey].openingCashIncome - grouped[monthKey].openingCashExpense

        grouped[monthKey].entries.push(entry)
        return
      }

      if (entry.type === 'einnahme') {
        grouped[monthKey].totalIncome += amount
        if (paymentMethod === 'ebanking') grouped[monthKey].incomeBank += amount
        else grouped[monthKey].incomeCash += amount
      }

      if (entry.type === 'ausgabe') {
        grouped[monthKey].totalExpense += amount
        if (paymentMethod === 'ebanking') grouped[monthKey].expenseBank += amount
        else grouped[monthKey].expenseCash += amount
      }

      grouped[monthKey].entries.push(entry)
    })

    let runningBalance = 0
    let currentYear = null

    return Object.values(grouped)
      .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
      .map((month) => {
        const monthYear = String(month.year || month.monthKey.slice(0, 4))

        if (selectedCashYear === 'alle' && currentYear !== monthYear) {
          runningBalance = 0
          currentYear = monthYear
        }

        const openingTotal = month.openingBank + month.openingCash
        month.monthMovement = month.totalIncome - month.totalExpense
        month.totalIncomeWithOpening =
          month.openingBankIncome + month.openingCashIncome + month.totalIncome
        month.totalExpenseWithOpening =
          month.openingBankExpense + month.openingCashExpense + month.totalExpense
        month.differenceWithOpening =
          month.totalIncomeWithOpening - month.totalExpenseWithOpening

        runningBalance += openingTotal + month.monthMovement

        return {
          ...month,
          openingTotal,
          runningBalance,
        }
      })
  }

  function getOpenFeesCount() {
    return fees.filter((fee) => !fee.paid && Number(fee.amount) > 0).length
  }

  function getOpenFeesTotal() {
    return fees
      .filter((fee) => !fee.paid)
      .reduce((sum, fee) => sum + Number(fee.amount || 0), 0)
  }

  function getIncomeTotal() {
    return getCashEntriesForSelectedYear()
      .filter((entry) => entry.type === 'einnahme' && !entry.is_opening)
      .reduce((sum, entry) => sum + Number(entry.amount || 0), 0)
  }

  function getExpenseTotal() {
    return getCashEntriesForSelectedYear()
      .filter((entry) => entry.type === 'ausgabe' && !entry.is_opening)
      .reduce((sum, entry) => sum + Number(entry.amount || 0), 0)
  }

  function getActiveMembersCount() {
    return members.filter((member) => member.status === 'aktiv').length
  }


  function getTodayDate() {
    return new Date().toISOString().slice(0, 10)
  }

  function getSelectedEvent() {
    return events.find((event) => event.id === selectedEventId)
  }

  function getActiveEventName() {
    const selectedEvent = getSelectedEvent()
    return selectedEvent?.name || String(eventName || '').trim()
  }

  function getEventNameById(eventId) {
    const event = events.find((item) => item.id === eventId)
    return event ? event.name : ''
  }

  function getCashEntriesForEvent(eventId) {
    if (!eventId) return []
    return cashEntries.filter((entry) => entry.event_id === eventId)
  }

  function getEventIncomeTotal(eventId) {
    return getCashEntriesForEvent(eventId)
      .filter((entry) => entry.type === 'einnahme' && !entry.is_opening)
      .reduce((sum, entry) => sum + Number(entry.amount || 0), 0)
  }

  function getEventExpenseTotal(eventId) {
    return getCashEntriesForEvent(eventId)
      .filter((entry) => entry.type === 'ausgabe' && !entry.is_opening)
      .reduce((sum, entry) => sum + Number(entry.amount || 0), 0)
  }

  function getEventBalance(eventId) {
    return getEventIncomeTotal(eventId) - getEventExpenseTotal(eventId)
  }

  function getSelectedEventIncomeTotal() {
    return getEventIncomeTotal(selectedEventId)
  }

  function getSelectedEventExpenseTotal() {
    return getEventExpenseTotal(selectedEventId)
  }

  function getSelectedEventBalance() {
    return getEventBalance(selectedEventId)
  }

  function getMemberName(memberId) {
    const member = members.find((m) => m.id === memberId)
    return member ? `${member.first_name || ''} ${member.last_name || ''}` : 'Unbekannt'
  }

  function getCheckinsForActiveEvent() {
    const activeEventName = getActiveEventName()
    return eventCheckins.filter((checkin) => checkin.event_name === activeEventName)
  }

  function getTodayCheckins() {
    const today = getTodayDate()
    const activeEventName = getActiveEventName()
    return eventCheckins.filter(
      (checkin) => checkin.checkin_date === today && checkin.event_name === activeEventName
    )
  }

  function isCheckedInToday(memberId) {
    return getTodayCheckins().some((checkin) => checkin.member_id === memberId)
  }

  function getChartMax() {
    return Math.max(getIncomeTotal(), getExpenseTotal(), 1)
  }

  function getBarHeight(value) {
    return `${Math.max((value / getChartMax()) * 180, 4)}px`
  }

  function getMonthlyData() {
    const months = [
      'Jan',
      'Feb',
      'Mär',
      'Apr',
      'Mai',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Okt',
      'Nov',
      'Dez',
    ]

    return months.map((month, index) => {
      const monthNumber = index + 1

      const income = getCashEntriesForSelectedYear()
        .filter((entry) => {
          if (!entry.entry_date) return false
          const date = new Date(entry.entry_date)
          return date.getMonth() + 1 === monthNumber && entry.type === 'einnahme'
        })
        .reduce((sum, entry) => sum + Number(entry.amount || 0), 0)

      const expense = getCashEntriesForSelectedYear()
        .filter((entry) => {
          if (!entry.entry_date) return false
          const date = new Date(entry.entry_date)
          return date.getMonth() + 1 === monthNumber && entry.type === 'ausgabe'
        })
        .reduce((sum, entry) => sum + Number(entry.amount || 0), 0)

      return { month, income, expense }
    })
  }

  function getMonthlyMax() {
    const values = getMonthlyData().flatMap((item) => [item.income, item.expense])
    return Math.max(...values, 1)
  }

  function getMonthlyBarHeight(value) {
    return `${Math.max((value / getMonthlyMax()) * 140, 3)}px`
  }

  function getFilteredMembers() {
    return members.filter((member) => {
      const fee = getFee(member.id)
      const search = memberSearch.toLowerCase()

      const matchesSearch =
        !search ||
        `${member.first_name || ''} ${member.last_name || ''}`.toLowerCase().includes(search) ||
        (member.email || '').toLowerCase().includes(search) ||
        (member.phone || '').toLowerCase().includes(search) ||
        (member.city || '').toLowerCase().includes(search)

      const matchesStatus =
        memberStatusFilter === 'alle' || member.status === memberStatusFilter

      const matchesType =
        memberTypeFilter === 'alle' || member.member_type === memberTypeFilter

      const matchesRole =
        roleFilter === 'alle' || (member.role || 'mitglied') === roleFilter

      const matchesFee =
        feeFilter === 'alle' ||
        (feeFilter === 'offen' && fee && !fee.paid && Number(fee.amount) > 0) ||
        (feeFilter === 'bezahlt' && fee && fee.paid) ||
        (feeFilter === 'gratis' && fee && Number(fee.amount) === 0)

      return matchesSearch && matchesStatus && matchesType && matchesRole && matchesFee
    })
  }

  function getFilteredCashEntries() {
    return getCashEntriesForSelectedYear().filter((entry) => {
      const search = cashSearch.toLowerCase()

      const matchesSearch =
        !search ||
        (entry.description || '').toLowerCase().includes(search) ||
        (entry.category || '').toLowerCase().includes(search) ||
        (entry.entry_date || '').toLowerCase().includes(search) ||
        getEventNameById(entry.event_id).toLowerCase().includes(search)

      const matchesType =
        cashTypeFilter === 'alle' || entry.type === cashTypeFilter

      const matchesCategory =
        cashCategoryFilter === 'alle' || entry.category === cashCategoryFilter

      return matchesSearch && matchesType && matchesCategory
    })
  }

  function exportMembersPdf() {
    const doc = new jsPDF()
    const filteredMembers = getFilteredMembers()

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

  function exportCashPdf() {
    const doc = new jsPDF()
    const filteredCash = getFilteredCashEntries()

    doc.text('Styrian Bastards - Kassabuch', 14, 15)
    doc.text(`Kassastand: ${getCashBalance().toFixed(2)} EUR`, 14, 23)
    doc.text(`Einnahmen: ${getIncomeTotal().toFixed(2)} EUR`, 14, 31)
    doc.text(`Ausgaben: ${getExpenseTotal().toFixed(2)} EUR`, 14, 39)

    autoTable(doc, {
      startY: 48,
      head: [['Datum', 'Typ', 'Zahlungsart', 'Event', 'Kategorie', 'Beschreibung', 'Betrag']],
      body: filteredCash.map((e) => [
        e.entry_date || '',
        e.type || '',
        getPaymentMethodLabel(getPaymentMethod(e)),
        getEventNameById(e.event_id) || '-',
        e.category || '',
        e.description || '',
        `${Number(e.amount || 0).toFixed(2)} EUR`,
      ]),
    })

    doc.save('styrian-bastards-kassabuch.pdf')
  }


  function exportDetailedCashbookPdf() {
    const doc = new jsPDF()
    const summary = getCashbookDetailedSummary()

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
        'Einnahmen inkl. Übertrag',
        'Ausgaben inkl. Übertrag',
        'Differenz',
        'Saldo'
      ]],
      body: summary.map((month) => [
        getCashMonthLabel(month.monthKey),
        `${month.openingBank.toFixed(2)} EUR`,
        `${month.openingCash.toFixed(2)} EUR`,
        `${month.incomeBank.toFixed(2)} EUR`,
        `${month.expenseBank.toFixed(2)} EUR`,
        `${month.incomeCash.toFixed(2)} EUR`,
        `${month.expenseCash.toFixed(2)} EUR`,
        `${month.totalIncomeWithOpening.toFixed(2)} EUR`,
        `${month.totalExpenseWithOpening.toFixed(2)} EUR`,
        `${month.differenceWithOpening.toFixed(2)} EUR`,
        `${month.runningBalance.toFixed(2)} EUR`,
      ]),
    })

    doc.save('styrian-bastards-kassabuch-detail.pdf')
  }

  function exportOpenFeesPdf() {
    const doc = new jsPDF()
    const openFees = fees.filter((fee) => !fee.paid && Number(fee.amount) > 0)

    doc.text('Styrian Bastards - Offene Mitgliedsbeitraege', 14, 15)
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

  function exportCheckinsPdf() {
    const doc = new jsPDF()
    const todayCheckins = getTodayCheckins()
    const activeEventName = getActiveEventName()

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


  function exportEventFinancePdf(event) {
    const eventCheckinsForReport = eventCheckins.filter((checkin) => checkin.event_name === event.name)
    const eventCashEntries = getCashEntriesForEvent(event.id)

    const income = getEventIncomeTotal(event.id)
    const expenses = getEventExpenseTotal(event.id)
    const balance = getEventBalance(event.id)

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

  async function exportMemberCardPdf(member) {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [86, 54],
    })

    const qrDataUrl = await QRCode.toDataURL(member.member_number || member.id, {
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

  function saveOfflineCashEntry(entry) {
    const current = JSON.parse(localStorage.getItem('offlineCashEntries') || '[]')
    const updated = [entry, ...current]

    localStorage.setItem('offlineCashEntries', JSON.stringify(updated))
    setOfflineCashEntries(updated)
  }

  async function syncOfflineCashEntries() {
    if (!navigator.onLine) {
      alert('Keine Internetverbindung.')
      return
    }

    if (offlineCashEntries.length === 0) {
      alert('Keine Offline-Einträge vorhanden.')
      return
    }

    const entriesToSync = offlineCashEntries.map(({ offline_id, ...entry }) => entry)

    const { error } = await supabase.from('cash_entries').insert(entriesToSync)

    if (error) return alert(error.message)

    localStorage.removeItem('offlineCashEntries')
    setOfflineCashEntries([])
    loadCashEntries()

    alert('Offline-Einträge wurden synchronisiert.')
  }

  async function createEvent() {
    if (!canManageEvents()) return alert('Keine Berechtigung für Event-Verwaltung.')

    if (!newEventName.trim()) {
      alert('Bitte einen Eventnamen eingeben.')
      return
    }

    const { data, error } = await supabase
      .from('events')
      .insert({
        name: newEventName.trim(),
        event_date: newEventDate || getTodayDate(),
        location: newEventLocation.trim() || null,
        notes: newEventNotes.trim() || null,
        status: 'geplant',
      })
      .select()
      .single()

    if (error) return alert(error.message)

    setNewEventName('')
    setNewEventDate(getTodayDate())
    setNewEventLocation('')
    setNewEventNotes('')

    await loadEvents()

    if (data) {
      setSelectedEventId(data.id)
      setCashEventId(data.id)
      setEventName(data.name)
    }

    alert('Event wurde angelegt.')
  }

  async function updateEventStatus(eventId, status) {
    if (!canManageEvents()) return alert('Keine Berechtigung für Event-Verwaltung.')

    const { error } = await supabase
      .from('events')
      .update({ status })
      .eq('id', eventId)

    if (error) return alert(error.message)

    loadEvents()
  }

  async function checkInMember(member) {
    if (!canUseCheckin()) return alert('Keine Berechtigung für Check-in.')

    const activeEventName = getActiveEventName()

    if (!activeEventName) {
      alert('Bitte zuerst ein Event auswählen oder anlegen.')
      return
    }

    if (isCheckedInToday(member.id)) {
      alert(`${member.first_name} ${member.last_name} ist für dieses Event heute bereits eingecheckt.`)
      return
    }

    const { error } = await supabase.from('event_checkins').insert({
      member_id: member.id,
      event_name: activeEventName,
      checkin_date: getTodayDate(),
    })

    if (error) return alert(error.message)

    await loadEventCheckins()
    alert(`Check-in erfolgreich: ${member.first_name} ${member.last_name} für ${activeEventName}`)
  }

  async function deleteMember(member) {
    if (!isAdmin()) return alert('Nur Admins dürfen Mitglieder löschen.')

    const confirmed = window.confirm(
      `Mitglied wirklich löschen?\n\n${member.first_name || ''} ${member.last_name || ''}\n\nDas kann nicht rückgängig gemacht werden.`
    )

    if (!confirmed) return

    const secondConfirm = window.confirm(
      'Bitte nochmals bestätigen: Dieses Mitglied und verknüpfte Daten können gelöscht werden.'
    )

    if (!secondConfirm) return

    const { error } = await supabase
      .from('members')
      .delete()
      .eq('id', member.id)

    if (error) return alert(error.message)

    if (editingId === member.id) {
      resetForm()
    }

    await loadAll()
    alert('Mitglied wurde gelöscht.')
  }

  function resetForm() {
    setEditingId(null)
    setFirstName('')
    setLastName('')
    setMemberEmail('')
    setPhone('')
    setMemberType('vollmitglied')
    setRole('mitglied')
    setAppRole('readonly')
    setStreet('')
    setPostalCode('')
    setCity('')
    setBirthdate('')
    setClothingSize('')
  }

  function resetMemberFilters() {
    setMemberSearch('')
    setMemberStatusFilter('alle')
    setMemberTypeFilter('alle')
    setRoleFilter('alle')
    setFeeFilter('alle')
  }

  function resetCashFilters() {
    setCashSearch('')
    setCashTypeFilter('alle')
    setCashCategoryFilter('alle')
  }

  function editMember(member) {
    setEditingId(member.id)
    setFirstName(member.first_name || '')
    setLastName(member.last_name || '')
    setMemberEmail(member.email || '')
    setPhone(member.phone || '')
    setMemberType(member.member_type || 'vollmitglied')
    setRole(member.role || 'mitglied')
    setAppRole(member.app_role || 'readonly')
    setStreet(member.street || '')
    setPostalCode(member.postal_code || '')
    setCity(member.city || '')
    setBirthdate(member.birthdate || '')
    setClothingSize(member.clothing_size || '')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function saveMember() {
    if (!canManageMembers()) return alert('Keine Berechtigung für Mitgliederverwaltung.')

    if (!firstName || !lastName) {
      alert('Vorname und Nachname sind Pflicht.')
      return
    }

    const payload = {
      first_name: firstName,
      last_name: lastName,
      email: memberEmail,
      phone,
      member_type: memberType,
      role,
      app_role: appRole,
      street,
      postal_code: postalCode,
      city,
      birthdate: birthdate || null,
      clothing_size: clothingSize,
      status: 'aktiv',
    }

    if (editingId) {
      const { error } = await supabase.from('members').update(payload).eq('id', editingId)
      if (error) return alert(error.message)
    } else {
      const { data, error } = await supabase.from('members').insert(payload).select().single()
      if (error) return alert(error.message)

      await supabase.from('membership_fees').insert({
        member_id: data.id,
        year: 2026,
        amount: getAmountByType(memberType),
        paid: false,
        payment_method: 'bar',
      })
    }

    resetForm()
    loadAll()
  }

  async function changeMemberStatus(id, status) {
    if (!canManageMembers()) return alert('Keine Berechtigung für Mitgliederverwaltung.')

    const { error } = await supabase.from('members').update({ status }).eq('id', id)
    if (error) return alert(error.message)
    loadMembers()
  }

  async function markFeePaid(fee, paymentMethod = 'bar') {
    if (!canManageCash()) return alert('Keine Berechtigung für Kassa.')

    const today = new Date().toISOString().slice(0, 10)

    const { error: feeError } = await supabase
      .from('membership_fees')
      .update({
        paid: true,
        paid_at: today,
        payment_method: paymentMethod,
      })
      .eq('id', fee.id)

    if (feeError) return alert(feeError.message)

    const member = members.find((m) => m.id === fee.member_id)

    const { error: cashError } = await supabase.from('cash_entries').insert({
      entry_date: today,
      type: 'einnahme',
      category: 'mitgliedsbeitrag',
      amount: fee.amount,
      description: `Mitgliedsbeitrag 2026 - ${
        member ? `${member.first_name} ${member.last_name}` : 'Mitglied'
      }`,
      member_id: fee.member_id,
      membership_fee_id: fee.id,
    })

    if (cashError) return alert(cashError.message)
    loadAll()
  }

  async function markFeeOpen(fee) {
    if (!canManageCash()) return alert('Keine Berechtigung für Kassa.')

    const { error: feeError } = await supabase
      .from('membership_fees')
      .update({
        paid: false,
        paid_at: null,
      })
      .eq('id', fee.id)

    if (feeError) return alert(feeError.message)

    await supabase.from('cash_entries').delete().eq('membership_fee_id', fee.id)
    loadAll()
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

    return amount
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

  function cashbookRowToEntries(row) {
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

  function normalizeCashType(value) {
    const text = String(value || '').toLowerCase()

    if (text.includes('aus')) return 'ausgabe'
    if (text.includes('ein')) return 'einnahme'

    return ''
  }

  function parseCashbookTextWithMonths(rawText) {
    const cleaned = String(rawText || '').replace(/^\uFEFF/, '').trim()
    if (!cleaned) return []

    const lines = cleaned.split(/\r?\n/).filter((line) => line.trim())
    if (lines.length < 2) return []

    const separator = lines[0].includes(';') ? ';' : ','
    const headers = parseCsvLine(lines[0], separator).map((header) => header.trim())

    const monthNumbers = {
      'jänner': '01',
      'jaenner': '01',
      'januar': '01',
      'februar': '02',
      'märz': '03',
      'maerz': '03',
      'april': '04',
      'mai': '05',
      'juni': '06',
      'juli': '07',
      'august': '08',
      'september': '09',
      'oktober': '10',
      'november': '11',
      'dezember': '12',
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

  function handleCashbookFile(event) {
    const file = event.target.files?.[0]

    if (!file) {
      setCashbookRows([])
      setCashbookFileName('')
      return
    }

    setCashbookFileName(file.name)

    const reader = new FileReader()

    reader.onload = () => {
      try {
        const rows = parseCashbookTextWithMonths(String(reader.result || ''))
        const entries = rows.flatMap(cashbookRowToEntries)

        setCashbookRows(entries)

        if (entries.length === 0) {
          alert('Keine gültigen Kassa-Einträge gefunden. Prüfe bitte Datum, Bezeichnung und Beträge.')
        }
      } catch (error) {
        alert(`Kassabuch konnte nicht gelesen werden: ${error.message}`)
      }
    }

    reader.readAsText(file, 'UTF-8')
  }

  async function importCashbookRows() {
    if (!canManageCash()) return alert('Keine Berechtigung für Kassa.')

    if (cashbookRows.length === 0) {
      alert('Bitte zuerst eine Kassabuch-CSV auswählen.')
      return
    }

    setCashbookImporting(true)

    try {
      const { error } = await supabase
        .from('cash_entries')
        .insert(cashbookRows)

      if (error) return alert(error.message)

      setCashbookRows([])
      setCashbookFileName('')
      await loadCashEntries()

      alert('Kassabuch wurde importiert.')
    } finally {
      setCashbookImporting(false)
    }
  }

  function editCashEntry(entry) {
    if (!canManageCash()) return alert('Keine Berechtigung für Kassa.')

    setEditingCashId(entry.id)
    setCashType(entry.type || 'einnahme')
    setCashCategory(entry.category || 'sonstiges')
    setCashPaymentMethod(getPaymentMethod(entry))
    setCashEventId(entry.event_id || '')
    setCashAmount(String(entry.amount || ''))
    setCashDescription(entry.description || '')
    setReceiptFile(null)

    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function resetCashForm() {
    setEditingCashId(null)
    setCashType('einnahme')
    setCashCategory('sonstiges')
    setCashPaymentMethod('bar')
    setCashAmount('')
    setCashDescription('')
    setReceiptFile(null)
  }

  async function updateCashEntry() {
    if (!canManageCash()) return alert('Keine Berechtigung für Kassa.')

    if (!editingCashId) {
      alert('Kein Kassa-Eintrag zum Bearbeiten ausgewählt.')
      return
    }

    if (!cashAmount || !cashDescription) {
      alert('Betrag und Beschreibung sind Pflicht.')
      return
    }

    const { error } = await supabase
      .from('cash_entries')
      .update({
        type: cashType,
        category: cashCategory,
        event_id: cashEventId || null,
        payment_method: cashPaymentMethod,
        amount: Number(cashAmount),
        description: cashDescription,
      })
      .eq('id', editingCashId)

    if (error) return alert(error.message)

    resetCashForm()
    await loadCashEntries()
    alert('Kassa-Eintrag wurde aktualisiert.')
  }

  async function addCashEntry() {
    if (!canManageCash()) return alert('Keine Berechtigung für Kassa.')

    if (!cashAmount || !cashDescription) {
      alert('Betrag und Beschreibung sind Pflicht.')
      return
    }

    const baseEntry = {
      entry_date: new Date().toISOString().slice(0, 10),
      type: cashType,
      category: cashCategory,
      event_id: cashEventId || selectedEventId || null,
      payment_method: cashPaymentMethod,
      is_opening: false,
      amount: Number(cashAmount),
      description: cashDescription,
      receipt_url: null,
    }

    if (!navigator.onLine) {
      saveOfflineCashEntry({
        ...baseEntry,
        offline_id: Date.now(),
      })

      setCashType('einnahme')
      setCashCategory('sonstiges')
      setCashAmount('')
      setCashDescription('')
      setReceiptFile(null)

      alert('Offline gespeichert. Wird später synchronisiert.')
      return
    }

    let receiptUrl = null

    if (receiptFile) {
      const fileExt = receiptFile.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `cash/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(filePath, receiptFile)

      if (uploadError) return alert(uploadError.message)
      receiptUrl = filePath
    }

    const { error } = await supabase.from('cash_entries').insert({
      ...baseEntry,
      receipt_url: receiptUrl,
    })

    if (error) return alert(error.message)

    resetCashForm()

    loadCashEntries()
  }

  async function deleteCashEntry(entry) {
    if (!canManageCash()) return alert('Keine Berechtigung für Kassa.')

    const confirmed = window.confirm(
      `Kassa-Eintrag wirklich löschen?\n\n${entry.type === 'einnahme' ? 'Einnahme' : 'Ausgabe'} ${Number(entry.amount || 0).toFixed(2)} €\n${entry.description || ''}\n\nDas kann nicht rückgängig gemacht werden.`
    )

    if (!confirmed) return

    const { error } = await supabase
      .from('cash_entries')
      .delete()
      .eq('id', entry.id)

    if (error) return alert(error.message)

    await loadCashEntries()
    alert('Kassa-Eintrag wurde gelöscht.')
  }

  function resetDocumentForm() {
    setDocumentTitle('')
    setDocumentCategory('sonstiges')
    setDocumentDate('')
    setDocumentDescription('')
    setDocumentFile(null)
  }

  async function uploadDocument() {
    if (!canManageMembers() && !isAdmin()) {
      alert('Keine Berechtigung für Dokumenten-Upload.')
      return
    }

    if (!documentTitle || !documentFile) {
      alert('Titel und Datei sind Pflicht.')
      return
    }

    const fileExt = documentFile.name.split('.').pop()
    const safeName = documentFile.name.replace(/[^a-zA-Z0-9_.-]/g, '-')
    const filePath = `${Date.now()}-${Math.random().toString(36).substring(2)}-${safeName}`

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, documentFile)

    if (uploadError) return alert(uploadError.message)

    const { error } = await supabase.from('documents').insert({
      title: documentTitle,
      category: documentCategory,
      document_date: documentDate || null,
      description: documentDescription || null,
      file_path: filePath,
      file_name: documentFile.name,
      mime_type: documentFile.type || null,
    })

    if (error) return alert(error.message)

    resetDocumentForm()
    await loadDocuments()
    alert('Dokument wurde hochgeladen.')
  }

  async function openDocument(path) {
    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(path, 120)

    if (error) return alert(error.message)
    window.open(data.signedUrl, '_blank')
  }

  async function deleteDocument(document) {
    if (!isAdmin()) return alert('Nur Admins dürfen Dokumente löschen.')

    const confirmed = window.confirm(
      `Dokument wirklich löschen?\n\n${document.title || ''}\n\nDas kann nicht rückgängig gemacht werden.`
    )

    if (!confirmed) return

    const { error: storageError } = await supabase.storage
      .from('documents')
      .remove([document.file_path])

    if (storageError) return alert(storageError.message)

    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', document.id)

    if (error) return alert(error.message)

    await loadDocuments()
    alert('Dokument wurde gelöscht.')
  }

  async function openReceipt(path) {
    const { data, error } = await supabase.storage
      .from('receipts')
      .createSignedUrl(path, 60)

    if (error) return alert(error.message)
    window.open(data.signedUrl, '_blank')
  }

  const filteredMembers = getFilteredMembers()
  const filteredCashEntries = getFilteredCashEntries()
  const income = getIncomeTotal()
  const expense = getExpenseTotal()
  const monthlyData = getMonthlyData()

  if (!user) {
    return (
      <main style={{ ...pageStyle, padding: 30, fontFamily: 'Arial, Helvetica, sans-serif', maxWidth: 520, margin: '0 auto', fontSize: 16, lineHeight: 1.55 }}>
        <h1 style={headingStyle}>Styrian Bastards Login</h1>

        <input
          placeholder="E-Mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
        />

        <input
          type="password"
          placeholder="Passwort"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={inputStyle}
        />

        <button onClick={login} style={buttonStyle}>
          Login
        </button>
      </main>
    )
  }

  return (
    <main
      style={{
        ...pageStyle,
        padding: isMobile ? 16 : 32,
        fontFamily: 'Arial, Helvetica, sans-serif',
        maxWidth: 1240,
        margin: '0 auto',
        boxSizing: 'border-box',
        fontSize: isMobile ? 16 : 15,
        lineHeight: 1.55,
      }}
    >
      <h1 style={headingStyle}>Styrian Bastards Vereinsmanager</h1>

      <p>
        Eingeloggt als: <strong>{user.email}</strong>
      </p>

      <p>
        App-Recht:{' '}
        <strong>{getAppRoleLabel(getAppRole())}</strong>
        {currentMember && (
          <>
            {' '}· Mitglied: <strong>{currentMember.first_name} {currentMember.last_name}</strong>
          </>
        )}
      </p>

      {!currentMember && (
        <div style={{ ...cardStyle, background: '#fef2f2', borderColor: '#b91c1c' }}>
          <strong>Kein Mitglied mit diesem Login verknüpft.</strong>
          <br />
          Bitte in Supabase beim passenden Mitglied die Spalte auth_user_id mit deiner Supabase User ID befüllen und app_role setzen.
        </div>
      )}

      <p>
        Verbindung:{' '}
        <strong style={{ color: isOnline ? '#2e7d32' : '#c62828' }}>
          {isOnline ? 'Online' : 'Offline'}
        </strong>
      </p>

      <button onClick={logout} style={secondaryButtonStyle}>
        Logout
      </button>

      <div style={{ marginTop: 15 }}>
        <button onClick={exportMembersPdf} style={secondaryButtonStyle}>
          Mitgliederliste PDF
        </button>
        <button onClick={exportCashPdf} style={secondaryButtonStyle}>
          Kassabuch PDF
        </button>
        <button onClick={exportDetailedCashbookPdf} style={secondaryButtonStyle}>
          Kassabuch Detail PDF
        </button>
        <button onClick={exportOpenFeesPdf} style={secondaryButtonStyle}>
          Offene Beiträge PDF
        </button>
        <button onClick={exportCheckinsPdf} style={secondaryButtonStyle}>
          Anwesenheitsliste PDF
        </button>
      </div>

      <section style={sectionStyle}>
        <h2 style={headingStyle}>Event-Verwaltung</h2>

        <h3 style={headingStyle}>Neues Event anlegen</h3>

        <input
          placeholder="Eventname, z.B. Cornhole Turnier 2026"
          value={newEventName}
          onChange={(e) => setNewEventName(e.target.value)}
          style={inputStyle}
        />

        <input
          type="date"
          value={newEventDate}
          onChange={(e) => setNewEventDate(e.target.value)}
          style={inputStyle}
        />

        <input
          placeholder="Ort"
          value={newEventLocation}
          onChange={(e) => setNewEventLocation(e.target.value)}
          style={inputStyle}
        />

        <input
          placeholder="Notizen"
          value={newEventNotes}
          onChange={(e) => setNewEventNotes(e.target.value)}
          style={inputStyle}
        />

        <button onClick={createEvent} style={buttonStyle}>
          Event anlegen
        </button>

        <h3 style={headingStyle}>Event auswählen</h3>

        <select
          value={selectedEventId}
          onChange={(e) => {
            const eventId = e.target.value
            setSelectedEventId(eventId)
            setCashEventId(eventId)
            const selectedEvent = events.find((event) => event.id === eventId)
            setEventName(selectedEvent?.name || '')
          }}
          style={inputStyle}
        >
          <option value="">Event auswählen</option>
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.name} · {event.event_date} · {event.status}
            </option>
          ))}
        </select>

        <p>
          Aktives Event:{' '}
          <strong>{getActiveEventName() || 'kein Event ausgewählt'}</strong>
        </p>

        {selectedEventId && (
          <div style={{ ...cardStyle, background: '#ecfdf5' }}>
            <strong>Finanzen für aktives Event</strong>
            <br />
            Einnahmen: {getSelectedEventIncomeTotal().toFixed(2)} €
            <br />
            Ausgaben: {getSelectedEventExpenseTotal().toFixed(2)} €
            <br />
            Ergebnis: {getSelectedEventBalance().toFixed(2)} €
          </div>
        )}

        <h3 style={headingStyle}>Event-Liste</h3>

        {events.length === 0 && <p>Noch keine Events angelegt.</p>}

        {events.map((event) => (
          <div key={event.id} style={cardStyle}>
            <strong>{event.name}</strong>
            <br />
            Datum: {event.event_date || '-'}
            <br />
            Ort: {event.location || '-'}
            <br />
            Status: {event.status || '-'}
            <br />
            Notizen: {event.notes || '-'}
            <br />
            Einnahmen: {getEventIncomeTotal(event.id).toFixed(2)} € · Ausgaben: {getEventExpenseTotal(event.id).toFixed(2)} € · Ergebnis: {getEventBalance(event.id).toFixed(2)} €
            <br />
            <button onClick={() => updateEventStatus(event.id, 'geplant')} style={buttonStyle}>
              Geplant
            </button>
            <button onClick={() => updateEventStatus(event.id, 'laufend')} style={buttonStyle}>
              Laufend
            </button>
            <button onClick={() => updateEventStatus(event.id, 'abgeschlossen')} style={buttonStyle}>
              Abgeschlossen
            </button>
            <button onClick={() => exportEventFinancePdf(event)} style={buttonStyle}>
              Finanzbericht PDF
            </button>
          </div>
        ))}
      </section>

{canUseCheckin() && (
      <section style={sectionStyle}>
        <h2 style={headingStyle}>Event Check-in / QR-Code Scanner</h2>

        <p>
          Aktives Event für Check-in:{' '}
          <strong>{getActiveEventName() || 'kein Event ausgewählt'}</strong>
        </p>

        <button onClick={() => setScanning(true)} style={buttonStyle}>
          QR-Code scannen & einchecken
        </button>

        <button onClick={() => setScanning(false)} style={buttonStyle}>
          Scanner stoppen
        </button>

        <button onClick={exportCheckinsPdf} style={secondaryButtonStyle}>
          Anwesenheitsliste PDF
        </button>

        {scanning && (
          <div
            id="reader"
            style={{
              marginTop: 20,
              maxWidth: 400,
              width: '100%',
            }}
          />
        )}

        <h3 style={headingStyle}>Heute für dieses Event eingecheckt: {getTodayCheckins().length}</h3>

        {getTodayCheckins().map((checkin) => (
          <div key={checkin.id} style={cardStyle}>
            <strong>{getMemberName(checkin.member_id)}</strong>
            <br />
            {checkin.event_name} · {checkin.checkin_time ? new Date(checkin.checkin_time).toLocaleTimeString('de-AT') : ''}
          </div>
        ))}
      </section>
      )}

      <section style={sectionStyle}>
        <h2 style={headingStyle}>Dashboard</h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 12,
            marginBottom: 30,
          }}
        >
          {[
            ['Kassastand', `${getCashBalance().toFixed(2)} €`],
            ['Mitglieder aktiv', getActiveMembersCount()],
            ['Offene Beiträge', `${getOpenFeesCount()} offen`],
            ['Offene Summe', `${getOpenFeesTotal().toFixed(2)} €`],
            ['Einnahmen', `${income.toFixed(2)} €`],
            ['Ausgaben', `${expense.toFixed(2)} €`],
            ['Offline-Kassa', `${offlineCashEntries.length} Einträge`],
            ['Events', events.length],
            ['Check-ins heute', getTodayCheckins().length],
            ['Event Einnahmen', `${getSelectedEventIncomeTotal().toFixed(2)} €`],
            ['Event Ausgaben', `${getSelectedEventExpenseTotal().toFixed(2)} €`],
            ['Event Ergebnis', `${getSelectedEventBalance().toFixed(2)} €`],
          ].map(([label, value]) => (
            <div key={label} style={cardStyle}>
              <strong>{label}</strong>
              <br />
              {value}
            </div>
          ))}
        </div>

        <h3 style={headingStyle}>Einnahmen vs. Ausgaben</h3>

        <div style={{ ...cardStyle, overflowX: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 40, height: 220, minWidth: 260 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ height: getBarHeight(income), width: 80, background: '#2e7d32' }} />
              <strong>Einnahmen</strong>
              <br />
              {income.toFixed(2)} €
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{ height: getBarHeight(expense), width: 80, background: '#c62828' }} />
              <strong>Ausgaben</strong>
              <br />
              {expense.toFixed(2)} €
            </div>
          </div>
        </div>

        <h3 style={headingStyle}>Monatsdiagramm Einnahmen / Ausgaben</h3>

        <div style={{ ...cardStyle, overflowX: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 18, minWidth: 850, height: 220 }}>
            {monthlyData.map((item) => (
              <div key={item.month} style={{ textAlign: 'center', width: 60 }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 4, height: 150 }}>
                  <div
                    title={`Einnahmen ${item.month}: ${item.income.toFixed(2)} €`}
                    style={{
                      width: 22,
                      height: getMonthlyBarHeight(item.income),
                      background: '#2e7d32',
                    }}
                  />
                  <div
                    title={`Ausgaben ${item.month}: ${item.expense.toFixed(2)} €`}
                    style={{
                      width: 22,
                      height: getMonthlyBarHeight(item.expense),
                      background: '#c62828',
                    }}
                  />
                </div>
                <strong>{item.month}</strong>
                <br />
                <span style={{ fontSize: 11, color: '#2e7d32' }}>{item.income.toFixed(0)}€</span>
                /
                <span style={{ fontSize: 11, color: '#c62828' }}>{item.expense.toFixed(0)}€</span>
              </div>
            ))}
          </div>

          <p>
            <span style={{ color: '#2e7d32', fontWeight: 'bold' }}>Grün = Einnahmen</span>
            {' | '}
            <span style={{ color: '#c62828', fontWeight: 'bold' }}>Rot = Ausgaben</span>
          </p>
        </div>
      </section>

{canManageCash() && (
      <section style={sectionStyle}>
        <h2 style={headingStyle}>Kassa</h2>

        <h3 style={headingStyle}>Kassajahr</h3>

        <select value={selectedCashYear} onChange={(e) => setSelectedCashYear(e.target.value)} style={inputStyle}>
          <option value="alle">Alle Jahre</option>
          {getAvailableCashYears().map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>

        <p>
          Verbindung:{' '}
          <strong style={{ color: isOnline ? '#2e7d32' : '#c62828' }}>
            {isOnline ? 'Online' : 'Offline'}
          </strong>
        </p>

        <p>
          Offline gespeicherte Kassa-Einträge:{' '}
          <strong>{offlineCashEntries.length}</strong>
        </p>

        <button onClick={syncOfflineCashEntries} style={buttonStyle}>
          Offline-Einträge synchronisieren
        </button>

        <h3 style={headingStyle}>Aktueller Kassastand: {getCashBalance().toFixed(2)} €</h3>

        <h3 style={headingStyle}>{editingCashId ? 'Kassa-Eintrag bearbeiten' : 'Kassa-Eintrag erfassen'}</h3>

        <select value={cashType} onChange={(e) => setCashType(e.target.value)} style={inputStyle}>
          <option value="einnahme">Einnahme</option>
          <option value="ausgabe">Ausgabe</option>
        </select>

        <select value={cashCategory} onChange={(e) => setCashCategory(e.target.value)} style={inputStyle}>
          <option value="mitgliedsbeitrag">Mitgliedsbeitrag</option>
          <option value="pfandbecher">Pfandbecher</option>
          <option value="veranstaltung">Veranstaltung</option>
          <option value="fanartikel">Fanartikel</option>
          <option value="sonstiges">Sonstiges</option>
        </select>

        <select value={cashPaymentMethod} onChange={(e) => setCashPaymentMethod(e.target.value)} style={inputStyle}>
          <option value="bar">Bar</option>
          <option value="ebanking">E-Banking</option>
        </select>

        <select value={cashEventId} onChange={(e) => setCashEventId(e.target.value)} style={inputStyle}>
          <option value="">Keinem Event zuordnen</option>
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.name} · {event.event_date}
            </option>
          ))}
        </select>

        <input
          type="number"
          placeholder="Betrag"
          value={cashAmount}
          onChange={(e) => setCashAmount(e.target.value)}
          style={inputStyle}
        />

        <input
          placeholder="Beschreibung"
          value={cashDescription}
          onChange={(e) => setCashDescription(e.target.value)}
          style={inputStyle}
        />

        <input
          type="file"
          accept="image/*,.pdf"
          onChange={(e) => setReceiptFile(e.target.files[0])}
          style={inputStyle}
        />

        {!isOnline && (
          <p style={{ color: '#c62828' }}>
            Offline-Modus: Belege werden offline noch nicht gespeichert. Der Kassa-Eintrag wird lokal vorgemerkt.
          </p>
        )}

        {editingCashId ? (
          <>
            <button onClick={updateCashEntry} style={buttonStyle}>
              Änderungen speichern
            </button>
            <button onClick={resetCashForm} style={secondaryButtonStyle}>
              Bearbeiten abbrechen
            </button>
          </>
        ) : (
          <button onClick={addCashEntry} style={buttonStyle}>
            Kassa-Eintrag speichern
          </button>
        )}

        {offlineCashEntries.length > 0 && (
          <>
            <h3 style={headingStyle}>Offline vorgemerkte Einträge</h3>
            {offlineCashEntries.map((entry) => (
              <div key={entry.offline_id} style={{ ...cardStyle, background: '#fffbeb' }}>
                <strong>
                  {entry.type === 'einnahme' ? '+' : '-'} {Number(entry.amount).toFixed(2)} €
                </strong>
                <br />
                {entry.category} · {entry.entry_date}
                <br />
                {entry.description}
              </div>
            ))}
          </>
        )}

        <h3 style={headingStyle}>Kassabuch Detailübersicht</h3>

        <div style={{ ...cardStyle, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
            <thead>
              <tr>
                {[
                  'Monat',
                  'Übertrag Bank netto',
                  'Übertrag Bar netto',
                  'Einnahme E-Banking',
                  'Ausgabe E-Banking',
                  'Einnahme Bar',
                  'Ausgabe Bar',
                  'Einnahmen ges. inkl. Übertrag',
                  'Ausgaben ges. inkl. Übertrag',
                  'Differenz wie Excel',
                  'Saldo laufend',
                ].map((header) => (
                  <th key={header} style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #d1d5db' }}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {getCashbookDetailedSummary().map((month) => (
                <tr key={month.monthKey}>
                  <td style={{ padding: 8, borderBottom: '1px solid #e5e7eb' }}>{getCashMonthLabel(month.monthKey)}</td>
                  <td style={{ padding: 8, borderBottom: '1px solid #e5e7eb' }}>{month.openingBank.toFixed(2)} €</td>
                  <td style={{ padding: 8, borderBottom: '1px solid #e5e7eb' }}>{month.openingCash.toFixed(2)} €</td>
                  <td style={{ padding: 8, borderBottom: '1px solid #e5e7eb' }}>{month.incomeBank.toFixed(2)} €</td>
                  <td style={{ padding: 8, borderBottom: '1px solid #e5e7eb' }}>{month.expenseBank.toFixed(2)} €</td>
                  <td style={{ padding: 8, borderBottom: '1px solid #e5e7eb' }}>{month.incomeCash.toFixed(2)} €</td>
                  <td style={{ padding: 8, borderBottom: '1px solid #e5e7eb' }}>{month.expenseCash.toFixed(2)} €</td>
                  <td style={{ padding: 8, borderBottom: '1px solid #e5e7eb' }}><strong>{month.totalIncomeWithOpening.toFixed(2)} €</strong></td>
                  <td style={{ padding: 8, borderBottom: '1px solid #e5e7eb' }}><strong>{month.totalExpenseWithOpening.toFixed(2)} €</strong></td>
                  <td style={{ padding: 8, borderBottom: '1px solid #e5e7eb', color: month.differenceWithOpening >= 0 ? '#166534' : '#b91c1c' }}>
                    <strong>{month.differenceWithOpening.toFixed(2)} €</strong>
                  </td>
                  <td style={{ padding: 8, borderBottom: '1px solid #e5e7eb' }}><strong>{month.runningBalance.toFixed(2)} €</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button onClick={exportDetailedCashbookPdf} style={secondaryButtonStyle}>
          Kassabuch Detail PDF
        </button>

        <h3 style={headingStyle}>Kassabuch CSV importieren</h3>

        <p style={mutedTextStyle}>
          Unterstützt dein altes Format mit Einnahme/Ausgabe Bar und E-Banking. Leere Zeilen und Summenzeilen werden ignoriert.
          Wenn oben ein Event ausgewählt ist, werden die importierten Einträge diesem Event zugeordnet.
        </p>

        <input
          type="file"
          accept=".csv,text/csv"
          onChange={handleCashbookFile}
          style={inputStyle}
        />

        {cashbookFileName && (
          <p style={mutedTextStyle}>
            Datei: <strong>{cashbookFileName}</strong>
          </p>
        )}

        {cashbookRows.length > 0 && (
          <>
            <h3 style={headingStyle}>Vorschau: {cashbookRows.length} Kassa-Einträge</h3>

            {cashbookRows.slice(0, 5).map((entry, index) => (
              <div key={`${entry.entry_date}-${entry.description}-${index}`} style={cardStyle}>
                <strong>
                  {entry.type === 'einnahme' ? '+' : '-'} {Number(entry.amount || 0).toFixed(2)} €
                </strong>
                <br />
                {entry.entry_date} · {entry.category}
                <br />
                {entry.description}
              </div>
            ))}

            {cashbookRows.length > 5 && (
              <p style={mutedTextStyle}>
                Es werden nur die ersten 5 Einträge angezeigt. Insgesamt werden {cashbookRows.length} Einträge importiert.
              </p>
            )}

            <button onClick={importCashbookRows} style={buttonStyle} disabled={cashbookImporting}>
              {cashbookImporting ? 'Import läuft...' : 'Kassabuch importieren'}
            </button>

            <button
              onClick={() => {
                setCashbookRows([])
                setCashbookFileName('')
              }}
              style={secondaryButtonStyle}
              disabled={cashbookImporting}
            >
              Import abbrechen
            </button>
          </>
        )}

        <h3 style={{ marginTop: 25 }}>Kassa Suche & Filter</h3>

        <input
          placeholder="Kassa suchen..."
          value={cashSearch}
          onChange={(e) => setCashSearch(e.target.value)}
          style={inputStyle}
        />

        <select value={cashTypeFilter} onChange={(e) => setCashTypeFilter(e.target.value)} style={inputStyle}>
          <option value="alle">Alle Typen</option>
          <option value="einnahme">Einnahmen</option>
          <option value="ausgabe">Ausgaben</option>
        </select>

        <select value={cashCategoryFilter} onChange={(e) => setCashCategoryFilter(e.target.value)} style={inputStyle}>
          <option value="alle">Alle Kategorien</option>
          <option value="mitgliedsbeitrag">Mitgliedsbeitrag</option>
          <option value="pfandbecher">Pfandbecher</option>
          <option value="veranstaltung">Veranstaltung</option>
          <option value="fanartikel">Fanartikel</option>
          <option value="sonstiges">Sonstiges</option>
        </select>

        <button onClick={resetCashFilters} style={buttonStyle}>
          Filter zurücksetzen
        </button>

        <p>
          Angezeigt: <strong>{filteredCashEntries.length}</strong> von {getCashEntriesForSelectedYear().length} Kassa-Einträgen
        </p>

        <h3 style={{ marginTop: 25 }}>Kassa-Einträge</h3>

        {filteredCashEntries.map((entry) => (
          <div
            key={entry.id}
            style={{
              ...cardStyle,
              background: entry.type === 'einnahme' ? '#eefbea' : '#fff0f0',
            }}
          >
            <strong>
              {entry.type === 'einnahme' ? '+' : '-'} {Number(entry.amount).toFixed(2)} €
            </strong>
            <br />
            {entry.is_opening ? 'Übertrag' : entry.category} · {entry.entry_date} · {getPaymentMethodLabel(getPaymentMethod(entry))}
            <br />
            {entry.description}

            {entry.receipt_url && (
              <>
                <br />
                <button onClick={() => openReceipt(entry.receipt_url)} style={buttonStyle}>
                  Beleg öffnen
                </button>
              </>
            )}

            <br />
            <button onClick={() => editCashEntry(entry)} style={secondaryButtonStyle}>
              Kassa-Eintrag bearbeiten
            </button>

            <button
              onClick={() => deleteCashEntry(entry)}
              style={{ ...secondaryButtonStyle, borderColor: '#b91c1c', color: '#b91c1c' }}
            >
              Kassa-Eintrag löschen
            </button>
          </div>
        ))}
      </section>
      )}

      <section style={sectionStyle}>
        <h2 style={headingStyle}>Dokumente</h2>

        {(canManageMembers() || isAdmin()) && (
          <>
            <h3 style={headingStyle}>Dokument hochladen</h3>

            <input
              placeholder="Titel, z.B. Statuten 2026"
              value={documentTitle}
              onChange={(e) => setDocumentTitle(e.target.value)}
              style={inputStyle}
            />

            <select value={documentCategory} onChange={(e) => setDocumentCategory(e.target.value)} style={inputStyle}>
              <option value="statuten">Statuten</option>
              <option value="sitzung">Sitzung / Protokoll</option>
              <option value="bescheid">Bescheid</option>
              <option value="rechnung">Rechnung</option>
              <option value="vertrag">Vertrag</option>
              <option value="sonstiges">Sonstiges</option>
            </select>

            <input
              type="date"
              value={documentDate}
              onChange={(e) => setDocumentDate(e.target.value)}
              style={inputStyle}
            />

            <input
              placeholder="Beschreibung"
              value={documentDescription}
              onChange={(e) => setDocumentDescription(e.target.value)}
              style={inputStyle}
            />

            <input
              type="file"
              accept=".pdf,image/*,.doc,.docx,.xls,.xlsx,.csv"
              onChange={(e) => setDocumentFile(e.target.files[0])}
              style={inputStyle}
            />

            <button onClick={uploadDocument} style={buttonStyle}>
              Dokument hochladen
            </button>

            <button onClick={resetDocumentForm} style={secondaryButtonStyle}>
              Formular leeren
            </button>
          </>
        )}

        <h3 style={headingStyle}>Dokumentenliste</h3>

        {documents.length === 0 && <p style={mutedTextStyle}>Noch keine Dokumente vorhanden.</p>}

        {documents.map((document) => (
          <div key={document.id} style={cardStyle}>
            <strong>{document.title}</strong>
            <br />
            Kategorie: {document.category}
            <br />
            Datum: {document.document_date || '-'}
            <br />
            Datei: {document.file_name || document.file_path}
            <br />
            Beschreibung: {document.description || '-'}
            <br />

            <button onClick={() => openDocument(document.file_path)} style={buttonStyle}>
              Öffnen / Download
            </button>

            {isAdmin() && (
              <button
                onClick={() => deleteDocument(document)}
                style={{ ...secondaryButtonStyle, borderColor: '#b91c1c', color: '#b91c1c' }}
              >
                Dokument löschen
              </button>
            )}
          </div>
        ))}
      </section>

      {canManageMembers() && (
      <section style={sectionStyle}>
        <h2 style={headingStyle}>CSV Mitglieder-Import</h2>

        <p style={mutedTextStyle}>
          CSV-Datei mit Spalten wie Vorname, Nachname, E-Mail, Telefon, Mitgliedsart, Straße, PLZ, Ort,
          Geburtsdatum und Kleidergröße hochladen. Trennzeichen Komma oder Semikolon funktionieren.
        </p>

        <input
          type="file"
          accept=".csv,text/csv"
          onChange={handleCsvFile}
          style={inputStyle}
        />

        {csvFileName && (
          <p style={mutedTextStyle}>
            Datei: <strong>{csvFileName}</strong>
          </p>
        )}

        {csvRows.length > 0 && (
          <>
            <h3 style={headingStyle}>Vorschau: {csvRows.length} Mitglieder</h3>

            {csvRows.slice(0, 5).map((member, index) => (
              <div key={`${member.first_name}-${member.last_name}-${index}`} style={cardStyle}>
                <strong>
                  {member.first_name} {member.last_name}
                </strong>
                <br />
                {member.email || '-'}
                <br />
                Mitgliedsart: {member.member_type}
                <br />
                Funktion: {getRoleLabel(member.role || 'mitglied')}
                <br />
                Adresse: {member.street || '-'}, {member.postal_code || '-'} {member.city || '-'}
              </div>
            ))}

            {csvRows.length > 5 && (
              <p style={mutedTextStyle}>
                Es werden nur die ersten 5 Zeilen angezeigt. Insgesamt werden {csvRows.length} Mitglieder importiert.
              </p>
            )}

            <button onClick={importCsvMembers} style={buttonStyle} disabled={csvImporting}>
              {csvImporting ? 'Import läuft...' : 'CSV Mitglieder importieren'}
            </button>

            <button
              onClick={() => {
                setCsvRows([])
                setCsvFileName('')
              }}
              style={secondaryButtonStyle}
              disabled={csvImporting}
            >
              Import abbrechen
            </button>
          </>
        )}
      </section>
      )}

      {canManageMembers() && (
      <section style={sectionStyle}>
        <h2 style={headingStyle}>{editingId ? 'Mitglied bearbeiten' : 'Mitglied hinzufügen'}</h2>

        <input placeholder="Vorname" value={firstName} onChange={(e) => setFirstName(e.target.value)} style={inputStyle} />
        <input placeholder="Nachname" value={lastName} onChange={(e) => setLastName(e.target.value)} style={inputStyle} />
        <input placeholder="E-Mail" value={memberEmail} onChange={(e) => setMemberEmail(e.target.value)} style={inputStyle} />
        <input placeholder="Telefon" value={phone} onChange={(e) => setPhone(e.target.value)} style={inputStyle} />

        <select value={memberType} onChange={(e) => setMemberType(e.target.value)} style={inputStyle}>
          <option value="vollmitglied">Vollmitglied</option>
          <option value="ehrenmitglied">Ehrenmitglied</option>
          <option value="foerdermitglied">Fördermitglied</option>
          <option value="probejahr">Probejahr</option>
        </select>

        <select value={role} onChange={(e) => setRole(e.target.value)} style={inputStyle}>
          <option value="mitglied">Mitglied</option>
          <option value="obmann">Obmann</option>
          <option value="obmann_stv">Obmann-Stellvertreter</option>
          <option value="kassier">Kassier</option>
          <option value="kassier_stv">Kassier-Stellvertreter</option>
          <option value="schriftfuehrer">Schriftführer</option>
          <option value="schriftfuehrer_stv">Schriftführer-Stellvertreter</option>
          <option value="beirat">Beirat</option>
          <option value="helfer">Helfer</option>
        </select>

        {isAdmin() && (
          <select value={appRole} onChange={(e) => setAppRole(e.target.value)} style={inputStyle}>
            <option value="readonly">App-Recht: Nur Lesen</option>
            <option value="checkin">App-Recht: Check-in</option>
            <option value="cashier">App-Recht: Kassa</option>
            <option value="members">App-Recht: Mitgliederverwaltung</option>
            <option value="admin">App-Recht: Admin</option>
          </select>
        )}

        <input placeholder="Straße" value={street} onChange={(e) => setStreet(e.target.value)} style={inputStyle} />
        <input placeholder="PLZ" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} style={inputStyle} />
        <input placeholder="Ort" value={city} onChange={(e) => setCity(e.target.value)} style={inputStyle} />
        <input type="date" value={birthdate} onChange={(e) => setBirthdate(e.target.value)} style={inputStyle} />

        <select value={clothingSize} onChange={(e) => setClothingSize(e.target.value)} style={inputStyle}>
          <option value="">Kleidergröße wählen</option>
          <option>XXS</option>
          <option>XS</option>
          <option>S</option>
          <option>M</option>
          <option>L</option>
          <option>XL</option>
          <option>XXL</option>
          <option>3XL</option>
          <option>4XL</option>
          <option>5XL</option>
        </select>

        <button onClick={saveMember} style={buttonStyle}>
          {editingId ? 'Änderungen speichern' : 'Mitglied speichern'}
        </button>

        {editingId && (
          <button onClick={resetForm} style={buttonStyle}>
            Abbrechen
          </button>
        )}
      </section>
      )}

      <section style={sectionStyle}>
        <h2 style={headingStyle}>Mitglieder & Beiträge 2026</h2>

        <h3 style={headingStyle}>Mitglieder Suche & Filter</h3>

        <input
          placeholder="Mitglied suchen..."
          value={memberSearch}
          onChange={(e) => setMemberSearch(e.target.value)}
          style={inputStyle}
        />

        <select value={memberStatusFilter} onChange={(e) => setMemberStatusFilter(e.target.value)} style={inputStyle}>
          <option value="alle">Alle Status</option>
          <option value="aktiv">Aktiv</option>
          <option value="ruhend">Ruhend</option>
          <option value="ausgetreten">Ausgetreten</option>
        </select>

        <select value={memberTypeFilter} onChange={(e) => setMemberTypeFilter(e.target.value)} style={inputStyle}>
          <option value="alle">Alle Arten</option>
          <option value="vollmitglied">Vollmitglied</option>
          <option value="ehrenmitglied">Ehrenmitglied</option>
          <option value="foerdermitglied">Fördermitglied</option>
          <option value="probejahr">Probejahr</option>
        </select>

        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} style={inputStyle}>
          <option value="alle">Alle Funktionen</option>
          <option value="mitglied">Mitglied</option>
          <option value="obmann">Obmann</option>
          <option value="obmann_stv">Obmann-Stellvertreter</option>
          <option value="kassier">Kassier</option>
          <option value="kassier_stv">Kassier-Stellvertreter</option>
          <option value="schriftfuehrer">Schriftführer</option>
          <option value="schriftfuehrer_stv">Schriftführer-Stellvertreter</option>
          <option value="beirat">Beirat</option>
          <option value="helfer">Helfer</option>
        </select>

        <select value={feeFilter} onChange={(e) => setFeeFilter(e.target.value)} style={inputStyle}>
          <option value="alle">Alle Beiträge</option>
          <option value="offen">Beitrag offen</option>
          <option value="bezahlt">Beitrag bezahlt</option>
          <option value="gratis">Kein Beitrag</option>
        </select>

        <button onClick={resetMemberFilters} style={buttonStyle}>
          Filter zurücksetzen
        </button>

        <p>
          Angezeigt: <strong>{filteredMembers.length}</strong> von {members.length} Mitgliedern
        </p>

        {filteredMembers.map((member) => {
          const fee = getFee(member.id)

          return (
            <div key={member.id} style={cardStyle}>
              <strong>
                {member.first_name} {member.last_name}
              </strong>
              <br />
              {member.email}
              <br />
              {member.phone}
              <br />
              Mitgliedsnummer: {member.member_number || '-'}
              <br />
              Mitgliedsart: {member.member_type}
              <br />
              Vereinsfunktion: {getRoleLabel(member.role || 'mitglied')}
              <br />
              App-Recht: {getAppRoleLabel(member.app_role || 'readonly')}
              <br />
              Adresse: {member.street}, {member.postal_code} {member.city}
              <br />
              Geburtsdatum: {member.birthdate || '-'}
              <br />
              Größe: {member.clothing_size || '-'}
              <br />
              Status: {member.status}

              <hr />

              <strong>Mitgliedsbeitrag 2026</strong>
              <br />
              Betrag: {fee ? `${Number(fee.amount).toFixed(2)} €` : 'kein Beitrag angelegt'}
              <br />
              Status: {fee ? (fee.paid ? 'bezahlt' : 'offen') : '-'}
              <br />
              Zahlungsdatum: {fee?.paid_at || '-'}
              <br />
              Zahlungsart: {fee?.payment_method || '-'}

              <br />
              <br />

              <button onClick={() => editMember(member)} style={buttonStyle}>
                Bearbeiten
              </button>

              <button onClick={() => changeMemberStatus(member.id, 'aktiv')} style={buttonStyle}>
                Aktiv
              </button>

              <button onClick={() => changeMemberStatus(member.id, 'ruhend')} style={buttonStyle}>
                Ruhend
              </button>

              <button onClick={() => changeMemberStatus(member.id, 'ausgetreten')} style={buttonStyle}>
                Ausgetreten
              </button>

              {isAdmin() && (
                <button
                  onClick={() => deleteMember(member)}
                  style={{ ...secondaryButtonStyle, borderColor: '#b91c1c', color: '#b91c1c' }}
                >
                  Mitglied löschen
                </button>
              )}

              <button onClick={() => checkInMember(member)} style={buttonStyle}>
                {isCheckedInToday(member.id) ? 'Heute eingecheckt' : 'Manuell einchecken'}
              </button>

              <button
                onClick={() => setShowQR(showQR === member.id ? null : member.id)}
                style={buttonStyle}
              >
                QR-Code
              </button>

              <button onClick={() => exportMemberCardPdf(member)} style={buttonStyle}>
                Mitgliedsausweis PDF
              </button>

              {showQR === member.id && (
                <div style={{ marginTop: 10 }}>
                  <QRCodeCanvas value={member.member_number || member.id} size={160} />
                  <p style={{ fontSize: 12 }}>
                    QR-Code für {member.first_name} {member.last_name}
                    <br />
                    {member.member_number || 'ohne Mitgliedsnummer'}
                  </p>
                </div>
              )}

              {fee && !fee.paid && (
                <>
                  <button onClick={() => markFeePaid(fee, 'bar')} style={buttonStyle}>
                    Beitrag bar bezahlt
                  </button>

                  <button onClick={() => markFeePaid(fee, 'ueberweisung')} style={buttonStyle}>
                    Beitrag per Überweisung bezahlt
                  </button>
                </>
              )}

              {fee && fee.paid && (
                <button onClick={() => markFeeOpen(fee)} style={buttonStyle}>
                  Beitrag wieder offen setzen
                </button>
              )}
            </div>
          )
        })}
      </section>
    </main>
  )
}
