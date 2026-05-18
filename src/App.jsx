import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from './lib/supabase'
import { Html5QrcodeScanner } from 'html5-qrcode'
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
import {
  loadAll as loadAllService,
  loadAuditLogs as loadAuditLogsService,
  loadCashEntries as loadCashEntriesService,
  loadCashMonthClosings as loadCashMonthClosingsService,
  loadCurrentMember as loadCurrentMemberService,
  loadDocuments as loadDocumentsService,
  loadEventCheckins as loadEventCheckinsService,
  loadEvents as loadEventsService,
  loadFees as loadFeesService,
  loadInventoryItems as loadInventoryItemsService,
  loadInvoiceCustomers as loadInvoiceCustomersService,
  loadInvoiceItems as loadInvoiceItemsService,
  loadInvoices as loadInvoicesService,
  loadMemberChangeRequests as loadMemberChangeRequestsService,
  loadMembers as loadMembersService,
} from './services/loaders/appLoaders'
import {
  addCashEntryRecord,
  deleteCashEntryRecord,
  deleteMembershipFee,
  saveMembershipFee,
  updateCashEntryRecord,
} from './services/repositories/cashRepository'
import {
  closeCashMonthService,
  reopenCashMonthService,
} from './services/cash/cashMonthService'
import { createAutomaticCarryoverService } from './services/cash/carryoverService'
import {
  saveOfflineCashEntryService,
  syncOfflineCashEntriesService,
} from './services/cash/offlineCashService'
import { getCashbookDetailedSummaryService } from './services/cash/summary/cashbookSummary'
import {
  importCashbookRowsService,
  parseCashbookEntries,
} from './services/cash/import/cashbookImportService'
import {
  checkInMemberRecord,
  createEventRecord,
  deleteEventRecord,
  updateEventRecord,
  updateEventStatusRecord,
} from './services/repositories/eventsRepository'
import {
  deleteDocumentRecord,
  uploadDocumentRecord,
} from './services/repositories/documentsRepository'
import {
  exportMembersCsv as exportMembersCsvService,
  exportCashCsv as exportCashCsvService,
  exportTaxAdvisorCsv as exportTaxAdvisorCsvService,
  exportTaxAdvisorProCsv as exportTaxAdvisorProCsvService,
  exportCategorySummaryCsv as exportCategorySummaryCsvService,
  exportExcelStyleCashbookCsv as exportExcelStyleCashbookCsvService,
  exportEventsCsv as exportEventsCsvService,
  exportCheckinsCsv as exportCheckinsCsvService,
  exportDocumentsCsv as exportDocumentsCsvService,
  exportAuditLogsCsv as exportAuditLogsCsvService,
  exportInventoryCsv as exportInventoryCsvService,
  exportInvoicesCsv as exportInvoicesCsvService,
} from './services/export/csvExports'
import {
  blobToBase64 as blobToBase64Service,
  buildInvoicePdfBlob as buildInvoicePdfBlobService,
  exportInvoicePdf as exportInvoicePdfService,
  exportMembersPdf as exportMembersPdfService,
  exportCashPdf as exportCashPdfService,
  exportDetailedCashbookPdf as exportDetailedCashbookPdfService,
  exportOpenFeesPdf as exportOpenFeesPdfService,
  exportCheckinsPdf as exportCheckinsPdfService,
  exportEventFinancePdf as exportEventFinancePdfService,
  exportAllMemberCardsPdf as exportAllMemberCardsPdfService,
  exportMemberCardPdf as exportMemberCardPdfService,
  exportInventoryPdf as exportInventoryPdfService,
  exportInventoryLabelPdf as exportInventoryLabelPdfService,
  exportInventoryLabelsPdf as exportInventoryLabelsPdfService,
  exportExcelStyleCashbookPdf as exportExcelStyleCashbookPdfService,
} from './services/pdf/pdfExports'
import {
  deleteInvoiceCustomerRecord,
  saveInvoiceCustomerRecord,
} from './services/repositories/invoicesRepository'
import {
  archiveInvoicePdfService,
  cancelInvoiceService,
  createCancellationInvoiceService,
  createInvoiceService,
  createMembershipFeeInvoiceService,
  deleteInvoiceService,
  markInvoicePaidService,
  openArchivedInvoiceService,
  sendInvoiceEmailService,
} from './services/invoices/invoiceWorkflowService'
import {
  exportFullBackupJson as exportFullBackupJsonBackupService,
  getRestoreCount as getRestoreCountService,
  handleRestoreFile as handleRestoreFileService,
  restoreFullBackup as restoreFullBackupService,
} from './services/backup/backupRestoreService'
import {
  changeMemberStatusRecord,
  deleteMemberRecord,
  inviteMemberUserRecord,
  markMemberAsTestRecord,
  saveMemberRecord,
} from './services/repositories/membersRepository'
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
import {
  approveMemberChangeRequestRecord,
  rejectMemberChangeRequestRecord,
  submitMemberChangeRequestRecord,
} from './services/repositories/memberChangeRequestsRepository'
import {
  deleteInventoryItemRecord,
  importInventoryRowsRecord,
  retireInventoryItemRecord,
  saveInventoryItemRecord,
} from './services/repositories/inventoryRepository'

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
  const selectedEventIdRef = useRef(selectedEventId)

  selectedEventIdRef.current = selectedEventId

  const syncPortalFormFromMember = useCallback((member) => {
    if (!member) return

    setPortalEmail(member.email || '')
    setPortalPhone(member.phone || '')
    setPortalStreet(member.street || '')
    setPortalPostalCode(member.postal_code || '')
    setPortalCity(member.city || '')
    setPortalClothingSize(member.clothing_size || '')
  }, [])

  const loadCurrentMember = useCallback(async (authUserId) => {
    const loadedMember = await loadCurrentMemberService({
      authUserId,
      setCurrentMember,
    })

    syncPortalFormFromMember(loadedMember)
    return loadedMember
  }, [syncPortalFormFromMember])

  const loadAll = useCallback(() => {
    return loadAllService({
      loadMembersFn: () => loadMembersService({ setMembers }),
      loadFeesFn: () => loadFeesService({ year: 2026, setFees }),
      loadCashEntriesFn: () => loadCashEntriesService({ setCashEntries }),
      loadCashMonthClosingsFn: () => loadCashMonthClosingsService({ setCashMonthClosings }),
      loadAuditLogsFn: () => loadAuditLogsService({ setAuditLogs }),
      loadEventCheckinsFn: () => loadEventCheckinsService({ setEventCheckins }),
      loadEventsFn: () => loadEventsService({
        setEvents,
        selectedEventId: selectedEventIdRef.current,
        setSelectedEventId,
        setEventName,
      }),
      loadDocumentsFn: () => loadDocumentsService({ setDocuments }),
      loadInventoryItemsFn: () => loadInventoryItemsService({ setInventoryItems }),
      loadInvoicesFn: () => loadInvoicesService({ setInvoices }),
      loadInvoiceItemsFn: () => loadInvoiceItemsService({ setInvoiceItems }),
      loadMemberChangeRequestsFn: () => loadMemberChangeRequestsService({ setMemberChangeRequests }),
    })
  }, [])

  const checkUser = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    setUser(user)

    if (user) {
      await loadCurrentMember(user.id)
      loadAll()
    }
  }, [loadAll, loadCurrentMember])

  useEffect(() => {
    Promise.resolve().then(() => {
      checkUser()
    })

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [checkUser])

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
    return loadMembersService({
      setMembers,
    })
  }

  async function loadFees() {
    return loadFeesService({
      year: 2026,
      setFees,
    })
  }

  async function loadCashEntries() {
    return loadCashEntriesService({
      setCashEntries,
    })
  }

  async function loadCashMonthClosings() {
    return loadCashMonthClosingsService({
      setCashMonthClosings,
    })
  }

  async function loadAuditLogs() {
    return loadAuditLogsService({
      setAuditLogs,
    })
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
    return loadEventCheckinsService({
      setEventCheckins,
    })
  }

  async function loadEvents() {
    return loadEventsService({
      setEvents,
      selectedEventId,
      setSelectedEventId,
      setEventName,
    })
  }

  async function loadDocuments() {
    return loadDocumentsService({
      setDocuments,
    })
  }

  async function loadInventoryItems() {
    return loadInventoryItemsService({
      setInventoryItems,
    })
  }

  async function loadInvoices() {
    return loadInvoicesService({
      setInvoices,
    })
  }

  async function loadInvoiceItems() {
    return loadInvoiceItemsService({
      setInvoiceItems,
    })
  }

  async function loadInvoiceCustomers() {
    return loadInvoiceCustomersService({
      setInvoiceCustomers,
    })
  }

  async function loadMemberChangeRequests() {
    return loadMemberChangeRequestsService({
      setMemberChangeRequests,
    })
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
    return createAutomaticCarryoverService({
      canManageCash,
      carryoverFromYear,
      carryoverToYear,
      hasOpeningForYear,
      getCashBalanceForYear,
      createAuditLog,
      loadCashEntries,
      setSelectedCashYear,
    })
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
    return closeCashMonthService({
      year,
      month,
      isAdmin,
      isCashMonthClosed,
      user,
      createAuditLog,
      loadCashMonthClosings,
    })
  }

  async function reopenCashMonth(year, month) {
    return reopenCashMonthService({
      year,
      month,
      isAdmin,
      createAuditLog,
      loadCashMonthClosings,
    })
  }


  function getCashbookDetailedSummary() {
    return getCashbookDetailedSummaryService({
      entries: getCashEntriesForSelectedYear(),
      selectedCashYear,
      getCashMonthKey,
      getPaymentMethod,
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

  function exportMembersCsv() {
    return exportMembersCsvService({
      members,
      getFee,
      getRoleLabel,
      getAppRoleLabel,
    })
  }

  function exportCashCsv() {
    return exportCashCsvService({
      filteredCashEntries: getFilteredCashEntries(),
      selectedCashYear,
      getEntryYear,
      getPaymentMethodLabel,
      getPaymentMethod,
      getEventNameById,
      getInvoiceById,
    })
  }

  function exportTaxAdvisorCsv() {
    return exportTaxAdvisorCsvService({
      filteredCashEntries: getFilteredCashEntries(),
      selectedCashYear,
      getEntryYear,
      getPaymentMethodLabel,
      getPaymentMethod,
      getEventNameById,
    })
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
    return exportTaxAdvisorProCsvService({
      filteredCashEntries: getFilteredCashEntries(),
      selectedCashYear,
      getEntryYear,
      getCashEntrySignedAmount,
      getPaymentMethodLabel,
      getPaymentMethod,
      getEventNameById,
    })
  }

  function exportCategorySummaryCsv() {
    return exportCategorySummaryCsvService({
      categorySummary: getCategorySummary(),
      selectedCashYear,
    })
  }

  function exportExcelStyleCashbookCsv() {
    return exportExcelStyleCashbookCsvService({
      summary: getCashbookDetailedSummary(),
      getCashMonthLabel,
      getPaymentMethod,
      getEventNameById,
      selectedCashYear,
    })
  }

  function exportExcelStyleCashbookPdf() {
    return exportExcelStyleCashbookPdfService({
      summary: getCashbookDetailedSummary(),
      getCashBalance,
      getCashMonthLabel,
      selectedCashYear,
      getPaymentMethod,
      getEventNameById,
    })
  }

  function exportEventsCsv() {
    return exportEventsCsvService({
      events,
      getEventIncomeTotal,
      getEventExpenseTotal,
      getEventBalance,
    })
  }

  function exportCheckinsCsv() {
    return exportCheckinsCsvService({
      eventCheckins,
      getMemberName,
    })
  }

  function exportDocumentsCsv() {
    return exportDocumentsCsvService({
      documents,
    })
  }

  function exportFullBackupJson() {
    return exportFullBackupJsonBackupService({
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
    })
  }

  function handleRestoreFile(event) {
    return handleRestoreFileService({
      event,
      setRestoreData,
      setRestoreFileName,
    })
  }

  function getRestoreCount(key) {
    return getRestoreCountService(restoreData, key)
  }

  async function restoreFullBackup() {
    return restoreFullBackupService({
      isAdmin,
      restoreData,
      members,
      fees,
      events,
      cashEntries,
      eventCheckins,
      documents,
      setRestoreData,
      setRestoreFileName,
      setRestoreImporting,
      loadAll,
    })
  }

  function exportAuditLogsCsv() {
    return exportAuditLogsCsvService({
      auditLogs,
    })
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

    await inviteMemberUserRecord({
      member,
      selectedRole,
      getAppRoleLabel,
      loadMembers,
      loadAuditLogs,
      setInvitingMemberId,
    })
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

      await importInventoryRowsRecord({
        rowsToInsert,
        inventoryCsvFileName,
        createAuditLog,
        loadInventoryItems,
        setInventoryCsvRows,
        setInventoryCsvFileName,
      })
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

    await saveInventoryItemRecord({
      inventoryEditingId,
      payload,
      inventoryItems,
      createAuditLog,
      loadInventoryItems,
      resetInventoryForm,
    })
  }

  async function retireInventoryItem(item) {
    if (!isAdmin()) return alert('Nur Admins dÃ¼rfen Inventar ausmustern.')

    const reason = window.prompt(`Grund fÃ¼r Ausmustern von ${item.inventory_number} eingeben:`)

    if (!reason || !reason.trim()) return

    await retireInventoryItemRecord({
      item,
      reason,
      createAuditLog,
      loadInventoryItems,
    })
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

    await deleteInventoryItemRecord({
      item,
      createAuditLog,
      loadInventoryItems,
    })
  }

  function getInventoryQrValue(item) {
    return buildGetInventoryQrValue(item)
  }

  function exportInventoryCsv() {
    return exportInventoryCsvService({
      filteredInventoryItems: getFilteredInventoryItems(),
      getInventoryQrValue,
    })
  }

  function exportInventoryPdf() {
    return exportInventoryPdfService({
      filteredInventoryItems: getFilteredInventoryItems(),
    })
  }

  async function exportInventoryLabelPdf(item) {
    return exportInventoryLabelPdfService(item, getInventoryQrValue)
  }

  async function exportInventoryLabelsPdf() {
    return exportInventoryLabelsPdfService({
      filteredInventoryItems: getFilteredInventoryItems(),
      getInventoryQrValue,
    })
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

    await markMemberAsTestRecord({
      member,
      createAuditLog,
      loadMembers,
    })
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

    await submitMemberChangeRequestRecord({
      currentMember,
      user,
      requestedData,
      createAuditLog,
      loadMemberChangeRequests,
    })
  }

  async function approveMemberChangeRequest(request) {
    if (!canManageMembers() && !isAdmin()) return alert('Keine Berechtigung.')

    const member = members.find((item) => item.id === request.member_id)

    const confirmed = window.confirm(
      `Ã„nderungsantrag genehmigen?\n\nMitglied: ${member ? `${member.first_name || ''} ${member.last_name || ''}` : request.member_id}`
    )

    if (!confirmed) return

    await approveMemberChangeRequestRecord({
      request,
      members,
      user,
      createAuditLog,
      loadMembers,
      loadCurrentMember,
      loadMemberChangeRequests,
    })
  }

  async function rejectMemberChangeRequest(request) {
    if (!canManageMembers() && !isAdmin()) return alert('Keine Berechtigung.')

    const note = window.prompt('Ablehnungsgrund / Notiz:')

    await rejectMemberChangeRequestRecord({
      request,
      user,
      note,
      createAuditLog,
      loadMemberChangeRequests,
    })
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

    await saveInvoiceCustomerRecord({
      editingCustomerId,
      payload,
      invoiceCustomers,
      createAuditLog,
      loadInvoiceCustomers,
      resetCustomerForm,
    })
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

    await deleteInvoiceCustomerRecord({
      customer,
      invoices,
      createAuditLog,
      loadInvoiceCustomers,
    })
  }

  function getFilteredInvoiceCustomers() {
    return buildGetFilteredInvoiceCustomers(invoiceCustomers, customerSearch)
  }

  function blobToBase64(blob) {
    return blobToBase64Service(blob)
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
    return buildInvoicePdfBlobService({
      invoice,
      member: invoice.member_id ? getMemberById(invoice.member_id) : null,
      items: getItemsForInvoice(invoice.id),
      isTest: Boolean(invoice.is_test || getMemberById(invoice.member_id)?.is_test),
      isCancelled: invoice.status === 'storniert',
    })
  }

  async function archiveInvoicePdf(invoice) {
    return archiveInvoicePdfService({
      invoice,
      canManageCash,
      isAdmin,
      buildInvoicePdfBlob,
      getInvoiceFilePath,
      createAuditLog,
      loadInvoices,
    })
  }

  async function openArchivedInvoice(invoice) {
    return openArchivedInvoiceService({
      invoice,
    })
  }

  async function sendInvoiceEmail(invoice, reminder = false) {
    return sendInvoiceEmailService({
      invoice,
      reminder,
      canManageCash,
      isAdmin,
      buildInvoicePdfBlob,
      blobToBase64,
      createAuditLog,
      loadInvoices,
    })
  }

  async function createCancellationInvoice(invoice) {
    return createCancellationInvoiceService({
      invoice,
      invoices,
      isAdmin,
      getInvoiceYear,
      getNextInvoiceNumber,
      getItemsForInvoice,
      user,
      createAuditLog,
      loadInvoices,
      loadInvoiceItems,
    })
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
    return createMembershipFeeInvoiceService({
      member,
      fee,
      canManageCash,
      isAdmin,
      invoices,
      getNextInvoiceNumber,
      exportInvoicePdf,
      user,
      createAuditLog,
      loadInvoices,
      loadInvoiceItems,
    })
  }

  async function createInvoice() {
    return createInvoiceService({
      canManageCash,
      isAdmin,
      selectedInvoiceCustomerId,
      invoiceCustomerName,
      invoiceCustomerEmail,
      invoiceCustomerStreet,
      invoiceCustomerHouseNumber,
      invoiceCustomerAddressAddition,
      invoiceCustomerPostalCode,
      invoiceCustomerCity,
      invoiceCustomerCountry,
      invoiceIssueDate,
      invoiceDueDate,
      invoiceNotes,
      invoiceRows,
      invoiceIsTest,
      formatCustomerAddressFromFields,
      getNextInvoiceNumber,
      user,
      createAuditLog,
      resetInvoiceForm,
      loadInvoices,
      loadInvoiceItems,
    })
  }

  async function markInvoicePaid(invoice) {
    return markInvoicePaidService({
      invoice,
      canManageCash,
      isAdmin,
      getNextReceiptNumber,
      createAuditLog,
      loadInvoices,
      loadCashEntries,
      loadFees,
    })
  }

  async function cancelInvoice(invoice) {
    return cancelInvoiceService({
      invoice,
      isAdmin,
      createAuditLog,
      loadInvoices,
    })
  }

  async function deleteInvoice(invoice) {
    return deleteInvoiceService({
      invoice,
      isAdmin,
      createAuditLog,
      loadInvoices,
      loadInvoiceItems,
    })
  }

  async function exportInvoicePdf(invoice) {
    return exportInvoicePdfService({
      invoice,
      member: invoice.member_id ? getMemberById(invoice.member_id) : null,
      items: getItemsForInvoice(invoice.id),
      isTest: Boolean(invoice.is_test || getMemberById(invoice.member_id)?.is_test),
      isCancelled: invoice.status === 'storniert',
    })
  }

  function exportInvoicesCsv() {
    return exportInvoicesCsvService({
      filteredInvoices: getFilteredInvoices(),
      getInvoiceCustomerAddress,
    })
  }

  function exportMembersPdf() {
    return exportMembersPdfService({
      filteredMembers: getFilteredMembers(),
      getRoleLabel,
    })
  }

  function exportCashPdf() {
    return exportCashPdfService({
      filteredCash: getFilteredCashEntries(),
      getCashBalance,
      getIncomeTotal,
      getExpenseTotal,
      getPaymentMethodLabel,
      getPaymentMethod,
      getEventNameById,
      getInvoiceById,
    })
  }


  function exportDetailedCashbookPdf() {
    return exportDetailedCashbookPdfService({
      summary: getCashbookDetailedSummary(),
      getCashBalance,
      getCashMonthLabel,
    })
  }

  function exportOpenFeesPdf() {
    return exportOpenFeesPdfService({
      openFees: fees.filter((fee) => !fee.paid && Number(fee.amount) > 0),
      getOpenFeesTotal,
      members,
    })
  }

  function exportCheckinsPdf() {
    return exportCheckinsPdfService({
      todayCheckins: getTodayCheckins(),
      activeEventName: getActiveEventName(),
      getTodayDate,
      getMemberName,
    })
  }


  function exportEventFinancePdf(event) {
    return exportEventFinancePdfService({
      event,
      eventCheckinsForReport: eventCheckins.filter((checkin) => checkin.event_name === event.name),
      eventCashEntries: getCashEntriesForEvent(event.id),
      income: getEventIncomeTotal(event.id),
      expenses: getEventExpenseTotal(event.id),
      balance: getEventBalance(event.id),
      getMemberName,
    })
  }

  async function exportAllMemberCardsPdf() {
    return exportAllMemberCardsPdfService({
      filteredMembers: getFilteredMembers(),
      getMemberQrValue,
    })
  }

  async function exportMemberCardPdf(member) {
    return exportMemberCardPdfService(member, getMemberQrValue)
  }

  function saveOfflineCashEntry(entry) {
    return saveOfflineCashEntryService({
      entry,
      setOfflineCashEntries,
    })
  }

  async function syncOfflineCashEntries() {
    return syncOfflineCashEntriesService({
      offlineCashEntries,
      setOfflineCashEntries,
      loadCashEntries,
    })
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

    await createEventRecord({
      payload: {
        name: newEventName.trim(),
        event_date: newEventDate || getTodayDate(),
        location: newEventLocation.trim() || null,
        notes: newEventNotes.trim() || null,
      },
      createAuditLog,
      loadEvents,
      resetEventForm,
      setSelectedEventId,
      setEventName,
    })
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

    await updateEventRecord({
      editingEventId,
      payload: {
        name: newEventName.trim(),
        event_date: newEventDate || getTodayDate(),
        location: newEventLocation.trim() || null,
        notes: newEventNotes.trim() || null,
      },
      events,
      createAuditLog,
      loadEvents,
      resetEventForm,
      selectedEventId,
      setEventName,
    })
  }

  async function updateEventStatus(eventId, status) {
    if (!canManageEvents()) return alert('Keine Berechtigung fÃ¼r Event-Verwaltung.')

    await updateEventStatusRecord({
      eventId,
      status,
      events,
      createAuditLog,
      loadEvents,
    })
  }

  async function deleteEvent(event) {
    if (!isAdmin()) return alert('Nur Admins dÃ¼rfen Events lÃ¶schen.')

    await deleteEventRecord({
      event,
      cashEntries,
      eventCheckins,
      createAuditLog,
      loadEvents,
      loadCashEntries,
      selectedEventId,
      editingEventId,
      setSelectedEventId,
      setCashEventId,
      setEventName,
      resetEventForm,
    })
  }

  async function checkInMember(member) {
    await checkInMemberRecord({
      member,
      canUseCheckin,
      getActiveEventName,
      isCheckedInToday,
      getTodayDate,
      loadEventCheckins,
    })
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

    await deleteMemberRecord({
      member,
      editingId,
      resetForm,
      loadAll,
    })
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

    await saveMemberRecord({
      editingId,
      payload,
      members,
      createAuditLog,
      loadAll,
      getAmountByType,
      memberType,
      resetForm,
    })
  }

  async function changeMemberStatus(id, status) {
    if (!canManageMembers()) return alert('Keine Berechtigung fÃ¼r Mitgliederverwaltung.')

    await changeMemberStatusRecord({
      id,
      status,
      members,
      createAuditLog,
      loadMembers,
    })
  }

  async function markFeePaid(fee, paymentMethod = 'bar') {
    if (!canManageCash()) return alert('Keine Berechtigung fÃ¼r Kassa.')

    await saveMembershipFee({
      fee,
      paymentMethod,
      members,
      createAuditLog,
      loadAll,
    })
  }

  async function markFeeOpen(fee) {
    if (!canManageCash()) return alert('Keine Berechtigung fÃ¼r Kassa.')

    await deleteMembershipFee({
      fee,
      createAuditLog,
      loadAll,
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
        const entries = parseCashbookEntries(String(reader.result || ''), cashEventId)

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
      await importCashbookRowsService({
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
      })
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

    await updateCashEntryRecord({
      editingCashId,
      payload: {
        type: cashType,
        category: cashCategory,
        event_id: cashEventId || null,
        payment_method: cashPaymentMethod,
        amount: Number(cashAmount),
        description: cashDescription,
      },
      cashEntries,
      createAuditLog,
      loadCashEntries,
      resetCashForm,
    })
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

    await addCashEntryRecord({
      baseEntry,
      receiptUrl,
      createAuditLog,
      loadCashEntries,
      resetCashForm,
    })
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

    await deleteCashEntryRecord({
      entry,
      reason,
      createAuditLog,
      loadCashEntries,
    })
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

    await uploadDocumentRecord({
      documentTitle,
      documentCategory,
      documentDate,
      documentDescription,
      documentFile,
      createAuditLog,
      loadDocuments,
      resetDocumentForm,
    })
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

    await deleteDocumentRecord({
      document,
      createAuditLog,
      loadDocuments,
    })
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









