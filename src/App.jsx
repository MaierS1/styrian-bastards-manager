import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { generateInvoicePdf } from './lib/invoiceGenerator'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { Html5QrcodeScanner } from 'html5-qrcode'
import QRCode from 'qrcode'
import {
  buttonStyle,
  cardStyle,
  colors,
  headingStyle,
  inputStyle,
  isMobile,
  navButtonStyle,
  navStyle,
  pageStyle,
  pageWrapperStyle,
  secondaryButtonStyle,
  sectionStyle,
} from './styles/appStyles'
import {
  canManageCashRole,
  canManageEventsRole,
  canManageMembersRole,
  canUseCheckinRole,
  getAppRole as getMemberAppRole,
  getAppRoleLabel,
  isAdminRole,
} from './utils/permissions'
import { navigationItems } from './app/navigation'
import { fetchMembers } from './services/repositories/membersRepository'
import { fetchMembershipFees } from './services/repositories/membershipFeesRepository'
import { formatCustomerAddressFromFields as buildFormatCustomerAddressFromFields } from './utils/formatters'
import {
  getAlertStyle as buildAlertStyle,
  getAmountByType as buildAmountByType,
  getCashBalanceForYear as buildCashBalanceForYear,
  getDashboardAlerts as buildDashboardAlerts,
  getFinanceDashboardData as buildFinanceDashboardData,
  getFinanceHealthStatus as buildFinanceHealthStatus,
} from './services/helpers/dashboardHelpers'
import {
  getFilteredInvoiceCustomers as buildGetFilteredInvoiceCustomers,
  getFilteredInvoices as buildGetFilteredInvoices,
  getInvoiceById as buildGetInvoiceById,
  getInvoiceCustomerAddress as buildGetInvoiceCustomerAddress,
  getInvoiceFilePath as buildGetInvoiceFilePath,
  getInvoiceRowsTotal as buildGetInvoiceRowsTotal,
  getInvoiceYear as buildGetInvoiceYear,
  getItemsForInvoice as buildGetItemsForInvoice,
  getNextInvoiceNumber as buildGetNextInvoiceNumber,
  getOverdueInvoices as buildGetOverdueInvoices,
  getSelectedInvoiceCustomer as buildGetSelectedInvoiceCustomer,
} from './services/helpers/invoiceHelpers'
import {
  getCurrentMemberFee as buildGetCurrentMemberFee,
} from './services/helpers/memberEventHelpers'
import {
  getFilteredInventoryItems as buildGetFilteredInventoryItems,
  getInventoryCategories as buildGetInventoryCategories,
  getInventoryCsvValue as buildGetInventoryCsvValue,
  getInventoryQrValue as buildGetInventoryQrValue,
  getInventorySortValue as buildGetInventorySortValue,
  getInventoryTotalValue as buildGetInventoryTotalValue,
  getNextInventoryNumber as buildGetNextInventoryNumber,
  normalizeInventoryCondition as buildNormalizeInventoryCondition,
  normalizeInventoryDate as buildNormalizeInventoryDate,
  normalizeInventoryStatus as buildNormalizeInventoryStatus,
} from './services/helpers/inventoryHelpers'
import { MembersPage } from './components/members/MembersPage'
import { CashPage } from './components/cash/CashPage'
import { DocumentsPage } from './components/documents/DocumentsPage'
import { EventsPage } from './components/events/EventsPage'
import { AdminPage } from './components/admin/AdminPage'
import { InventoryPage } from './components/inventory/InventoryPage'
import { InvoicesPage } from './components/invoices/InvoicesPage'
import { DashboardPage } from './components/dashboard/DashboardPage'
import { PortalPage } from './components/portal/PortalPage'
import { MobileScannerPage } from './components/scanner/MobileScannerPage'

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
  const [invoices, setInvoices] = useState([])
  const [invoiceItems, setInvoiceItems] = useState([])
  const [invoiceCustomers, setInvoiceCustomers] = useState([])
  const [memberChangeRequests, setMemberChangeRequests] = useState([])

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

  const [offlineCashEntries, setOfflineCashEntries] = useState(() =>
    JSON.parse(localStorage.getItem('offlineCashEntries') || '[]')
  )
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  const [editingId, setEditingId] = useState(null)
  const [showQR, setShowQR] = useState(null)
  const [scanning, setScanning] = useState(false)

  const [memberSearch, setMemberSearch] = useState('')
  const [memberStatusFilter, setMemberStatusFilter] = useState('alle')
  const [memberTypeFilter, setMemberTypeFilter] = useState('alle')
  const [roleFilter, setRoleFilter] = useState('alle')
  const [feeFilter, setFeeFilter] = useState('alle')
  const [memberTestFilter, setMemberTestFilter] = useState('alle')
  const [linkedMemberNotice, setLinkedMemberNotice] = useState('')

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
  const [isTestMember, setIsTestMember] = useState(false)
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
  const [mobileScanning, setMobileScanning] = useState(false)
  const [mobileScanMode, setMobileScanMode] = useState('member')

  const [selectedInvoiceCustomerId, setSelectedInvoiceCustomerId] = useState('')
  const [invoiceCustomerName, setInvoiceCustomerName] = useState('')
  const [invoiceCustomerEmail, setInvoiceCustomerEmail] = useState('')
  const [invoiceCustomerStreet, setInvoiceCustomerStreet] = useState('')
  const [invoiceCustomerHouseNumber, setInvoiceCustomerHouseNumber] = useState('')
  const [invoiceCustomerAddressAddition, setInvoiceCustomerAddressAddition] = useState('')
  const [invoiceCustomerPostalCode, setInvoiceCustomerPostalCode] = useState('')
  const [invoiceCustomerCity, setInvoiceCustomerCity] = useState('')
  const [invoiceCustomerCountry, setInvoiceCustomerCountry] = useState('Ã–sterreich')
  const [invoiceIssueDate, setInvoiceIssueDate] = useState(new Date().toISOString().slice(0, 10))
  const [invoiceDueDate, setInvoiceDueDate] = useState('')
  const [invoiceNotes, setInvoiceNotes] = useState('')
  const [invoiceRows, setInvoiceRows] = useState([{ description: '', quantity: 1, unit_price: '' }])
  const [invoiceSearch, setInvoiceSearch] = useState('')
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState('alle')
  const [invoiceIsTest, setInvoiceIsTest] = useState(false)
  const [invoiceTestFilter, setInvoiceTestFilter] = useState('alle')

  const [customerSearch, setCustomerSearch] = useState('')
  const [editingCustomerId, setEditingCustomerId] = useState(null)
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerStreet, setCustomerStreet] = useState('')
  const [customerHouseNumber, setCustomerHouseNumber] = useState('')
  const [customerAddressAddition, setCustomerAddressAddition] = useState('')
  const [customerPostalCode, setCustomerPostalCode] = useState('')
  const [customerCity, setCustomerCity] = useState('')
  const [customerCountry, setCustomerCountry] = useState('Ã–sterreich')
  const [customerNotes, setCustomerNotes] = useState('')

  const [portalEmail, setPortalEmail] = useState('')
  const [portalPhone, setPortalPhone] = useState('')
  const [portalStreet, setPortalStreet] = useState('')
  const [portalPostalCode, setPortalPostalCode] = useState('')
  const [portalCity, setPortalCity] = useState('')
  const [portalClothingSize, setPortalClothingSize] = useState('')

  const [restoreData, setRestoreData] = useState(null)
  const [restoreFileName, setRestoreFileName] = useState('')
  const [restoreImporting, setRestoreImporting] = useState(false)

  const [activePage, setActivePage] = useState('dashboard')
  const [invitingMemberId, setInvitingMemberId] = useState(null)

  useEffect(() => {
    checkUser()

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
        const member = getMemberFromQrValue(decodedText)

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

  useEffect(() => {
    if (!currentMember) return

    setPortalEmail(currentMember.email || '')
    setPortalPhone(currentMember.phone || '')
    setPortalStreet(currentMember.street || '')
    setPortalPostalCode(currentMember.postal_code || '')
    setPortalCity(currentMember.city || '')
    setPortalClothingSize(currentMember.clothing_size || '')
  }, [currentMember])

  useEffect(() => {
    handleMemberDeepLink()
  }, [members, currentMember])

  useEffect(() => {
    if (!mobileScanning) return

    const scanner = new Html5QrcodeScanner('mobile-reader', {
      fps: 10,
      qrbox: 250,
    })

    scanner.render(
      (decodedText) => {
        if (mobileScanMode === 'inventory') {
          const item = inventoryItems.find(
            (inventoryItem) =>
              inventoryItem.inventory_number === decodedText ||
              inventoryItem.id === decodedText ||
              getInventoryQrValue(inventoryItem) === decodedText
          )

          if (item) {
            setInventorySearch(item.inventory_number || item.name || '')
            setActivePage('inventory')
            setMobileScanning(false)
            scanner.clear().catch(() => {})
            return
          }

          alert('Inventar nicht gefunden.')
          return
        }

        const member = getMemberFromQrValue(decodedText)

        if (member) {
          if (mobileScanMode === 'member_edit') {
            if (!canManageMembers() && !isAdmin()) {
              alert('Keine Berechtigung zum Bearbeiten von Mitgliedern.')
              return
            }

            setMemberSearch(member.member_number || `${member.first_name || ''} ${member.last_name || ''}`)
            editMember(member)
            setActivePage('members')
            setMobileScanning(false)
            scanner.clear().catch(() => {})
            return
          }

          checkInMember(member)
          setMobileScanning(false)
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
  }, [mobileScanning, mobileScanMode, members, inventoryItems])

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
    await Promise.all([loadMembers(), loadFees(), loadCashEntries(), loadCashMonthClosings(), loadAuditLogs(), loadEventCheckins(), loadEvents(), loadDocuments(), loadInventoryItems(), loadInvoices(), loadInvoiceItems(), loadMemberChangeRequests()])
  }

  function getAppRole() {
    return getMemberAppRole(currentMember)
  }

  function isAdmin() {
    return isAdminRole(getAppRole())
  }

  function canManageMembers() {
    return canManageMembersRole(getAppRole())
  }

  function canManageCash() {
    return canManageCashRole(getAppRole())
  }

  function canUseCheckin() {
    return canUseCheckinRole(getAppRole())
  }

  function canManageEvents() {
    return canManageEventsRole(getAppRole())
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
    setInvoices([])
    setInvoiceItems([])
    setMemberChangeRequests([])
    resetForm()
  }

  async function loadMembers() {
    const { data, error } = await fetchMembers()

    if (error) return alert(error.message)
    setMembers(data || [])
  }

  async function loadFees() {
    const { data, error } = await fetchMembershipFees(2026)

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

  async function loadInvoices() {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .order('issue_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      console.warn(error.message)
      return
    }

    setInvoices(data || [])
  }

  async function loadInvoiceItems() {
    const { data, error } = await supabase
      .from('invoice_items')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) {
      console.warn(error.message)
      return
    }

    setInvoiceItems(data || [])
  }

  async function loadInvoiceCustomers() {
    const { data, error } = await supabase
      .from('invoice_customers')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      console.warn(error.message)
      return
    }

    setInvoiceCustomers(data || [])
  }

  async function loadMemberChangeRequests() {
    const { data, error } = await supabase
      .from('member_change_requests')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.warn(error.message)
      return
    }

    setMemberChangeRequests(data || [])
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

  function getCashBalanceForYear(year) {
    return buildCashBalanceForYear(year, cashEntries)
  }

  function hasOpeningForYear(year) {
    return cashEntries.some(
      (entry) =>
        getEntryYear(entry) === String(year) &&
        entry.is_opening &&
        String(entry.description || '').toLowerCase().includes('Ã¼bertrag vorjahr')
    )
  }

  async function createAutomaticCarryover() {
    if (!canManageCash()) return alert('Keine Berechtigung fÃ¼r Kassa.')

    if (!carryoverFromYear || !carryoverToYear) {
      alert('Bitte Quelljahr und Zieljahr auswÃ¤hlen.')
      return
    }

    if (String(carryoverFromYear) === String(carryoverToYear)) {
      alert('Quelljahr und Zieljahr dÃ¼rfen nicht gleich sein.')
      return
    }

    if (Number(carryoverToYear) !== Number(carryoverFromYear) + 1) {
      const proceed = window.confirm(
        'Das Zieljahr ist nicht direkt das Folgejahr. Trotzdem Ãœbertrag erstellen?'
      )

      if (!proceed) return
    }

    if (hasOpeningForYear(carryoverToYear)) {
      alert(`FÃ¼r ${carryoverToYear} existiert bereits ein Ãœbertrag Vorjahr.`)
      return
    }

    const balance = getCashBalanceForYear(carryoverFromYear)

    if (balance === 0) {
      const proceed = window.confirm(
        `Der Endsaldo ${carryoverFromYear} ist 0,00 â‚¬. Trotzdem Ãœbertrag erstellen?`
      )

      if (!proceed) return
    }

    const confirmed = window.confirm(
      `Ãœbertrag erstellen?\n\nEndsaldo ${carryoverFromYear}: ${balance.toFixed(2)} â‚¬\nZieljahr: ${carryoverToYear}\n\nDer Ãœbertrag wird als Startsaldo am 01.01.${carryoverToYear} angelegt.`
    )

    if (!confirmed) return

    const carryoverEntry = {
      entry_date: `${carryoverToYear}-01-01`,
      entry_year: Number(carryoverToYear),
      type: balance >= 0 ? 'einnahme' : 'ausgabe',
      category: 'sonstiges',
      payment_method: 'bar',
      is_opening: true,
      amount: Math.abs(balance),
      description: `Ãœbertrag Vorjahr automatisch aus ${carryoverFromYear}`,
      receipt_url: null,
      event_id: null,
    }

    const { error } = await supabase.from('cash_entries').insert(carryoverEntry)

    if (error) return alert(error.message)

    await createAuditLog('create_carryover', 'cash_entries', null, null, carryoverEntry)

    await loadCashEntries()
    setSelectedCashYear(String(carryoverToYear))
    alert('Ãœbertrag wurde erstellt.')
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

  function getDashboardAlerts() {
    return buildDashboardAlerts({
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
    })
  }

  function getAlertStyle(type) {
    return buildAlertStyle(type, colors)
  }


  function getAmountByType(type) {
    return buildAmountByType(type)
  }

  function normalizeMemberType(value) {
    const normalized = String(value || '')
      .trim()
      .toLowerCase()
      .replace('Ã¶', 'oe')
      .replace('Ã¼', 'ue')
      .replace('Ã¤', 'ae')
      .replace('ÃŸ', 'ss')

    if (normalized.includes('foerder')) return 'foerdermitglied'
    if (normalized.includes('fÃ¶rder')) return 'foerdermitglied'
    if (normalized.includes('ehren')) return 'ehrenmitglied'
    if (normalized.includes('probe')) return 'probejahr'
    if (normalized.includes('voll')) return 'vollmitglied'

    return 'vollmitglied'
  }

  function normalizeRole(value) {
    const normalized = String(value || '')
      .trim()
      .toLowerCase()
      .replace('Ã¶', 'oe')
      .replace('Ã¼', 'ue')
      .replace('Ã¤', 'ae')
      .replace('ÃŸ', 'ss')
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
      schriftfuehrer: 'SchriftfÃ¼hrer',
      schriftfuehrer_stv: 'SchriftfÃ¼hrer-Stellvertreter',
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
        .replace('Ã¤', 'ae')
        .replace('Ã¶', 'oe')
        .replace('Ã¼', 'ue')
        .replace('ÃŸ', 'ss')
        .replace(/[^a-z0-9]/g, '')

      normalizedRow[normalizedKey] = row[key]
    })

    for (const key of keys) {
      const normalizedKey = key
        .trim()
        .toLowerCase()
        .replace('Ã¤', 'ae')
        .replace('Ã¶', 'oe')
        .replace('Ã¼', 'ue')
        .replace('ÃŸ', 'ss')
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
    const street = getCsvValue(row, ['strasse', 'straÃŸe', 'street', 'adresse'])
    const postalCode = getCsvValue(row, ['plz', 'postal_code', 'postcode', 'zip'])
    const city = getCsvValue(row, ['ort', 'city', 'stadt'])
    const birthdate = getCsvValue(row, ['geburtsdatum', 'birthdate', 'birthday', 'geburtstag'])
    const clothingSize = getCsvValue(row, ['kleidergroesse', 'kleidergrÃ¶ÃŸe', 'clothing_size', 'groesse', 'grÃ¶ÃŸe'])
    const role = normalizeRole(getCsvValue(row, ['rolle', 'funktion', 'vereinsfunktion', 'role']))

    return {
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      member_type: memberType,
      app_role: appRole,
      is_test: isTestMember,
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
          alert('Keine gÃ¼ltigen Mitglieder gefunden. Mindestens Vorname und Nachname mÃ¼ssen vorhanden sein.')
        }
      } catch (error) {
        alert(`CSV konnte nicht gelesen werden: ${error.message}`)
      }
    }

    reader.readAsText(file, 'UTF-8')
  }

  async function importCsvMembers() {
    if (!canManageMembers()) return alert('Keine Berechtigung fÃ¼r Mitglieder-Import.')

    if (csvRows.length === 0) {
      alert('Bitte zuerst eine CSV-Datei auswÃ¤hlen.')
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
        alert('Keine neuen Mitglieder gefunden. MÃ¶glicherweise sind alle bereits vorhanden.')
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
      'JÃ¤nner',
      'Februar',
      'MÃ¤rz',
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
    if (!isAdmin()) return alert('Nur Admins dÃ¼rfen Monate abschlieÃŸen.')

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
      `Monat wirklich abschlieÃŸen?\n\n${String(month).padStart(2, '0')}/${year}\n\nDanach kÃ¶nnen EintrÃ¤ge in diesem Monat nicht mehr bearbeitet oder storniert werden.`
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
    if (!isAdmin()) return alert('Nur Admins dÃ¼rfen MonatsabschlÃ¼sse aufheben.')

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
    return fees.filter((fee) => {
      const member = getMemberById(fee.member_id)
      return !member?.is_test && !fee.paid && Number(fee.amount) > 0
    }).length
  }

  function getOpenFeesTotal() {
    return fees
      .filter((fee) => {
        const member = getMemberById(fee.member_id)
        return !member?.is_test && !fee.paid
      })
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

  function getMemberQrValue(member) {
    const memberCode = member.member_number || member.id
    return `${window.location.origin}${window.location.pathname}?member=${encodeURIComponent(memberCode)}`
  }

  function getMemberFromQrValue(value) {
    const text = String(value || '').trim()

    try {
      const url = new URL(text)
      const memberCode = url.searchParams.get('member')

      if (memberCode) {
        return members.find((member) => member.member_number === memberCode || member.id === memberCode)
      }
    } catch {
      // kein URL-QR, weiter unten als alte Mitgliedsnummer/ID behandeln
    }

    return members.find((member) => member.member_number === text || member.id === text)
  }

  function handleMemberDeepLink() {
    const params = new URLSearchParams(window.location.search)
    const memberCode = params.get('member')

    if (!memberCode || members.length === 0) return

    const member = members.find((item) => item.member_number === memberCode || item.id === memberCode)

    if (!member) {
      setLinkedMemberNotice(`Mitglied aus QR-Code wurde nicht gefunden: ${memberCode}`)
      return
    }

    if (canManageMembers() || isAdmin()) {
      setMemberSearch(member.member_number || `${member.first_name || ''} ${member.last_name || ''}`)
      editMember(member)
      setActivePage('members')
      setLinkedMemberNotice(`Mitglied aus QR-Code geÃ¶ffnet: ${member.first_name || ''} ${member.last_name || ''}`)
      return
    }

    if (currentMember?.id === member.id) {
      setActivePage('portal')
      setLinkedMemberNotice('Dein Mitgliederportal wurde Ã¼ber den QR-Code geÃ¶ffnet.')
      return
    }

    setActivePage('portal')
    setLinkedMemberNotice('Dieser Mitgliedsausweis gehÃ¶rt zu einem anderen Mitglied. Du hast keine Berechtigung, diese Daten zu Ã¶ffnen.')
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

  function getMonthlyData() {
    const months = [
      'Jan',
      'Feb',
      'MÃ¤r',
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
      ['foerdermitglied', 'FÃ¶rdermitglieder'],
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

      const matchesTest =
        memberTestFilter === 'alle' ||
        (memberTestFilter === 'test' && member.is_test) ||
        (memberTestFilter === 'echt' && !member.is_test)

      return matchesSearch && matchesStatus && matchesType && matchesRole && matchesFee && matchesTest
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
      Kategorie: entry.is_opening ? 'Ãœbertrag' : entry.category || '',
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
            Kuerzel: entry.is_opening ? 'Ãœbertrag' : entry.category || '',
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
            entry.is_opening ? 'Ãœbertrag' : entry.category || '',
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
        'KÃ¼rzel',
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
      invoices,
      invoice_items: invoiceItems,
      invoice_customers: invoiceCustomers,
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
          alert('Backup-Datei ist ungÃ¼ltig.')
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
    const cleaned = { ...(row || {}) }
    delete cleaned.created_at
    delete cleaned.updated_at
    return cleaned
  }

  function deduplicateById(rows, existingRows) {
    const existingIds = new Set((existingRows || []).map((row) => row.id).filter(Boolean))

    return (rows || [])
      .filter((row) => row && row.id && !existingIds.has(row.id))
      .map(stripSystemFields)
  }

  async function restoreFullBackup() {
    if (!isAdmin()) return alert('Nur Admins dÃ¼rfen Backups wiederherstellen.')

    if (!restoreData) {
      alert('Bitte zuerst eine Backup-JSON-Datei auswÃ¤hlen.')
      return
    }

    const confirmed = window.confirm(
      `Backup wiederherstellen?\n\n` +
        `Mitglieder: ${getRestoreCount('members')}\n` +
        `BeitrÃ¤ge: ${getRestoreCount('membership_fees')}\n` +
        `Kassa: ${getRestoreCount('cash_entries')}\n` +
        `Events: ${getRestoreCount('events')}\n` +
        `Check-ins: ${getRestoreCount('event_checkins')}\n` +
        `Dokumente: ${getRestoreCount('documents')}\n\n` +
        `Es werden nur DatensÃ¤tze mit noch nicht vorhandener ID importiert. Bestehende Daten werden nicht Ã¼berschrieben.`
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
    if (!isAdmin()) return alert('Nur Admins dÃ¼rfen Benutzer einladen.')

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
      `App-Recht fÃ¼r ${member.first_name || ''} ${member.last_name || ''}:\n\nadmin\ncashier\nmembers\ncheckin\nreadonly`,
      member.app_role || 'readonly'
    )

    if (!selectedRole) return

    const allowedRoles = ['admin', 'cashier', 'members', 'checkin', 'readonly']

    if (!allowedRoles.includes(selectedRole)) {
      alert('UngÃ¼ltige Rolle.')
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

      alert('Einladung wurde versendet und das Mitglied wurde mit dem Auth-User verknÃ¼pft.')
    } finally {
      setInvitingMemberId(null)
    }
  }

  function normalizeInventoryDate(value) {
    return buildNormalizeInventoryDate(value)
  }

  function getInventoryCsvValue(row, keys) {
    return buildGetInventoryCsvValue(row, keys)
  }

  function normalizeInventoryCondition(value) {
    return buildNormalizeInventoryCondition(value)
  }

  function normalizeInventoryStatus(value) {
    return buildNormalizeInventoryStatus(value)
  }

  function getNextInventoryNumber() {
    return buildGetNextInventoryNumber(inventoryItems)
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
    const lastCheckDate = normalizeInventoryDate(getInventoryCsvValue(row, ['Letzte Pruefung', 'Letzte PrÃ¼fung']))
    const checkStatus = getInventoryCsvValue(row, ['Pruefstatus', 'PrÃ¼fstatus']) || 'OK'
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
          alert('Keine gÃ¼ltigen Inventar-EintrÃ¤ge gefunden. Inventar-Nr. und Bezeichnung sind Pflicht.')
        }
      } catch (error) {
        alert(`Inventar-CSV konnte nicht gelesen werden: ${error.message}`)
      }
    }

    reader.readAsText(file, 'UTF-8')
  }

  async function importInventoryRows() {
    if (!canManageMembers() && !isAdmin()) return alert('Keine Berechtigung fÃ¼r Inventar-Import.')

    if (inventoryCsvRows.length === 0) {
      alert('Bitte zuerst eine Inventar-CSV auswÃ¤hlen.')
      return
    }

    setInventoryImporting(true)

    try {
      const existingNumbers = new Set(inventoryItems.map((item) => item.inventory_number))
      const rowsToInsert = inventoryCsvRows.filter((item) => !existingNumbers.has(item.inventory_number))

      if (rowsToInsert.length === 0) {
        alert('Keine neuen Inventar-EintrÃ¤ge gefunden. MÃ¶glicherweise sind alle bereits vorhanden.')
        return
      }

      const { error } = await supabase
        .from('inventory_items')
        .insert(rowsToInsert)

      if (error) return alert(error.message)

      await createAuditLog('bulk_import', 'inventory_items', null, null, {
        count: rowsToInsert.length,
        file: inventoryCsvFileName,
      })

      setInventoryCsvRows([])
      setInventoryCsvFileName('')
      await loadInventoryItems()

      alert(`${rowsToInsert.length} Inventar-EintrÃ¤ge wurden importiert.`)
    } finally {
      setInventoryImporting(false)
    }
  }

  function editInventoryItem(item) {
    if (!canManageMembers() && !isAdmin()) return alert('Keine Berechtigung fÃ¼r Inventarverwaltung.')

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
    if (!canManageMembers() && !isAdmin()) return alert('Keine Berechtigung fÃ¼r Inventarverwaltung.')

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
    if (!isAdmin()) return alert('Nur Admins dÃ¼rfen Inventar ausmustern.')

    const reason = window.prompt(`Grund fÃ¼r Ausmustern von ${item.inventory_number} eingeben:`)

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

  function getFilteredInventoryItems() {
    return buildGetFilteredInventoryItems(
      inventoryItems,
      {
        searchText: inventorySearch,
        categoryFilter: inventoryCategoryFilter,
        statusFilter: inventoryStatusFilter,
        sortBy: inventorySortBy,
        sortDirection: inventorySortDirection,
      },
      buildGetInventorySortValue
    )
  }

  function getInventoryCategories() {
    return buildGetInventoryCategories(inventoryItems)
  }

  function getInventoryTotalValue(items = inventoryItems) {
    return buildGetInventoryTotalValue(items)
  }

  async function deleteInventoryItem(item) {
    if (!isAdmin()) return alert('Nur Admins dÃ¼rfen Inventar lÃ¶schen.')

    const confirmed = window.confirm(
      `Inventar-Eintrag wirklich endgÃ¼ltig lÃ¶schen?\n\n${item.inventory_number || ''} Â· ${item.name || ''}\n\nEmpfohlen ist normalerweise â€žAusmusternâ€œ. LÃ¶schen entfernt den Eintrag dauerhaft.`
    )

    if (!confirmed) return

    const secondConfirm = window.confirm(
      'Bitte nochmals bestÃ¤tigen: Dieser Inventar-Eintrag wird endgÃ¼ltig gelÃ¶scht.'
    )

    if (!secondConfirm) return

    const { error } = await supabase
      .from('inventory_items')
      .delete()
      .eq('id', item.id)

    if (error) return alert(error.message)

    await createAuditLog('delete', 'inventory_items', item.id, item, null)
    await loadInventoryItems()

    alert('Inventar-Eintrag wurde gelÃ¶scht.')
  }

  function getInventoryQrValue(item) {
    return buildGetInventoryQrValue(item)
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
      head: [['Inventar-Nr.', 'Bezeichnung', 'Kategorie', 'Verantwortlich', 'Standort', 'Zustand', 'Status', 'PrÃ¼fung']],
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
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })

    const items = getFilteredInventoryItems()

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

      doc.rect(x, y, labelWidth, labelHeight)

      doc.setTextColor(0, 0, 0)
      doc.setFontSize(8)
      doc.text(item.label_line_1 || 'STYRIAN BASTARDS', x + 4, y + 6)

      doc.setFontSize(7)
      doc.text(item.label_line_2 || 'VEREINSEIGENTUM', x + 4, y + 11)
      doc.text(item.label_line_3 || `Inv.-Nr.: ${item.inventory_number || ''}`, x + 4, y + 16)
      doc.text(item.label_line_4 || item.name || '', x + 4, y + 21, { maxWidth: labelWidth - 30 })

      doc.addImage(qrDataUrl, 'PNG', x + labelWidth - 23, y + 5, 18, 18)

      doc.setFontSize(6)
      doc.text(item.inventory_number || '', x + labelWidth - 22, y + 27)
    }

    doc.save('styrian-bastards-inventar-etiketten-a4-16.pdf')
  }

  function getTestMembers() {
    return members.filter((member) => member.is_test)
  }

  function getTestInvoices() {
    return invoices.filter((invoice) => invoice.is_test || getMemberById(invoice.member_id)?.is_test)
  }

  function getTestCashEntries() {
    return cashEntries.filter((entry) => {
      if (entry.is_test) return true
      if (entry.invoice_id && getInvoiceById(entry.invoice_id)?.is_test) return true
      if (entry.member_id && getMemberById(entry.member_id)?.is_test) return true
      return false
    })
  }

  async function markMemberAsTest(member) {
    if (!isAdmin()) return alert('Nur Admins dÃ¼rfen Testmitglieder markieren.')

    const confirmed = window.confirm(
      `Mitglied als Testmitglied markieren?\n\n${member.first_name || ''} ${member.last_name || ''}\n\nTestmitglieder werden im Dashboard und Kassasystem getrennt angezeigt.`
    )

    if (!confirmed) return

    const { error } = await supabase
      .from('members')
      .update({ is_test: true })
      .eq('id', member.id)

    if (error) return alert(error.message)

    await createAuditLog('mark_test_member', 'members', member.id, member, { is_test: true })
    await loadMembers()
    alert('Mitglied wurde als Testmitglied markiert.')
  }

  async function deleteAllTestDataForMember(member) {
    if (!isAdmin()) return alert('Nur Admins dÃ¼rfen Testdaten lÃ¶schen.')

    if (!member?.is_test) {
      alert('Dieses Mitglied ist kein Testmitglied. Aus SicherheitsgrÃ¼nden wird nichts gelÃ¶scht.')
      return
    }

    const confirmed = window.confirm(
      `Alle Testdaten endgÃ¼ltig lÃ¶schen?\n\n${member.first_name || ''} ${member.last_name || ''}\n\nGelÃ¶scht werden:\n- Test-Rechnungen\n- Test-Kassa-EintrÃ¤ge\n- MitgliedsbeitrÃ¤ge\n- Ã„nderungsantrÃ¤ge\n- das Testmitglied\n\nEchte Daten werden nicht gelÃ¶scht.`
    )

    if (!confirmed) return

    const secondConfirm = window.confirm('Bitte nochmals bestÃ¤tigen: Die Testdaten werden endgÃ¼ltig gelÃ¶scht.')

    if (!secondConfirm) return

    const memberInvoices = invoices.filter((invoice) => invoice.member_id === member.id || invoice.is_test)
    const memberInvoiceIds = memberInvoices.map((invoice) => invoice.id)

    if (memberInvoiceIds.length > 0) {
      const { error: cashError } = await supabase
        .from('cash_entries')
        .delete()
        .in('invoice_id', memberInvoiceIds)

      if (cashError) return alert(cashError.message)
    }

    const { error: memberCashError } = await supabase
      .from('cash_entries')
      .delete()
      .eq('member_id', member.id)

    if (memberCashError) return alert(memberCashError.message)

    if (memberInvoiceIds.length > 0) {
      const { error: invoiceError } = await supabase
        .from('invoices')
        .delete()
        .in('id', memberInvoiceIds)

      if (invoiceError) return alert(invoiceError.message)
    }

    const { error: feesError } = await supabase
      .from('membership_fees')
      .delete()
      .eq('member_id', member.id)

    if (feesError) return alert(feesError.message)

    const { error: requestsError } = await supabase
      .from('member_change_requests')
      .delete()
      .eq('member_id', member.id)

    if (requestsError) return alert(requestsError.message)

    const { error: memberError } = await supabase
      .from('members')
      .delete()
      .eq('id', member.id)

    if (memberError) return alert(memberError.message)

    await createAuditLog('delete_test_member_data', 'members', member.id, member, {
      deleted_invoices: memberInvoiceIds.length,
    })

    await loadAll()
    alert('Testmitglied und zugehÃ¶rige Testdaten wurden gelÃ¶scht.')
  }

  async function deleteAllTestData() {
    if (!isAdmin()) return alert('Nur Admins dÃ¼rfen Testdaten lÃ¶schen.')

    const testMembers = getTestMembers()

    if (testMembers.length === 0 && getTestInvoices().length === 0 && getTestCashEntries().length === 0) {
      alert('Keine Testdaten vorhanden.')
      return
    }

    const confirmed = window.confirm(
      `Alle Testdaten lÃ¶schen?\n\nTestmitglieder: ${testMembers.length}\nTest-Rechnungen: ${getTestInvoices().length}\nTest-Kassa-EintrÃ¤ge: ${getTestCashEntries().length}\n\nDieser Vorgang ist endgÃ¼ltig.`
    )

    if (!confirmed) return

    for (const member of testMembers) {
      await deleteAllTestDataForMember(member)
    }

    const remainingTestInvoices = getTestInvoices().filter((invoice) => !invoice.member_id)
    const remainingTestInvoiceIds = remainingTestInvoices.map((invoice) => invoice.id)

    if (remainingTestInvoiceIds.length > 0) {
      await supabase.from('cash_entries').delete().in('invoice_id', remainingTestInvoiceIds)
      await supabase.from('invoices').delete().in('id', remainingTestInvoiceIds)
    }

    await loadAll()
    alert('Alle Testdaten wurden gelÃ¶scht.')
  }

  function getPendingMemberChangeRequests() {
    return memberChangeRequests.filter((request) => request.status === 'offen')
  }

  function getMyMemberChangeRequests() {
    if (!currentMember) return []
    return memberChangeRequests.filter((request) => request.member_id === currentMember.id)
  }

  async function submitMemberChangeRequest() {
    if (!currentMember) return alert('Kein Mitglied mit deinem Login verknÃ¼pft.')

    const requestedData = {
      email: portalEmail,
      phone: portalPhone,
      street: portalStreet,
      postal_code: portalPostalCode,
      city: portalCity,
      clothing_size: portalClothingSize,
    }

    const changedFields = Object.keys(requestedData).filter((key) => {
      return String(requestedData[key] || '') !== String(currentMember[key] || '')
    })

    if (changedFields.length === 0) {
      alert('Es wurden keine Ã„nderungen erkannt.')
      return
    }

    const confirmed = window.confirm(
      `Ã„nderungsantrag einreichen?\n\nGeÃ¤nderte Felder: ${changedFields.join(', ')}\n\nEin Vorstandsmitglied muss die Ã„nderung bestÃ¤tigen.`
    )

    if (!confirmed) return

    const { error } = await supabase.from('member_change_requests').insert({
      member_id: currentMember.id,
      requested_by: user?.id || null,
      requested_data: requestedData,
      status: 'offen',
    })

    if (error) return alert(error.message)

    await createAuditLog('request_member_change', 'members', currentMember.id, currentMember, requestedData)
    await loadMemberChangeRequests()

    alert('Ã„nderungsantrag wurde eingereicht.')
  }

  async function approveMemberChangeRequest(request) {
    if (!canManageMembers() && !isAdmin()) return alert('Keine Berechtigung.')

    const member = members.find((item) => item.id === request.member_id)
    const requestedData = request.requested_data || {}

    const confirmed = window.confirm(
      `Ã„nderungsantrag genehmigen?\n\nMitglied: ${member ? `${member.first_name || ''} ${member.last_name || ''}` : request.member_id}`
    )

    if (!confirmed) return

    const { error: memberError } = await supabase
      .from('members')
      .update(requestedData)
      .eq('id', request.member_id)

    if (memberError) return alert(memberError.message)

    const { error } = await supabase
      .from('member_change_requests')
      .update({
        status: 'genehmigt',
        reviewed_by: user?.id || null,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', request.id)

    if (error) return alert(error.message)

    await createAuditLog('approve_member_change', 'members', request.member_id, member, requestedData)
    await loadMembers()
    await loadCurrentMember(user.id)
    await loadMemberChangeRequests()

    alert('Ã„nderung wurde genehmigt und Ã¼bernommen.')
  }

  async function rejectMemberChangeRequest(request) {
    if (!canManageMembers() && !isAdmin()) return alert('Keine Berechtigung.')

    const note = window.prompt('Ablehnungsgrund / Notiz:')

    const { error } = await supabase
      .from('member_change_requests')
      .update({
        status: 'abgelehnt',
        reviewed_by: user?.id || null,
        reviewed_at: new Date().toISOString(),
        review_note: note || null,
      })
      .eq('id', request.id)

    if (error) return alert(error.message)

    await createAuditLog('reject_member_change', 'member_change_requests', request.id, request, { note })
    await loadMemberChangeRequests()

    alert('Ã„nderungsantrag wurde abgelehnt.')
  }

  function getCurrentMemberFee() {
    return buildGetCurrentMemberFee(currentMember, getFee)
  }

  function getFinanceDashboardData() {
    return buildFinanceDashboardData({
      cashEntriesForSelectedYear: getCashEntriesForSelectedYear(),
      fees,
      members,
      events,
      getMemberById,
      getEventIncomeTotal,
      getEventExpenseTotal,
      getEventBalance,
    })
  }

  function getFinanceHealthStatus() {
    return buildFinanceHealthStatus(getFinanceDashboardData(), colors)
  }

  function formatCustomerAddressFromFields(data) {
    return buildFormatCustomerAddressFromFields(data)
  }

  function getInvoiceCustomerAddress(invoice) {
    return buildGetInvoiceCustomerAddress(invoice)
  }

  function getSelectedInvoiceCustomer() {
    return buildGetSelectedInvoiceCustomer(invoiceCustomers, selectedInvoiceCustomerId)
  }

  function selectInvoiceCustomer(customerId) {
    setSelectedInvoiceCustomerId(customerId)

    if (!customerId) return

    const customer = invoiceCustomers.find((item) => item.id === customerId)

    if (!customer) return

    setInvoiceCustomerName(customer.name || '')
    setInvoiceCustomerEmail(customer.email || '')
    setInvoiceCustomerStreet(customer.street || '')
    setInvoiceCustomerHouseNumber(customer.house_number || '')
    setInvoiceCustomerAddressAddition(customer.address_addition || '')
    setInvoiceCustomerPostalCode(customer.postal_code || '')
    setInvoiceCustomerCity(customer.city || '')
    setInvoiceCustomerCountry(customer.country || 'Ã–sterreich')
  }

  function resetCustomerForm() {
    setEditingCustomerId(null)
    setCustomerName('')
    setCustomerEmail('')
    setCustomerStreet('')
    setCustomerHouseNumber('')
    setCustomerAddressAddition('')
    setCustomerPostalCode('')
    setCustomerCity('')
    setCustomerCountry('Ã–sterreich')
    setCustomerNotes('')
  }

  function editInvoiceCustomer(customer) {
    if (!canManageCash() && !isAdmin()) return alert('Keine Berechtigung fÃ¼r Kunden.')

    setEditingCustomerId(customer.id)
    setCustomerName(customer.name || '')
    setCustomerEmail(customer.email || '')
    setCustomerStreet(customer.street || '')
    setCustomerHouseNumber(customer.house_number || '')
    setCustomerAddressAddition(customer.address_addition || '')
    setCustomerPostalCode(customer.postal_code || '')
    setCustomerCity(customer.city || '')
    setCustomerCountry(customer.country || 'Ã–sterreich')
    setCustomerNotes(customer.notes || '')
  }

  async function saveInvoiceCustomer() {
    if (!canManageCash() && !isAdmin()) return alert('Keine Berechtigung fÃ¼r Kunden.')

    if (!customerName.trim()) {
      alert('Kundenname ist Pflicht.')
      return
    }

    const payload = {
      name: customerName.trim(),
      email: customerEmail.trim() || null,
      street: customerStreet.trim() || null,
      house_number: customerHouseNumber.trim() || null,
      address_addition: customerAddressAddition.trim() || null,
      postal_code: customerPostalCode.trim() || null,
      city: customerCity.trim() || null,
      country: customerCountry.trim() || 'Ã–sterreich',
      notes: customerNotes.trim() || null,
    }

    if (editingCustomerId) {
      const oldCustomer = invoiceCustomers.find((customer) => customer.id === editingCustomerId)

      const { error } = await supabase
        .from('invoice_customers')
        .update(payload)
        .eq('id', editingCustomerId)

      if (error) return alert(error.message)

      await createAuditLog('update', 'invoice_customers', editingCustomerId, oldCustomer, payload)
      alert('Kunde wurde aktualisiert.')
    } else {
      const { data, error } = await supabase
        .from('invoice_customers')
        .insert(payload)
        .select()
        .single()

      if (error) return alert(error.message)

      await createAuditLog('insert', 'invoice_customers', data?.id, null, data)
      alert('Kunde wurde angelegt.')
    }

    resetCustomerForm()
    await loadInvoiceCustomers()
  }

  async function deleteInvoiceCustomer(customer) {
    if (!isAdmin()) return alert('Nur Admins dÃ¼rfen Kunden lÃ¶schen.')

    const used = invoices.some((invoice) => invoice.customer_id === customer.id)

    if (used) {
      alert('Dieser Kunde wird bereits in Rechnungen verwendet und kann nicht gelÃ¶scht werden.')
      return
    }

    const confirmed = window.confirm(`Kunde wirklich lÃ¶schen?\n\n${customer.name}`)

    if (!confirmed) return

    const { error } = await supabase
      .from('invoice_customers')
      .delete()
      .eq('id', customer.id)

    if (error) return alert(error.message)

    await createAuditLog('delete', 'invoice_customers', customer.id, customer, null)
    await loadInvoiceCustomers()
    alert('Kunde wurde gelÃ¶scht.')
  }

  function getFilteredInvoiceCustomers() {
    return buildGetFilteredInvoiceCustomers(invoiceCustomers, customerSearch)
  }

  function blobToBase64(blob) {
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

  function getInvoiceYear(invoice) {
    return buildGetInvoiceYear(invoice)
  }

  function getInvoiceFilePath(invoice, filename) {
    return buildGetInvoiceFilePath(invoice, filename)
  }

  function isInvoiceOverdue(invoice) {
    if (invoice.status !== 'offen') return false
    if (!invoice.due_date) return false

    const due = new Date(invoice.due_date)
    due.setHours(23, 59, 59, 999)

    return due < new Date()
  }

  function getOverdueInvoices() {
    return buildGetOverdueInvoices(invoices, isInvoiceOverdue)
  }

  async function buildInvoicePdfBlob(invoice) {
    const result = await generateInvoicePdf({
      invoice,
      member: invoice.member_id ? getMemberById(invoice.member_id) : null,
      items: getItemsForInvoice(invoice.id),
      isTest: Boolean(invoice.is_test || getMemberById(invoice.member_id)?.is_test),
      isCancelled: invoice.status === 'storniert',
      download: false,
      returnBlob: true,
    })

    return result
  }

  async function archiveInvoicePdf(invoice) {
    if (!canManageCash() && !isAdmin()) return alert('Keine Berechtigung fÃ¼r Rechnungsarchiv.')

    const { blob, filename } = await buildInvoicePdfBlob(invoice)
    const filePath = getInvoiceFilePath(invoice, filename)

    const { error: uploadError } = await supabase.storage
      .from('invoice-archive')
      .upload(filePath, blob, {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (uploadError) return alert(uploadError.message)

    const { error } = await supabase
      .from('invoices')
      .update({
        pdf_url: filePath,
        pdf_archived_at: new Date().toISOString(),
      })
      .eq('id', invoice.id)

    if (error) return alert(error.message)

    await createAuditLog('archive_pdf', 'invoices', invoice.id, invoice, { pdf_url: filePath })
    await loadInvoices()

    alert('Rechnung wurde im Archiv gespeichert.')
  }

  async function openArchivedInvoice(invoice) {
    if (!invoice.pdf_url) {
      alert('FÃ¼r diese Rechnung ist noch kein Archiv-PDF gespeichert.')
      return
    }

    const { data, error } = await supabase.storage
      .from('invoice-archive')
      .createSignedUrl(invoice.pdf_url, 300)

    if (error) return alert(error.message)

    window.open(data.signedUrl, '_blank')
  }

  async function sendInvoiceEmail(invoice, reminder = false) {
    if (!canManageCash() && !isAdmin()) return alert('Keine Berechtigung fÃ¼r Rechnungsversand.')

    if (!invoice.customer_email) {
      alert('Diese Rechnung hat keine E-Mail-Adresse.')
      return
    }

    const confirmed = window.confirm(
      `${reminder ? 'Zahlungserinnerung' : 'Rechnung'} per E-Mail senden?\n\n${invoice.customer_email}\n${invoice.invoice_number}`
    )

    if (!confirmed) return

    const { blob, filename } = await buildInvoicePdfBlob(invoice)
    const pdfBase64 = await blobToBase64(blob)

    const subject = reminder
      ? `Zahlungserinnerung ${invoice.invoice_number}`
      : `Rechnung ${invoice.invoice_number}`

    const html = reminder
      ? `<p>Hallo,</p><p>wir mÃ¶chten freundlich an die offene Rechnung <strong>${invoice.invoice_number}</strong> erinnern.</p><p>Danke und sportliche GrÃ¼ÃŸe<br/>Styrian Bastards Eishockey-Fanclub</p>`
      : `<p>Hallo,</p><p>anbei senden wir die Rechnung <strong>${invoice.invoice_number}</strong>.</p><p>Danke und sportliche GrÃ¼ÃŸe<br/>Styrian Bastards Eishockey-Fanclub</p>`

    const { data, error } = await supabase.functions.invoke('send-invoice-email', {
      body: {
        to: invoice.customer_email,
        subject,
        html,
        pdf_base64: pdfBase64,
        filename,
        invoice_number: invoice.invoice_number,
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

    const updatePayload = reminder
      ? {
          last_reminder_at: new Date().toISOString(),
          reminder_count: Number(invoice.reminder_count || 0) + 1,
        }
      : {
          emailed_at: new Date().toISOString(),
        }

    await supabase.from('invoices').update(updatePayload).eq('id', invoice.id)

    await createAuditLog(reminder ? 'send_invoice_reminder' : 'send_invoice_email', 'invoices', invoice.id, invoice, {
      to: invoice.customer_email,
    })

    await loadInvoices()

    alert(reminder ? 'Zahlungserinnerung wurde gesendet.' : 'Rechnung wurde per E-Mail gesendet.')
  }

  async function createCancellationInvoice(invoice) {
    if (!isAdmin()) return alert('Nur Admins dÃ¼rfen Stornorechnungen erstellen.')

    const existingCancellation = invoices.find(
      (item) => item.original_invoice_id === invoice.id && item.invoice_type === 'storno'
    )

    if (existingCancellation) {
      alert(`FÃ¼r diese Rechnung existiert bereits eine Stornorechnung: ${existingCancellation.invoice_number}`)
      return
    }

    const reason = window.prompt(`Grund fÃ¼r Stornorechnung zu ${invoice.invoice_number}:`)

    if (!reason || !reason.trim()) return

    const year = Number(getInvoiceYear(invoice))
    const invoiceNumber = `STORNO-${getNextInvoiceNumber(year, Boolean(invoice.is_test))}`
    const originalItems = getItemsForInvoice(invoice.id)

    const { data: cancellation, error } = await supabase
      .from('invoices')
      .insert({
        invoice_number: invoiceNumber,
        customer_id: invoice.customer_id || null,
        customer_name: invoice.customer_name,
        customer_email: invoice.customer_email || null,
        customer_address: invoice.customer_address || null,
        customer_street: invoice.customer_street || null,
        customer_house_number: invoice.customer_house_number || null,
        customer_address_addition: invoice.customer_address_addition || null,
        customer_postal_code: invoice.customer_postal_code || null,
        customer_city: invoice.customer_city || null,
        customer_country: invoice.customer_country || 'Ã–sterreich',
        issue_date: new Date().toISOString().slice(0, 10),
        due_date: null,
        total_amount: -Math.abs(Number(invoice.total_amount || 0)),
        status: 'storniert',
        is_test: Boolean(invoice.is_test),
        invoice_type: 'storno',
        original_invoice_id: invoice.id,
        cancellation_reason: reason.trim(),
        notes: `Stornorechnung zu ${invoice.invoice_number}`,
        created_by: user?.id || null,
        member_id: invoice.member_id || null,
        membership_fee_id: invoice.membership_fee_id || null,
      })
      .select()
      .single()

    if (error) return alert(error.message)

    const rowsToInsert = originalItems.map((item) => ({
      invoice_id: cancellation.id,
      description: `Storno: ${item.description || ''}`,
      quantity: Number(item.quantity || 0),
      unit_price: -Math.abs(Number(item.unit_price || 0)),
      total_price: -Math.abs(Number(item.total_price || 0)),
    }))

    if (rowsToInsert.length > 0) {
      const { error: itemsError } = await supabase.from('invoice_items').insert(rowsToInsert)
      if (itemsError) return alert(itemsError.message)
    }

    await supabase
      .from('invoices')
      .update({
        status: 'storniert',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason.trim(),
      })
      .eq('id', invoice.id)

    await createAuditLog('create_cancellation_invoice', 'invoices', invoice.id, invoice, {
      cancellation_invoice_id: cancellation.id,
      cancellation_invoice_number: invoiceNumber,
      reason: reason.trim(),
    })

    await loadInvoices()
    await loadInvoiceItems()

    alert(`Stornorechnung ${invoiceNumber} wurde erstellt.`)
  }

  function getNextInvoiceNumber(year = new Date().getFullYear(), isTest = false) {
    return buildGetNextInvoiceNumber(invoices, year, isTest)
  }

  function getInvoiceRowsTotal(rows = invoiceRows) {
    return buildGetInvoiceRowsTotal(rows)
  }

  function getItemsForInvoice(invoiceId) {
    return buildGetItemsForInvoice(invoiceItems, invoiceId)
  }

  function getInvoiceById(invoiceId) {
    return buildGetInvoiceById(invoices, invoiceId)
  }

  function getMemberById(memberId) {
    return members.find((member) => member.id === memberId)
  }

  function resetInvoiceForm() {
    setSelectedInvoiceCustomerId('')
    setInvoiceCustomerName('')
    setInvoiceCustomerEmail('')
    setInvoiceCustomerStreet('')
    setInvoiceCustomerHouseNumber('')
    setInvoiceCustomerAddressAddition('')
    setInvoiceCustomerPostalCode('')
    setInvoiceCustomerCity('')
    setInvoiceCustomerCountry('Ã–sterreich')
    setInvoiceIssueDate(new Date().toISOString().slice(0, 10))
    setInvoiceDueDate('')
    setInvoiceNotes('')
    setInvoiceIsTest(false)
    setInvoiceRows([{ description: '', quantity: 1, unit_price: '' }])
  }

  function updateInvoiceRow(index, field, value) {
    setInvoiceRows((rows) =>
      rows.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row
      )
    )
  }

  function addInvoiceRow() {
    setInvoiceRows((rows) => [...rows, { description: '', quantity: 1, unit_price: '' }])
  }

  function removeInvoiceRow(index) {
    setInvoiceRows((rows) => rows.filter((_, rowIndex) => rowIndex !== index))
  }

  function getFilteredInvoices() {
    return buildGetFilteredInvoices(invoices, invoiceSearch, invoiceStatusFilter, invoiceTestFilter)
  }

  async function createMembershipFeeInvoice(member, fee) {
    if (!canManageCash() && !isAdmin()) return alert('Keine Berechtigung fÃ¼r Rechnungen.')

    if (!member || !fee) {
      alert('Mitglied oder Beitrag fehlt.')
      return
    }

    if (fee.paid) {
      alert('Dieser Mitgliedsbeitrag ist bereits bezahlt.')
      return
    }

    const existingInvoice = invoices.find(
      (invoice) =>
        invoice.membership_fee_id === fee.id &&
        invoice.status !== 'storniert'
    )

    if (existingInvoice) {
      const openExisting = window.confirm(
        `FÃ¼r diesen Beitrag gibt es bereits eine Rechnung:\n\n${existingInvoice.invoice_number}\n\nPDF jetzt Ã¶ffnen?`
      )

      if (openExisting) {
        await exportInvoicePdf(existingInvoice)
      }

      return
    }

    const year = Number(fee.year || new Date().getFullYear())
    const invoiceNumber = getNextInvoiceNumber(year, false)
    const amount = Number(fee.amount || 0)

    const confirmed = window.confirm(
      `Mitgliedsbeitrag-Rechnung erstellen?\n\n${member.first_name || ''} ${member.last_name || ''}\nBetrag: ${amount.toFixed(2)} â‚¬\nRechnungsnummer: ${invoiceNumber}`
    )

    if (!confirmed) return

    const { data: invoice, error } = await supabase
      .from('invoices')
      .insert({
        invoice_number: invoiceNumber,
        customer_name: `${member.first_name || ''} ${member.last_name || ''}`.trim(),
        customer_email: member.email || null,
        customer_address: [member.street, `${member.postal_code || ''} ${member.city || ''}`.trim()]
          .filter(Boolean)
          .join(', ') || null,
        customer_street: member.street || null,
        customer_house_number: null,
        customer_address_addition: null,
        customer_postal_code: member.postal_code || null,
        customer_city: member.city || null,
        customer_country: 'Ã–sterreich',
        issue_date: new Date().toISOString().slice(0, 10),
        due_date: null,
        total_amount: amount,
        status: 'offen',
        is_test: Boolean(member.is_test),
        notes: `Mitgliedsbeitrag ${year}`,
        created_by: user?.id || null,
        member_id: member.id,
        membership_fee_id: fee.id,
      })
      .select()
      .single()

    if (error) return alert(error.message)

    const { error: itemError } = await supabase.from('invoice_items').insert({
      invoice_id: invoice.id,
      description: `Mitgliedsbeitrag ${year} - ${member.first_name || ''} ${member.last_name || ''}`,
      quantity: 1,
      unit_price: amount,
      total_price: amount,
    })

    if (itemError) return alert(itemError.message)

    await createAuditLog('insert_membership_fee_invoice', 'invoices', invoice.id, null, {
      invoice,
      member_id: member.id,
      membership_fee_id: fee.id,
    })

    await loadInvoices()
    await loadInvoiceItems()

    alert(`Mitgliedsbeitrag-Rechnung ${invoiceNumber} wurde erstellt.`)
  }

  async function createInvoice() {
    if (!canManageCash() && !isAdmin()) return alert('Keine Berechtigung fÃ¼r Rechnungen.')

    if (!invoiceCustomerName.trim()) {
      alert('Kundenname ist Pflicht.')
      return
    }

    const validRows = invoiceRows
      .map((row) => ({
        description: String(row.description || '').trim(),
        quantity: Number(row.quantity || 0),
        unit_price: Number(row.unit_price || 0),
      }))
      .filter((row) => row.description && row.quantity > 0 && row.unit_price >= 0)

    if (validRows.length === 0) {
      alert('Bitte mindestens eine gÃ¼ltige Rechnungsposition eingeben.')
      return
    }

    const issueYear = Number(String(invoiceIssueDate || new Date().toISOString().slice(0, 10)).slice(0, 4))
    const invoiceNumber = getNextInvoiceNumber(issueYear, invoiceIsTest)
    const totalAmount = validRows.reduce((sum, row) => sum + row.quantity * row.unit_price, 0)

    const { data: invoice, error } = await supabase
      .from('invoices')
      .insert({
        invoice_number: invoiceNumber,
        customer_id: selectedInvoiceCustomerId || null,
        customer_name: invoiceCustomerName.trim(),
        customer_email: invoiceCustomerEmail.trim() || null,
        customer_address: formatCustomerAddressFromFields({
          street: invoiceCustomerStreet,
          house_number: invoiceCustomerHouseNumber,
          address_addition: invoiceCustomerAddressAddition,
          postal_code: invoiceCustomerPostalCode,
          city: invoiceCustomerCity,
          country: invoiceCustomerCountry,
        }) || null,
        customer_street: invoiceCustomerStreet.trim() || null,
        customer_house_number: invoiceCustomerHouseNumber.trim() || null,
        customer_address_addition: invoiceCustomerAddressAddition.trim() || null,
        customer_postal_code: invoiceCustomerPostalCode.trim() || null,
        customer_city: invoiceCustomerCity.trim() || null,
        customer_country: invoiceCustomerCountry.trim() || 'Ã–sterreich',
        issue_date: invoiceIssueDate || new Date().toISOString().slice(0, 10),
        due_date: invoiceDueDate || null,
        total_amount: totalAmount,
        status: 'offen',
        is_test: invoiceIsTest,
        notes: invoiceNotes.trim() || null,
        created_by: user?.id || null,
      })
      .select()
      .single()

    if (error) return alert(error.message)

    const rowsToInsert = validRows.map((row) => ({
      invoice_id: invoice.id,
      description: row.description,
      quantity: row.quantity,
      unit_price: row.unit_price,
      total_price: row.quantity * row.unit_price,
    }))

    const { error: itemsError } = await supabase.from('invoice_items').insert(rowsToInsert)

    if (itemsError) return alert(itemsError.message)

    await createAuditLog('insert', 'invoices', invoice.id, null, {
      ...invoice,
      items: rowsToInsert,
    })

    resetInvoiceForm()
    await loadInvoices()
    await loadInvoiceItems()

    alert(`${invoiceIsTest ? 'Testrechnung' : 'Rechnung'} ${invoiceNumber} wurde erstellt.`)
  }

  async function markInvoicePaid(invoice) {
    if (!canManageCash() && !isAdmin()) return alert('Keine Berechtigung fÃ¼r Rechnungen.')

    if (invoice.status === 'bezahlt') {
      alert('Diese Rechnung ist bereits bezahlt.')
      return
    }

    const confirmed = window.confirm(
      `Rechnung als bezahlt markieren?\n\n${invoice.invoice_number}\n${invoice.customer_name}\n${Number(invoice.total_amount || 0).toFixed(2)} â‚¬\n\n` +
        (invoice.is_test ? 'Testrechnung: Es wird KEINE Kassa-Einnahme erstellt.' : 'Es wird automatisch eine Kassa-Einnahme erstellt.')
    )

    if (!confirmed) return

    const today = new Date().toISOString().slice(0, 10)
    const year = Number(today.slice(0, 4))

    if (!invoice.is_test) {
      const { error: cashError } = await supabase.from('cash_entries').insert({
        entry_date: today,
        entry_year: year,
        receipt_number: getNextReceiptNumber(year),
        is_cancelled: false,
        type: 'einnahme',
        category: 'sonstiges',
        event_id: null,
        payment_method: 'ebanking',
        is_opening: false,
        amount: Number(invoice.total_amount || 0),
        description: `Rechnung bezahlt: ${invoice.invoice_number} - ${invoice.customer_name}`,
        receipt_url: null,
        invoice_id: invoice.id,
        membership_fee_id: invoice.membership_fee_id || null,
        member_id: invoice.member_id || null,
      })

      if (cashError) return alert(cashError.message)
    }

    const { error } = await supabase
      .from('invoices')
      .update({
        status: 'bezahlt',
        paid_at: today,
      })
      .eq('id', invoice.id)

    if (error) return alert(error.message)

    if (invoice.membership_fee_id) {
      const { error: feeError } = await supabase
        .from('membership_fees')
        .update({
          paid: true,
          paid_at: today,
          payment_method: 'ueberweisung',
        })
        .eq('id', invoice.membership_fee_id)

      if (feeError) return alert(feeError.message)
    }

    await createAuditLog('mark_paid', 'invoices', invoice.id, invoice, {
      status: 'bezahlt',
      paid_at: today,
    })

    await loadInvoices()
    await loadCashEntries()
    await loadFees()

    alert('Rechnung wurde als bezahlt markiert und in die Kassa Ã¼bernommen.')
  }

  async function cancelInvoice(invoice) {
    if (!isAdmin()) return alert('Nur Admins dÃ¼rfen Rechnungen stornieren.')

    if (invoice.status === 'storniert') {
      alert('Diese Rechnung ist bereits storniert.')
      return
    }

    const reason = window.prompt(`Storno-Grund fÃ¼r ${invoice.invoice_number} eingeben:`)

    if (!reason || !reason.trim()) return

    const { error } = await supabase
      .from('invoices')
      .update({
        status: 'storniert',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason.trim(),
      })
      .eq('id', invoice.id)

    if (error) return alert(error.message)

    await createAuditLog('cancel', 'invoices', invoice.id, invoice, {
      status: 'storniert',
      cancellation_reason: reason.trim(),
    })

    await loadInvoices()
    alert('Rechnung wurde storniert.')
  }

  async function deleteInvoice(invoice) {
    if (!isAdmin()) return alert('Nur Admins dÃ¼rfen Rechnungen lÃ¶schen.')

    const confirmed = window.confirm(
      `Rechnung wirklich endgÃ¼ltig lÃ¶schen?\n\n${invoice.invoice_number} Â· ${invoice.customer_name}\n\nBei echten Rechnungen ist normalerweise Storno besser. Testrechnungen kÃ¶nnen gefahrlos gelÃ¶scht werden.`
    )

    if (!confirmed) return

    const secondConfirm = window.confirm(
      'Bitte nochmals bestÃ¤tigen: Die Rechnung inklusive Positionen wird endgÃ¼ltig gelÃ¶scht.'
    )

    if (!secondConfirm) return

    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', invoice.id)

    if (error) return alert(error.message)

    await createAuditLog('delete', 'invoices', invoice.id, invoice, null)
    await loadInvoices()
    await loadInvoiceItems()

    alert('Rechnung wurde gelÃ¶scht.')
  }

  async function exportInvoicePdf(invoice) {
    await generateInvoicePdf({
      invoice,
      member: invoice.member_id ? getMemberById(invoice.member_id) : null,
      items: getItemsForInvoice(invoice.id),
      isTest: Boolean(invoice.is_test || getMemberById(invoice.member_id)?.is_test),
      isCancelled: invoice.status === 'storniert',
      download: true,
    })
  }

  function exportInvoicesCsv() {
    const rows = getFilteredInvoices().map((invoice) => ({
      Rechnungsnummer: invoice.invoice_number || '',
      Kunde: invoice.customer_name || '',
      Email: invoice.customer_email || '',
      KundenID: invoice.customer_id || '',
      StraÃŸe: invoice.customer_street || '',
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
      'StraÃŸe',
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

    downloadTextFile('styrian-bastards-rechnungen.csv', rowsToCsv(headers, rows), 'text/csv;charset=utf-8')
  }

  function exportMembersPdf() {
    const doc = new jsPDF()
    const filteredMembers = getFilteredMembers()

    doc.text('Styrian Bastards - Mitgliederliste', 14, 15)

    autoTable(doc, {
      startY: 25,
      head: [['Nr.', 'Name', 'Art', 'Funktion', 'Status', 'E-Mail', 'Telefon', 'Adresse', 'Geburtsdatum', 'GrÃ¶ÃŸe']],
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


  function exportDetailedCashbookPdf() {
    const doc = new jsPDF()
    const summary = getCashbookDetailedSummary()

    doc.text('Styrian Bastards - Kassabuch DetailÃ¼bersicht', 14, 15)
    doc.text(`Kassastand: ${getCashBalance().toFixed(2)} EUR`, 14, 23)

    autoTable(doc, {
      startY: 32,
      head: [[
        'Monat',
        'Ãœbertrag Bank netto',
        'Ãœbertrag Bar netto',
        'Einnahme Bank',
        'Ausgabe Bank',
        'Einnahme Bar',
        'Ausgabe Bar',
        'Einnahmen inkl. Ãœbertrag',
        'Ausgaben inkl. Ãœbertrag',
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

  async function exportAllMemberCardsPdf() {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })

    const membersToPrint = getFilteredMembers()

    // A4 Hochformat: 2 Spalten x 5 Reihen = 10 Visitenkarten pro Seite
    // Visitenkartenformat ca. 85 x 54 mm
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

      // Karte Hintergrund
      doc.setFillColor(5, 5, 5)
      doc.roundedRect(x, y, cardWidth, cardHeight, 3, 3, 'F')

      // Vereins-Akzent
      doc.setFillColor(193, 18, 31)
      doc.rect(x, y, 4, cardHeight, 'F')

      // Titel
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(13)
      doc.text('STYRIAN BASTARDS', x + 8, y + 9)

      doc.setFontSize(8)
      doc.text('Mitgliedsausweis', x + 8, y + 15)

      // Mitgliedsdaten
      doc.setFontSize(12)
      doc.text(`${member.first_name || ''} ${member.last_name || ''}`, x + 8, y + 27, {
        maxWidth: 48,
      })

      doc.setFontSize(7)
      doc.text(`Art: ${member.member_type || '-'}`, x + 8, y + 35)
      doc.text(`Status: ${member.status || '-'}`, x + 8, y + 40)
      doc.text(`Nr.: ${member.member_number || member.id.slice(0, 8)}`, x + 8, y + 45)

      // QR-Code
      doc.setFillColor(255, 255, 255)
      doc.roundedRect(x + 58, y + 15, 22, 22, 1.5, 1.5, 'F')
      doc.addImage(qrDataUrl, 'PNG', x + 59, y + 16, 20, 20)

      doc.setTextColor(255, 255, 255)
      doc.setFontSize(6)
      doc.text('QR-Code zur PrÃ¼fung', x + 57, y + 43)
    }

    doc.save('styrian-bastards-mitgliedsausweise-visitenkarten.pdf')
  }

  async function exportMemberCardPdf(member) {
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
    doc.text('QR-Code zur PrÃ¼fung', 55, 44)

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
      alert('Keine Offline-EintrÃ¤ge vorhanden.')
      return
    }

    const entriesToSync = offlineCashEntries.map((offlineEntry) => {
      const entry = { ...offlineEntry }
      delete entry.offline_id
      return entry
    })

    const { error } = await supabase.from('cash_entries').insert(entriesToSync)

    if (error) return alert(error.message)

    localStorage.removeItem('offlineCashEntries')
    setOfflineCashEntries([])
    loadCashEntries()

    alert('Offline-EintrÃ¤ge wurden synchronisiert.')
  }

  function resetEventForm() {
    setEditingEventId(null)
    setNewEventName('')
    setNewEventDate(getTodayDate())
    setNewEventLocation('')
    setNewEventNotes('')
  }

  function editEvent(event) {
    if (!canManageEvents()) return alert('Keine Berechtigung fÃ¼r Event-Verwaltung.')

    setEditingEventId(event.id)
    setNewEventName(event.name || '')
    setNewEventDate(event.event_date || getTodayDate())
    setNewEventLocation(event.location || '')
    setNewEventNotes(event.notes || '')

    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function createEvent() {
    if (!canManageEvents()) return alert('Keine Berechtigung fÃ¼r Event-Verwaltung.')

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
    if (!canManageEvents()) return alert('Keine Berechtigung fÃ¼r Event-Verwaltung.')

    if (!editingEventId) {
      alert('Kein Event zum Bearbeiten ausgewÃ¤hlt.')
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
    if (!canManageEvents()) return alert('Keine Berechtigung fÃ¼r Event-Verwaltung.')

    const { error } = await supabase
      .from('events')
      .update({ status })
      .eq('id', eventId)

    if (error) return alert(error.message)

    await createAuditLog('status_change', 'events', eventId, events.find((event) => event.id === eventId), { status })

    loadEvents()
  }

  async function deleteEvent(event) {
    if (!isAdmin()) return alert('Nur Admins dÃ¼rfen Events lÃ¶schen.')

    const hasCashEntries = cashEntries.some((entry) => entry.event_id === event.id)
    const hasCheckins = eventCheckins.some((checkin) => checkin.event_name === event.name)

    const warning = [
      `Event wirklich lÃ¶schen?`,
      ``,
      event.name || '',
      ``,
      hasCashEntries ? 'Achtung: Es gibt Kassa-EintrÃ¤ge zu diesem Event. Diese bleiben bestehen, verlieren aber die Event-Zuordnung.' : '',
      hasCheckins ? 'Achtung: Es gibt Check-ins zu diesem Event. Diese bleiben in der Datenbank, sind aber nicht mehr in der Eventliste sichtbar.' : '',
      ``,
      'Das kann nicht rÃ¼ckgÃ¤ngig gemacht werden.',
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

    alert('Event wurde gelÃ¶scht.')
  }

  async function checkInMember(member) {
    if (!canUseCheckin()) return alert('Keine Berechtigung fÃ¼r Check-in.')

    const activeEventName = getActiveEventName()

    if (!activeEventName) {
      alert('Bitte zuerst ein Event auswÃ¤hlen oder anlegen.')
      return
    }

    if (isCheckedInToday(member.id)) {
      alert(`${member.first_name} ${member.last_name} ist fÃ¼r dieses Event heute bereits eingecheckt.`)
      return
    }

    const { error } = await supabase.from('event_checkins').insert({
      member_id: member.id,
      event_name: activeEventName,
      checkin_date: getTodayDate(),
    })

    if (error) return alert(error.message)

    await loadEventCheckins()
    alert(`Check-in erfolgreich: ${member.first_name} ${member.last_name} fÃ¼r ${activeEventName}`)
  }

  async function deleteMember(member) {
    if (!isAdmin()) return alert('Nur Admins dÃ¼rfen Mitglieder lÃ¶schen.')

    const confirmed = window.confirm(
      `Mitglied wirklich lÃ¶schen?\n\n${member.first_name || ''} ${member.last_name || ''}\n\nDas kann nicht rÃ¼ckgÃ¤ngig gemacht werden.`
    )

    if (!confirmed) return

    const secondConfirm = window.confirm(
      'Bitte nochmals bestÃ¤tigen: Dieses Mitglied und verknÃ¼pfte Daten kÃ¶nnen gelÃ¶scht werden.'
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
    alert('Mitglied wurde gelÃ¶scht.')
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
    setIsTestMember(false)
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
    setIsTestMember(Boolean(member.is_test))
    setStreet(member.street || '')
    setPostalCode(member.postal_code || '')
    setCity(member.city || '')
    setBirthdate(member.birthdate || '')
    setClothingSize(member.clothing_size || '')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function saveMember() {
    if (!canManageMembers()) return alert('Keine Berechtigung fÃ¼r Mitgliederverwaltung.')

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
    if (!canManageMembers()) return alert('Keine Berechtigung fÃ¼r Mitgliederverwaltung.')

    const oldMember = members.find((member) => member.id === id)
    const { error } = await supabase.from('members').update({ status }).eq('id', id)
    if (error) return alert(error.message)
    await createAuditLog('status_change', 'members', id, oldMember, { status })
    loadMembers()
  }

  async function markFeePaid(fee, paymentMethod = 'bar') {
    if (!canManageCash()) return alert('Keine Berechtigung fÃ¼r Kassa.')

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
      is_test: Boolean(member?.is_test),
      member_id: fee.member_id,
      membership_fee_id: fee.id,
    })

    if (cashError) return alert(cashError.message)
    await createAuditLog('payment_mark_paid', 'membership_fees', fee.id, fee, { paid: true, paid_at: today, payment_method: paymentMethod })
    loadAll()
  }

  async function markFeeOpen(fee) {
    if (!canManageCash()) return alert('Keine Berechtigung fÃ¼r Kassa.')

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
      .replace('â‚¬', '')
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
    const date = rawDate || (description.toLowerCase().includes('Ã¼bertrag') || description.toLowerCase().includes('uebertrag') ? row.__month_start : '')
    const note = getCsvValue(row, ['anmerkung', 'notiz', 'notes'])
    const number = getCsvValue(row, ['nummer', 'belegnummer'])
    const lowerDescription = description.toLowerCase()
    const isOpening = lowerDescription.includes('Ã¼bertrag vorjahr') || lowerDescription.includes('uebertrag vorjahr')
    const isCarryForward = lowerDescription.includes('Ã¼bertrag vormonat') || lowerDescription.includes('uebertrag vormonat')
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
      'jÃ¤nner': '01',
      'jaenner': '01',
      'januar': '01',
      'februar': '02',
      'mÃ¤rz': '03',
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
      const monthMatch = firstCell.match(/^([A-Za-zÃ„Ã–ÃœÃ¤Ã¶Ã¼ÃŸ]+)\s+(\d{4})$/)

      if (monthMatch) {
        const monthName = monthMatch[1]
          .toLowerCase()
          .replace('Ã¤', 'ae')
          .replace('Ã¶', 'oe')
          .replace('Ã¼', 'ue')
          .replace('ÃŸ', 'ss')

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
          alert('Keine gÃ¼ltigen Kassa-EintrÃ¤ge gefunden. PrÃ¼fe bitte Datum, Bezeichnung und BetrÃ¤ge.')
        }
      } catch (error) {
        alert(`Kassabuch konnte nicht gelesen werden: ${error.message}`)
      }
    }

    reader.readAsText(file, 'UTF-8')
  }

  async function importCashbookRows() {
    if (!canManageCash()) return alert('Keine Berechtigung fÃ¼r Kassa.')

    if (cashbookRows.length === 0) {
      alert('Bitte zuerst eine Kassabuch-CSV auswÃ¤hlen.')
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
    if (!canManageCash()) return alert('Keine Berechtigung fÃ¼r Kassa.')
    if (entry.is_cancelled) return alert('Stornierte EintrÃ¤ge kÃ¶nnen nicht bearbeitet werden.')
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
    if (!canManageCash()) return alert('Keine Berechtigung fÃ¼r Kassa.')

    const editingEntry = cashEntries.find((entry) => entry.id === editingCashId)

    if (editingEntry && isCashEntryMonthClosed(editingEntry)) {
      alert('Dieser Monat ist abgeschlossen. Der Eintrag kann nicht bearbeitet werden.')
      return
    }

    if (!editingCashId) {
      alert('Kein Kassa-Eintrag zum Bearbeiten ausgewÃ¤hlt.')
      return
    }

    const todayYear = Number(new Date().getFullYear())
    const todayMonth = Number(new Date().toISOString().slice(5, 7))

    if (isCashMonthClosed(todayYear, todayMonth)) {
      alert('Der aktuelle Monat ist abgeschlossen. Es kÃ¶nnen keine neuen Kassa-EintrÃ¤ge angelegt werden.')
      return
    }

    if (!cashAmount || !cashDescription) {
      alert('Betrag und Beschreibung sind Pflicht.')
      return
    }

    if (cashType === 'ausgabe' && !receiptFile) {
      const proceedWithoutReceipt = window.confirm(
        'FÃ¼r Ausgaben sollte ein Beleg hochgeladen werden. Trotzdem ohne Beleg speichern?'
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
    if (!canManageCash()) return alert('Keine Berechtigung fÃ¼r Kassa.')

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

      alert('Offline gespeichert. Wird spÃ¤ter synchronisiert.')
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
    if (!canManageCash()) return alert('Keine Berechtigung fÃ¼r Kassa.')

    if (isCashEntryMonthClosed(entry)) {
      alert('Dieser Monat ist abgeschlossen. Der Eintrag kann nicht storniert werden.')
      return
    }

    if (entry.is_cancelled) {
      alert('Dieser Kassa-Eintrag ist bereits storniert.')
      return
    }

    const reason = window.prompt(
      `Storno-Grund eingeben:\n\n${entry.receipt_number || 'ohne Belegnummer'} Â· ${entry.type === 'einnahme' ? 'Einnahme' : 'Ausgabe'} ${Number(entry.amount || 0).toFixed(2)} â‚¬\n${entry.description || ''}`
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
      alert('Keine Berechtigung fÃ¼r Dokumenten-Upload.')
      return
    }

    if (!documentTitle || !documentFile) {
      alert('Titel und Datei sind Pflicht.')
      return
    }

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
    if (!isAdmin()) return alert('Nur Admins dÃ¼rfen Dokumente lÃ¶schen.')

    const confirmed = window.confirm(
      `Dokument wirklich lÃ¶schen?\n\n${document.title || ''}\n\nDas kann nicht rÃ¼ckgÃ¤ngig gemacht werden.`
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
    alert('Dokument wurde gelÃ¶scht.')
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
        width: '100%',
        padding: isMobile ? 16 : 32,
        fontFamily: 'Arial, Helvetica, sans-serif',
        boxSizing: 'border-box',
        fontSize: isMobile ? 16 : 15,
        lineHeight: 1.55,
      }}
    >
      <div style={pageWrapperStyle}>
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
            {' '}Â· Mitglied:{' '}
            <strong style={{ color: colors.white }}>
              {currentMember.first_name} {currentMember.last_name}
            </strong>
          </>
        )}
      </p>

      {!currentMember && (
        <div style={{ ...cardStyle, background: '#fef2f2', color: '#991b1b', borderColor: '#b91c1c' }}>
          <strong>Kein Mitglied mit diesem Login verknÃ¼pft.</strong>
          <br />
          Bitte in Supabase beim passenden Mitglied die Spalte auth_user_id mit deiner Supabase User ID befÃ¼llen und app_role setzen.
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
        {navigationItems.map(([pageKey, label]) => (
          <button
            key={pageKey}
            onClick={() => setActivePage(pageKey)}
            style={navButtonStyle(activePage === pageKey)}
          >
            {label}
          </button>
        ))}
      </nav>

      {linkedMemberNotice && (
        <div style={{ ...cardStyle, background: colors.infoBg, borderColor: colors.blue, color: colors.infoText }}>
          <strong>QR-Code Hinweis</strong>
          <br />
          {linkedMemberNotice}
          <br />
          <button onClick={() => setLinkedMemberNotice('')} style={secondaryButtonStyle}>
            Hinweis schlieÃŸen
          </button>
        </div>
      )}

      {activePage === 'cash' && !canManageCash() && (
        <section style={sectionStyle}>
          <h2 style={headingStyle}>Kassa</h2>
          <p>FÃ¼r diesen Bereich hast du keine Berechtigung.</p>
        </section>
      )}

      {activePage === 'members' && !canManageMembers() && (
        <section style={sectionStyle}>
          <h2 style={headingStyle}>Mitglieder</h2>
          <p>FÃ¼r die Mitgliederverwaltung hast du keine Bearbeitungsrechte. Die Mitgliederliste bleibt weiter unten sichtbar, wenn sie freigegeben ist.</p>
        </section>
      )}


      {activePage === 'invoices' && (
        <InvoicesPage
          invoices={invoices}
          invoiceCustomers={invoiceCustomers}
          selectedInvoiceCustomerId={selectedInvoiceCustomerId}
          setSelectedInvoiceCustomerId={setSelectedInvoiceCustomerId}
          invoiceCustomerName={invoiceCustomerName}
          setInvoiceCustomerName={setInvoiceCustomerName}
          invoiceCustomerEmail={invoiceCustomerEmail}
          setInvoiceCustomerEmail={setInvoiceCustomerEmail}
          invoiceCustomerStreet={invoiceCustomerStreet}
          setInvoiceCustomerStreet={setInvoiceCustomerStreet}
          invoiceCustomerHouseNumber={invoiceCustomerHouseNumber}
          setInvoiceCustomerHouseNumber={setInvoiceCustomerHouseNumber}
          invoiceCustomerAddressAddition={invoiceCustomerAddressAddition}
          setInvoiceCustomerAddressAddition={setInvoiceCustomerAddressAddition}
          invoiceCustomerPostalCode={invoiceCustomerPostalCode}
          setInvoiceCustomerPostalCode={setInvoiceCustomerPostalCode}
          invoiceCustomerCity={invoiceCustomerCity}
          setInvoiceCustomerCity={setInvoiceCustomerCity}
          invoiceCustomerCountry={invoiceCustomerCountry}
          setInvoiceCustomerCountry={setInvoiceCustomerCountry}
          invoiceIssueDate={invoiceIssueDate}
          setInvoiceIssueDate={setInvoiceIssueDate}
          invoiceDueDate={invoiceDueDate}
          setInvoiceDueDate={setInvoiceDueDate}
          invoiceRows={invoiceRows}
          updateInvoiceRow={updateInvoiceRow}
          addInvoiceRow={addInvoiceRow}
          removeInvoiceRow={removeInvoiceRow}
          invoiceNotes={invoiceNotes}
          setInvoiceNotes={setInvoiceNotes}
          invoiceIsTest={invoiceIsTest}
          setInvoiceIsTest={setInvoiceIsTest}
          getInvoiceRowsTotal={getInvoiceRowsTotal}
          getNextInvoiceNumber={getNextInvoiceNumber}
          createInvoice={createInvoice}
          resetInvoiceForm={resetInvoiceForm}
          editingCustomerId={editingCustomerId}
          customerName={customerName}
          setCustomerName={setCustomerName}
          customerEmail={customerEmail}
          setCustomerEmail={setCustomerEmail}
          customerStreet={customerStreet}
          setCustomerStreet={setCustomerStreet}
          customerHouseNumber={customerHouseNumber}
          setCustomerHouseNumber={setCustomerHouseNumber}
          customerAddressAddition={customerAddressAddition}
          setCustomerAddressAddition={setCustomerAddressAddition}
          customerPostalCode={customerPostalCode}
          setCustomerPostalCode={setCustomerPostalCode}
          customerCity={customerCity}
          setCustomerCity={setCustomerCity}
          customerCountry={customerCountry}
          setCustomerCountry={setCustomerCountry}
          customerNotes={customerNotes}
          setCustomerNotes={setCustomerNotes}
          saveInvoiceCustomer={saveInvoiceCustomer}
          resetCustomerForm={resetCustomerForm}
          customerSearch={customerSearch}
          setCustomerSearch={setCustomerSearch}
          getFilteredInvoiceCustomers={getFilteredInvoiceCustomers}
          selectInvoiceCustomer={selectInvoiceCustomer}
          editInvoiceCustomer={editInvoiceCustomer}
          deleteInvoiceCustomer={deleteInvoiceCustomer}
          getSelectedInvoiceCustomer={getSelectedInvoiceCustomer}
          formatCustomerAddressFromFields={formatCustomerAddressFromFields}
          invoiceSearch={invoiceSearch}
          setInvoiceSearch={setInvoiceSearch}
          invoiceStatusFilter={invoiceStatusFilter}
          setInvoiceStatusFilter={setInvoiceStatusFilter}
          invoiceTestFilter={invoiceTestFilter}
          setInvoiceTestFilter={setInvoiceTestFilter}
          exportInvoicesCsv={exportInvoicesCsv}
          getFilteredInvoices={getFilteredInvoices}
          getInvoiceCustomerAddress={getInvoiceCustomerAddress}
          getItemsForInvoice={getItemsForInvoice}
          getMemberById={getMemberById}
          exportInvoicePdf={exportInvoicePdf}
          archiveInvoicePdf={archiveInvoicePdf}
          openArchivedInvoice={openArchivedInvoice}
          sendInvoiceEmail={sendInvoiceEmail}
          markInvoicePaid={markInvoicePaid}
          createCancellationInvoice={createCancellationInvoice}
          cancelInvoice={cancelInvoice}
          deleteInvoice={deleteInvoice}
          getOverdueInvoices={getOverdueInvoices}
          canManageCash={canManageCash}
          isAdmin={isAdmin}
        />
      )}


      {activePage === 'events' && (
        <EventsPage
          editingEventId={editingEventId}
          newEventName={newEventName}
          setNewEventName={setNewEventName}
          newEventDate={newEventDate}
          setNewEventDate={setNewEventDate}
          newEventLocation={newEventLocation}
          setNewEventLocation={setNewEventLocation}
          newEventNotes={newEventNotes}
          setNewEventNotes={setNewEventNotes}
          createEvent={createEvent}
          updateEvent={updateEvent}
          resetEventForm={resetEventForm}
          selectedEventId={selectedEventId}
          setSelectedEventId={setSelectedEventId}
          setEventName={setEventName}
          events={events}
          getActiveEventName={getActiveEventName}
          getSelectedEventIncomeTotal={getSelectedEventIncomeTotal}
          getSelectedEventExpenseTotal={getSelectedEventExpenseTotal}
          getSelectedEventBalance={getSelectedEventBalance}
          getEventIncomeTotal={getEventIncomeTotal}
          getEventExpenseTotal={getEventExpenseTotal}
          getEventBalance={getEventBalance}
          updateEventStatus={updateEventStatus}
          editEvent={editEvent}
          deleteEvent={deleteEvent}
          isAdmin={isAdmin}
          exportEventFinancePdf={exportEventFinancePdf}
          canUseCheckin={canUseCheckin}
          scanning={scanning}
          setScanning={setScanning}
          exportCheckinsPdf={exportCheckinsPdf}
          getTodayCheckins={getTodayCheckins}
          getMemberName={getMemberName}
        />
      )}

      {activePage === 'dashboard' && (
        <DashboardPage
          alerts={getDashboardAlerts()}
          getAlertStyle={getAlertStyle}
          cashBalance={getCashBalance()}
          incomeTotal={getIncomeTotal()}
          expenseTotal={getExpenseTotal()}
          inventoryTotalValue={getInventoryTotalValue()}
          testMembersCount={getTestMembers().length}
          openFeesCount={getOpenFeesCount()}
          openFeesTotal={getOpenFeesTotal()}
          nextEvent={events.length > 0 ? events[0] : null}
          monthlyData={getMonthlyData()}
          getDashboardBarHeight={getDashboardBarHeight}
          memberTypeStats={getMemberTypeStats()}
          feeStats={getFeeStats()}
          getStatsMax={getStatsMax}
          financeData={getFinanceDashboardData()}
          financeHealthStatus={getFinanceHealthStatus()}
          getCategorySummary={getCategorySummary}
          cashEntries={cashEntries}
          documents={documents}
        />
      )}

      {activePage === 'cash' && canManageCash() && (
        <CashPage
          {...{
            selectedCashYear,
            setSelectedCashYear,
            getAvailableCashYears,
            getTestMembers,
            fees,
            getMemberById,
            getTestCashEntries,
            getCashEntrySignedAmount,
            carryoverFromYear,
            setCarryoverFromYear,
            carryoverToYear,
            setCarryoverToYear,
            getCashBalanceForYear,
            hasOpeningForYear,
            createAutomaticCarryover,
            cashMonthClosings,
            isOnline,
            offlineCashEntries,
            syncOfflineCashEntries,
            getCashBalance,
            editingCashId,
            cashType,
            setCashType,
            cashCategory,
            setCashCategory,
            cashPaymentMethod,
            setCashPaymentMethod,
            cashEventId,
            setCashEventId,
            events,
            cashAmount,
            setCashAmount,
            cashDescription,
            setCashDescription,
            receiptFile,
            setReceiptFile,
            updateCashEntry,
            resetCashForm,
            addCashEntry,
            getCashbookDetailedSummary,
            getCashMonthLabel,
            isCashMonthClosed,
            isAdmin,
            reopenCashMonth,
            closeCashMonth,
            exportDetailedCashbookPdf,
            exportTaxAdvisorCsv,
            exportExcelStyleCashbookCsv,
            exportExcelStyleCashbookPdf,
            getCategorySummary,
            handleCashbookFile,
            cashbookFileName,
            cashbookRows,
            importCashbookRows,
            cashbookImporting,
            setCashbookRows,
            setCashbookFileName,
            cashSearch,
            setCashSearch,
            cashTypeFilter,
            setCashTypeFilter,
            cashCategoryFilter,
            setCashCategoryFilter,
            resetCashFilters,
            filteredCashEntries,
            getCashEntriesForSelectedYear,
            getPaymentMethodLabel,
            getPaymentMethod,
            isCashEntryMonthClosed,
            getInvoiceById,
            exportInvoicePdf,
            openReceipt,
            editCashEntry,
            deleteCashEntry,
          }}
        />
      )}

      {activePage === 'documents' && (
        <DocumentsPage
          canManageDocuments={() => canManageMembers() || isAdmin()}
          uploadFormProps={{
            documentTitle,
            setDocumentTitle,
            documentCategory,
            setDocumentCategory,
            documentDate,
            setDocumentDate,
            documentDescription,
            setDocumentDescription,
            setDocumentFile,
            uploadDocument,
            resetDocumentForm,
          }}
          listProps={{
            documents,
            isAdmin,
            openDocument,
            deleteDocument,
          }}
        />
      )}

      {activePage === 'inventory' && (
        <InventoryPage
          inventoryItems={inventoryItems}
          getInventoryTotalValue={getInventoryTotalValue}
          inventoryEditingId={inventoryEditingId}
          inventoryNumber={inventoryNumber}
          setInventoryNumber={setInventoryNumber}
          inventoryName={inventoryName}
          setInventoryName={setInventoryName}
          inventoryCategory={inventoryCategory}
          setInventoryCategory={setInventoryCategory}
          inventoryResponsible={inventoryResponsible}
          setInventoryResponsible={setInventoryResponsible}
          inventoryLocation={inventoryLocation}
          setInventoryLocation={setInventoryLocation}
          inventoryPurchaseDate={inventoryPurchaseDate}
          setInventoryPurchaseDate={setInventoryPurchaseDate}
          inventoryCondition={inventoryCondition}
          setInventoryCondition={setInventoryCondition}
          inventoryStatus={inventoryStatus}
          setInventoryStatus={setInventoryStatus}
          inventoryLastCheckDate={inventoryLastCheckDate}
          setInventoryLastCheckDate={setInventoryLastCheckDate}
          inventoryCheckStatus={inventoryCheckStatus}
          setInventoryCheckStatus={setInventoryCheckStatus}
          inventorySerialNumber={inventorySerialNumber}
          setInventorySerialNumber={setInventorySerialNumber}
          inventoryValue={inventoryValue}
          setInventoryValue={setInventoryValue}
          inventoryNotes={inventoryNotes}
          setInventoryNotes={setInventoryNotes}
          getNextInventoryNumber={getNextInventoryNumber}
          saveInventoryItem={saveInventoryItem}
          resetInventoryForm={resetInventoryForm}
          handleInventoryCsvFile={handleInventoryCsvFile}
          inventoryCsvFileName={inventoryCsvFileName}
          inventoryCsvRows={inventoryCsvRows}
          importInventoryRows={importInventoryRows}
          inventoryImporting={inventoryImporting}
          setInventoryCsvRows={setInventoryCsvRows}
          setInventoryCsvFileName={setInventoryCsvFileName}
          inventorySearch={inventorySearch}
          setInventorySearch={setInventorySearch}
          inventoryCategoryFilter={inventoryCategoryFilter}
          setInventoryCategoryFilter={setInventoryCategoryFilter}
          inventoryStatusFilter={inventoryStatusFilter}
          setInventoryStatusFilter={setInventoryStatusFilter}
          inventorySortBy={inventorySortBy}
          setInventorySortBy={setInventorySortBy}
          inventorySortDirection={inventorySortDirection}
          setInventorySortDirection={setInventorySortDirection}
          getInventoryCategories={getInventoryCategories}
          exportInventoryCsv={exportInventoryCsv}
          exportInventoryPdf={exportInventoryPdf}
          exportInventoryLabelsPdf={exportInventoryLabelsPdf}
          getFilteredInventoryItems={getFilteredInventoryItems}
          getInventoryQrValue={getInventoryQrValue}
          showInventoryQr={showInventoryQr}
          setShowInventoryQr={setShowInventoryQr}
          exportInventoryLabelPdf={exportInventoryLabelPdf}
          editInventoryItem={editInventoryItem}
          retireInventoryItem={retireInventoryItem}
          deleteInventoryItem={deleteInventoryItem}
          canManageMembers={canManageMembers}
          isAdmin={isAdmin}
        />
      )}

      {activePage === 'portal' && (
        <PortalPage
          currentMember={currentMember}
          getRoleLabel={getRoleLabel}
          currentMemberFee={getCurrentMemberFee()}
          portalEmail={portalEmail}
          setPortalEmail={setPortalEmail}
          portalPhone={portalPhone}
          setPortalPhone={setPortalPhone}
          portalStreet={portalStreet}
          setPortalStreet={setPortalStreet}
          portalPostalCode={portalPostalCode}
          setPortalPostalCode={setPortalPostalCode}
          portalCity={portalCity}
          setPortalCity={setPortalCity}
          portalClothingSize={portalClothingSize}
          setPortalClothingSize={setPortalClothingSize}
          submitMemberChangeRequest={submitMemberChangeRequest}
          getMyMemberChangeRequests={getMyMemberChangeRequests}
          getMemberQrValue={getMemberQrValue}
          exportMemberCardPdf={exportMemberCardPdf}
          getUpcomingEvents={getUpcomingEvents}
        />
      )}

      {activePage === 'scanner' && (
        <MobileScannerPage
          mobileScanMode={mobileScanMode}
          setMobileScanMode={setMobileScanMode}
          mobileScanning={mobileScanning}
          setMobileScanning={setMobileScanning}
          canManageMembers={canManageMembers}
          isAdmin={isAdmin}
        />
      )}

      {activePage === 'admin' && (
        <AdminPage
          exportsProps={{
            exportMembersPdf,
            exportAllMemberCardsPdf,
            exportCashPdf,
            exportDetailedCashbookPdf,
            exportTaxAdvisorCsv,
            exportTaxAdvisorProCsv,
            exportCategorySummaryCsv,
            exportExcelStyleCashbookCsv,
            exportExcelStyleCashbookPdf,
            exportOpenFeesPdf,
            exportCheckinsPdf,
          }}
          backupProps={{
            canRestore: isAdmin(),
            exportMembersCsv,
            exportCashCsv,
            exportTaxAdvisorCsv,
            exportTaxAdvisorProCsv,
            exportCategorySummaryCsv,
            exportAuditLogsCsv,
            exportExcelStyleCashbookCsv,
            exportExcelStyleCashbookPdf,
            exportEventsCsv,
            exportCheckinsCsv,
            exportDocumentsCsv,
            exportInventoryCsv,
            exportInventoryPdf,
            exportInventoryLabelsPdf,
            exportInvoicesCsv,
            exportFullBackupJson,
            handleRestoreFile,
            restoreFileName,
            restoreData,
            getRestoreCount,
            restoreFullBackup,
            restoreImporting,
            setRestoreData,
            setRestoreFileName,
          }}
          userInvitesProps={isAdmin() ? {
            members,
            getAppRoleLabel,
            inviteMemberUser,
            invitingMemberId,
          } : null}
          changeRequestsProps={(canManageMembers() || isAdmin()) ? {
            members,
            getPendingMemberChangeRequests,
            approveMemberChangeRequest,
            rejectMemberChangeRequest,
          } : null}
          testDataProps={isAdmin() ? {
            getTestMembers,
            getTestInvoices,
            getTestCashEntries,
            deleteAllTestData,
            deleteAllTestDataForMember,
          } : null}
          auditLogProps={isAdmin() ? {
            auditLogs,
            exportAuditLogsCsv,
          } : null}
        />
      )}
      {activePage === 'members' && (
        <MembersPage
          canManageMembers={canManageMembers}
          csvImportProps={{
            csvRows,
            csvFileName,
            csvImporting,
            getRoleLabel,
            handleCsvFile,
            importCsvMembers,
            setCsvRows,
            setCsvFileName,
          }}
          formProps={{
            isAdmin,
            editingId,
            firstName,
            setFirstName,
            lastName,
            setLastName,
            memberEmail,
            setMemberEmail,
            phone,
            setPhone,
            memberType,
            setMemberType,
            role,
            setRole,
            appRole,
            setAppRole,
            isTestMember,
            setIsTestMember,
            street,
            setStreet,
            postalCode,
            setPostalCode,
            city,
            setCity,
            birthdate,
            setBirthdate,
            clothingSize,
            setClothingSize,
            saveMember,
            resetForm,
          }}
          overviewProps={{
            members,
            filteredMembers,
            memberSearch,
            setMemberSearch,
            memberStatusFilter,
            setMemberStatusFilter,
            memberTypeFilter,
            setMemberTypeFilter,
            roleFilter,
            setRoleFilter,
            feeFilter,
            setFeeFilter,
            memberTestFilter,
            setMemberTestFilter,
            resetMemberFilters,
            exportAllMemberCardsPdf,
            tableProps: {
              getFee,
              getRoleLabel,
              getAppRoleLabel,
              isAdmin,
              editMember,
              changeMemberStatus,
              deleteMember,
              markMemberAsTest,
              deleteAllTestDataForMember,
              checkInMember,
              isCheckedInToday,
              showQR,
              setShowQR,
              exportMemberCardPdf,
              getMemberQrValue,
              createMembershipFeeInvoice,
              markFeePaid,
              markFeeOpen,
            },
          }}
        />
      )}
      </div>
    </main>
  )
}









