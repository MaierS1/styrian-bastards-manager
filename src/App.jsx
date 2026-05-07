import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { QRCodeCanvas } from 'qrcode.react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import QRCode from 'qrcode'

const isMobile = window.innerWidth < 768

const colors = {
  black: '#050505',
  white: '#ffffff',
  offWhite: '#f8fafc',
  border: '#d1d5db',
  text: '#111827',
  muted: '#4b5563',
  red: '#c1121f',
  blue: '#003f88',
  navy: '#0b1f3a',
  successBg: '#ecfdf5',
  successText: '#065f46',
  dangerBg: '#fef2f2',
  dangerText: '#991b1b',
  infoBg: '#eff6ff',
  infoText: '#1e3a8a',
}

const pageStyle = {
  minHeight: '100vh',
  background: colors.black,
  color: colors.text,
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
  border: `2px solid ${colors.border}`,
  borderRadius: 10,
  background: colors.white,
  color: colors.text,
  outlineColor: colors.red,
}

const buttonStyle = {
  padding: isMobile ? 15 : 12,
  fontSize: isMobile ? 17 : 15,
  fontWeight: 800,
  marginTop: 6,
  marginRight: isMobile ? 0 : 10,
  marginBottom: 8,
  width: isMobile ? '100%' : 'auto',
  cursor: 'pointer',
  border: `2px solid ${colors.black}`,
  borderRadius: 10,
  background: colors.black,
  color: colors.white,
  boxShadow: '0 2px 4px rgba(0,0,0,0.18)',
}

const secondaryButtonStyle = {
  ...buttonStyle,
  background: colors.white,
  color: colors.black,
  border: `2px solid ${colors.black}`,
}

const dangerButtonStyle = {
  ...secondaryButtonStyle,
  borderColor: colors.red,
  color: colors.red,
}

const cardStyle = {
  border: `1px solid ${colors.border}`,
  padding: isMobile ? 16 : 16,
  marginBottom: 12,
  borderRadius: 14,
  background: colors.white,
  boxShadow: '0 3px 10px rgba(0,0,0,0.10)',
  lineHeight: 1.6,
  fontSize: isMobile ? 16 : 15,
  color: colors.text,
}

const sectionStyle = {
  border: `1px solid ${colors.border}`,
  borderRadius: 16,
  padding: isMobile ? 16 : 24,
  marginBottom: 28,
  background: colors.offWhite,
  boxShadow: '0 4px 18px rgba(0,0,0,0.16)',
  color: colors.text,
}

const headingStyle = {
  color: colors.black,
  marginTop: 0,
  letterSpacing: '-0.02em',
  borderLeft: `6px solid ${colors.red}`,
  paddingLeft: 10,
}

const mutedTextStyle = {
  color: colors.muted,
  lineHeight: 1.5,
}

const appHeaderStyle = {
  background: colors.black,
  color: colors.white,
  padding: isMobile ? 18 : 24,
  borderRadius: 18,
  marginBottom: 22,
  border: `2px solid ${colors.white}`,
  boxShadow: '0 6px 18px rgba(0,0,0,0.28)',
}

const dashboardNumberStyle = {
  fontSize: '30px',
  marginTop: 10,
  marginBottom: 0,
  color: colors.black,
  fontWeight: 900,
}

const dashboardLabelStyle = {
  color: colors.black,
  fontWeight: 900,
  textTransform: 'uppercase',
  letterSpacing: '0.03em',
}

const navStyle = {
  position: 'sticky',
  top: 0,
  zIndex: 50,
  background: colors.black,
  padding: isMobile ? 10 : 14,
  borderRadius: 16,
  marginBottom: 22,
  border: `1px solid ${colors.white}`,
  display: 'flex',
  flexWrap: 'wrap',
  gap: 8,
  boxShadow: '0 6px 18px rgba(0,0,0,0.25)',
}

const navButtonStyle = (active) => ({
  padding: isMobile ? '12px 10px' : '12px 16px',
  borderRadius: 12,
  border: active ? `2px solid ${colors.red}` : `2px solid ${colors.white}`,
  background: active ? colors.white : colors.black,
  color: active ? colors.black : colors.white,
  fontWeight: 900,
  cursor: 'pointer',
  flex: isMobile ? '1 1 45%' : '0 0 auto',
})

export default function App() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [user, setUser] = useState(null)
  const [currentMember, setCurrentMember] = useState(null)

  const [members, setMembers] = useState([])
  const [fees, setFees] = useState([])
  const [cashEntries, setCashEntries] = useState([])
  const [cashMonthClosings, setCashMonthClosings] = useState([])
  const [auditLogs, setAuditLogs] = useState([])
  const [eventCheckins, setEventCheckins] = useState([])
  const [events, setEvents] = useState([])
  const [documents, setDocuments] = useState([])
  const [inventoryItems, setInventoryItems] = useState([])

  const [selectedCashYear, setSelectedCashYear] = useState(String(new Date().getFullYear()))
  const [carryoverFromYear, setCarryoverFromYear] = useState(String(new Date().getFullYear() - 1))
  const [carryoverToYear, setCarryoverToYear] = useState(String(new Date().getFullYear()))

  const [eventName, setEventName] = useState('Heimspiel')
  const [selectedEventId, setSelectedEventId] = useState('')
  const [editingEventId, setEditingEventId] = useState(null)
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

  const [inventorySearch, setInventorySearch] = useState('')
  const [inventoryCategoryFilter, setInventoryCategoryFilter] = useState('alle')
  const [inventoryStatusFilter, setInventoryStatusFilter] = useState('alle')
  const [inventorySortBy, setInventorySortBy] = useState('inventory_number')
  const [inventorySortDirection, setInventorySortDirection] = useState('asc')
  const [inventoryEditingId, setInventoryEditingId] = useState(null)
  const [inventoryNumber, setInventoryNumber] = useState('')
  const [inventoryName, setInventoryName] = useState('')
  const [inventoryCategory, setInventoryCategory] = useState('sonstiges')
  const [inventoryResponsible, setInventoryResponsible] = useState('')
  const [inventoryLocation, setInventoryLocation] = useState('')
  const [inventoryPurchaseDate, setInventoryPurchaseDate] = useState('')
  const [inventoryCondition, setInventoryCondition] = useState('gut')
  const [inventoryStatus, setInventoryStatus] = useState('aktiv')
  const [inventoryLastCheckDate, setInventoryLastCheckDate] = useState('')
  const [inventoryCheckStatus, setInventoryCheckStatus] = useState('OK')
  const [inventorySerialNumber, setInventorySerialNumber] = useState('')
  const [inventoryValue, setInventoryValue] = useState('')
  const [inventoryNotes, setInventoryNotes] = useState('')
  const [inventoryCsvRows, setInventoryCsvRows] = useState([])
  const [inventoryCsvFileName, setInventoryCsvFileName] = useState('')
  const [inventoryImporting, setInventoryImporting] = useState(false)
  const [showInventoryQr, setShowInventoryQr] = useState(null)

  const [restoreData, setRestoreData] = useState(null)
  const [restoreFileName, setRestoreFileName] = useState('')
  const [restoreImporting, setRestoreImporting] = useState(false)

  const [activePage, setActivePage] = useState('dashboard')
  const [invitingMemberId, setInvitingMemberId] = useState(null)

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
    await Promise.all([loadMembers(), loadFees(), loadCashEntries(), loadCashMonthClosings(), loadAuditLogs(), loadEventCheckins(), loadEvents(), loadDocuments(), loadInventoryItems()])
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
    setCashMonthClosings([])
    setAuditLogs([])
    setEventCheckins([])
    setEvents([])
    setDocuments([])
    setInventoryItems([])
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

  async function loadCashMonthClosings() {
    const { data, error } = await supabase
      .from('cash_month_closings')
      .select('*')
      .order('year', { ascending: false })
      .order('month', { ascending: false })

    if (error) return alert(error.message)
    setCashMonthClosings(data || [])
  }

  async function loadAuditLogs() {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      console.warn(error.message)
      return
    }

    setAuditLogs(data || [])
  }

  async function createAuditLog(action, tableName, recordId, oldData = null, newData = null) {
    const { error } = await supabase.from('audit_logs').insert({
      action,
      table_name: tableName,
      record_id: recordId || null,
      old_data: oldData,
      new_data: newData,
      user_id: user?.id || null,
      user_email: user?.email || null,
    })

    if (error) {
      console.warn('Audit Log Fehler:', error.message)
    }
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

  async function loadInventoryItems() {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .order('inventory_number', { ascending: true })

    if (error) {
      console.warn(error.message)
      return
    }

    setInventoryItems(data || [])
  }

  function getFee(memberId) {
    return fees.find((fee) => fee.member_id === memberId)
  }

  function getAvailableCashYears() {
    const years = new Set()

    cashEntries.forEach((entry) => {
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

  function getCashEntriesForYear(year) {
    return cashEntries.filter((entry) => getEntryYear(entry) === String(year))
  }

  function getCashBalanceForYear(year) {
    return getCashEntriesForYear(year).filter((entry) => !entry.is_cancelled).reduce((sum, entry) => {
      const amount = Number(entry.amount || 0)

      if (entry.is_opening) {
        return entry.type === 'einnahme' ? sum + amount : sum - amount
      }

      return entry.type === 'einnahme' ? sum + amount : sum - amount
    }, 0)
  }

  function hasOpeningForYear(year) {
    return cashEntries.some(
      (entry) =>
        getEntryYear(entry) === String(year) &&
        entry.is_opening &&
        String(entry.description || '').toLowerCase().includes('übertrag vorjahr')
    )
  }

  async function createAutomaticCarryover() {
    if (!canManageCash()) return alert('Keine Berechtigung für Kassa.')

    if (!carryoverFromYear || !carryoverToYear) {
      alert('Bitte Quelljahr und Zieljahr auswählen.')
      return
    }

    if (String(carryoverFromYear) === String(carryoverToYear)) {
      alert('Quelljahr und Zieljahr dürfen nicht gleich sein.')
      return
    }

    if (Number(carryoverToYear) !== Number(carryoverFromYear) + 1) {
      const proceed = window.confirm(
        'Das Zieljahr ist nicht direkt das Folgejahr. Trotzdem Übertrag erstellen?'
      )

      if (!proceed) return
    }

    if (hasOpeningForYear(carryoverToYear)) {
      alert(`Für ${carryoverToYear} existiert bereits ein Übertrag Vorjahr.`)
      return
    }

    const balance = getCashBalanceForYear(carryoverFromYear)

    if (balance === 0) {
      const proceed = window.confirm(
        `Der Endsaldo ${carryoverFromYear} ist 0,00 €. Trotzdem Übertrag erstellen?`
      )

      if (!proceed) return
    }

    const confirmed = window.confirm(
      `Übertrag erstellen?\n\nEndsaldo ${carryoverFromYear}: ${balance.toFixed(2)} €\nZieljahr: ${carryoverToYear}\n\nDer Übertrag wird als Startsaldo am 01.01.${carryoverToYear} angelegt.`
    )

    if (!confirmed) return

    const { error } = await supabase.from('cash_entries').insert({
      entry_date: `${carryoverToYear}-01-01`,
      entry_year: Number(carryoverToYear),
      type: balance >= 0 ? 'einnahme' : 'ausgabe',
      category: 'sonstiges',
      payment_method: 'bar',
      is_opening: true,
      amount: Math.abs(balance),
      description: `Übertrag Vorjahr automatisch aus ${carryoverFromYear}`,
      receipt_url: null,
      event_id: null,
    })

    if (error) return alert(error.message)

    await createAuditLog('cancel', 'cash_entries', entry.id, entry, {
      is_cancelled: true,
      cancellation_reason: reason.trim(),
    })

    await loadCashEntries()
    setSelectedCashYear(String(carryoverToYear))
    alert('Übertrag wurde erstellt.')
  }

  function getUpcomingEvents(days = 14) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const maxDate = new Date(today)
    maxDate.setDate(today.getDate() + days)

    return events
      .filter((event) => {
        if (!event.event_date) return false
        if (event.status === 'abgeschlossen') return false

        const eventDate = new Date(event.event_date)
        eventDate.setHours(0, 0, 0, 0)

        return eventDate >= today && eventDate <= maxDate
      })
      .sort((a, b) => new Date(a.event_date) - new Date(b.event_date))
  }

  function getOpenFeeMembers() {
    return members.filter((member) => {
      const fee = getFee(member.id)
      return fee && !fee.paid && Number(fee.amount || 0) > 0
    })
  }

  function getDashboardAlerts() {
    const alerts = []
    const openFeeMembers = getOpenFeeMembers()
    const openFeeTotal = getOpenFeesTotal()
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

    if (missingRequiredDocuments.length > 0) {
      alerts.push({
        type: 'warning',
        title: 'Wichtige Dokumente fehlen',
        message: `${missingRequiredDocuments.join(', ')} noch nicht im Dokumentenbereich hochgeladen.`,
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

  function getAlertStyle(type) {
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


  function getAmountByType(type) {
    if (type === 'vollmitglied') return 70
    if (type === 'foerdermitglied') return 40
    if (type === 'probejahr') return 40
    if (type === 'ehrenmitglied') return 0

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
    return getCashEntriesForSelectedYear().filter((entry) => !entry.is_cancelled).reduce((sum, entry) => {
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

  function getEntryMonth(entry) {
    return Number(String(entry.entry_date || '').slice(5, 7))
  }

  function isCashMonthClosed(year, month) {
    return cashMonthClosings.some(
      (closing) => Number(closing.year) === Number(year) && Number(closing.month) === Number(month)
    )
  }

  function isCashEntryMonthClosed(entry) {
    const year = Number(getEntryYear(entry))
    const month = getEntryMonth(entry)

    if (!year || !month) return false

    return isCashMonthClosed(year, month)
  }

  async function closeCashMonth(year, month) {
    if (!isAdmin()) return alert('Nur Admins dürfen Monate abschließen.')

    if (!year || !month) {
      alert('Jahr und Monat fehlen.')
      return
    }

    if (isCashMonthClosed(year, month)) {
      alert('Dieser Monat ist bereits abgeschlossen.')
      return
    }

    const note = window.prompt(`Notiz zum Monatsabschluss ${String(month).padStart(2, '0')}/${year}:`, '')

    const confirmed = window.confirm(
      `Monat wirklich abschließen?\n\n${String(month).padStart(2, '0')}/${year}\n\nDanach können Einträge in diesem Monat nicht mehr bearbeitet oder storniert werden.`
    )

    if (!confirmed) return

    const { error } = await supabase.from('cash_month_closings').insert({
      year: Number(year),
      month: Number(month),
      closed_by: user?.id || null,
      note: note || null,
    })

    if (error) return alert(error.message)

    await createAuditLog('close_month', 'cash_month_closings', null, null, { year: Number(year), month: Number(month), note: note || null })

    await loadCashMonthClosings()
    alert('Monat wurde abgeschlossen.')
  }

  async function reopenCashMonth(year, month) {
    if (!isAdmin()) return alert('Nur Admins dürfen Monatsabschlüsse aufheben.')

    const confirmed = window.confirm(
      `Monatsabschluss wirklich aufheben?\n\n${String(month).padStart(2, '0')}/${year}`
    )

    if (!confirmed) return

    const { error } = await supabase
      .from('cash_month_closings')
      .delete()
      .eq('year', Number(year))
      .eq('month', Number(month))

    if (error) return alert(error.message)

    await createAuditLog('reopen_month', 'cash_month_closings', null, { year: Number(year), month: Number(month) }, null)

    await loadCashMonthClosings()
    alert('Monatsabschluss wurde aufgehoben.')
  }


  function getCashbookDetailedSummary() {
    const grouped = {}

    getCashEntriesForSelectedYear().filter((entry) => !entry.is_cancelled).forEach((entry) => {
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
      .filter((entry) => entry.type === 'einnahme' && !entry.is_opening && !entry.is_cancelled)
      .reduce((sum, entry) => sum + Number(entry.amount || 0), 0)
  }

  function getExpenseTotal() {
    return getCashEntriesForSelectedYear()
      .filter((entry) => entry.type === 'ausgabe' && !entry.is_opening && !entry.is_cancelled)
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
    return cashEntries.filter((entry) => entry.event_id === eventId && !entry.is_cancelled)
  }

  function getEventIncomeTotal(eventId) {
    return getCashEntriesForEvent(eventId)
      .filter((entry) => entry.type === 'einnahme' && !entry.is_opening && !entry.is_cancelled)
      .reduce((sum, entry) => sum + Number(entry.amount || 0), 0)
  }

  function getEventExpenseTotal(eventId) {
    return getCashEntriesForEvent(eventId)
      .filter((entry) => entry.type === 'ausgabe' && !entry.is_opening && !entry.is_cancelled)
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
          return date.getMonth() + 1 === monthNumber && entry.type === 'einnahme' && !entry.is_cancelled
        })
        .reduce((sum, entry) => sum + Number(entry.amount || 0), 0)

      const expense = getCashEntriesForSelectedYear()
        .filter((entry) => {
          if (!entry.entry_date) return false
          const date = new Date(entry.entry_date)
          return date.getMonth() + 1 === monthNumber && entry.type === 'ausgabe' && !entry.is_cancelled
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

  function getDashboardMonthlyMax() {
    const values = getMonthlyData().flatMap((item) => [item.income, item.expense])
    return Math.max(...values, 1)
  }

  function getDashboardBarHeight(value) {
    return `${Math.max((value / getDashboardMonthlyMax()) * 130, 4)}px`
  }

  function getMemberTypeStats() {
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

  function getFeeStats() {
    const paid = fees.filter((fee) => fee.paid).length
    const open = fees.filter((fee) => !fee.paid && Number(fee.amount || 0) > 0).length
    const free = fees.filter((fee) => Number(fee.amount || 0) === 0).length

    return [
      { label: 'Bezahlt', count: paid, color: colors.blue },
      { label: 'Offen', count: open, color: colors.red },
      { label: 'Gratis', count: free, color: colors.black },
    ]
  }

  function getStatsMax(items) {
    return Math.max(...items.map((item) => item.count), 1)
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

  function downloadTextFile(filename, content, mimeType = 'text/plain;charset=utf-8') {
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

  function csvEscape(value) {
    const text = String(value ?? '')
    return `"${text.replace(/"/g, '""')}"`
  }

  function rowsToCsv(headers, rows) {
    const headerLine = headers.map(csvEscape).join(';')
    const bodyLines = rows.map((row) => headers.map((header) => csvEscape(row[header])).join(';'))

    return [headerLine, ...bodyLines].join('\n')
  }

  function exportMembersCsv() {
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

    downloadTextFile('styrian-bastards-mitglieder.csv', rowsToCsv(headers, rows), 'text/csv;charset=utf-8')
  }

  function exportCashCsv() {
    const rows = getFilteredCashEntries().map((entry) => ({
      Belegnummer: entry.receipt_number || '',
      Datum: entry.entry_date || '',
      Jahr: getEntryYear(entry),
      Typ: entry.type || '',
      Zahlungsart: getPaymentMethodLabel(getPaymentMethod(entry)),
      Kategorie: entry.is_opening ? 'Übertrag' : entry.category || '',
      Event: getEventNameById(entry.event_id) || '',
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
      'Betrag',
      'Beschreibung',
      'Beleg',
      'Uebertrag',
      'Storniert',
      'StornoGrund',
    ]

    downloadTextFile(`styrian-bastards-kassabuch-${selectedCashYear}.csv`, rowsToCsv(headers, rows), 'text/csv;charset=utf-8')
  }

  function exportTaxAdvisorCsv() {
    const rows = getFilteredCashEntries()
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

    downloadTextFile(
      `styrian-bastards-steuerberater-${selectedCashYear}.csv`,
      rowsToCsv(headers, rows),
      'text/csv;charset=utf-8'
    )
  }

  function getCategorySummary() {
    const grouped = {}

    getCashEntriesForSelectedYear()
      .filter((entry) => !entry.is_cancelled && !entry.is_opening)
      .forEach((entry) => {
        const category = entry.category || 'sonstiges'

        if (!grouped[category]) {
          grouped[category] = {
            category,
            income: 0,
            expense: 0,
            balance: 0,
            count: 0,
          }
        }

        const amount = Number(entry.amount || 0)

        if (entry.type === 'einnahme') grouped[category].income += amount
        if (entry.type === 'ausgabe') grouped[category].expense += amount

        grouped[category].balance = grouped[category].income - grouped[category].expense
        grouped[category].count += 1
      })

    return Object.values(grouped).sort((a, b) => a.category.localeCompare(b.category))
  }

  function exportTaxAdvisorProCsv() {
    const rows = getFilteredCashEntries()
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

    downloadTextFile(
      `styrian-bastards-steuerberater-pro-${selectedCashYear}.csv`,
      rowsToCsv(headers, rows),
      'text/csv;charset=utf-8'
    )
  }

  function exportCategorySummaryCsv() {
    const rows = getCategorySummary().map((item) => ({
      Kategorie: item.category,
      Einnahmen: item.income.toFixed(2),
      Ausgaben: item.expense.toFixed(2),
      Ergebnis: item.balance.toFixed(2),
      Buchungen: item.count,
    }))

    const headers = ['Kategorie', 'Einnahmen', 'Ausgaben', 'Ergebnis', 'Buchungen']

    downloadTextFile(
      `styrian-bastards-kategorien-${selectedCashYear}.csv`,
      rowsToCsv(headers, rows),
      'text/csv;charset=utf-8'
    )
  }

  function exportExcelStyleCashbookCsv() {
    const summary = getCashbookDetailedSummary()
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

      rows.push({
        Monat: '',
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

    downloadTextFile(
      `styrian-bastards-kassabuch-excel-style-${selectedCashYear}.csv`,
      rowsToCsv(headers, rows),
      'text/csv;charset=utf-8'
    )
  }

  function exportExcelStyleCashbookPdf() {
    const doc = new jsPDF('landscape')
    const summary = getCashbookDetailedSummary()

    doc.text('Styrian Bastards - Kassabuch wie Excel', 14, 15)
    doc.text(`Jahr/Filter: ${selectedCashYear}`, 14, 23)
    doc.text(`Kassastand: ${getCashBalance().toFixed(2)} EUR`, 14, 31)

    const rows = []

    summary.forEach((month) => {
      rows.push([
        getCashMonthLabel(month.monthKey),
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

      month.entries
        .sort((a, b) => String(a.entry_date || '').localeCompare(String(b.entry_date || '')))
        .forEach((entry) => {
          const paymentMethod = getPaymentMethod(entry)
          const amount = Number(entry.amount || 0).toFixed(2)

          rows.push([
            '',
            entry.receipt_number || '',
            entry.entry_date || '',
            entry.description || '',
            entry.is_opening ? 'Übertrag' : entry.category || '',
            entry.type === 'einnahme' && paymentMethod === 'ebanking' ? `${amount} EUR` : '',
            entry.type === 'ausgabe' && paymentMethod === 'ebanking' ? `${amount} EUR` : '',
            entry.type === 'einnahme' && paymentMethod === 'bar' ? `${amount} EUR` : '',
            entry.type === 'ausgabe' && paymentMethod === 'bar' ? `${amount} EUR` : '',
            entry.is_cancelled ? `STORNIERT: ${entry.cancellation_reason || ''}` : getEventNameById(entry.event_id) || '',
          ])
        })

      rows.push([
        'Summen einzeln',
        '',
        '',
        '',
        '',
        `${(month.openingBankIncome + month.incomeBank).toFixed(2)} EUR`,
        `${(month.openingBankExpense + month.expenseBank).toFixed(2)} EUR`,
        `${(month.openingCashIncome + month.incomeCash).toFixed(2)} EUR`,
        `${(month.openingCashExpense + month.expenseCash).toFixed(2)} EUR`,
        '',
      ])

      rows.push([
        'Einnahmen gesamt',
        `${month.totalIncomeWithOpening.toFixed(2)} EUR`,
        '',
        '',
        '',
        'Summe E-Banking',
        '',
        'Summe Bar',
        '',
        '',
      ])

      rows.push([
        'Ausgaben gesamt',
        `${month.totalExpenseWithOpening.toFixed(2)} EUR`,
        '',
        '',
        '',
        `${month.openingBank.toFixed(2)} EUR`,
        '',
        `${month.openingCash.toFixed(2)} EUR`,
        '',
        '',
      ])

      rows.push([
        'Differenz',
        `${month.differenceWithOpening.toFixed(2)} EUR`,
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
      ])
    })

    autoTable(doc, {
      startY: 40,
      head: [[
        'Monat',
        'Nummer/Summe',
        'Datum',
        'Bezeichnung',
        'Kürzel',
        'Einnahme E-Banking',
        'Ausgabe E-Banking',
        'Einnahme Bar',
        'Ausgabe Bar',
        'Anmerkung',
      ]],
      body: rows,
      styles: { fontSize: 7 },
      headStyles: { fillColor: [5, 5, 5] },
    })

    doc.save(`styrian-bastards-kassabuch-excel-style-${selectedCashYear}.pdf`)
  }

  function exportEventsCsv() {
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

    downloadTextFile('styrian-bastards-events.csv', rowsToCsv(headers, rows), 'text/csv;charset=utf-8')
  }

  function exportCheckinsCsv() {
    const rows = eventCheckins.map((checkin) => ({
      Event: checkin.event_name || '',
      Mitglied: getMemberName(checkin.member_id),
      Datum: checkin.checkin_date || '',
      Uhrzeit: checkin.checkin_time ? new Date(checkin.checkin_time).toLocaleTimeString('de-AT') : '',
    }))

    const headers = ['Event', 'Mitglied', 'Datum', 'Uhrzeit']

    downloadTextFile('styrian-bastards-checkins.csv', rowsToCsv(headers, rows), 'text/csv;charset=utf-8')
  }

  function exportDocumentsCsv() {
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

    downloadTextFile('styrian-bastards-dokumente.csv', rowsToCsv(headers, rows), 'text/csv;charset=utf-8')
  }

  function exportFullBackupJson() {
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
    }

    downloadTextFile(
      `styrian-bastards-backup-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(backup, null, 2),
      'application/json;charset=utf-8'
    )
  }

  function handleRestoreFile(event) {
    const file = event.target.files?.[0]

    if (!file) {
      setRestoreData(null)
      setRestoreFileName('')
      return
    }

    setRestoreFileName(file.name)

    const reader = new FileReader()

    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || '{}'))

        if (!parsed || typeof parsed !== 'object') {
          alert('Backup-Datei ist ungültig.')
          return
        }

        setRestoreData(parsed)
      } catch (error) {
        alert(`Backup konnte nicht gelesen werden: ${error.message}`)
      }
    }

    reader.readAsText(file, 'UTF-8')
  }

  function getRestoreCount(key) {
    return Array.isArray(restoreData?.[key]) ? restoreData[key].length : 0
  }

  function stripSystemFields(row) {
    const { created_at, updated_at, ...cleaned } = row || {}
    return cleaned
  }

  function deduplicateById(rows, existingRows) {
    const existingIds = new Set((existingRows || []).map((row) => row.id).filter(Boolean))

    return (rows || [])
      .filter((row) => row && row.id && !existingIds.has(row.id))
      .map(stripSystemFields)
  }

  async function restoreFullBackup() {
    if (!isAdmin()) return alert('Nur Admins dürfen Backups wiederherstellen.')

    if (!restoreData) {
      alert('Bitte zuerst eine Backup-JSON-Datei auswählen.')
      return
    }

    const confirmed = window.confirm(
      `Backup wiederherstellen?\n\n` +
        `Mitglieder: ${getRestoreCount('members')}\n` +
        `Beiträge: ${getRestoreCount('membership_fees')}\n` +
        `Kassa: ${getRestoreCount('cash_entries')}\n` +
        `Events: ${getRestoreCount('events')}\n` +
        `Check-ins: ${getRestoreCount('event_checkins')}\n` +
        `Dokumente: ${getRestoreCount('documents')}\n\n` +
        `Es werden nur Datensätze mit noch nicht vorhandener ID importiert. Bestehende Daten werden nicht überschrieben.`
    )

    if (!confirmed) return

    setRestoreImporting(true)

    try {
      const restoreSteps = [
        {
          table: 'members',
          backupKey: 'members',
          existing: members,
        },
        {
          table: 'membership_fees',
          backupKey: 'membership_fees',
          existing: fees,
        },
        {
          table: 'events',
          backupKey: 'events',
          existing: events,
        },
        {
          table: 'cash_entries',
          backupKey: 'cash_entries',
          existing: cashEntries,
        },
        {
          table: 'event_checkins',
          backupKey: 'event_checkins',
          existing: eventCheckins,
        },
        {
          table: 'documents',
          backupKey: 'documents',
          existing: documents,
        },
      ]

      const importedSummary = []

      for (const step of restoreSteps) {
        const rows = Array.isArray(restoreData[step.backupKey]) ? restoreData[step.backupKey] : []
        const rowsToInsert = deduplicateById(rows, step.existing)

        if (rowsToInsert.length === 0) {
          importedSummary.push(`${step.table}: 0`)
          continue
        }

        const { error } = await supabase.from(step.table).insert(rowsToInsert)

        if (error) {
          alert(`Fehler beim Restore in ${step.table}: ${error.message}`)
          return
        }

        importedSummary.push(`${step.table}: ${rowsToInsert.length}`)
      }

      setRestoreData(null)
      setRestoreFileName('')
      await loadAll()

      alert(`Backup wurde wiederhergestellt.\n\nImportiert:\n${importedSummary.join('\n')}`)
    } finally {
      setRestoreImporting(false)
    }
  }

  function exportAuditLogsCsv() {
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

    downloadTextFile('styrian-bastards-audit-log.csv', rowsToCsv(headers, rows), 'text/csv;charset=utf-8')
  }

  async function inviteMemberUser(member) {
    if (!isAdmin()) return alert('Nur Admins dürfen Benutzer einladen.')

    if (!member?.id) {
      alert('Mitglied fehlt.')
      return
    }

    const email = String(member.email || '').trim()

    if (!email) {
      alert('Dieses Mitglied hat keine E-Mail-Adresse.')
      return
    }

    const selectedRole = window.prompt(
      `App-Recht für ${member.first_name || ''} ${member.last_name || ''}:\n\nadmin\ncashier\nmembers\ncheckin\nreadonly`,
      member.app_role || 'readonly'
    )

    if (!selectedRole) return

    const allowedRoles = ['admin', 'cashier', 'members', 'checkin', 'readonly']

    if (!allowedRoles.includes(selectedRole)) {
      alert('Ungültige Rolle.')
      return
    }

    const confirmed = window.confirm(
      `Benutzer einladen?\n\n${member.first_name || ''} ${member.last_name || ''}\n${email}\nRolle: ${getAppRoleLabel(selectedRole)}`
    )

    if (!confirmed) return

    setInvitingMemberId(member.id)

    try {
      const { data, error } = await supabase.functions.invoke('invite-member-user', {
        body: {
          member_id: member.id,
          email,
          app_role: selectedRole,
          redirect_to: window.location.origin,
        },
      })

      if (error) {
        alert(error.message)
        return
      }

      if (data?.error) {
        alert(data.error)
        return
      }

      await loadMembers()
      await loadAuditLogs()

      alert('Einladung wurde versendet und das Mitglied wurde mit dem Auth-User verknüpft.')
    } finally {
      setInvitingMemberId(null)
    }
  }

  function normalizeInventoryDate(value) {
    const text = String(value || '').trim()

    if (!text) return null
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text

    const parts = text.split('.')
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0')
      const month = parts[1].padStart(2, '0')
      const year = parts[2]
      return `${year}-${month}-${day}`
    }

    return null
  }

  function getInventoryCsvValue(row, keys) {
    const normalizedRow = {}

    Object.keys(row || {}).forEach((key) => {
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

  function normalizeInventoryCondition(value) {
    const text = String(value || '').trim().toLowerCase()

    if (text.includes('neu')) return 'neu'
    if (text.includes('defekt')) return 'defekt'
    if (text.includes('repar')) return 'reparatur'
    if (text.includes('schlecht')) return 'schlecht'
    if (text.includes('gebraucht')) return 'gebraucht'
    if (text.includes('gut')) return 'gut'

    return 'gut'
  }

  function normalizeInventoryStatus(value) {
    const text = String(value || '').trim().toLowerCase()

    if (text.includes('ausgemustert')) return 'ausgemustert'
    if (text.includes('verliehen')) return 'verliehen'
    if (text.includes('defekt')) return 'defekt'
    if (text.includes('aktiv')) return 'aktiv'

    return 'aktiv'
  }

  function getNextInventoryNumber() {
    const maxNumber = inventoryItems.reduce((max, item) => {
      const match = String(item.inventory_number || '').match(/^SB-(\d+)$/)
      if (!match) return max

      return Math.max(max, Number(match[1]))
    }, 0)

    return `SB-${String(maxNumber + 1).padStart(3, '0')}`
  }

  function resetInventoryForm() {
    setInventoryEditingId(null)
    setInventoryNumber('')
    setInventoryName('')
    setInventoryCategory('sonstiges')
    setInventoryResponsible('')
    setInventoryLocation('')
    setInventoryPurchaseDate('')
    setInventoryCondition('gut')
    setInventoryStatus('aktiv')
    setInventoryLastCheckDate('')
    setInventoryCheckStatus('OK')
    setInventorySerialNumber('')
    setInventoryValue('')
    setInventoryNotes('')
  }

  function inventoryRowToItem(row) {
    const inventoryNumber = getInventoryCsvValue(row, ['Inventar-Nr.', 'Inventar Nr', 'Inventarnummer'])
    const name = getInventoryCsvValue(row, ['Bezeichnung', 'Name'])
    const category = getInventoryCsvValue(row, ['Kategorie'])
    const responsible = getInventoryCsvValue(row, ['Verantwortlich'])
    const location = getInventoryCsvValue(row, ['Standort'])
    const purchaseDate = normalizeInventoryDate(getInventoryCsvValue(row, ['Anschaffungsdatum', 'Kaufdatum']))
    const condition = normalizeInventoryCondition(getInventoryCsvValue(row, ['Zustand']))
    const status = normalizeInventoryStatus(getInventoryCsvValue(row, ['Status']))
    const lastCheckDate = normalizeInventoryDate(getInventoryCsvValue(row, ['Letzte Pruefung', 'Letzte Prüfung']))
    const checkStatus = getInventoryCsvValue(row, ['Pruefstatus', 'Prüfstatus']) || 'OK'
    const qrUrl = getInventoryCsvValue(row, ['QR-URL', 'QR URL']) || getInventoryCsvValue(row, [''])
    const labelLine1 = getInventoryCsvValue(row, ['Etikett Zeile 1']) || 'STYRIAN BASTARDS'
    const labelLine2 = getInventoryCsvValue(row, ['Etikett Zeile 2']) || 'VEREINSEIGENTUM'
    const labelLine3 = getInventoryCsvValue(row, ['Etikett Zeile 3']) || (inventoryNumber ? `Inv.-Nr.: ${inventoryNumber}` : '')
    const labelLine4 = getInventoryCsvValue(row, ['Etikett Zeile 4'])
    const notes = getInventoryCsvValue(row, ['Notizen', 'Notiz'])

    if (!inventoryNumber || !name) return null

    return {
      inventory_number: inventoryNumber,
      name,
      category: category || 'sonstiges',
      responsible: responsible || null,
      location: location || null,
      purchase_date: purchaseDate,
      condition,
      status,
      last_check_date: lastCheckDate,
      check_status: checkStatus,
      qr_url: qrUrl || null,
      label_line_1: labelLine1,
      label_line_2: labelLine2,
      label_line_3: labelLine3,
      label_line_4: labelLine4 || null,
      notes: notes || null,
    }
  }

  function handleInventoryCsvFile(event) {
    const file = event.target.files?.[0]

    if (!file) {
      setInventoryCsvRows([])
      setInventoryCsvFileName('')
      return
    }

    setInventoryCsvFileName(file.name)

    const reader = new FileReader()

    reader.onload = () => {
      try {
        const rows = parseCsvText(String(reader.result || ''))
        const items = rows.map(inventoryRowToItem).filter(Boolean)
        setInventoryCsvRows(items)

        if (items.length === 0) {
          alert('Keine gültigen Inventar-Einträge gefunden. Inventar-Nr. und Bezeichnung sind Pflicht.')
        }
      } catch (error) {
        alert(`Inventar-CSV konnte nicht gelesen werden: ${error.message}`)
      }
    }

    reader.readAsText(file, 'UTF-8')
  }

  async function importInventoryRows() {
    if (!canManageMembers() && !isAdmin()) return alert('Keine Berechtigung für Inventar-Import.')

    if (inventoryCsvRows.length === 0) {
      alert('Bitte zuerst eine Inventar-CSV auswählen.')
      return
    }

    setInventoryImporting(true)

    try {
      const existingNumbers = new Set(inventoryItems.map((item) => item.inventory_number))
      const rowsToInsert = inventoryCsvRows.filter((item) => !existingNumbers.has(item.inventory_number))

      if (rowsToInsert.length === 0) {
        alert('Keine neuen Inventar-Einträge gefunden. Möglicherweise sind alle bereits vorhanden.')
        return
      }

      const { data, error } = await supabase
        .from('inventory_items')
        .insert(rowsToInsert)
        .select()

      if (error) return alert(error.message)

      await createAuditLog('bulk_import', 'inventory_items', null, null, {
        count: rowsToInsert.length,
        file: inventoryCsvFileName,
      })

      setInventoryCsvRows([])
      setInventoryCsvFileName('')
      await loadInventoryItems()

      alert(`${rowsToInsert.length} Inventar-Einträge wurden importiert.`)
    } finally {
      setInventoryImporting(false)
    }
  }

  function editInventoryItem(item) {
    if (!canManageMembers() && !isAdmin()) return alert('Keine Berechtigung für Inventarverwaltung.')

    setInventoryEditingId(item.id)
    setInventoryNumber(item.inventory_number || '')
    setInventoryName(item.name || '')
    setInventoryCategory(item.category || 'sonstiges')
    setInventoryResponsible(item.responsible || '')
    setInventoryLocation(item.location || '')
    setInventoryPurchaseDate(item.purchase_date || '')
    setInventoryCondition(item.condition || 'gut')
    setInventoryStatus(item.status || 'aktiv')
    setInventoryLastCheckDate(item.last_check_date || '')
    setInventoryCheckStatus(item.check_status || 'OK')
    setInventorySerialNumber(item.serial_number || '')
    setInventoryValue(item.value ? String(item.value) : '')
    setInventoryNotes(item.notes || '')

    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function saveInventoryItem() {
    if (!canManageMembers() && !isAdmin()) return alert('Keine Berechtigung für Inventarverwaltung.')

    if (!inventoryName.trim()) {
      alert('Bezeichnung ist Pflicht.')
      return
    }

    const number = inventoryNumber.trim() || getNextInventoryNumber()
    const payload = {
      inventory_number: number,
      name: inventoryName.trim(),
      category: inventoryCategory || 'sonstiges',
      responsible: inventoryResponsible.trim() || null,
      location: inventoryLocation.trim() || null,
      purchase_date: inventoryPurchaseDate || null,
      condition: inventoryCondition || 'gut',
      status: inventoryStatus || 'aktiv',
      last_check_date: inventoryLastCheckDate || null,
      check_status: inventoryCheckStatus || null,
      serial_number: inventorySerialNumber.trim() || null,
      value: inventoryValue ? Number(inventoryValue) : null,
      notes: inventoryNotes.trim() || null,
      label_line_1: 'STYRIAN BASTARDS',
      label_line_2: 'VEREINSEIGENTUM',
      label_line_3: `Inv.-Nr.: ${number}`,
      label_line_4: inventoryName.trim(),
    }

    if (inventoryEditingId) {
      const oldItem = inventoryItems.find((item) => item.id === inventoryEditingId)

      const { error } = await supabase
        .from('inventory_items')
        .update(payload)
        .eq('id', inventoryEditingId)

      if (error) return alert(error.message)

      await createAuditLog('update', 'inventory_items', inventoryEditingId, oldItem, payload)
      alert('Inventar-Eintrag wurde aktualisiert.')
    } else {
      const { data, error } = await supabase
        .from('inventory_items')
        .insert(payload)
        .select()
        .single()

      if (error) return alert(error.message)

      await createAuditLog('insert', 'inventory_items', data?.id, null, data)
      alert('Inventar-Eintrag wurde angelegt.')
    }

    resetInventoryForm()
    await loadInventoryItems()
  }

  async function retireInventoryItem(item) {
    if (!isAdmin()) return alert('Nur Admins dürfen Inventar ausmustern.')

    const reason = window.prompt(`Grund für Ausmustern von ${item.inventory_number} eingeben:`)

    if (!reason || !reason.trim()) return

    const { error } = await supabase
      .from('inventory_items')
      .update({
        status: 'ausgemustert',
        notes: `${item.notes || ''}\nAusgemustert: ${reason.trim()}`.trim(),
      })
      .eq('id', item.id)

    if (error) return alert(error.message)

    await createAuditLog('retire', 'inventory_items', item.id, item, {
      status: 'ausgemustert',
      reason: reason.trim(),
    })

    await loadInventoryItems()
    alert('Inventar wurde ausgemustert.')
  }

  function getInventorySortValue(item, key) {
    if (key === 'inventory_number') {
      const match = String(item.inventory_number || '').match(/(\d+)/)
      return match ? Number(match[1]) : 0
    }

    if (key === 'purchase_date' || key === 'last_check_date') {
      return item[key] ? new Date(item[key]).getTime() : 0
    }

    if (key === 'value') {
      return Number(item.value || 0)
    }

    return String(item[key] || '').toLowerCase()
  }

  function getFilteredInventoryItems() {
    const search = inventorySearch.toLowerCase()

    return inventoryItems
      .filter((item) => {
        const matchesSearch =
          !search ||
          (item.inventory_number || '').toLowerCase().includes(search) ||
          (item.name || '').toLowerCase().includes(search) ||
          (item.category || '').toLowerCase().includes(search) ||
          (item.location || '').toLowerCase().includes(search) ||
          (item.responsible || '').toLowerCase().includes(search)

        const matchesCategory = inventoryCategoryFilter === 'alle' || item.category === inventoryCategoryFilter
        const matchesStatus = inventoryStatusFilter === 'alle' || item.status === inventoryStatusFilter

        return matchesSearch && matchesCategory && matchesStatus
      })
      .sort((a, b) => {
        const valueA = getInventorySortValue(a, inventorySortBy)
        const valueB = getInventorySortValue(b, inventorySortBy)

        if (typeof valueA === 'number' && typeof valueB === 'number') {
          return inventorySortDirection === 'asc' ? valueA - valueB : valueB - valueA
        }

        return inventorySortDirection === 'asc'
          ? String(valueA).localeCompare(String(valueB), 'de-AT')
          : String(valueB).localeCompare(String(valueA), 'de-AT')
      })
  }

  function getInventoryCategories() {
    const categories = new Set(inventoryItems.map((item) => item.category).filter(Boolean))
    return Array.from(categories).sort((a, b) => a.localeCompare(b))
  }

  function getInventoryTotalValue(items = inventoryItems) {
    return items
      .filter((item) => item.status !== 'ausgemustert')
      .reduce((sum, item) => sum + Number(item.value || 0), 0)
  }

  function getInventoryActiveValue() {
    return getInventoryTotalValue(inventoryItems.filter((item) => item.status === 'aktiv'))
  }

  async function deleteInventoryItem(item) {
    if (!isAdmin()) return alert('Nur Admins dürfen Inventar löschen.')

    const confirmed = window.confirm(
      `Inventar-Eintrag wirklich endgültig löschen?\n\n${item.inventory_number || ''} · ${item.name || ''}\n\nEmpfohlen ist normalerweise „Ausmustern“. Löschen entfernt den Eintrag dauerhaft.`
    )

    if (!confirmed) return

    const secondConfirm = window.confirm(
      'Bitte nochmals bestätigen: Dieser Inventar-Eintrag wird endgültig gelöscht.'
    )

    if (!secondConfirm) return

    const { error } = await supabase
      .from('inventory_items')
      .delete()
      .eq('id', item.id)

    if (error) return alert(error.message)

    await createAuditLog('delete', 'inventory_items', item.id, item, null)
    await loadInventoryItems()

    alert('Inventar-Eintrag wurde gelöscht.')
  }

  function getInventoryQrValue(item) {
    return item.qr_url || `${window.location.origin}?inventory=${encodeURIComponent(item.inventory_number || item.id)}`
  }

  function exportInventoryCsv() {
    const rows = getFilteredInventoryItems().map((item) => ({
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

    downloadTextFile('styrian-bastards-inventar.csv', rowsToCsv(headers, rows), 'text/csv;charset=utf-8')
  }

  function exportInventoryPdf() {
    const doc = new jsPDF('landscape')
    const items = getFilteredInventoryItems()

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

    doc.save('styrian-bastards-inventarliste.pdf')
  }

  async function exportInventoryLabelPdf(item) {
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

  async function exportInventoryLabelsPdf() {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    })

    const items = getFilteredInventoryItems()
    const labelWidth = 70
    const labelHeight = 36
    const marginX = 8
    const marginY = 10
    const gapX = 4
    const gapY = 4
    let x = marginX
    let y = marginY

    for (let index = 0; index < items.length; index += 1) {
      const item = items[index]
      const qrDataUrl = await QRCode.toDataURL(getInventoryQrValue(item), {
        width: 180,
        margin: 1,
      })

      doc.rect(x, y, labelWidth, labelHeight)
      doc.setFontSize(8)
      doc.text(item.label_line_1 || 'STYRIAN BASTARDS', x + 4, y + 6)
      doc.setFontSize(7)
      doc.text(item.label_line_2 || 'VEREINSEIGENTUM', x + 4, y + 11)
      doc.text(item.label_line_3 || `Inv.-Nr.: ${item.inventory_number || ''}`, x + 4, y + 16)
      doc.text(item.label_line_4 || item.name || '', x + 4, y + 21, { maxWidth: 42 })
      doc.addImage(qrDataUrl, 'PNG', x + 49, y + 5, 16, 16)
      doc.setFontSize(6)
      doc.text(item.inventory_number || '', x + 50, y + 27)

      x += labelWidth + gapX

      if (x + labelWidth > 290) {
        x = marginX
        y += labelHeight + gapY
      }

      if (y + labelHeight > 200 && index < items.length - 1) {
        doc.addPage()
        x = marginX
        y = marginY
      }
    }

    doc.save('styrian-bastards-inventar-etiketten.pdf')
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
      head: [['Belegnr.', 'Datum', 'Typ', 'Zahlungsart', 'Event', 'Kategorie', 'Beschreibung', 'Betrag', 'Status']],
      body: filteredCash.map((e) => [
        e.receipt_number || '',
        e.entry_date || '',
        e.type || '',
        getPaymentMethodLabel(getPaymentMethod(e)),
        getEventNameById(e.event_id) || '-',
        e.category || '',
        e.description || '',
        `${Number(e.amount || 0).toFixed(2)} EUR`,
        e.is_cancelled ? `STORNIERT: ${e.cancellation_reason || ''}` : 'OK',
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

  function resetEventForm() {
    setEditingEventId(null)
    setNewEventName('')
    setNewEventDate(getTodayDate())
    setNewEventLocation('')
    setNewEventNotes('')
  }

  function editEvent(event) {
    if (!canManageEvents()) return alert('Keine Berechtigung für Event-Verwaltung.')

    setEditingEventId(event.id)
    setNewEventName(event.name || '')
    setNewEventDate(event.event_date || getTodayDate())
    setNewEventLocation(event.location || '')
    setNewEventNotes(event.notes || '')

    window.scrollTo({ top: 0, behavior: 'smooth' })
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

    await createAuditLog('insert', 'events', data?.id, null, data)

    resetEventForm()
    await loadEvents()

    if (data) {
      setSelectedEventId(data.id)
      setEventName(data.name)
    }

    alert('Event wurde angelegt.')
  }

  async function updateEvent() {
    if (!canManageEvents()) return alert('Keine Berechtigung für Event-Verwaltung.')

    if (!editingEventId) {
      alert('Kein Event zum Bearbeiten ausgewählt.')
      return
    }

    if (!newEventName.trim()) {
      alert('Bitte einen Eventnamen eingeben.')
      return
    }

    const { error } = await supabase
      .from('events')
      .update({
        name: newEventName.trim(),
        event_date: newEventDate || getTodayDate(),
        location: newEventLocation.trim() || null,
        notes: newEventNotes.trim() || null,
      })
      .eq('id', editingEventId)

    if (error) return alert(error.message)

    await createAuditLog('update', 'events', editingEventId, events.find((event) => event.id === editingEventId), {
      name: newEventName.trim(),
      event_date: newEventDate || getTodayDate(),
      location: newEventLocation.trim() || null,
      notes: newEventNotes.trim() || null,
    })

    if (selectedEventId === editingEventId) {
      setEventName(newEventName.trim())
    }

    resetEventForm()
    await loadEvents()
    alert('Event wurde aktualisiert.')
  }

  async function updateEventStatus(eventId, status) {
    if (!canManageEvents()) return alert('Keine Berechtigung für Event-Verwaltung.')

    const { error } = await supabase
      .from('events')
      .update({ status })
      .eq('id', eventId)

    if (error) return alert(error.message)

    await createAuditLog('status_change', 'events', eventId, events.find((event) => event.id === eventId), { status })

    loadEvents()
  }

  async function deleteEvent(event) {
    if (!isAdmin()) return alert('Nur Admins dürfen Events löschen.')

    const hasCashEntries = cashEntries.some((entry) => entry.event_id === event.id)
    const hasCheckins = eventCheckins.some((checkin) => checkin.event_name === event.name)

    const warning = [
      `Event wirklich löschen?`,
      ``,
      event.name || '',
      ``,
      hasCashEntries ? 'Achtung: Es gibt Kassa-Einträge zu diesem Event. Diese bleiben bestehen, verlieren aber die Event-Zuordnung.' : '',
      hasCheckins ? 'Achtung: Es gibt Check-ins zu diesem Event. Diese bleiben in der Datenbank, sind aber nicht mehr in der Eventliste sichtbar.' : '',
      ``,
      'Das kann nicht rückgängig gemacht werden.',
    ]
      .filter((line) => line !== '')
      .join('\n')

    const confirmed = window.confirm(warning)

    if (!confirmed) return

    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', event.id)

    if (error) return alert(error.message)

    await createAuditLog('delete', 'events', event.id, event, null)

    if (selectedEventId === event.id) {
      setSelectedEventId('')
      setCashEventId('')
      setEventName('')
    }

    if (editingEventId === event.id) {
      resetEventForm()
    }

    await loadEvents()
    await loadCashEntries()

    alert('Event wurde gelöscht.')
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
      const oldMember = members.find((member) => member.id === editingId)
      const { error } = await supabase.from('members').update(payload).eq('id', editingId)
      if (error) return alert(error.message)
      await createAuditLog('update', 'members', editingId, oldMember, payload)
    } else {
      const { data, error } = await supabase.from('members').insert(payload).select().single()
      if (error) return alert(error.message)
      await createAuditLog('insert', 'members', data.id, null, data)

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

    const oldMember = members.find((member) => member.id === id)
    const { error } = await supabase.from('members').update({ status }).eq('id', id)
    if (error) return alert(error.message)
    await createAuditLog('status_change', 'members', id, oldMember, { status })
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
    await createAuditLog('payment_mark_paid', 'membership_fees', fee.id, fee, { paid: true, paid_at: today, payment_method: paymentMethod })
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
    await createAuditLog('payment_mark_open', 'membership_fees', fee.id, fee, { paid: false, paid_at: null })
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
      const blockedRows = cashbookRows.filter((row) => {
        const year = Number(row.entry_year || String(row.entry_date || '').slice(0, 4))
        const month = Number(String(row.entry_date || '').slice(5, 7))
        return isCashMonthClosed(year, month)
      })

      if (blockedRows.length > 0) {
        alert('Import abgebrochen: Mindestens ein Eintrag liegt in einem bereits abgeschlossenen Monat.')
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

      if (error) return alert(error.message)

      await createAuditLog('bulk_import', 'cash_entries', null, null, {
        count: rowsWithReceiptNumbers.length,
        file: cashbookFileName,
      })

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
    if (entry.is_cancelled) return alert('Stornierte Einträge können nicht bearbeitet werden.')
    if (isCashEntryMonthClosed(entry)) return alert('Dieser Monat ist abgeschlossen. Der Eintrag kann nicht bearbeitet werden.')

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

  function getNextReceiptNumber(year = new Date().getFullYear()) {
    const prefix = `${year}-`

    const maxNumber = cashEntries.reduce((max, entry) => {
      const receiptNumber = String(entry.receipt_number || '')

      if (!receiptNumber.startsWith(prefix)) return max

      const numberPart = Number(receiptNumber.replace(prefix, ''))
      return Number.isFinite(numberPart) ? Math.max(max, numberPart) : max
    }, 0)

    return `${prefix}${String(maxNumber + 1).padStart(3, '0')}`
  }

  function getCashEntrySignedAmount(entry) {
    const amount = Number(entry.amount || 0)
    return entry.type === 'einnahme' ? amount : -amount
  }

  async function updateCashEntry() {
    if (!canManageCash()) return alert('Keine Berechtigung für Kassa.')

    const editingEntry = cashEntries.find((entry) => entry.id === editingCashId)

    if (editingEntry && isCashEntryMonthClosed(editingEntry)) {
      alert('Dieser Monat ist abgeschlossen. Der Eintrag kann nicht bearbeitet werden.')
      return
    }

    if (!editingCashId) {
      alert('Kein Kassa-Eintrag zum Bearbeiten ausgewählt.')
      return
    }

    const todayYear = Number(new Date().getFullYear())
    const todayMonth = Number(new Date().toISOString().slice(5, 7))

    if (isCashMonthClosed(todayYear, todayMonth)) {
      alert('Der aktuelle Monat ist abgeschlossen. Es können keine neuen Kassa-Einträge angelegt werden.')
      return
    }

    if (!cashAmount || !cashDescription) {
      alert('Betrag und Beschreibung sind Pflicht.')
      return
    }

    if (cashType === 'ausgabe' && !receiptFile) {
      const proceedWithoutReceipt = window.confirm(
        'Für Ausgaben sollte ein Beleg hochgeladen werden. Trotzdem ohne Beleg speichern?'
      )

      if (!proceedWithoutReceipt) return
    }

    const oldCashEntry = cashEntries.find((entry) => entry.id === editingCashId)

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

    await createAuditLog('update', 'cash_entries', editingCashId, oldCashEntry, {
      type: cashType,
      category: cashCategory,
      event_id: cashEventId || null,
      payment_method: cashPaymentMethod,
      amount: Number(cashAmount),
      description: cashDescription,
    })

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
      entry_year: Number(new Date().getFullYear()),
      receipt_number: getNextReceiptNumber(new Date().getFullYear()),
      is_cancelled: false,
      type: cashType,
      category: cashCategory,
      event_id: cashEventId || null,
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

    const { data, error } = await supabase.from('cash_entries').insert({
      ...baseEntry,
      receipt_url: receiptUrl,
    }).select().single()

    if (error) return alert(error.message)

    await createAuditLog('insert', 'cash_entries', data?.id, null, data)

    resetCashForm()

    loadCashEntries()
  }

  async function deleteCashEntry(entry) {
    if (!canManageCash()) return alert('Keine Berechtigung für Kassa.')

    if (isCashEntryMonthClosed(entry)) {
      alert('Dieser Monat ist abgeschlossen. Der Eintrag kann nicht storniert werden.')
      return
    }

    if (entry.is_cancelled) {
      alert('Dieser Kassa-Eintrag ist bereits storniert.')
      return
    }

    const reason = window.prompt(
      `Storno-Grund eingeben:\n\n${entry.receipt_number || 'ohne Belegnummer'} · ${entry.type === 'einnahme' ? 'Einnahme' : 'Ausgabe'} ${Number(entry.amount || 0).toFixed(2)} €\n${entry.description || ''}`
    )

    if (!reason || !reason.trim()) {
      alert('Storno abgebrochen. Ein Grund ist erforderlich.')
      return
    }

    const confirmed = window.confirm(
      `Kassa-Eintrag wirklich stornieren?\n\nBelegnummer: ${entry.receipt_number || '-'}\nGrund: ${reason}\n\nDer Eintrag bleibt im Kassabuch sichtbar und nachvollziehbar.`
    )

    if (!confirmed) return

    const { error } = await supabase
      .from('cash_entries')
      .update({
        is_cancelled: true,
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason.trim(),
      })
      .eq('id', entry.id)

    if (error) return alert(error.message)

    await loadCashEntries()
    alert('Kassa-Eintrag wurde storniert.')
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

    await createAuditLog('insert', 'documents', null, null, {
      title: documentTitle,
      category: documentCategory,
      file_path: filePath,
      file_name: documentFile.name,
    })

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

    await createAuditLog('delete', 'documents', document.id, document, null)

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
      <h1 style={{ ...headingStyle, color: colors.white }}>
        Styrian Bastards Vereinsmanager
      </h1>

      <p style={{ color: colors.white }}>
        Eingeloggt als:{' '}
        <strong style={{ color: colors.white }}>
          {user.email}
        </strong>
      </p>

      <p style={{ color: colors.white }}>
        App-Recht:{' '}
        <strong style={{ color: colors.white }}>
          {getAppRoleLabel(getAppRole())}
        </strong>

        {currentMember && (
          <>
            {' '}· Mitglied:{' '}
            <strong style={{ color: colors.white }}>
              {currentMember.first_name} {currentMember.last_name}
            </strong>
          </>
        )}
      </p>

      {!currentMember && (
        <div style={{ ...cardStyle, background: '#fef2f2', color: '#991b1b', borderColor: '#b91c1c' }}>
          <strong>Kein Mitglied mit diesem Login verknüpft.</strong>
          <br />
          Bitte in Supabase beim passenden Mitglied die Spalte auth_user_id mit deiner Supabase User ID befüllen und app_role setzen.
        </div>
      )}

      <p style={{ color: isOnline ? '#4ade80' : '#f87171' }}>
        Verbindung:{' '}
        <strong>
          {isOnline ? 'Online' : 'Offline'}
        </strong>
      </p>

      <button onClick={logout} style={secondaryButtonStyle}>
        Logout
      </button>

      <nav style={navStyle}>
        {[
          ['dashboard', 'Dashboard'],
          ['members', 'Mitglieder'],
          ['cash', 'Kassa'],
          ['events', 'Events'],
          ['documents', 'Dokumente'],
          ['inventory', 'Inventar'],
          ['admin', 'Admin / Export'],
        ].map(([pageKey, label]) => (
          <button
            key={pageKey}
            onClick={() => setActivePage(pageKey)}
            style={navButtonStyle(activePage === pageKey)}
          >
            {label}
          </button>
        ))}
      </nav>

      {activePage === 'cash' && !canManageCash() && (
        <section style={sectionStyle}>
          <h2 style={headingStyle}>Kassa</h2>
          <p>Für diesen Bereich hast du keine Berechtigung.</p>
        </section>
      )}

      {activePage === 'members' && !canManageMembers() && (
        <section style={sectionStyle}>
          <h2 style={headingStyle}>Mitglieder</h2>
          <p>Für die Mitgliederverwaltung hast du keine Bearbeitungsrechte. Die Mitgliederliste bleibt weiter unten sichtbar, wenn sie freigegeben ist.</p>
        </section>
      )}

      {activePage === 'admin' && (
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

        <button onClick={exportTaxAdvisorCsv} style={secondaryButtonStyle}>
          Steuerberater CSV
        </button>

        <button onClick={exportTaxAdvisorProCsv} style={secondaryButtonStyle}>
          Steuerberater PRO CSV
        </button>

        <button onClick={exportCategorySummaryCsv} style={secondaryButtonStyle}>
          Kategorien-Auswertung CSV
        </button>

        <button onClick={exportExcelStyleCashbookCsv} style={secondaryButtonStyle}>
          Kassabuch wie Excel CSV
        </button>

        <button onClick={exportExcelStyleCashbookPdf} style={secondaryButtonStyle}>
          Kassabuch wie Excel PDF
        </button>
        <button onClick={exportOpenFeesPdf} style={secondaryButtonStyle}>
          Offene Beiträge PDF
        </button>
        <button onClick={exportCheckinsPdf} style={secondaryButtonStyle}>
          Anwesenheitsliste PDF
        </button>
      </div>
      )}

      {activePage === 'admin' && (
      <section style={sectionStyle}>
        <h2 style={headingStyle}>Export & Backup</h2>

        <p style={mutedTextStyle}>
          Hier kannst du deine Vereinsdaten lokal sichern. CSV-Dateien eignen sich für Excel/LibreOffice,
          das JSON-Backup enthält alle Hauptdaten als Sicherheitskopie.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          <button onClick={exportMembersCsv} style={secondaryButtonStyle}>
            Mitglieder CSV
          </button>

          <button onClick={exportCashCsv} style={secondaryButtonStyle}>
            Kassabuch CSV
          </button>

          <button onClick={exportTaxAdvisorCsv} style={secondaryButtonStyle}>
            Steuerberater CSV
          </button>

          <button onClick={exportTaxAdvisorProCsv} style={secondaryButtonStyle}>
            Steuerberater PRO CSV
          </button>

          <button onClick={exportCategorySummaryCsv} style={secondaryButtonStyle}>
            Kategorien-Auswertung CSV
          </button>

          <button onClick={exportAuditLogsCsv} style={secondaryButtonStyle}>
            Audit Log CSV
          </button>

          <button onClick={exportExcelStyleCashbookCsv} style={secondaryButtonStyle}>
            Kassabuch wie Excel CSV
          </button>

          <button onClick={exportExcelStyleCashbookPdf} style={secondaryButtonStyle}>
            Kassabuch wie Excel PDF
          </button>

          <button onClick={exportEventsCsv} style={secondaryButtonStyle}>
            Events CSV
          </button>

          <button onClick={exportCheckinsCsv} style={secondaryButtonStyle}>
            Check-ins CSV
          </button>

          <button onClick={exportDocumentsCsv} style={secondaryButtonStyle}>
            Dokumentenliste CSV
          </button>

          <button onClick={exportInventoryCsv} style={secondaryButtonStyle}>
            Inventar CSV
          </button>

          <button onClick={exportInventoryPdf} style={secondaryButtonStyle}>
            Inventarliste PDF
          </button>

          <button onClick={exportInventoryLabelsPdf} style={secondaryButtonStyle}>
            Inventar Etiketten PDF
          </button>

          <button onClick={exportFullBackupJson} style={buttonStyle}>
            Komplett-Backup JSON
          </button>
        </div>

        <p style={mutedTextStyle}>
          Hinweis: Das JSON-Backup enthält die Dokumenten-Metadaten, aber nicht die eigentlichen hochgeladenen Dateien.
          Diese liegen weiterhin im Supabase Storage.
        </p>

        {isAdmin() && (
          <div style={{ ...cardStyle, borderTop: `6px solid ${colors.red}` }}>
            <h3 style={headingStyle}>Backup wiederherstellen</h3>

            <p style={mutedTextStyle}>
              Wähle eine zuvor exportierte JSON-Backup-Datei aus. Die App importiert nur Datensätze,
              deren ID noch nicht vorhanden ist. Bestehende Daten werden nicht überschrieben.
            </p>

            <input
              type="file"
              accept=".json,application/json"
              onChange={handleRestoreFile}
              style={inputStyle}
            />

            {restoreFileName && (
              <p style={mutedTextStyle}>
                Datei: <strong>{restoreFileName}</strong>
              </p>
            )}

            {restoreData && (
              <div style={{ ...cardStyle, background: colors.infoBg, borderColor: colors.blue }}>
                <strong style={{ color: colors.infoText }}>Restore-Vorschau</strong>
                <br />
                Exportiert am: {restoreData.exported_at || '-'}
                <br />
                Mitglieder: {getRestoreCount('members')}
                <br />
                Beiträge: {getRestoreCount('membership_fees')}
                <br />
                Kassa-Einträge: {getRestoreCount('cash_entries')}
                <br />
                Events: {getRestoreCount('events')}
                <br />
                Check-ins: {getRestoreCount('event_checkins')}
                <br />
                Dokumente: {getRestoreCount('documents')}
              </div>
            )}

            <button onClick={restoreFullBackup} style={buttonStyle} disabled={restoreImporting || !restoreData}>
              {restoreImporting ? 'Restore läuft...' : 'Backup wiederherstellen'}
            </button>

            <button
              onClick={() => {
                setRestoreData(null)
                setRestoreFileName('')
              }}
              style={secondaryButtonStyle}
              disabled={restoreImporting}
            >
              Restore abbrechen
            </button>
          </div>
        )}
      </section>
      )}

      {activePage === 'events' && (
      <>
      <section style={sectionStyle}>
        <h2 style={headingStyle}>Event-Verwaltung</h2>

        <h3 style={headingStyle}>{editingEventId ? 'Event bearbeiten' : 'Neues Event anlegen'}</h3>

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

        {editingEventId ? (
          <>
            <button onClick={updateEvent} style={buttonStyle}>
              Änderungen speichern
            </button>
            <button onClick={resetEventForm} style={secondaryButtonStyle}>
              Bearbeiten abbrechen
            </button>
          </>
        ) : (
          <button onClick={createEvent} style={buttonStyle}>
            Event anlegen
          </button>
        )}

        <h3 style={headingStyle}>Event auswählen</h3>

        <select
          value={selectedEventId}
          onChange={(e) => {
            const eventId = e.target.value
            setSelectedEventId(eventId)
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
          <div style={{ ...cardStyle, background: '#ecfdf5', color: '#065f46' }}>
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

            <button onClick={() => editEvent(event)} style={secondaryButtonStyle}>
              Event bearbeiten
            </button>

            {isAdmin() && (
              <button
                onClick={() => deleteEvent(event)}
                style={{ ...secondaryButtonStyle, borderColor: '#b91c1c', color: '#b91c1c' }}
              >
                Event löschen
              </button>
            )}
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
      </>
      )}

      {activePage === 'dashboard' && (
      <section style={sectionStyle}>
        <h2 style={headingStyle}>Dashboard</h2>

<div style={{ ...cardStyle, borderTop: `6px solid ${colors.red}` }}>
  <strong style={dashboardLabelStyle}>Smart Alerts</strong>

  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12, marginTop: 14 }}>
    {getDashboardAlerts().map((alert, index) => (
      <div
        key={`${alert.title}-${index}`}
        style={{
          border: '2px solid',
          borderRadius: 12,
          padding: 14,
          ...getAlertStyle(alert.type),
        }}
      >
        <strong style={{ color: 'inherit' }}>{alert.title}</strong>
        <br />
        <span style={{ color: 'inherit' }}>{alert.message}</span>
      </div>
    ))}
  </div>
</div>

<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 15 }}>

  <div style={{ ...cardStyle, background: colors.white, borderTop: `6px solid ${colors.black}` }}>
    <strong style={dashboardLabelStyle}>Kassastand</strong>
    <h2 style={dashboardNumberStyle}>{getCashBalance().toFixed(2)} €</h2>
  </div>

  <div style={{ ...cardStyle, background: colors.white, borderTop: `6px solid ${colors.blue}` }}>
    <strong style={dashboardLabelStyle}>Einnahmen</strong>
    <h2 style={dashboardNumberStyle}>{getIncomeTotal().toFixed(2)} €</h2>
  </div>

  <div style={{ ...cardStyle, background: colors.white, borderTop: `6px solid ${colors.red}` }}>
    <strong style={dashboardLabelStyle}>Ausgaben</strong>
    <h2 style={dashboardNumberStyle}>{getExpenseTotal().toFixed(2)} €</h2>
  </div>

  <div style={{ ...cardStyle, background: colors.white, borderTop: `6px solid ${colors.navy}` }}>
    <strong style={dashboardLabelStyle}>Ergebnis</strong>
    <h2 style={dashboardNumberStyle}>{(getIncomeTotal() - getExpenseTotal()).toFixed(2)} €</h2>
  </div>

  <div style={{ ...cardStyle, background: colors.white, borderTop: `6px solid ${colors.black}` }}>
    <strong style={dashboardLabelStyle}>Inventarwert</strong>
    <h2 style={dashboardNumberStyle}>{getInventoryTotalValue().toFixed(2)} €</h2>
  </div>

</div>

<br />

<div style={cardStyle}>
  <strong>Offene Mitgliedsbeiträge</strong>
  <br />
  Anzahl offen: {members.filter(m => getFee(m.id)?.status !== 'bezahlt').length}
  <br />
  Summe offen: {
    members
      .filter(m => getFee(m.id)?.status !== 'bezahlt')
      .reduce((sum, m) => sum + (getFee(m.id)?.amount || 0), 0)
      .toFixed(2)
  } €
</div>

<br />

<div style={cardStyle}>
  <strong>Nächstes Event</strong>
  <br />
  {events.length > 0 ? (
    <>
      {events[0].name}
      <br />
      {events[0].event_date}
      <br />
      Status: {events[0].status}
    </>
  ) : (
    'Kein Event vorhanden'
  )}
</div>

<br />

<div style={{ ...cardStyle, marginTop: 18 }}>
  <strong style={dashboardLabelStyle}>Monatsdiagramm Einnahmen / Ausgaben</strong>

  <div style={{ overflowX: 'auto', marginTop: 16 }}>
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 18, minWidth: 850, height: 190 }}>
      {getMonthlyData().map((item) => (
        <div key={item.month} style={{ textAlign: 'center', width: 62 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 5, height: 140 }}>
            <div
              title={`Einnahmen ${item.month}: ${item.income.toFixed(2)} €`}
              style={{
                width: 23,
                height: getDashboardBarHeight(item.income),
                background: colors.blue,
                borderRadius: '6px 6px 0 0',
              }}
            />
            <div
              title={`Ausgaben ${item.month}: ${item.expense.toFixed(2)} €`}
              style={{
                width: 23,
                height: getDashboardBarHeight(item.expense),
                background: colors.red,
                borderRadius: '6px 6px 0 0',
              }}
            />
          </div>
          <strong style={{ color: colors.black }}>{item.month}</strong>
          <br />
          <span style={{ fontSize: 11, color: colors.blue }}>{item.income.toFixed(0)}€</span>
          {' / '}
          <span style={{ fontSize: 11, color: colors.red }}>{item.expense.toFixed(0)}€</span>
        </div>
      ))}
    </div>
  </div>

  <p style={mutedTextStyle}>
    <strong style={{ color: colors.blue }}>Blau = Einnahmen</strong>
    {' · '}
    <strong style={{ color: colors.red }}>Rot = Ausgaben</strong>
  </p>
</div>

<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 15 }}>
  <div style={cardStyle}>
    <strong style={dashboardLabelStyle}>Mitglieder nach Art</strong>

    <div style={{ marginTop: 14 }}>
      {getMemberTypeStats().map((item) => (
        <div key={item.value} style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
            <span style={{ color: colors.black }}>{item.label}</span>
            <strong style={{ color: colors.black }}>{item.count}</strong>
          </div>
          <div style={{ height: 10, background: '#e5e7eb', borderRadius: 999, overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${(item.count / getStatsMax(getMemberTypeStats())) * 100}%`,
                background: colors.black,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  </div>

  <div style={cardStyle}>
    <strong style={dashboardLabelStyle}>Beitragsstatus</strong>

    <div style={{ marginTop: 14 }}>
      {getFeeStats().map((item) => (
        <div key={item.label} style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
            <span style={{ color: colors.black }}>{item.label}</span>
            <strong style={{ color: colors.black }}>{item.count}</strong>
          </div>
          <div style={{ height: 10, background: '#e5e7eb', borderRadius: 999, overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${(item.count / getStatsMax(getFeeStats())) * 100}%`,
                background: item.color,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  </div>
</div>

<br />

<div style={cardStyle}>
  <strong>Letzte Aktivitäten</strong>
  <br />

  <u>Kassa:</u>
  {cashEntries.slice(0, 3).map(e => (
    <div key={e.id}>
      {e.entry_date} · {e.amount} €
    </div>
  ))}

  <br />

  <u>Dokumente:</u>
  {documents.slice(0, 3).map(d => (
    <div key={d.id}>
      {d.title}
    </div>
  ))}
</div>
</section>
      )}

{activePage === 'cash' && canManageCash() && (
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

        <h3 style={headingStyle}>Automatischer Jahresübertrag</h3>

        <div style={{ ...cardStyle, borderTop: `6px solid ${colors.blue}` }}>
          <p style={mutedTextStyle}>
            Berechnet den Endsaldo eines Jahres und legt im Folgejahr automatisch einen Startsaldo
            als „Übertrag Vorjahr“ an. Die App prüft vorher, ob im Zieljahr bereits ein Übertrag existiert.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(180px, 260px))', gap: 12 }}>
            <div>
              <label style={{ fontWeight: 800, color: colors.black }}>Von Jahr</label>
              <select value={carryoverFromYear} onChange={(e) => setCarryoverFromYear(e.target.value)} style={inputStyle}>
                {getAvailableCashYears().map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontWeight: 800, color: colors.black }}>Nach Jahr</label>
              <input
                type="number"
                value={carryoverToYear}
                onChange={(e) => setCarryoverToYear(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          <p>
            Endsaldo {carryoverFromYear}:{' '}
            <strong style={{ color: colors.black }}>
              {getCashBalanceForYear(carryoverFromYear).toFixed(2)} €
            </strong>
          </p>

          <p>
            Übertrag in {carryoverToYear}:{' '}
            <strong style={{ color: hasOpeningForYear(carryoverToYear) ? colors.red : colors.successText }}>
              {hasOpeningForYear(carryoverToYear) ? 'bereits vorhanden' : 'noch nicht vorhanden'}
            </strong>
          </p>

          <button onClick={createAutomaticCarryover} style={buttonStyle}>
            Übertrag automatisch erstellen
          </button>
        </div>

        <h3 style={headingStyle}>Monatsabschlüsse</h3>

        <div style={cardStyle}>
          {cashMonthClosings.length === 0 && <p style={mutedTextStyle}>Noch keine Monate abgeschlossen.</p>}

          {cashMonthClosings.map((closing) => (
            <div key={closing.id} style={{ marginBottom: 10 }}>
              <strong>
                {String(closing.month).padStart(2, '0')}/{closing.year}
              </strong>
              {' '}abgeschlossen am{' '}
              {closing.closed_at ? new Date(closing.closed_at).toLocaleString('de-AT') : '-'}
              {closing.note && (
                <>
                  <br />
                  Notiz: {closing.note}
                </>
              )}
            </div>
          ))}
        </div>

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

        {cashType === 'ausgabe' && !receiptFile && (
          <p style={{ ...mutedTextStyle, color: colors.red }}>
            Hinweis: Für Ausgaben sollte ein Beleg hochgeladen werden.
          </p>
        )}

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
                  'Abschluss',
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
                  <td style={{ padding: 8, borderBottom: '1px solid #e5e7eb' }}>
                    {isCashMonthClosed(Number(month.monthKey.slice(0, 4)), Number(month.monthKey.slice(5, 7))) ? (
                      <>
                        <strong style={{ color: colors.successText }}>Abgeschlossen</strong>
                        {isAdmin() && (
                          <>
                            <br />
                            <button
                              onClick={() => reopenCashMonth(Number(month.monthKey.slice(0, 4)), Number(month.monthKey.slice(5, 7)))}
                              style={secondaryButtonStyle}
                            >
                              Öffnen
                            </button>
                          </>
                        )}
                      </>
                    ) : (
                      <>
                        <strong style={{ color: colors.red }}>Offen</strong>
                        {isAdmin() && (
                          <>
                            <br />
                            <button
                              onClick={() => closeCashMonth(Number(month.monthKey.slice(0, 4)), Number(month.monthKey.slice(5, 7)))}
                              style={buttonStyle}
                            >
                              Abschließen
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button onClick={exportDetailedCashbookPdf} style={secondaryButtonStyle}>
          Kassabuch Detail PDF
        </button>

        <button onClick={exportTaxAdvisorCsv} style={secondaryButtonStyle}>
          Steuerberater CSV
        </button>

        <button onClick={exportExcelStyleCashbookCsv} style={secondaryButtonStyle}>
          Kassabuch wie Excel CSV
        </button>

        <button onClick={exportExcelStyleCashbookPdf} style={secondaryButtonStyle}>
          Kassabuch wie Excel PDF
        </button>

        <h3 style={headingStyle}>Kategorien-Auswertung</h3>

        <div style={{ ...cardStyle, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 650 }}>
            <thead>
              <tr>
                {['Kategorie', 'Einnahmen', 'Ausgaben', 'Ergebnis', 'Buchungen'].map((header) => (
                  <th key={header} style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #d1d5db' }}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {getCategorySummary().map((item) => (
                <tr key={item.category}>
                  <td style={{ padding: 8, borderBottom: '1px solid #e5e7eb' }}>{item.category}</td>
                  <td style={{ padding: 8, borderBottom: '1px solid #e5e7eb' }}>{item.income.toFixed(2)} €</td>
                  <td style={{ padding: 8, borderBottom: '1px solid #e5e7eb' }}>{item.expense.toFixed(2)} €</td>
                  <td style={{ padding: 8, borderBottom: '1px solid #e5e7eb' }}>
                    <strong>{item.balance.toFixed(2)} €</strong>
                  </td>
                  <td style={{ padding: 8, borderBottom: '1px solid #e5e7eb' }}>{item.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

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
              background: entry.is_cancelled ? '#f3f4f6' : entry.type === 'einnahme' ? '#eefbea' : '#fff0f0',
              opacity: entry.is_cancelled ? 0.78 : 1,
            }}
          >
            <strong>
              {entry.type === 'einnahme' ? '+' : '-'} {Number(entry.amount).toFixed(2)} €
            </strong>
            <br />
            Belegnr.: {entry.receipt_number || '-'} · {entry.is_opening ? 'Übertrag' : entry.category} · {entry.entry_date} · {getPaymentMethodLabel(getPaymentMethod(entry))}
            {isCashEntryMonthClosed(entry) && (
              <>
                {' '}· <strong style={{ color: colors.successText }}>Monat abgeschlossen</strong>
              </>
            )}
            <br />
            {entry.description}
            {entry.is_cancelled && (
              <>
                <br />
                <strong style={{ color: colors.red }}>STORNIERT</strong>
                <br />
                Grund: {entry.cancellation_reason || '-'}
              </>
            )}

            {entry.receipt_url && (
              <>
                <br />
                <button onClick={() => openReceipt(entry.receipt_url)} style={buttonStyle}>
                  Beleg öffnen
                </button>
              </>
            )}

            <br />
            {!isCashEntryMonthClosed(entry) && (
              <>
                <button onClick={() => editCashEntry(entry)} style={secondaryButtonStyle}>
                  Kassa-Eintrag bearbeiten
                </button>

                <button
                  onClick={() => deleteCashEntry(entry)}
                  style={{ ...secondaryButtonStyle, borderColor: '#b91c1c', color: '#b91c1c' }}
                >
                  Kassa-Eintrag stornieren
                </button>
              </>
            )}
          </div>
        ))}
      </section>
      )}

      {activePage === 'documents' && (
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
      )}

      {activePage === 'inventory' && (
        <section style={sectionStyle}>
          <h2 style={headingStyle}>Inventar PRO</h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 15 }}>
            <div style={{ ...cardStyle, borderTop: `6px solid ${colors.black}` }}>
              <strong style={dashboardLabelStyle}>Inventar gesamt</strong>
              <h2 style={dashboardNumberStyle}>{inventoryItems.length}</h2>
            </div>

            <div style={{ ...cardStyle, borderTop: `6px solid ${colors.navy}` }}>
              <strong style={dashboardLabelStyle}>Gesamtwert</strong>
              <h2 style={dashboardNumberStyle}>{getInventoryTotalValue().toFixed(2)} €</h2>
            </div>

            <div style={{ ...cardStyle, borderTop: `6px solid ${colors.blue}` }}>
              <strong style={dashboardLabelStyle}>Aktiv</strong>
              <h2 style={dashboardNumberStyle}>{inventoryItems.filter((item) => item.status === 'aktiv').length}</h2>
            </div>

            <div style={{ ...cardStyle, borderTop: `6px solid ${colors.red}` }}>
              <strong style={dashboardLabelStyle}>Defekt / Reparatur</strong>
              <h2 style={dashboardNumberStyle}>
                {inventoryItems.filter((item) => ['defekt', 'reparatur'].includes(item.condition) || item.status === 'defekt').length}
              </h2>
            </div>
          </div>

          {(canManageMembers() || isAdmin()) && (
            <>
              <h3 style={headingStyle}>{inventoryEditingId ? 'Inventar bearbeiten' : 'Inventar anlegen'}</h3>

              <input
                placeholder={`Inventar-Nr. leer lassen für ${getNextInventoryNumber()}`}
                value={inventoryNumber}
                onChange={(e) => setInventoryNumber(e.target.value)}
                style={inputStyle}
              />

              <input
                placeholder="Bezeichnung"
                value={inventoryName}
                onChange={(e) => setInventoryName(e.target.value)}
                style={inputStyle}
              />

              <input
                placeholder="Kategorie, z.B. Event, Technik, Gastro"
                value={inventoryCategory}
                onChange={(e) => setInventoryCategory(e.target.value)}
                style={inputStyle}
              />

              <input
                placeholder="Verantwortlich"
                value={inventoryResponsible}
                onChange={(e) => setInventoryResponsible(e.target.value)}
                style={inputStyle}
              />

              <input
                placeholder="Standort"
                value={inventoryLocation}
                onChange={(e) => setInventoryLocation(e.target.value)}
                style={inputStyle}
              />

              <input
                type="date"
                value={inventoryPurchaseDate}
                onChange={(e) => setInventoryPurchaseDate(e.target.value)}
                style={inputStyle}
              />

              <select value={inventoryCondition} onChange={(e) => setInventoryCondition(e.target.value)} style={inputStyle}>
                <option value="neu">Neu</option>
                <option value="gut">Gut</option>
                <option value="gebraucht">Gebraucht</option>
                <option value="schlecht">Schlecht</option>
                <option value="reparatur">Reparatur</option>
                <option value="defekt">Defekt</option>
              </select>

              <select value={inventoryStatus} onChange={(e) => setInventoryStatus(e.target.value)} style={inputStyle}>
                <option value="aktiv">Aktiv</option>
                <option value="verliehen">Verliehen</option>
                <option value="defekt">Defekt</option>
                <option value="ausgemustert">Ausgemustert</option>
              </select>

              <input
                type="date"
                value={inventoryLastCheckDate}
                onChange={(e) => setInventoryLastCheckDate(e.target.value)}
                style={inputStyle}
              />

              <input
                placeholder="Prüfstatus, z.B. OK"
                value={inventoryCheckStatus}
                onChange={(e) => setInventoryCheckStatus(e.target.value)}
                style={inputStyle}
              />

              <input
                placeholder="Seriennummer"
                value={inventorySerialNumber}
                onChange={(e) => setInventorySerialNumber(e.target.value)}
                style={inputStyle}
              />

              <input
                type="number"
                placeholder="Wert"
                value={inventoryValue}
                onChange={(e) => setInventoryValue(e.target.value)}
                style={inputStyle}
              />

              <input
                placeholder="Notizen"
                value={inventoryNotes}
                onChange={(e) => setInventoryNotes(e.target.value)}
                style={inputStyle}
              />

              <button onClick={saveInventoryItem} style={buttonStyle}>
                {inventoryEditingId ? 'Änderungen speichern' : 'Inventar speichern'}
              </button>

              {inventoryEditingId && (
                <button onClick={resetInventoryForm} style={secondaryButtonStyle}>
                  Bearbeiten abbrechen
                </button>
              )}

              <h3 style={headingStyle}>Inventar CSV Import</h3>

              <p style={mutedTextStyle}>
                Unterstützt deine bestehende Google-Sheets-Struktur mit Inventar-Nr., Bezeichnung,
                Kategorie, Verantwortlich, Standort, Prüfstatus und Etikett-Zeilen.
              </p>

              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleInventoryCsvFile}
                style={inputStyle}
              />

              {inventoryCsvFileName && (
                <p style={mutedTextStyle}>
                  Datei: <strong>{inventoryCsvFileName}</strong>
                </p>
              )}

              {inventoryCsvRows.length > 0 && (
                <>
                  <h3 style={headingStyle}>Vorschau: {inventoryCsvRows.length} Inventar-Einträge</h3>

                  {inventoryCsvRows.slice(0, 5).map((item) => (
                    <div key={item.inventory_number} style={cardStyle}>
                      <strong>{item.inventory_number}</strong> · {item.name}
                      <br />
                      {item.category} · {item.location || '-'} · {item.status}
                    </div>
                  ))}

                  <button onClick={importInventoryRows} style={buttonStyle} disabled={inventoryImporting}>
                    {inventoryImporting ? 'Import läuft...' : 'Inventar importieren'}
                  </button>

                  <button
                    onClick={() => {
                      setInventoryCsvRows([])
                      setInventoryCsvFileName('')
                    }}
                    style={secondaryButtonStyle}
                    disabled={inventoryImporting}
                  >
                    Import abbrechen
                  </button>
                </>
              )}
            </>
          )}

          <h3 style={headingStyle}>Inventar Suche & Filter</h3>

          <input
            placeholder="Inventar suchen..."
            value={inventorySearch}
            onChange={(e) => setInventorySearch(e.target.value)}
            style={inputStyle}
          />

          <select value={inventoryCategoryFilter} onChange={(e) => setInventoryCategoryFilter(e.target.value)} style={inputStyle}>
            <option value="alle">Alle Kategorien</option>
            {getInventoryCategories().map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          <select value={inventoryStatusFilter} onChange={(e) => setInventoryStatusFilter(e.target.value)} style={inputStyle}>
            <option value="alle">Alle Status</option>
            <option value="aktiv">Aktiv</option>
            <option value="verliehen">Verliehen</option>
            <option value="defekt">Defekt</option>
            <option value="ausgemustert">Ausgemustert</option>
          </select>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(220px, 1fr))', gap: 12 }}>
            <select value={inventorySortBy} onChange={(e) => setInventorySortBy(e.target.value)} style={inputStyle}>
              <option value="inventory_number">Sortieren nach Inventar-Nr.</option>
              <option value="name">Sortieren nach Bezeichnung</option>
              <option value="category">Sortieren nach Kategorie</option>
              <option value="location">Sortieren nach Standort</option>
              <option value="responsible">Sortieren nach Verantwortlich</option>
              <option value="condition">Sortieren nach Zustand</option>
              <option value="status">Sortieren nach Status</option>
              <option value="purchase_date">Sortieren nach Anschaffungsdatum</option>
              <option value="last_check_date">Sortieren nach letzter Prüfung</option>
              <option value="value">Sortieren nach Wert</option>
            </select>

            <select value={inventorySortDirection} onChange={(e) => setInventorySortDirection(e.target.value)} style={inputStyle}>
              <option value="asc">Aufsteigend</option>
              <option value="desc">Absteigend</option>
            </select>
          </div>

          <button onClick={exportInventoryCsv} style={secondaryButtonStyle}>
            Inventar CSV
          </button>

          <button onClick={exportInventoryPdf} style={secondaryButtonStyle}>
            Inventarliste PDF
          </button>

          <button onClick={exportInventoryLabelsPdf} style={buttonStyle}>
            Etiketten PDF
          </button>

          <p>
            Angezeigt: <strong>{getFilteredInventoryItems().length}</strong> von {inventoryItems.length} Inventar-Einträgen
            <br />
            Wert der angezeigten aktiven Einträge:{' '}
            <strong>{getInventoryTotalValue(getFilteredInventoryItems()).toFixed(2)} €</strong>
          </p>

          {getFilteredInventoryItems().map((item) => (
            <div
              key={item.id}
              style={{
                ...cardStyle,
                borderLeft: `6px solid ${item.status === 'aktiv' ? colors.blue : item.status === 'ausgemustert' ? colors.muted : colors.red}`,
                opacity: item.status === 'ausgemustert' ? 0.72 : 1,
              }}
            >
              <strong>
                {item.inventory_number} · {item.name}
              </strong>
              <br />
              Kategorie: {item.category || '-'} · Standort: {item.location || '-'}
              <br />
              Verantwortlich: {item.responsible || '-'}
              <br />
              Zustand: {item.condition || '-'} · Status: {item.status || '-'}
              <br />
              Letzte Prüfung: {item.last_check_date || '-'} · Prüfstatus: {item.check_status || '-'}
              <br />
              Seriennummer: {item.serial_number || '-'} · Wert: {item.value ? `${Number(item.value).toFixed(2)} €` : '-'}
              <br />
              Notizen: {item.notes || '-'}

              <br />

              <button onClick={() => setShowInventoryQr(showInventoryQr === item.id ? null : item.id)} style={secondaryButtonStyle}>
                QR-Code
              </button>

              <button onClick={() => exportInventoryLabelPdf(item)} style={secondaryButtonStyle}>
                Etikett PDF
              </button>

              {(canManageMembers() || isAdmin()) && (
                <button onClick={() => editInventoryItem(item)} style={buttonStyle}>
                  Bearbeiten
                </button>
              )}

              {isAdmin() && item.status !== 'ausgemustert' && (
                <button
                  onClick={() => retireInventoryItem(item)}
                  style={{ ...secondaryButtonStyle, borderColor: colors.red, color: colors.red }}
                >
                  Ausmustern
                </button>
              )}

              {isAdmin() && (
                <button
                  onClick={() => deleteInventoryItem(item)}
                  style={{ ...secondaryButtonStyle, borderColor: '#7f1d1d', color: '#7f1d1d' }}
                >
                  Inventar löschen
                </button>
              )}

              {showInventoryQr === item.id && (
                <div style={{ marginTop: 12 }}>
                  <QRCodeCanvas value={getInventoryQrValue(item)} size={170} />
                  <p style={mutedTextStyle}>{getInventoryQrValue(item)}</p>
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      {activePage === 'admin' && isAdmin() && (
        <section style={sectionStyle}>
          <h2 style={headingStyle}>Benutzerverwaltung</h2>

          <p style={mutedTextStyle}>
            Hier kannst du für Mitglieder einen App-Zugang per E-Mail-Einladung erstellen.
            Der Benutzer wird automatisch mit dem Mitglied verknüpft.
          </p>

          <h3 style={headingStyle}>Mitglieder ohne Login</h3>

          {members.filter((member) => !member.auth_user_id).length === 0 && (
            <p style={mutedTextStyle}>Alle Mitglieder sind bereits mit einem Login verknüpft.</p>
          )}

          {members
            .filter((member) => !member.auth_user_id)
            .map((member) => (
              <div key={member.id} style={cardStyle}>
                <strong>
                  {member.first_name || ''} {member.last_name || ''}
                </strong>
                <br />
                E-Mail: {member.email || '-'}
                <br />
                Aktuelles App-Recht: {getAppRoleLabel(member.app_role || 'readonly')}
                <br />

                <button
                  onClick={() => inviteMemberUser(member)}
                  style={buttonStyle}
                  disabled={invitingMemberId === member.id || !member.email}
                >
                  {invitingMemberId === member.id ? 'Einladung läuft...' : 'Einladung senden'}
                </button>
              </div>
            ))}

          <h3 style={headingStyle}>Verknüpfte Benutzer</h3>

          {members
            .filter((member) => member.auth_user_id)
            .map((member) => (
              <div key={member.id} style={cardStyle}>
                <strong>
                  {member.first_name || ''} {member.last_name || ''}
                </strong>
                <br />
                E-Mail: {member.email || '-'}
                <br />
                App-Recht: {getAppRoleLabel(member.app_role || 'readonly')}
                <br />
                Auth User ID: {member.auth_user_id}
              </div>
            ))}
        </section>
      )}

      {activePage === 'admin' && isAdmin() && (
        <section style={sectionStyle}>
          <h2 style={headingStyle}>Audit Log</h2>

          <p style={mutedTextStyle}>
            Zeigt die letzten 100 protokollierten Änderungen. Der vollständige Export ist über „Audit Log CSV“ möglich.
          </p>

          <button onClick={exportAuditLogsCsv} style={secondaryButtonStyle}>
            Audit Log CSV
          </button>

          {auditLogs.length === 0 && <p style={mutedTextStyle}>Noch keine Audit-Logs vorhanden.</p>}

          {auditLogs.slice(0, 20).map((log) => (
            <div key={log.id} style={cardStyle}>
              <strong>{log.action}</strong> · {log.table_name}
              <br />
              {log.created_at ? new Date(log.created_at).toLocaleString('de-AT') : '-'} · {log.user_email || '-'}
              <br />
              Datensatz: {log.record_id || '-'}
            </div>
          ))}
        </section>
      )}

      {activePage === 'members' && (
      <>
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
      </>
      )}
    </main>
  )
}
