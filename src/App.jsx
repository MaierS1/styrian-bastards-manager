import { Component, useCallback, useEffect, useRef, useState } from 'react'
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
  canManagePurchaseMember,
  canUseCheckinRole,
  getAppRole as getMemberAppRole,
  getAppRoleLabel,
  isAdminRole,
} from './utils/permissions'
import { navigationItems } from './app/navigation'
import { formatCustomerAddressFromFields as buildFormatCustomerAddressFromFields } from './utils/formatters'
import { normalizeRichTextHtml } from './utils/sanitizeHtml'
import {
  getAlertStyle as buildAlertStyle,
  getAmountByType as buildAmountByType,
  getCashAmountCents as buildCashAmountCents,
  getCashBalance as buildCashBalance,
  getCashBalanceForYear as buildCashBalanceForYear,
  getCashEntrySignedAmount as buildCashEntrySignedAmount,
  getCommercialDashboardData as buildCommercialDashboardData,
  getDashboardAlerts as buildDashboardAlerts,
  getDashboardCockpitTasks as buildDashboardCockpitTasks,
  getFinanceDashboardData as buildFinanceDashboardData,
  getFinanceHealthStatus as buildFinanceHealthStatus,
  isValidCashEntry as buildIsValidCashEntry,
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
  loadMediaItems as loadMediaItemsService,
  loadInventoryItems as loadInventoryItemsService,
  loadInvoiceCustomers as loadInvoiceCustomersService,
  loadInvoiceItems as loadInvoiceItemsService,
  loadInvoices as loadInvoicesService,
  loadMemberChangeRequests as loadMemberChangeRequestsService,
  loadMerchItems as loadMerchItemsService,
  loadMerchSaleItems as loadMerchSaleItemsService,
  loadMerchSales as loadMerchSalesService,
  loadMerchVariants as loadMerchVariantsService,
  loadMembers as loadMembersService,
  loadShopOrderItems as loadShopOrderItemsService,
  loadShopOrders as loadShopOrdersService,
  loadSponsorContracts as loadSponsorContractsService,
  loadSponsors as loadSponsorsService,
  loadMembershipFeeData as loadMembershipFeeDataService,
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
  updateDocumentMemberAreaSettings,
  uploadDocumentRecord,
} from './services/repositories/documentsRepository'
import {
  deleteMediaItemRecord,
  saveMediaItemRecord,
} from './services/repositories/mediaRepository'
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
import {
  createMembershipFeePeriodAndItems,
  deleteMembershipFeeItem as deleteMembershipFeeItemRecord,
  markMembershipFeeItemPaid as markMembershipFeeItemPaidRecord,
  reopenMembershipFeeItem as reopenMembershipFeeItemRecord,
  sendMembershipFeeNotification as sendMembershipFeeNotificationRecord,
} from './services/repositories/membershipFeesRepository'
import { MembersPage } from './components/members/MembersPage'
import { MembershipFeesPage } from './components/fees/MembershipFeesPage'
import { CashPage } from './components/cash/CashPage'
import { DocumentsPage } from './components/documents/DocumentsPage'
import { MemberAreaPage } from './components/member-area/MemberAreaPage'
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
import {
  deleteSponsorContractRecord,
  deleteSponsorRecord,
  saveSponsorContractRecord,
  saveSponsorRecord,
} from './services/repositories/sponsorsRepository'
import {
  cancelMerchSaleRecord,
  createShopOrderRecord,
  createMerchSaleWithInvoiceRecord,
  createMerchSaleWithItemRecord,
  deleteMerchItemRecord,
  deleteOpenMerchOrderRecord,
  deleteMerchVariantRecord,
  saveMerchItemRecord,
  saveMerchVariantRecord,
  updateShopOrderRecord,
} from './services/repositories/merchRepository'
import { SponsorsPage } from './components/sponsors/SponsorsPage'
import { MerchPage } from './components/merch/MerchPage'
import { MediaPage } from './components/media/MediaPage'
import { PublicPressPage } from './components/media/PublicPressPage'
import { PublicSponsors } from './components/home/PublicSponsors'
import { PurchasePage } from './components/purchase/PurchasePage'

class PurchaseRouteErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error) {
    console.error('Purchase route failed', error)
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          ...cardStyle,
          borderLeft: `6px solid ${colors.red}`,
          background: colors.dangerBg,
          color: colors.dangerText,
        }}>
          <strong>Einkauf & Preisvergleich konnte nicht geladen werden.</strong>
          <br />
          {this.state.error?.message || 'Unbekannter Fehler'}
        </div>
      )
    }

    return this.props.children
  }
}

export default function App() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [user, setUser] = useState(null)
  const [currentMember, setCurrentMember] = useState(null)

  const [members, setMembers] = useState([])
  const [fees, setFees] = useState([])
  const [membershipFeePeriods, setMembershipFeePeriods] = useState([])
  const [membershipFeeItems, setMembershipFeeItems] = useState([])
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
  const [mediaItems, setMediaItems] = useState([])
  const [sponsors, setSponsors] = useState([])
  const [sponsorContracts, setSponsorContracts] = useState([])
  const [merchItems, setMerchItems] = useState([])
  const [merchVariants, setMerchVariants] = useState([])
  const [merchSales, setMerchSales] = useState([])
  const [merchSaleItems, setMerchSaleItems] = useState([])
  const [shopOrders, setShopOrders] = useState([])
  const [shopOrderItems, setShopOrderItems] = useState([])

  const [selectedCashYear, setSelectedCashYear] = useState(String(new Date().getFullYear()))
  const [carryoverFromYear, setCarryoverFromYear] = useState(String(new Date().getFullYear() - 1))
  const [carryoverToYear, setCarryoverToYear] = useState(String(new Date().getFullYear()))
  const [membershipFeeYearFilter, setMembershipFeeYearFilter] = useState('alle')
  const [membershipFeeStatusFilter, setMembershipFeeStatusFilter] = useState('alle')
  const [membershipFeeMemberTypeFilter, setMembershipFeeMemberTypeFilter] = useState('alle')
  const [membershipFeePaymentFilter, setMembershipFeePaymentFilter] = useState('alle')
  const [membershipFeeCreateYear, setMembershipFeeCreateYear] = useState(String(new Date().getFullYear()))
  const [membershipFeeCreateTitle, setMembershipFeeCreateTitle] = useState(`Mitgliedsbeiträge ${new Date().getFullYear()}`)
  const [membershipFeeCreateDueDate, setMembershipFeeCreateDueDate] = useState('')
  const [membershipFeeCreateCashEntry, setMembershipFeeCreateCashEntry] = useState(true)
  const [membershipFeePaymentMethod, setMembershipFeePaymentMethod] = useState('bar')
  const [membershipFeeGenerationLoading, setMembershipFeeGenerationLoading] = useState(false)
  const [membershipFeeGenerationResult, setMembershipFeeGenerationResult] = useState(null)
  const [membershipFeeActionLoadingId, setMembershipFeeActionLoadingId] = useState(null)

  const [eventName, setEventName] = useState('Heimspiel')
  const [selectedEventId, setSelectedEventId] = useState('')
  const [editingEventId, setEditingEventId] = useState(null)
  const [newEventName, setNewEventName] = useState('')
  const [newEventDate, setNewEventDate] = useState(new Date().toISOString().slice(0, 10))
  const [newEventStartsAt, setNewEventStartsAt] = useState('')
  const [newEventEndsAt, setNewEventEndsAt] = useState('')
  const [newEventCategory, setNewEventCategory] = useState('treffen')
  const [newEventLocation, setNewEventLocation] = useState('')
  const [newEventMeetingPoint, setNewEventMeetingPoint] = useState('')
  const [newEventNotes, setNewEventNotes] = useState('')
  const [newEventIsPublic, setNewEventIsPublic] = useState(false)
  const [newEventMembersOnly, setNewEventMembersOnly] = useState(false)
  const [newEventInternalOnly, setNewEventInternalOnly] = useState(false)
  const [newEventPublicStatus, setNewEventPublicStatus] = useState('draft')
  const [newEventPublicTitle, setNewEventPublicTitle] = useState('')
  const [newEventShortDescription, setNewEventShortDescription] = useState('')
  const [newEventPublicDescription, setNewEventPublicDescription] = useState('')
  const [newEventPublicDescriptionHtml, setNewEventPublicDescriptionHtml] = useState('')
  const [newEventRegistrationEnabled, setNewEventRegistrationEnabled] = useState(false)
  const [newEventAllowWaitlist, setNewEventAllowWaitlist] = useState(true)
  const [newEventContactPerson, setNewEventContactPerson] = useState('')
  const [newEventContactName, setNewEventContactName] = useState('')
  const [newEventContactEmail, setNewEventContactEmail] = useState('')
  const [newEventContactPhone, setNewEventContactPhone] = useState('')
  const [newEventRegistrationDeadline, setNewEventRegistrationDeadline] = useState('')
  const [newEventMaxParticipants, setNewEventMaxParticipants] = useState('')
  const [newEventInternalNotes, setNewEventInternalNotes] = useState('')
  const [newEventPublicSortOrder, setNewEventPublicSortOrder] = useState('0')
  const [newEventPublicPublishedAt, setNewEventPublicPublishedAt] = useState('')
  const [newEventPublicImagePath, setNewEventPublicImagePath] = useState('')
  const [newEventPublicImageUrl, setNewEventPublicImageUrl] = useState('')
  const [newEventImageUrl, setNewEventImageUrl] = useState('')
  const [newEventPublicRegistrationUrl, setNewEventPublicRegistrationUrl] = useState('')
  const [newEventPublicExternalUrl, setNewEventPublicExternalUrl] = useState('')

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
  const [documentShowInMemberArea, setDocumentShowInMemberArea] = useState(false)
  const [documentMembersOnly, setDocumentMembersOnly] = useState(true)
  const [documentMemberAreaCategory, setDocumentMemberAreaCategory] = useState('')
  const [documentSortOrder, setDocumentSortOrder] = useState('0')
  const [documentIsActive, setDocumentIsActive] = useState(true)

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

  const [sponsorEditingId, setSponsorEditingId] = useState(null)
  const [sponsorName, setSponsorName] = useState('')
  const [sponsorContactPerson, setSponsorContactPerson] = useState('')
  const [sponsorEmail, setSponsorEmail] = useState('')
  const [sponsorPhone, setSponsorPhone] = useState('')
  const [sponsorWebsite, setSponsorWebsite] = useState('')
  const [sponsorLogoPath, setSponsorLogoPath] = useState('')
  const [sponsorLogoFile, setSponsorLogoFile] = useState(null)
  const [sponsorLogoAlt, setSponsorLogoAlt] = useState('')
  const [sponsorIsPublic, setSponsorIsPublic] = useState(false)
  const [sponsorLevel, setSponsorLevel] = useState('supporter')
  const [sponsorPublicSortOrder, setSponsorPublicSortOrder] = useState('0')
  const [sponsorPublicDescription, setSponsorPublicDescription] = useState('')
  const [sponsorPublicDescriptionHtml, setSponsorPublicDescriptionHtml] = useState('')
  const [sponsorStatus, setSponsorStatus] = useState('active')
  const [sponsorNotes, setSponsorNotes] = useState('')
  const [sponsorSaving, setSponsorSaving] = useState(false)
  const [sponsorDeletingId, setSponsorDeletingId] = useState(null)
  const [sponsorContractEditingId, setSponsorContractEditingId] = useState(null)
  const [contractSponsorId, setContractSponsorId] = useState('')
  const [contractTitle, setContractTitle] = useState('')
  const [contractLevel, setContractLevel] = useState('premium')
  const [contractStatus, setContractStatus] = useState('draft')
  const [contractStartsOn, setContractStartsOn] = useState(new Date().toISOString().slice(0, 10))
  const [contractEndsOn, setContractEndsOn] = useState('')
  const [contractAmount, setContractAmount] = useState('')
  const [contractPaymentStatus, setContractPaymentStatus] = useState('open')
  const [contractBillingCycle, setContractBillingCycle] = useState('one_time')
  const [contractBenefits, setContractBenefits] = useState('')
  const [contractNotes, setContractNotes] = useState('')
  const [sponsorContractSaving, setSponsorContractSaving] = useState(false)
  const [sponsorContractDeletingId, setSponsorContractDeletingId] = useState(null)
  const [mediaEditingId, setMediaEditingId] = useState(null)
  const [mediaTitle, setMediaTitle] = useState('')
  const [mediaSlug, setMediaSlug] = useState('')
  const [mediaCategory, setMediaCategory] = useState('vereinsnews')
  const [mediaSourceName, setMediaSourceName] = useState('')
  const [mediaSummary, setMediaSummary] = useState('')
  const [mediaContent, setMediaContent] = useState('')
  const [mediaContentHtml, setMediaContentHtml] = useState('')
  const [mediaExternalUrl, setMediaExternalUrl] = useState('')
  const [mediaAudioUrl, setMediaAudioUrl] = useState('')
  const [mediaImagePath, setMediaImagePath] = useState('')
  const [mediaImageAlt, setMediaImageAlt] = useState('')
  const [mediaPublicationDate, setMediaPublicationDate] = useState(new Date().toISOString().slice(0, 10))
  const [mediaPublishedAt, setMediaPublishedAt] = useState('')
  const [mediaStatus, setMediaStatus] = useState('draft')
  const [mediaIsPublic, setMediaIsPublic] = useState(false)
  const [mediaMembersOnly, setMediaMembersOnly] = useState(false)
  const [mediaInternalOnly, setMediaInternalOnly] = useState(false)
  const [mediaIsFeatured, setMediaIsFeatured] = useState(false)
  const [mediaPublicSortOrder, setMediaPublicSortOrder] = useState('0')
  const [mediaInternalNotes, setMediaInternalNotes] = useState('')
  const [mediaSaving, setMediaSaving] = useState(false)
  const [mediaDeletingId, setMediaDeletingId] = useState(null)
  const [merchItemEditingId, setMerchItemEditingId] = useState(null)
  const [merchItemNumber, setMerchItemNumber] = useState('')
  const [merchItemName, setMerchItemName] = useState('')
  const [merchItemCategory, setMerchItemCategory] = useState('other')
  const [merchItemImagePath, setMerchItemImagePath] = useState('')
  const [merchItemStatus, setMerchItemStatus] = useState('active')
  const [merchItemBasePrice, setMerchItemBasePrice] = useState('')
  const [merchItemPurchasePrice, setMerchItemPurchasePrice] = useState('')
  const [merchItemMemberPrice, setMerchItemMemberPrice] = useState('')
  const [merchItemTaxRate, setMerchItemTaxRate] = useState('0')
  const [merchItemSkuPrefix, setMerchItemSkuPrefix] = useState('')
  const [merchItemShortDescription, setMerchItemShortDescription] = useState('')
  const [merchItemDescription, setMerchItemDescription] = useState('')
  const [merchItemStorageLocation, setMerchItemStorageLocation] = useState('')
  const [merchItemIsPreorder, setMerchItemIsPreorder] = useState(false)
  const [merchItemIsLimited, setMerchItemIsLimited] = useState(false)
  const [merchItemIsBestseller, setMerchItemIsBestseller] = useState(false)
  const [merchItemIsNew, setMerchItemIsNew] = useState(false)
  const [merchItemIsClearance, setMerchItemIsClearance] = useState(false)
  const [merchItemPickupAvailable, setMerchItemPickupAvailable] = useState(true)
  const [merchItemShippingAvailable, setMerchItemShippingAvailable] = useState(false)
  const [merchItemShippingCost, setMerchItemShippingCost] = useState('')
  const [merchItemIsPublic, setMerchItemIsPublic] = useState(false)
  const [merchItemPublicSortOrder, setMerchItemPublicSortOrder] = useState('0')
  const [merchItemPublicTitle, setMerchItemPublicTitle] = useState('')
  const [merchItemPublicDescription, setMerchItemPublicDescription] = useState('')
  const [merchItemPublicDescriptionHtml, setMerchItemPublicDescriptionHtml] = useState('')
  const [merchItemPublicImageAlt, setMerchItemPublicImageAlt] = useState('')
  const [merchItemPublicCtaLabel, setMerchItemPublicCtaLabel] = useState('')
  const [merchItemPublicCtaUrl, setMerchItemPublicCtaUrl] = useState('')
  const [merchItemSaving, setMerchItemSaving] = useState(false)
  const [merchItemDeletingId, setMerchItemDeletingId] = useState(null)
  const [merchVariantEditingId, setMerchVariantEditingId] = useState(null)
  const [merchVariantItemId, setMerchVariantItemId] = useState('')
  const [merchVariantSku, setMerchVariantSku] = useState('')
  const [merchVariantName, setMerchVariantName] = useState('')
  const [merchVariantSize, setMerchVariantSize] = useState('')
  const [merchVariantColor, setMerchVariantColor] = useState('')
  const [merchVariantPrice, setMerchVariantPrice] = useState('')
  const [merchVariantStock, setMerchVariantStock] = useState('0')
  const [merchVariantReorderLevel, setMerchVariantReorderLevel] = useState('0')
  const [merchVariantStatus, setMerchVariantStatus] = useState('active')
  const [merchVariantIsPublic, setMerchVariantIsPublic] = useState(false)
  const [merchVariantPublicSortOrder, setMerchVariantPublicSortOrder] = useState('0')
  const [merchVariantSaving, setMerchVariantSaving] = useState(false)
  const [merchVariantDeletingId, setMerchVariantDeletingId] = useState(null)
  const [merchSaleVariantId, setMerchSaleVariantId] = useState('')
  const [merchSaleQuantity, setMerchSaleQuantity] = useState('1')
  const [merchSaleDiscount, setMerchSaleDiscount] = useState('')
  const [merchSaleMemberId, setMerchSaleMemberId] = useState('')
  const [merchSaleBuyerName, setMerchSaleBuyerName] = useState('')
  const [merchSaleEventId, setMerchSaleEventId] = useState('')
  const [merchSalePaymentMethod, setMerchSalePaymentMethod] = useState('bar')
  const [merchSaleCreateCashEntry, setMerchSaleCreateCashEntry] = useState(true)
  const [merchSaleCreateInvoice, setMerchSaleCreateInvoice] = useState(false)
  const [merchSaleInvoiceCustomerId, setMerchSaleInvoiceCustomerId] = useState('')
  const [merchSaleInvoiceEmail, setMerchSaleInvoiceEmail] = useState('')
  const [merchSaleInvoiceStatus, setMerchSaleInvoiceStatus] = useState('bezahlt')
  const [merchSaleSendInvoiceEmail, setMerchSaleSendInvoiceEmail] = useState(false)
  const [merchSaleSaving, setMerchSaleSaving] = useState(false)
  const [merchSaleCancellingId, setMerchSaleCancellingId] = useState(null)
  const [shopOrderEditingId, setShopOrderEditingId] = useState(null)
  const [shopOrderVariantId, setShopOrderVariantId] = useState('')
  const [shopOrderQuantity, setShopOrderQuantity] = useState('1')
  const [shopOrderDiscount, setShopOrderDiscount] = useState('')
  const [shopOrderShippingCost, setShopOrderShippingCost] = useState('')
  const [shopOrderMemberId, setShopOrderMemberId] = useState('')
  const [shopOrderBuyerName, setShopOrderBuyerName] = useState('')
  const [shopOrderBuyerEmail, setShopOrderBuyerEmail] = useState('')
  const [shopOrderBuyerPhone, setShopOrderBuyerPhone] = useState('')
  const [shopOrderStatus, setShopOrderStatus] = useState('new')
  const [shopOrderPaymentStatus, setShopOrderPaymentStatus] = useState('open')
  const [shopOrderPaymentMethod, setShopOrderPaymentMethod] = useState('bar')
  const [shopOrderDeliveryMethod, setShopOrderDeliveryMethod] = useState('pickup')
  const [shopOrderNotes, setShopOrderNotes] = useState('')
  const [shopOrderInternalNotes, setShopOrderInternalNotes] = useState('')
  const [shopOrderSaving, setShopOrderSaving] = useState(false)
  const [shopOrderDeletingId, setShopOrderDeletingId] = useState(null)

  const [selectedInvoiceCustomerId, setSelectedInvoiceCustomerId] = useState('')
  const [invoiceCustomerName, setInvoiceCustomerName] = useState('')
  const [invoiceCustomerEmail, setInvoiceCustomerEmail] = useState('')
  const [invoiceCustomerStreet, setInvoiceCustomerStreet] = useState('')
  const [invoiceCustomerHouseNumber, setInvoiceCustomerHouseNumber] = useState('')
  const [invoiceCustomerAddressAddition, setInvoiceCustomerAddressAddition] = useState('')
  const [invoiceCustomerPostalCode, setInvoiceCustomerPostalCode] = useState('')
  const [invoiceCustomerCity, setInvoiceCustomerCity] = useState('')
  const [invoiceCustomerCountry, setInvoiceCustomerCountry] = useState('Österreich')
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
  const [customerCountry, setCustomerCountry] = useState('Österreich')
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
  const currentMemberRef = useRef(null)
  const selectedEventIdRef = useRef(selectedEventId)

  currentMemberRef.current = currentMember
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

    currentMemberRef.current = loadedMember
    syncPortalFormFromMember(loadedMember)
    return loadedMember
  }, [syncPortalFormFromMember])

  const loadAll = useCallback(() => {
    return loadAllService({
      loadMembersFn: () => loadMembersService({ setMembers }),
      loadFeesFn: () => loadFeesService({ year: 2026, setFees }),
      loadMembershipFeeDataFn: currentMemberRef.current?.app_role === 'admin'
        ? () =>
            loadMembershipFeeDataService({
              setMembershipFeePeriods,
              setMembershipFeeItems,
            })
        : undefined,
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
      loadMediaItemsFn: () => loadMediaItemsService({ setMediaItems }),
      loadSponsorsFn: () => loadSponsorsService({ setSponsors }),
      loadSponsorContractsFn: () => loadSponsorContractsService({ setSponsorContracts }),
      loadMerchItemsFn: () => loadMerchItemsService({ setMerchItems }),
      loadMerchVariantsFn: () => loadMerchVariantsService({ setMerchVariants }),
      loadMerchSalesFn: () => loadMerchSalesService({ setMerchSales }),
      loadMerchSaleItemsFn: () => loadMerchSaleItemsService({ setMerchSaleItems }),
      loadShopOrdersFn: () => loadShopOrdersService({ setShopOrders }),
      loadShopOrderItemsFn: () => loadShopOrderItemsService({ setShopOrderItems }),
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

  const getAppRole = useCallback(() => {
    return getMemberAppRole(currentMember)
  }, [currentMember])

  const isAdmin = useCallback(() => {
    return isAdminRole(getAppRole())
  }, [getAppRole])

  const canManageMembers = useCallback(() => {
    return canManageMembersRole(getAppRole())
  }, [getAppRole])

  const canUseCheckin = useCallback(() => {
    return canUseCheckinRole(getAppRole())
  }, [getAppRole])

  const getTodayDate = useCallback(() => {
    return new Date().toISOString().slice(0, 10)
  }, [])

  const formatDateTimeLocal = useCallback((value) => {
    if (!value) return ''

    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ''

    const timezoneOffsetMs = date.getTimezoneOffset() * 60000
    return new Date(date.getTime() - timezoneOffsetMs).toISOString().slice(0, 16)
  }, [])

  const getSelectedEvent = useCallback(() => {
    return events.find((event) => event.id === selectedEventId)
  }, [events, selectedEventId])

  const getActiveEventName = useCallback(() => {
    const selectedEvent = getSelectedEvent()
    return selectedEvent?.name || String(eventName || '').trim()
  }, [eventName, getSelectedEvent])

  const getTodayCheckins = useCallback(() => {
    const today = getTodayDate()
    const activeEventName = getActiveEventName()
    return eventCheckins.filter(
      (checkin) => checkin.checkin_date === today && checkin.event_name === activeEventName
    )
  }, [eventCheckins, getActiveEventName, getTodayDate])

  const isCheckedInToday = useCallback((memberId) => {
    return getTodayCheckins().some((checkin) => checkin.member_id === memberId)
  }, [getTodayCheckins])

  const getMemberFromQrValue = useCallback((value) => {
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
  }, [members])

  const getInventoryQrValue = useCallback((item) => {
    return buildGetInventoryQrValue(item)
  }, [])

  const checkInMember = useCallback(async (member) => {
    await checkInMemberRecord({
      member,
      canUseCheckin,
      getActiveEventName,
      isCheckedInToday,
      getTodayDate,
      loadEventCheckins: () => loadEventCheckinsService({ setEventCheckins }),
    })
  }, [canUseCheckin, getActiveEventName, getTodayDate, isCheckedInToday])

  const editMember = useCallback((member) => {
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
  }, [])

  const handleMemberDeepLink = useCallback(() => {
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
      setLinkedMemberNotice(`Mitglied aus QR-Code geöffnet: ${member.first_name || ''} ${member.last_name || ''}`)
      return
    }

    if (currentMember?.id === member.id) {
      setActivePage('portal')
      setLinkedMemberNotice('Dein Mitgliederportal wurde über den QR-Code geöffnet.')
      return
    }

    setActivePage('portal')
    setLinkedMemberNotice('Dieser Mitgliedsausweis gehört zu einem anderen Mitglied. Du hast keine Berechtigung, diese Daten zu öffnen.')
  }, [canManageMembers, currentMember, editMember, isAdmin, members])

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
  }, [checkInMember, getMemberFromQrValue, scanning])

  useEffect(() => {
    Promise.resolve().then(() => {
      handleMemberDeepLink()
    })
  }, [handleMemberDeepLink])

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
  }, [
    canManageMembers,
    checkInMember,
    editMember,
    getInventoryQrValue,
    getMemberFromQrValue,
    inventoryItems,
    isAdmin,
    mobileScanMode,
    mobileScanning,
  ])

  function canManageCash() {
    return canManageCashRole(getAppRole())
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

  async function loadMediaItems() {
    return loadMediaItemsService({
      setMediaItems,
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

  async function loadSponsors() {
    return loadSponsorsService({
      setSponsors,
    })
  }

  async function loadSponsorContracts() {
    return loadSponsorContractsService({
      setSponsorContracts,
    })
  }

  async function loadMerchItems() {
    return loadMerchItemsService({
      setMerchItems,
    })
  }

  async function loadMerchVariants() {
    return loadMerchVariantsService({
      setMerchVariants,
    })
  }

  async function loadMerchSales() {
    return loadMerchSalesService({
      setMerchSales,
    })
  }

  async function loadMerchSaleItems() {
    return loadMerchSaleItemsService({
      setMerchSaleItems,
    })
  }

  async function loadShopOrders() {
    return loadShopOrdersService({
      setShopOrders,
    })
  }

  async function loadShopOrderItems() {
    return loadShopOrderItemsService({
      setShopOrderItems,
    })
  }

  function getFee(memberId) {
    return fees.find((fee) => fee.member_id === memberId)
  }

  async function createMembershipFeesForYear({ year, title, dueDate }) {
    if (!isAdmin()) return alert('Keine Berechtigung für Beitragsverwaltung.')

    setMembershipFeeGenerationLoading(true)
    setMembershipFeeGenerationResult(null)

    try {
      const { data, error } = await createMembershipFeePeriodAndItems({
        year,
        title,
        dueDate,
      })

      if (error) {
        alert(error.message)
        return { error }
      }

      const result = Array.isArray(data) ? data[0] : data
      setMembershipFeeGenerationResult(result || null)
      await loadAll()
      return { ok: true, data: result }
    } finally {
      setMembershipFeeGenerationLoading(false)
    }
  }

  async function markMembershipFeeItemPaidAction({
    feeItemId,
    paymentMethod = 'bar',
    createCashEntry = true,
  }) {
    if (!isAdmin()) return alert('Keine Berechtigung für Beitragsverwaltung.')

    setMembershipFeeActionLoadingId(feeItemId)
    try {
      const { error } = await markMembershipFeeItemPaidRecord({
        feeItemId,
        paymentMethod,
        createCashEntry,
      })

      if (error) {
        alert(error.message)
        return { error }
      }

      await loadAll()
      return { ok: true }
    } finally {
      setMembershipFeeActionLoadingId(null)
    }
  }

  async function reopenMembershipFeeItemAction({ feeItemId, cancelCashEntry = true }) {
    if (!isAdmin()) return alert('Keine Berechtigung für Beitragsverwaltung.')

    setMembershipFeeActionLoadingId(feeItemId)
    try {
      const { error } = await reopenMembershipFeeItemRecord({
        feeItemId,
        cancelCashEntry,
      })

      if (error) {
        alert(error.message)
        return { error }
      }

      await loadAll()
      return { ok: true }
    } finally {
      setMembershipFeeActionLoadingId(null)
    }
  }

  async function sendMembershipFeeNotificationAction({ feeItemId, type }) {
    if (!isAdmin()) return alert('Keine Berechtigung für Beitragsverwaltung.')

    setMembershipFeeActionLoadingId(feeItemId)
    try {
      const { data, error } = await sendMembershipFeeNotificationRecord({
        feeItemId,
        type,
      })

      if (error) {
        let message = error.message

        try {
          const errorBody = await error.context?.json?.()
          message = errorBody?.error || message
        } catch {
          // Keep the Supabase error message if the response body cannot be read.
        }

        alert(message)
        return { error: new Error(message) }
      }

      if (data?.error) {
        alert(data.error)
        return { error: new Error(data.error) }
      }

      await loadAll()
      return { ok: true }
    } finally {
      setMembershipFeeActionLoadingId(null)
    }
  }

  async function deleteMembershipFeeItemAction({ feeItemId }) {
    if (!isAdmin()) return alert('Keine Berechtigung für Beitragsverwaltung.')

    setMembershipFeeActionLoadingId(feeItemId)
    try {
      const { error } = await deleteMembershipFeeItemRecord(feeItemId)

      if (error) {
        alert(error.message)
        return { error }
      }

      await loadAll()
      return { ok: true }
    } finally {
      setMembershipFeeActionLoadingId(null)
    }
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
        !entry.is_cancelled
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
      commercialData: getCommercialDashboardData(),
    })
  }

  function getDashboardCockpitTasks() {
    return buildDashboardCockpitTasks({
      members,
      fees,
      invoices,
      events,
      mediaItems,
      sponsors,
      sponsorContracts,
      merchItems,
      merchVariants,
      getMemberById,
      getFee,
      getCashBalance,
      getUpcomingEvents,
      isInvoiceOverdue,
      commercialData: getCommercialDashboardData(),
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
    return buildCashBalance(getCashEntriesForSelectedYear())
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
      .filter((entry) => entry.type === 'einnahme' && !entry.is_opening && buildIsValidCashEntry(entry))
      .reduce((sum, entry) => sum + buildCashAmountCents(entry), 0) / 100
  }

  function getExpenseTotal() {
    return getCashEntriesForSelectedYear()
      .filter((entry) => entry.type === 'ausgabe' && !entry.is_opening && buildIsValidCashEntry(entry))
      .reduce((sum, entry) => sum + buildCashAmountCents(entry), 0) / 100
  }

  function getEventNameById(eventId) {
    const event = events.find((item) => item.id === eventId)
    return event ? event.name : ''
  }

  function getCashEntriesForEvent(eventId) {
    if (!eventId) return []
    return cashEntries.filter((entry) => entry.event_id === eventId && buildIsValidCashEntry(entry))
  }

  function getEventIncomeTotal(eventId) {
    return getCashEntriesForEvent(eventId)
      .filter((entry) => entry.type === 'einnahme' && !entry.is_opening)
      .reduce((sum, entry) => sum + buildCashAmountCents(entry), 0) / 100
  }

  function getEventExpenseTotal(eventId) {
    return getCashEntriesForEvent(eventId)
      .filter((entry) => entry.type === 'ausgabe' && !entry.is_opening)
      .reduce((sum, entry) => sum + buildCashAmountCents(entry), 0) / 100
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
          return date.getMonth() + 1 === monthNumber && entry.type === 'einnahme' && buildIsValidCashEntry(entry)
        })
        .reduce((sum, entry) => sum + buildCashAmountCents(entry), 0) / 100

      const expense = getCashEntriesForSelectedYear()
        .filter((entry) => {
          if (!entry.entry_date) return false
          const date = new Date(entry.entry_date)
          return date.getMonth() + 1 === monthNumber && entry.type === 'ausgabe' && buildIsValidCashEntry(entry)
        })
        .reduce((sum, entry) => sum + buildCashAmountCents(entry), 0) / 100

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
      membershipFeePeriods,
      membershipFeeItems,
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
      membershipFeePeriods,
      membershipFeeItems,
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

  function canManageSponsors() {
    return canManageMembers() || isAdmin()
  }

  function canManageMedia() {
    return canManageMembers() || isAdmin()
  }

  function canManageMerch() {
    return canManageMembers() || isAdmin()
  }

  function canManagePurchase() {
    return canManagePurchaseMember(currentMember)
  }

  function resetMerchItemForm() {
    setMerchItemEditingId(null)
    setMerchItemNumber('')
    setMerchItemName('')
    setMerchItemCategory('other')
    setMerchItemImagePath('')
    setMerchItemStatus('active')
    setMerchItemBasePrice('')
    setMerchItemPurchasePrice('')
    setMerchItemMemberPrice('')
    setMerchItemTaxRate('0')
    setMerchItemSkuPrefix('')
    setMerchItemShortDescription('')
    setMerchItemDescription('')
    setMerchItemStorageLocation('')
    setMerchItemIsPreorder(false)
    setMerchItemIsLimited(false)
    setMerchItemIsBestseller(false)
    setMerchItemIsNew(false)
    setMerchItemIsClearance(false)
    setMerchItemPickupAvailable(true)
    setMerchItemShippingAvailable(false)
    setMerchItemShippingCost('')
    setMerchItemIsPublic(false)
    setMerchItemPublicSortOrder('0')
    setMerchItemPublicTitle('')
    setMerchItemPublicDescription('')
    setMerchItemPublicDescriptionHtml('')
    setMerchItemPublicImageAlt('')
    setMerchItemPublicCtaLabel('')
    setMerchItemPublicCtaUrl('')
  }

  function resetMerchVariantForm() {
    setMerchVariantEditingId(null)
    setMerchVariantItemId(merchItems[0]?.id || '')
    setMerchVariantSku('')
    setMerchVariantName('')
    setMerchVariantSize('')
    setMerchVariantColor('')
    setMerchVariantPrice('')
    setMerchVariantStock('0')
    setMerchVariantReorderLevel('0')
    setMerchVariantStatus('active')
    setMerchVariantIsPublic(false)
    setMerchVariantPublicSortOrder('0')
  }

  function resetMerchSaleForm() {
    setMerchSaleVariantId('')
    setMerchSaleQuantity('1')
    setMerchSaleDiscount('')
    setMerchSaleMemberId('')
    setMerchSaleBuyerName('')
    setMerchSaleEventId('')
    setMerchSalePaymentMethod('bar')
    setMerchSaleCreateCashEntry(true)
    setMerchSaleCreateInvoice(false)
    setMerchSaleInvoiceCustomerId('')
    setMerchSaleInvoiceEmail('')
    setMerchSaleInvoiceStatus('bezahlt')
    setMerchSaleSendInvoiceEmail(false)
  }

  function resetShopOrderForm() {
    setShopOrderEditingId(null)
    setShopOrderVariantId('')
    setShopOrderQuantity('1')
    setShopOrderDiscount('')
    setShopOrderShippingCost('')
    setShopOrderMemberId('')
    setShopOrderBuyerName('')
    setShopOrderBuyerEmail('')
    setShopOrderBuyerPhone('')
    setShopOrderStatus('new')
    setShopOrderPaymentStatus('open')
    setShopOrderPaymentMethod('bar')
    setShopOrderDeliveryMethod('pickup')
    setShopOrderNotes('')
    setShopOrderInternalNotes('')
  }

  function getMerchSaleUnitPriceCents(variantId = merchSaleVariantId) {
    const variant = merchVariants.find((item) => item.id === variantId)

    if (!variant) return 0
    if (variant.price_cents !== null && variant.price_cents !== undefined) return Number(variant.price_cents || 0)

    const item = merchItems.find((merchItem) => merchItem.id === variant.merch_item_id)
    return Number(item?.base_price_cents || 0)
  }

  function getMerchSaleSelectedVariant() {
    return merchVariants.find((variant) => variant.id === merchSaleVariantId) || null
  }

  function getMerchSaleInvoiceCustomer() {
    return invoiceCustomers.find((customer) => customer.id === merchSaleInvoiceCustomerId) || null
  }

  function getMerchSaleInvoiceRecipientLabel() {
    const member = members.find((item) => item.id === merchSaleMemberId)
    const customer = getMerchSaleInvoiceCustomer()
    const memberName = member ? `${member.first_name || ''} ${member.last_name || ''}`.trim() : ''

    return memberName || customer?.name || merchSaleBuyerName.trim()
  }

  async function fetchInvoiceForImmediateAction(invoiceId) {
    if (!invoiceId) return null

    const { data: invoice, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single()

    if (error) throw error

    const { data: items, error: itemsError } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('created_at', { ascending: true })

    if (itemsError) throw itemsError

    return { invoice, items: items || [] }
  }

  async function exportImmediateInvoicePdf(invoiceId) {
    const invoiceData = await fetchInvoiceForImmediateAction(invoiceId)

    if (!invoiceData) return null

    await exportInvoicePdfService({
      invoice: invoiceData.invoice,
      member: invoiceData.invoice.member_id ? getMemberById(invoiceData.invoice.member_id) : null,
      items: invoiceData.items,
      isTest: Boolean(invoiceData.invoice.is_test || getMemberById(invoiceData.invoice.member_id)?.is_test),
      isCancelled: invoiceData.invoice.status === 'storniert',
    })

    return invoiceData.invoice
  }

  async function sendImmediateInvoiceEmail(invoiceId) {
    const invoiceData = await fetchInvoiceForImmediateAction(invoiceId)

    if (!invoiceData?.invoice?.customer_email) {
      alert('Diese Rechnung hat keine E-Mail-Adresse.')
      return
    }

    await sendInvoiceEmailService({
      invoice: invoiceData.invoice,
      reminder: false,
      canManageCash,
      isAdmin,
      buildInvoicePdfBlob: async () => buildInvoicePdfBlobService({
        invoice: invoiceData.invoice,
        member: invoiceData.invoice.member_id ? getMemberById(invoiceData.invoice.member_id) : null,
        items: invoiceData.items,
        isTest: Boolean(invoiceData.invoice.is_test || getMemberById(invoiceData.invoice.member_id)?.is_test),
        isCancelled: invoiceData.invoice.status === 'storniert',
      }),
      blobToBase64,
      createAuditLog,
      loadInvoices,
    })
  }

  async function openMerchSaleInvoice(sale) {
    if (!sale?.invoice_id) return alert('Dieser Verkauf hat keine Rechnung.')

    const invoice = getInvoiceById(sale.invoice_id)

    if (invoice) {
      await exportInvoicePdf(invoice)
      return
    }

    await exportImmediateInvoicePdf(sale.invoice_id)
  }

  async function sendMerchSaleInvoice(sale) {
    if (!sale?.invoice_id) return alert('Dieser Verkauf hat keine Rechnung.')

    const invoice = getInvoiceById(sale.invoice_id)

    if (invoice) {
      await sendInvoiceEmail(invoice, false)
      return
    }

    await sendImmediateInvoiceEmail(sale.invoice_id)
  }

  function getLocalDateString(date = new Date()) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')

    return `${year}-${month}-${day}`
  }

  function getMerchSaleErrorMessage(error) {
    const message = error?.message || 'Fanartikel-Verkauf konnte nicht gespeichert werden.'
    const stockMatch = message.match(/not enough stock.*available\s+(\d+),\s+requested\s+(\d+)/i)

    if (stockMatch) {
      return `Nicht genug Bestand verfugbar. Verfugbar: ${stockMatch[1]}, angefragt: ${stockMatch[2]}.`
    }

    return message
  }

  function getCancelMerchSaleErrorMessage(error) {
    const message = error?.message || 'Fanartikel-Verkauf konnte nicht storniert werden.'

    if (message.includes('already cancelled')) return 'Dieser Verkauf wurde bereits storniert.'
    if (message.includes('cannot be cancelled from status')) return 'Dieser Verkauf kann nicht storniert werden.'
    if (message.includes('has no sale items')) return 'Dieser Verkauf hat keine Positionen und kann nicht storniert werden.'

    return message
  }

  async function reloadMerchAfterCancelError(sale) {
    await loadMerchSales()
    await loadMerchSaleItems()
    await loadMerchVariants()

    if (sale?.cash_entry_id) {
      await loadCashEntries()
    }
  }

  function getMerchSaleTotals() {
    const quantity = merchSaleQuantity ? Number(merchSaleQuantity) : 0
    const discount = merchSaleDiscount ? Number(String(merchSaleDiscount).replace(',', '.')) : 0
    const unitPriceCents = getMerchSaleUnitPriceCents()
    const subtotalCents = Number.isFinite(quantity) ? quantity * unitPriceCents : 0
    const discountCents = Number.isFinite(discount) ? Math.round(discount * 100) : 0

    return {
      unitPriceCents,
      subtotalCents,
      discountCents,
      totalCents: Math.max(0, subtotalCents - discountCents),
    }
  }

  function getShopOrderUnitPriceCents(variantId = shopOrderVariantId) {
    return getMerchSaleUnitPriceCents(variantId)
  }

  function getShopOrderSelectedVariant() {
    return merchVariants.find((variant) => variant.id === shopOrderVariantId) || null
  }

  function getShopOrderTotals() {
    const quantity = shopOrderQuantity ? Number(shopOrderQuantity) : 0
    const discount = shopOrderDiscount ? Number(String(shopOrderDiscount).replace(',', '.')) : 0
    const shipping = shopOrderShippingCost ? Number(String(shopOrderShippingCost).replace(',', '.')) : 0
    const unitPriceCents = getShopOrderUnitPriceCents()
    const subtotalCents = Number.isFinite(quantity) ? quantity * unitPriceCents : 0
    const discountCents = Number.isFinite(discount) ? Math.round(discount * 100) : 0
    const shippingCostCents = Number.isFinite(shipping) ? Math.round(shipping * 100) : 0

    return {
      unitPriceCents,
      subtotalCents,
      discountCents,
      shippingCostCents,
      totalCents: Math.max(0, subtotalCents - discountCents + shippingCostCents),
    }
  }

  function getShopOrderErrorMessage(error) {
    const message = error?.message || 'Shop-Bestellung konnte nicht gespeichert werden.'
    const stockMatch = message.match(/not enough stock.*available\s+(\d+),\s+requested\s+(\d+)/i)

    if (stockMatch) {
      return `Nicht genug Bestand verfugbar. Verfugbar: ${stockMatch[1]}, angefragt: ${stockMatch[2]}.`
    }

    return message
  }

  function getShopOrderDeleteErrorMessage(error) {
    const message = error?.message || 'Shop-Bestellung konnte nicht geloescht werden.'

    if (/permission denied/i.test(message)) {
      return 'Keine Berechtigung zum Löschen von Shop-Bestellungen.'
    }

    if (/Nur offene Shop-Bestellungen/i.test(message)) {
      return 'Nur offene Bestellungen können gelöscht werden.'
    }

    if (/Versendete, abgeschlossene oder stornierte/i.test(message)) {
      return 'Versendete, abgeschlossene oder stornierte Bestellungen können nicht gelöscht werden.'
    }

    if (/Kassa-Eintrag/i.test(message)) {
      return 'Diese Bestellung ist bereits mit der Kassa verknüpft und kann nicht gelöscht werden.'
    }

    return message
  }

  function editShopOrder(order) {
    if (!canManageMerch()) return alert('Keine Berechtigung für Shop-Bestellungen.')

    const orderItem = shopOrderItems.find((item) => item.shop_order_id === order.id)

    setShopOrderEditingId(order.id)
    setShopOrderVariantId(orderItem?.merch_variant_id || '')
    setShopOrderQuantity(orderItem?.quantity ? String(orderItem.quantity) : '1')
    setShopOrderDiscount(order.discount_cents ? String((Number(order.discount_cents) / 100).toFixed(2)) : '')
    setShopOrderShippingCost(order.shipping_cost_cents ? String((Number(order.shipping_cost_cents) / 100).toFixed(2)) : '')
    setShopOrderMemberId(order.member_id || '')
    setShopOrderBuyerName(order.buyer_name || '')
    setShopOrderBuyerEmail(order.buyer_email || '')
    setShopOrderBuyerPhone(order.buyer_phone || '')
    setShopOrderStatus(order.status || 'new')
    setShopOrderPaymentStatus(order.payment_status || 'open')
    setShopOrderPaymentMethod(order.payment_method === 'pending' ? 'sonstiges' : order.payment_method || 'bar')
    setShopOrderDeliveryMethod(order.delivery_method || 'pickup')
    setShopOrderNotes(order.notes || '')
    setShopOrderInternalNotes(order.internal_notes || '')

    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function saveShopOrder() {
    if (!canManageMerch()) return alert('Keine Berechtigung für Shop-Bestellungen.')
    if (shopOrderSaving) return

    const isEditing = Boolean(shopOrderEditingId)
    const variant = getShopOrderSelectedVariant()

    if (!isEditing && !variant) {
      alert('Variante ist Pflicht.')
      return
    }

    if (!isEditing && variant.status !== 'active') {
      alert('Diese Variante ist nicht für Bestellungen aktiv.')
      return
    }

    const quantity = shopOrderQuantity ? Number(shopOrderQuantity) : 0

    if (!isEditing && (!Number.isInteger(quantity) || quantity <= 0)) {
      alert('Menge muss eine ganze positive Zahl sein.')
      return
    }

    if (!isEditing && Number(variant.stock_quantity || 0) < quantity) {
      alert(`Nicht genug Bestand verfugbar. Verfugbar: ${Number(variant.stock_quantity || 0)}, angefragt: ${quantity}.`)
      return
    }

    const discount = shopOrderDiscount ? Number(String(shopOrderDiscount).replace(',', '.')) : 0
    const shipping = shopOrderShippingCost ? Number(String(shopOrderShippingCost).replace(',', '.')) : 0

    if (Number.isNaN(discount) || discount < 0) {
      alert('Rabatt muss eine positive Zahl sein.')
      return
    }

    if (Number.isNaN(shipping) || shipping < 0) {
      alert('Versandkosten müssen eine positive Zahl sein.')
      return
    }

    const totals = getShopOrderTotals()

    if (!isEditing && totals.discountCents > totals.subtotalCents) {
      alert('Rabatt darf nicht hoher als die Zwischensumme sein.')
      return
    }

    const orderDate = getLocalDateString()
    const receiptNumber = shopOrderPaymentStatus === 'paid'
      ? getNextReceiptNumber(Number(orderDate.slice(0, 4)))
      : null

    const basePayload = {
      p_status: shopOrderStatus,
      p_payment_status: shopOrderPaymentStatus,
      p_payment_method: shopOrderPaymentMethod,
      p_delivery_method: shopOrderDeliveryMethod,
      p_member_id: shopOrderMemberId || null,
      p_buyer_name: shopOrderBuyerName.trim() || null,
      p_buyer_email: shopOrderBuyerEmail.trim() || null,
      p_buyer_phone: shopOrderBuyerPhone.trim() || null,
      p_notes: shopOrderNotes.trim() || null,
      p_internal_notes: shopOrderInternalNotes.trim() || null,
      p_receipt_number: receiptNumber,
    }

    setShopOrderSaving(true)

    try {
      const result = isEditing
        ? await updateShopOrderRecord({
          rpcPayload: {
            p_shop_order_id: shopOrderEditingId,
            ...basePayload,
          },
          shopOrders,
          createAuditLog,
          loadShopOrders,
          loadCashEntries,
          resetShopOrderForm,
        })
        : await createShopOrderRecord({
          rpcPayload: {
            p_merch_variant_id: variant.id,
            p_quantity: quantity,
            p_unit_price_cents: totals.unitPriceCents,
            p_discount_cents: totals.discountCents,
            p_shipping_cost_cents: totals.shippingCostCents,
            p_order_date: orderDate,
            ...basePayload,
          },
          createAuditLog,
          loadShopOrders,
          loadShopOrderItems,
          loadMerchVariants,
          loadCashEntries,
          resetShopOrderForm,
        })

      if (result?.error) {
        alert(getShopOrderErrorMessage(result.error))
      }
    } catch (error) {
      alert(getShopOrderErrorMessage(error))
    } finally {
      setShopOrderSaving(false)
    }
  }

  async function deleteShopOrder(order) {
    if (!canManageMerch()) return alert('Keine Berechtigung für Shop-Bestellungen.')
    if (shopOrderDeletingId) return

    const confirmed = window.confirm(
      'Offene Bestellung wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.'
    )

    if (!confirmed) return

    setShopOrderDeletingId(order.id)

    try {
      const result = await deleteOpenMerchOrderRecord({
        order,
        shopOrders,
        createAuditLog,
        loadShopOrders,
        loadShopOrderItems,
      })

      if (result?.error) {
        console.error('delete_open_merch_order failed', result.error)
        alert(getShopOrderDeleteErrorMessage(result.error))
      }
    } catch (error) {
      console.error('delete_open_merch_order failed', error)
      alert(getShopOrderDeleteErrorMessage(error))
    } finally {
      setShopOrderDeletingId(null)
    }
  }

  async function saveMerchSale() {
    if (!canManageMerch()) return alert('Keine Berechtigung für Fanartikelverkauf.')
    if (merchSaleSaving) return

    const variant = getMerchSaleSelectedVariant()

    if (!variant) {
      alert('Variante ist Pflicht.')
      return
    }

    if (variant.status !== 'active') {
      alert('Diese Variante ist nicht für den Verkauf aktiv.')
      return
    }

    const quantity = merchSaleQuantity ? Number(merchSaleQuantity) : 0

    if (!Number.isInteger(quantity) || quantity <= 0) {
      alert('Menge muss eine ganze positive Zahl sein.')
      return
    }

    if (Number(variant.stock_quantity || 0) < quantity) {
      alert(`Nicht genug Bestand verfugbar. Verfugbar: ${Number(variant.stock_quantity || 0)}, angefragt: ${quantity}.`)
      return
    }

    const discount = merchSaleDiscount ? Number(String(merchSaleDiscount).replace(',', '.')) : 0

    if (Number.isNaN(discount) || discount < 0) {
      alert('Rabatt muss eine positive Zahl sein.')
      return
    }

    const totals = getMerchSaleTotals()

    if (totals.discountCents > totals.subtotalCents) {
      alert('Rabatt darf nicht hoher als die Zwischensumme sein.')
      return
    }

    if (merchSaleCreateInvoice && merchSaleInvoiceStatus === 'offen' && merchSaleCreateCashEntry) {
      alert('Eine offene Rechnung kann nicht gleichzeitig einen Kassa-Eintrag erzeugen.')
      return
    }

    if (merchSaleCreateInvoice && !getMerchSaleInvoiceRecipientLabel()) {
      alert('Für eine Rechnung ist ein Mitglied, ein Rechnungskunde oder ein Freitext-Kunde erforderlich.')
      return
    }

    const saleDate = getLocalDateString()
    const receiptNumber = merchSaleCreateCashEntry
      ? getNextReceiptNumber(Number(saleDate.slice(0, 4)))
      : null

    const baseRpcPayload = {
      p_merch_variant_id: variant.id,
      p_quantity: quantity,
      p_unit_price_cents: totals.unitPriceCents,
      p_discount_cents: totals.discountCents,
      p_sale_date: saleDate,
      p_payment_method: merchSalePaymentMethod || 'bar',
      p_member_id: merchSaleMemberId || null,
      p_event_id: merchSaleEventId || null,
      p_buyer_name: merchSaleBuyerName.trim() || null,
      p_notes: null,
      p_create_cash_entry: merchSaleCreateCashEntry,
      p_receipt_number: receiptNumber,
    }

    const invoiceCustomer = getMerchSaleInvoiceCustomer()
    const invoiceRpcPayload = {
      ...baseRpcPayload,
      p_buyer_email: merchSaleInvoiceEmail.trim() || null,
      p_customer_id: merchSaleInvoiceCustomerId || null,
      p_customer_street: invoiceCustomer?.street || null,
      p_customer_house_number: invoiceCustomer?.house_number || null,
      p_customer_address_addition: invoiceCustomer?.address_addition || null,
      p_customer_postal_code: invoiceCustomer?.postal_code || null,
      p_customer_city: invoiceCustomer?.city || null,
      p_customer_country: invoiceCustomer?.country || 'Österreich',
      p_create_invoice: true,
      p_invoice_is_test: false,
      p_invoice_status: merchSaleInvoiceStatus,
      p_invoice_due_date: null,
      p_invoice_notes: null,
    }

    setMerchSaleSaving(true)

    try {
      const result = merchSaleCreateInvoice
        ? await createMerchSaleWithInvoiceRecord({
          rpcPayload: invoiceRpcPayload,
          createAuditLog,
          loadMerchSales,
          loadMerchSaleItems,
          loadMerchVariants,
          loadCashEntries,
          loadInvoices,
          loadInvoiceItems,
          resetMerchSaleForm,
          alertFn: () => {},
        })
        : await createMerchSaleWithItemRecord({
          rpcPayload: baseRpcPayload,
          createAuditLog,
          loadMerchSales,
          loadMerchSaleItems,
          loadMerchVariants,
          loadCashEntries,
          resetMerchSaleForm,
        })

      if (result?.error) {
        alert(getMerchSaleErrorMessage(result.error))
        return
      }

      if (merchSaleCreateInvoice && result?.sale?.invoice_id) {
        alert(`Rechnung ${result.sale.invoice_number || ''} wurde erzeugt.`)
        await exportImmediateInvoicePdf(result.sale.invoice_id)

        if (merchSaleSendInvoiceEmail) {
          await sendImmediateInvoiceEmail(result.sale.invoice_id)
        }
      }
    } catch (error) {
      alert(getMerchSaleErrorMessage(error))
    } finally {
      setMerchSaleSaving(false)
    }
  }

  async function cancelMerchSale(sale) {
    if (!canManageMerch()) return alert('Keine Berechtigung für Fanartikelverkauf.')
    if (!sale || sale.status !== 'completed') return alert('Nur abgeschlossene Verkaeufe koennen storniert werden.')
    if (merchSaleCancellingId) return

    const reason = window.prompt(
      sale.invoice_id
        ? 'Grund für die Stornierung:\n\nDieser Verkauf ist mit einer Rechnung verknüpft. Rechnung, Kassa und Bestand werden gemeinsam storniert.'
        : 'Grund für die Stornierung:'
    )

    if (reason === null) return

    setMerchSaleCancellingId(sale.id)

    try {
      const result = await cancelMerchSaleRecord({
        sale,
        cancellationReason: reason.trim() || null,
        createAuditLog,
        loadMerchSales,
        loadMerchSaleItems,
        loadMerchVariants,
        loadCashEntries,
      })

      if (result?.error) {
        alert(getCancelMerchSaleErrorMessage(result.error))
        await reloadMerchAfterCancelError(sale)
      }
    } catch (error) {
      alert(getCancelMerchSaleErrorMessage(error))
      await reloadMerchAfterCancelError(sale)
    } finally {
      setMerchSaleCancellingId(null)
    }
  }

  function editMerchItem(item) {
    if (!canManageMerch()) return alert('Keine Berechtigung für Fanartikelverwaltung.')

    setMerchItemEditingId(item.id)
    setMerchItemNumber(item.item_number || '')
    setMerchItemName(item.name || '')
    setMerchItemCategory(item.category || 'other')
    setMerchItemImagePath(item.image_path || '')
    setMerchItemStatus(item.status || 'active')
    setMerchItemBasePrice(item.base_price_cents ? String((Number(item.base_price_cents) / 100).toFixed(2)) : '')
    setMerchItemPurchasePrice(item.purchase_price_cents ? String((Number(item.purchase_price_cents) / 100).toFixed(2)) : '')
    setMerchItemMemberPrice(item.member_price_cents ? String((Number(item.member_price_cents) / 100).toFixed(2)) : '')
    setMerchItemTaxRate(String(item.tax_rate ?? 0))
    setMerchItemSkuPrefix(item.sku_prefix || '')
    setMerchItemShortDescription(item.short_description || '')
    setMerchItemDescription(item.description || '')
    setMerchItemStorageLocation(item.storage_location || '')
    setMerchItemIsPreorder(Boolean(item.is_preorder))
    setMerchItemIsLimited(Boolean(item.is_limited))
    setMerchItemIsBestseller(Boolean(item.is_bestseller))
    setMerchItemIsNew(Boolean(item.is_new))
    setMerchItemIsClearance(Boolean(item.is_clearance))
    setMerchItemPickupAvailable(item.pickup_available !== false)
    setMerchItemShippingAvailable(Boolean(item.shipping_available))
    setMerchItemShippingCost(item.shipping_cost_cents ? String((Number(item.shipping_cost_cents) / 100).toFixed(2)) : '')
    setMerchItemIsPublic(Boolean(item.is_public))
    setMerchItemPublicSortOrder(String(item.public_sort_order ?? 0))
    setMerchItemPublicTitle(item.public_title || '')
    setMerchItemPublicDescription(item.public_description || '')
    setMerchItemPublicDescriptionHtml(item.public_description_html || '')
    setMerchItemPublicImageAlt(item.public_image_alt || '')
    setMerchItemPublicCtaLabel(item.public_cta_label || '')
    setMerchItemPublicCtaUrl(item.public_cta_url || '')

    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function saveMerchItem() {
    if (!canManageMerch()) return alert('Keine Berechtigung für Fanartikelverwaltung.')
    if (merchItemSaving) return

    if (!merchItemName.trim()) {
      alert('Name ist Pflicht.')
      return
    }

    const basePriceNumber = merchItemBasePrice ? Number(String(merchItemBasePrice).replace(',', '.')) : 0
    const purchasePriceNumber = merchItemPurchasePrice ? Number(String(merchItemPurchasePrice).replace(',', '.')) : null
    const memberPriceNumber = merchItemMemberPrice ? Number(String(merchItemMemberPrice).replace(',', '.')) : null
    const shippingCostNumber = merchItemShippingCost ? Number(String(merchItemShippingCost).replace(',', '.')) : 0
    const taxRateNumber = merchItemTaxRate ? Number(String(merchItemTaxRate).replace(',', '.')) : 0
    const publicSortOrderNumber = merchItemPublicSortOrder ? Number(merchItemPublicSortOrder) : 0

    if (Number.isNaN(basePriceNumber) || basePriceNumber < 0) {
      alert('Verkaufspreis muss eine positive Zahl sein.')
      return
    }

    if (purchasePriceNumber !== null && (Number.isNaN(purchasePriceNumber) || purchasePriceNumber < 0)) {
      alert('Einkaufspreis muss eine positive Zahl sein.')
      return
    }

    if (memberPriceNumber !== null && (Number.isNaN(memberPriceNumber) || memberPriceNumber < 0)) {
      alert('Mitgliederpreis muss eine positive Zahl sein.')
      return
    }

    if (Number.isNaN(shippingCostNumber) || shippingCostNumber < 0) {
      alert('Versandkosten müssen eine positive Zahl sein.')
      return
    }

    if (Number.isNaN(taxRateNumber) || taxRateNumber < 0 || taxRateNumber > 100) {
      alert('Steuersatz muss zwischen 0 und 100 liegen.')
      return
    }

    if (!Number.isInteger(publicSortOrderNumber) || publicSortOrderNumber < 0) {
      alert('Oeffentliche Sortierung muss eine ganze positive Zahl sein.')
      return
    }

    const payload = {
      item_number: merchItemNumber.trim() || null,
      name: merchItemName.trim(),
      short_description: merchItemShortDescription.trim() || null,
      description: merchItemDescription.trim() || null,
      category: merchItemCategory.trim() || 'other',
      image_path: merchItemImagePath.trim() || null,
      status: merchItemStatus || 'active',
      base_price_cents: Math.round(basePriceNumber * 100),
      purchase_price_cents: purchasePriceNumber === null ? null : Math.round(purchasePriceNumber * 100),
      member_price_cents: memberPriceNumber === null ? null : Math.round(memberPriceNumber * 100),
      tax_rate: taxRateNumber,
      sku_prefix: merchItemSkuPrefix.trim() || null,
      storage_location: merchItemStorageLocation.trim() || null,
      is_preorder: merchItemIsPreorder,
      is_limited: merchItemIsLimited,
      is_bestseller: merchItemIsBestseller,
      is_new: merchItemIsNew,
      is_clearance: merchItemIsClearance,
      pickup_available: merchItemPickupAvailable,
      shipping_available: merchItemShippingAvailable,
      shipping_cost_cents: Math.round(shippingCostNumber * 100),
      is_public: merchItemIsPublic,
      public_sort_order: publicSortOrderNumber,
      public_title: merchItemPublicTitle.trim() || null,
      public_description: merchItemPublicDescription.trim() || null,
      public_description_html: normalizeRichTextHtml(merchItemPublicDescriptionHtml) || null,
      public_image_alt: merchItemPublicImageAlt.trim() || null,
      public_cta_label: merchItemPublicCtaLabel.trim() || null,
      public_cta_url: merchItemPublicCtaUrl.trim() || null,
    }

    setMerchItemSaving(true)

    try {
      const result = await saveMerchItemRecord({
        merchItemEditingId,
        payload,
        merchItems,
        createAuditLog,
        loadMerchItems,
        resetMerchItemForm,
      })

      if (result?.error) alert(result.error.message)
    } finally {
      setMerchItemSaving(false)
    }
  }

  async function deleteMerchItem(item) {
    if (!canManageMerch()) return alert('Keine Berechtigung für Fanartikelverwaltung.')
    if (merchItemDeletingId) return

    const confirmed = window.confirm(
      `Fanartikel wirklich löschen?\n\n${item.name || ''}\n\nAlle Varianten dieses Artikels werden ebenfalls gelöscht.`
    )

    if (!confirmed) return

    setMerchItemDeletingId(item.id)

    try {
      const result = await deleteMerchItemRecord({
        item,
        createAuditLog,
        loadMerchItems,
        loadMerchVariants,
      })

      if (result?.error) alert(result.error.message)
    } finally {
      setMerchItemDeletingId(null)
    }
  }

  function editMerchVariant(variant) {
    if (!canManageMerch()) return alert('Keine Berechtigung für Fanartikelverwaltung.')

    setMerchVariantEditingId(variant.id)
    setMerchVariantItemId(variant.merch_item_id || '')
    setMerchVariantSku(variant.sku || '')
    setMerchVariantName(variant.variant_name || '')
    setMerchVariantSize(variant.size || '')
    setMerchVariantColor(variant.color || '')
    setMerchVariantPrice(variant.price_cents === null ? '' : String((Number(variant.price_cents) / 100).toFixed(2)))
    setMerchVariantStock(String(variant.stock_quantity ?? 0))
    setMerchVariantReorderLevel(String(variant.reorder_level ?? 0))
    setMerchVariantStatus(variant.status || 'active')
    setMerchVariantIsPublic(Boolean(variant.is_public))
    setMerchVariantPublicSortOrder(String(variant.public_sort_order ?? 0))

    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function saveMerchVariant() {
    if (!canManageMerch()) return alert('Keine Berechtigung für Fanartikelverwaltung.')
    if (merchVariantSaving) return

    if (merchItems.length === 0) {
      alert('Bitte zuerst einen Fanartikel anlegen.')
      return
    }

    if (!merchVariantItemId) {
      alert('Fanartikel ist Pflicht.')
      return
    }

    if (
      !merchVariantSku.trim()
      && !merchVariantName.trim()
      && !merchVariantSize.trim()
      && !merchVariantColor.trim()
    ) {
      alert('Mindestens SKU, Variantenname, Größe oder Farbe ist Pflicht.')
      return
    }

    const variantPriceNumber = merchVariantPrice ? Number(String(merchVariantPrice).replace(',', '.')) : null
    const stockNumber = merchVariantStock ? Number(merchVariantStock) : 0
    const reorderLevelNumber = merchVariantReorderLevel ? Number(merchVariantReorderLevel) : 0
    const publicSortOrderNumber = merchVariantPublicSortOrder ? Number(merchVariantPublicSortOrder) : 0

    if (variantPriceNumber !== null && (Number.isNaN(variantPriceNumber) || variantPriceNumber < 0)) {
      alert('Variantenpreis muss eine positive Zahl sein.')
      return
    }

    if (!Number.isInteger(stockNumber) || stockNumber < 0) {
      alert('Bestand muss eine ganze positive Zahl sein.')
      return
    }

    if (!Number.isInteger(reorderLevelNumber) || reorderLevelNumber < 0) {
      alert('Mindestbestand muss eine ganze positive Zahl sein.')
      return
    }

    if (!Number.isInteger(publicSortOrderNumber) || publicSortOrderNumber < 0) {
      alert('Varianten-Sortierung muss eine ganze positive Zahl sein.')
      return
    }

    const payload = {
      merch_item_id: merchVariantItemId,
      sku: merchVariantSku.trim() || null,
      variant_name: merchVariantName.trim() || null,
      size: merchVariantSize.trim() || null,
      color: merchVariantColor.trim() || null,
      price_cents: variantPriceNumber === null ? null : Math.round(variantPriceNumber * 100),
      stock_quantity: stockNumber,
      reorder_level: reorderLevelNumber,
      status: stockNumber > 0 && merchVariantStatus === 'sold_out' ? 'active' : (merchVariantStatus || 'active'),
      is_public: merchVariantIsPublic,
      public_sort_order: publicSortOrderNumber,
    }

    setMerchVariantSaving(true)

    try {
      const result = await saveMerchVariantRecord({
        merchVariantEditingId,
        payload,
        merchVariants,
        createAuditLog,
        loadMerchVariants,
        resetMerchVariantForm,
      })

      if (result?.error) alert(result.error.message)
    } finally {
      setMerchVariantSaving(false)
    }
  }

  async function deleteMerchVariant(variant) {
    if (!canManageMerch()) return alert('Keine Berechtigung für Fanartikelverwaltung.')
    if (merchVariantDeletingId) return

    const confirmed = window.confirm(
      `Variante wirklich löschen?\n\n${variant.variant_name || variant.sku || ''}`
    )

    if (!confirmed) return

    setMerchVariantDeletingId(variant.id)

    try {
      const result = await deleteMerchVariantRecord({
        variant,
        createAuditLog,
        loadMerchVariants,
      })

      if (result?.error) alert(result.error.message)
    } finally {
      setMerchVariantDeletingId(null)
    }
  }

  function resetSponsorForm() {
    setSponsorEditingId(null)
    setSponsorName('')
    setSponsorContactPerson('')
    setSponsorEmail('')
    setSponsorPhone('')
    setSponsorWebsite('')
    setSponsorLogoPath('')
    setSponsorLogoFile(null)
    setSponsorLogoAlt('')
    setSponsorIsPublic(false)
    setSponsorLevel('supporter')
    setSponsorPublicSortOrder('0')
    setSponsorPublicDescription('')
    setSponsorPublicDescriptionHtml('')
    setSponsorStatus('active')
    setSponsorNotes('')
  }

  function resetSponsorContractForm() {
    setSponsorContractEditingId(null)
    setContractSponsorId(sponsors[0]?.id || '')
    setContractTitle('')
    setContractLevel('premium')
    setContractStatus('draft')
    setContractStartsOn(new Date().toISOString().slice(0, 10))
    setContractEndsOn('')
    setContractAmount('')
    setContractPaymentStatus('open')
    setContractBillingCycle('one_time')
    setContractBenefits('')
    setContractNotes('')
  }

  function editSponsor(sponsor) {
    if (!canManageSponsors()) return alert('Keine Berechtigung für Sponsorenverwaltung.')

    setSponsorEditingId(sponsor.id)
    setSponsorName(sponsor.name || '')
    setSponsorContactPerson(sponsor.contact_person || '')
    setSponsorEmail(sponsor.email || '')
    setSponsorPhone(sponsor.phone || '')
    setSponsorWebsite(sponsor.website || '')
    setSponsorLogoPath(sponsor.logo_path || '')
    setSponsorLogoFile(null)
    setSponsorLogoAlt(sponsor.logo_alt || '')
    setSponsorIsPublic(Boolean(sponsor.is_public))
    setSponsorLevel(sponsor.sponsor_level || 'supporter')
    setSponsorPublicSortOrder(String(sponsor.public_sort_order ?? 0))
    setSponsorPublicDescription(sponsor.public_description || '')
    setSponsorPublicDescriptionHtml(sponsor.public_description_html || '')
    setSponsorStatus(sponsor.status || 'active')
    setSponsorNotes(sponsor.notes || '')

    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function saveSponsor() {
    if (!canManageSponsors()) return alert('Keine Berechtigung für Sponsorenverwaltung.')
    if (sponsorSaving) return

    if (!sponsorName.trim()) {
      alert('Name ist Pflicht.')
      return
    }

    const sortOrderNumber = sponsorPublicSortOrder ? Number(sponsorPublicSortOrder) : 0

    if (!Number.isInteger(sortOrderNumber) || sortOrderNumber < 0) {
      alert('Öffentliche Sortierung muss eine ganze positive Zahl sein.')
      return
    }

    let logoPath = sponsorLogoPath.trim() || null

    if (sponsorLogoFile) {
      const fileExt = sponsorLogoFile.name.split('.').pop()?.toLowerCase() || 'bin'
      const sponsorFolder = sponsorEditingId || crypto.randomUUID()
      const fileName = `logo-${Date.now()}.${fileExt}`
      const filePath = `sponsors/${sponsorFolder}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('public-assets')
        .upload(filePath, sponsorLogoFile, { upsert: true })

      if (uploadError) {
        alert(uploadError.message)
        return
      }

      logoPath = filePath
      setSponsorLogoPath(filePath)
    }

    const payload = {
      name: sponsorName.trim(),
      contact_person: sponsorContactPerson.trim() || null,
      email: sponsorEmail.trim() || null,
      phone: sponsorPhone.trim() || null,
      website: sponsorWebsite.trim() || null,
      logo_path: logoPath,
      logo_alt: sponsorLogoAlt.trim() || null,
      is_public: sponsorIsPublic,
      sponsor_level: sponsorLevel || 'supporter',
      public_sort_order: sortOrderNumber,
      public_description: sponsorPublicDescription.trim() || null,
      public_description_html: normalizeRichTextHtml(sponsorPublicDescriptionHtml) || null,
      status: sponsorStatus || 'active',
      notes: sponsorNotes.trim() || null,
    }

    setSponsorSaving(true)

    try {
      const result = await saveSponsorRecord({
        sponsorEditingId,
        payload,
        sponsors,
        createAuditLog,
        loadSponsors,
        resetSponsorForm,
      })

      if (result?.error) alert(result.error.message)
    } finally {
      setSponsorSaving(false)
    }
  }

  function editSponsorContract(contract) {
    if (!canManageSponsors()) return alert('Keine Berechtigung für Sponsorenverwaltung.')

    setSponsorContractEditingId(contract.id)
    setContractSponsorId(contract.sponsor_id || '')
    setContractTitle(contract.title || '')
    setContractLevel(contract.category || 'premium')
    setContractStatus(contract.status || 'draft')
    setContractStartsOn(contract.starts_on || new Date().toISOString().slice(0, 10))
    setContractEndsOn(contract.ends_on || '')
    setContractAmount(contract.amount_cents ? String((Number(contract.amount_cents) / 100).toFixed(2)) : '')
    setContractPaymentStatus(contract.payment_status || 'open')
    setContractBillingCycle(contract.billing_cycle || 'one_time')
    setContractBenefits(contract.benefits || '')
    setContractNotes(contract.notes || '')

    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function saveSponsorContract() {
    if (!canManageSponsors()) return alert('Keine Berechtigung für Sponsorenverwaltung.')
    if (sponsorContractSaving) return

    if (sponsors.length === 0) {
      alert('Bitte zuerst einen Sponsor anlegen.')
      return
    }

    if (!contractSponsorId) {
      alert('Sponsor ist Pflicht.')
      return
    }

    if (!contractTitle.trim()) {
      alert('Vertragstitel ist Pflicht.')
      return
    }

    if (!contractStartsOn) {
      alert('Startdatum ist Pflicht.')
      return
    }

    if (contractEndsOn && contractEndsOn < contractStartsOn) {
      alert('Enddatum darf nicht vor dem Startdatum liegen.')
      return
    }

    const amountNumber = contractAmount ? Number(String(contractAmount).replace(',', '.')) : 0

    if (Number.isNaN(amountNumber) || amountNumber < 0) {
      alert('Betrag muss eine positive Zahl sein.')
      return
    }

    const payload = {
      sponsor_id: contractSponsorId,
      title: contractTitle.trim(),
      category: contractLevel || 'bronze',
      status: contractStatus || 'draft',
      starts_on: contractStartsOn,
      ends_on: contractEndsOn || null,
      amount_cents: Math.round(amountNumber * 100),
      currency: 'EUR',
      payment_status: contractPaymentStatus || 'open',
      billing_cycle: contractBillingCycle || 'one_time',
      benefits: contractBenefits.trim() || null,
      notes: contractNotes.trim() || null,
    }

    setSponsorContractSaving(true)

    try {
      const result = await saveSponsorContractRecord({
        sponsorContractEditingId,
        payload,
        sponsorContracts,
        createAuditLog,
        loadSponsorContracts,
        resetSponsorContractForm,
      })

      if (result?.error) alert(result.error.message)
    } finally {
      setSponsorContractSaving(false)
    }
  }

  async function deleteSponsorContract(contract) {
    if (!canManageSponsors()) return alert('Keine Berechtigung für Sponsorenverwaltung.')
    if (sponsorContractDeletingId) return

    const confirmed = window.confirm(
      `Sponsor-Vertrag wirklich löschen?\n\n${contract.title || ''}\n\nDas kann nicht rückgängig gemacht werden.`
    )

    if (!confirmed) return

    setSponsorContractDeletingId(contract.id)

    try {
      const result = await deleteSponsorContractRecord({
        contract,
        createAuditLog,
        loadSponsorContracts,
      })

      if (result?.error) alert(result.error.message)
    } finally {
      setSponsorContractDeletingId(null)
    }
  }

  async function deleteSponsor(sponsor) {
    if (!canManageSponsors()) return alert('Keine Berechtigung für Sponsorenverwaltung.')
    if (sponsorDeletingId) return

    const confirmed = window.confirm(
      `Sponsor wirklich löschen?\n\n${sponsor.name || ''}\n\nBestehende Sponsor-Verträge wurden durch die Datenbank ebenfalls gelöscht.`
    )

    if (!confirmed) return

    setSponsorDeletingId(sponsor.id)

    try {
      const result = await deleteSponsorRecord({
        sponsor,
        createAuditLog,
        loadSponsors,
      })

      if (result?.error) alert(result.error.message)
      else await loadSponsorContracts()
    } finally {
      setSponsorDeletingId(null)
    }
  }

  function resetMediaForm() {
    setMediaEditingId(null)
    setMediaTitle('')
    setMediaSlug('')
    setMediaCategory('vereinsnews')
    setMediaSourceName('')
    setMediaSummary('')
    setMediaContent('')
    setMediaContentHtml('')
    setMediaExternalUrl('')
    setMediaAudioUrl('')
    setMediaImagePath('')
    setMediaImageAlt('')
    setMediaPublicationDate(new Date().toISOString().slice(0, 10))
    setMediaPublishedAt('')
    setMediaStatus('draft')
    setMediaIsPublic(false)
    setMediaMembersOnly(false)
    setMediaInternalOnly(false)
    setMediaIsFeatured(false)
    setMediaPublicSortOrder('0')
    setMediaInternalNotes('')
  }

  function editMediaItem(mediaItem) {
    if (!canManageMedia()) return alert('Keine Berechtigung für Medienverwaltung.')

    setMediaEditingId(mediaItem.id)
    setMediaTitle(mediaItem.title || '')
    setMediaSlug(mediaItem.slug || '')
    setMediaCategory(mediaItem.category || 'vereinsnews')
    setMediaSourceName(mediaItem.source_name || '')
    setMediaSummary(mediaItem.summary || '')
    setMediaContent(mediaItem.content || '')
    setMediaContentHtml(mediaItem.content_html || '')
    setMediaExternalUrl(mediaItem.external_url || '')
    setMediaAudioUrl(mediaItem.audio_url || '')
    setMediaImagePath(mediaItem.image_path || '')
    setMediaImageAlt(mediaItem.image_alt || '')
    setMediaPublicationDate(mediaItem.publication_date || new Date().toISOString().slice(0, 10))
    setMediaPublishedAt(mediaItem.published_at ? String(mediaItem.published_at).slice(0, 16) : '')
    setMediaStatus(mediaItem.status || 'draft')
    setMediaIsPublic(Boolean(mediaItem.is_public))
    setMediaMembersOnly(Boolean(mediaItem.members_only))
    setMediaInternalOnly(Boolean(mediaItem.internal_only))
    setMediaIsFeatured(Boolean(mediaItem.is_featured))
    setMediaPublicSortOrder(String(mediaItem.public_sort_order ?? 0))
    setMediaInternalNotes(mediaItem.internal_notes || '')

    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function saveMediaItem() {
    if (!canManageMedia()) return alert('Keine Berechtigung für Medienverwaltung.')
    if (mediaSaving) return

    if (!mediaTitle.trim()) {
      alert('Titel ist Pflicht.')
      return
    }

    if (!mediaPublicationDate) {
      alert('Veröffentlichungsdatum ist Pflicht.')
      return
    }

    const sortOrderNumber = mediaPublicSortOrder ? Number(mediaPublicSortOrder) : 0

    if (!Number.isInteger(sortOrderNumber) || sortOrderNumber < 0) {
      alert('Sortierung muss eine ganze positive Zahl sein.')
      return
    }

    const slugValue = mediaSlug.trim() || null

    if (slugValue && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slugValue)) {
      alert('Slug darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten.')
      return
    }

    const payload = {
      title: mediaTitle.trim(),
      slug: slugValue,
      category: mediaCategory || 'vereinsnews',
      source_name: mediaSourceName.trim() || null,
      summary: mediaSummary.trim() || null,
      content: mediaContent.trim() || null,
      content_html: normalizeRichTextHtml(mediaContentHtml) || null,
      external_url: mediaExternalUrl.trim() || null,
      audio_url: mediaAudioUrl.trim() || null,
      image_path: mediaImagePath.trim() || null,
      image_alt: mediaImageAlt.trim() || null,
      publication_date: mediaPublicationDate,
      published_at: mediaPublishedAt || null,
      status: mediaStatus || 'draft',
      is_public: mediaIsPublic,
      members_only: mediaMembersOnly,
      internal_only: mediaInternalOnly,
      is_featured: mediaIsFeatured,
      public_sort_order: sortOrderNumber,
      internal_notes: mediaInternalNotes.trim() || null,
    }

    setMediaSaving(true)

    try {
      const result = await saveMediaItemRecord({
        mediaEditingId,
        payload,
        mediaItems,
        createAuditLog,
        loadMediaItems,
        resetMediaForm,
      })

      if (result?.error) alert(result.error.message)
    } finally {
      setMediaSaving(false)
    }
  }

  async function deleteMediaItem(mediaItem) {
    if (!canManageMedia()) return alert('Keine Berechtigung für Medienverwaltung.')
    if (mediaDeletingId) return

    const confirmed = window.confirm(
      `Medienbeitrag wirklich löschen?\n\n${mediaItem.title || ''}\n\nDas kann nicht rückgängig gemacht werden.`
    )

    if (!confirmed) return

    setMediaDeletingId(mediaItem.id)

    try {
      const result = await deleteMediaItemRecord({
        mediaItem,
        createAuditLog,
        loadMediaItems,
      })

      if (result?.error) alert(result.error.message)
    } finally {
      setMediaDeletingId(null)
    }
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
    if (!isAdmin()) return alert('Nur Admins dürfen Inventar ausmustern.')

    const reason = window.prompt(`Grund für Ausmustern von ${item.inventory_number} eingeben:`)

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
    if (!isAdmin()) return alert('Nur Admins dürfen Inventar löschen.')

    const confirmed = window.confirm(
      `Inventar-Eintrag wirklich endgültig löschen?\n\n${item.inventory_number || ''} · ${item.name || ''}\n\nEmpfohlen ist normalerweise â€žAusmusternâ€œ. Löschen entfernt den Eintrag dauerhaft.`
    )

    if (!confirmed) return

    const secondConfirm = window.confirm(
      'Bitte nochmals bestätigen: Dieser Inventar-Eintrag wird endgültig gelöscht.'
    )

    if (!secondConfirm) return

    await deleteInventoryItemRecord({
      item,
      createAuditLog,
      loadInventoryItems,
    })
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
    if (!isAdmin()) return alert('Nur Admins dürfen Testmitglieder markieren.')

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
    if (!isAdmin()) return alert('Nur Admins dürfen Testdaten löschen.')

    if (!member?.is_test) {
      alert('Dieses Mitglied ist kein Testmitglied. Aus Sicherheitsgründen wird nichts gelöscht.')
      return
    }

    const confirmed = window.confirm(
      `Alle Testdaten endgültig löschen?\n\n${member.first_name || ''} ${member.last_name || ''}\n\nGelöscht werden:\n- Test-Rechnungen\n- Test-Kassa-Einträge\n- Mitgliedsbeiträge\n- Änderungsanträge\n- das Testmitglied\n\nEchte Daten werden nicht gelöscht.`
    )

    if (!confirmed) return

    const secondConfirm = window.confirm('Bitte nochmals bestätigen: Die Testdaten werden endgültig gelöscht.')

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
    alert('Testmitglied und zugehörige Testdaten wurden gelöscht.')
  }

  async function deleteAllTestData() {
    if (!isAdmin()) return alert('Nur Admins dürfen Testdaten löschen.')

    const testMembers = getTestMembers()

    if (testMembers.length === 0 && getTestInvoices().length === 0 && getTestCashEntries().length === 0) {
      alert('Keine Testdaten vorhanden.')
      return
    }

    const confirmed = window.confirm(
      `Alle Testdaten löschen?\n\nTestmitglieder: ${testMembers.length}\nTest-Rechnungen: ${getTestInvoices().length}\nTest-Kassa-Einträge: ${getTestCashEntries().length}\n\nDieser Vorgang ist endgültig.`
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
    alert('Alle Testdaten wurden gelöscht.')
  }

  function getPendingMemberChangeRequests() {
    return memberChangeRequests.filter((request) => request.status === 'offen')
  }

  function getMyMemberChangeRequests() {
    if (!currentMember) return []
    return memberChangeRequests.filter((request) => request.member_id === currentMember.id)
  }

  async function submitMemberChangeRequest() {
    if (!currentMember) return alert('Kein Mitglied mit deinem Login verknüpft.')

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
      alert('Es wurden keine Änderungen erkannt.')
      return
    }

    const confirmed = window.confirm(
      `Änderungsantrag einreichen?\n\nGeänderte Felder: ${changedFields.join(', ')}\n\nEin Vorstandsmitglied muss die Änderung bestätigen.`
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
      `Änderungsantrag genehmigen?\n\nMitglied: ${member ? `${member.first_name || ''} ${member.last_name || ''}` : request.member_id}`
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

  function getCommercialDashboardData() {
    return buildCommercialDashboardData({
      sponsors,
      sponsorContracts,
      merchSales,
      merchSaleItems,
      merchVariants,
      merchItems,
      selectedCashYear,
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
    setInvoiceCustomerCountry(customer.country || 'Österreich')
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
    setCustomerCountry('Österreich')
    setCustomerNotes('')
  }

  function editInvoiceCustomer(customer) {
    if (!canManageCash() && !isAdmin()) return alert('Keine Berechtigung für Kunden.')

    setEditingCustomerId(customer.id)
    setCustomerName(customer.name || '')
    setCustomerEmail(customer.email || '')
    setCustomerStreet(customer.street || '')
    setCustomerHouseNumber(customer.house_number || '')
    setCustomerAddressAddition(customer.address_addition || '')
    setCustomerPostalCode(customer.postal_code || '')
    setCustomerCity(customer.city || '')
    setCustomerCountry(customer.country || 'Österreich')
    setCustomerNotes(customer.notes || '')
  }

  async function saveInvoiceCustomer() {
    if (!canManageCash() && !isAdmin()) return alert('Keine Berechtigung für Kunden.')

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
      country: customerCountry.trim() || 'Österreich',
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
    if (!isAdmin()) return alert('Nur Admins dürfen Kunden löschen.')

    const used = invoices.some((invoice) => invoice.customer_id === customer.id)

    if (used) {
      alert('Dieser Kunde wird bereits in Rechnungen verwendet und kann nicht gelöscht werden.')
      return
    }

    const confirmed = window.confirm(`Kunde wirklich löschen?\n\n${customer.name}`)

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
    setInvoiceCustomerCountry('Österreich')
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
    setNewEventStartsAt('')
    setNewEventEndsAt('')
    setNewEventCategory('treffen')
    setNewEventLocation('')
    setNewEventMeetingPoint('')
    setNewEventNotes('')
    setNewEventIsPublic(false)
    setNewEventMembersOnly(false)
    setNewEventInternalOnly(false)
    setNewEventPublicStatus('draft')
    setNewEventPublicTitle('')
    setNewEventShortDescription('')
    setNewEventPublicDescription('')
    setNewEventPublicDescriptionHtml('')
    setNewEventRegistrationEnabled(false)
    setNewEventAllowWaitlist(true)
    setNewEventContactPerson('')
    setNewEventContactName('')
    setNewEventContactEmail('')
    setNewEventContactPhone('')
    setNewEventRegistrationDeadline('')
    setNewEventMaxParticipants('')
    setNewEventInternalNotes('')
    setNewEventPublicSortOrder('0')
    setNewEventPublicPublishedAt('')
    setNewEventPublicImagePath('')
    setNewEventPublicImageUrl('')
    setNewEventImageUrl('')
    setNewEventPublicRegistrationUrl('')
    setNewEventPublicExternalUrl('')
  }

  function editEvent(event) {
    if (!canManageEvents()) return alert('Keine Berechtigung für Event-Verwaltung.')

    setEditingEventId(event.id)
    setNewEventName(event.name || '')
    setNewEventDate(event.event_date || getTodayDate())
    setNewEventStartsAt(formatDateTimeLocal(event.starts_at))
    setNewEventEndsAt(formatDateTimeLocal(event.ends_at))
    setNewEventCategory(event.event_category || 'treffen')
    setNewEventLocation(event.location || '')
    setNewEventMeetingPoint(event.meeting_point || '')
    setNewEventNotes(event.notes || '')
    setNewEventIsPublic(Boolean(event.is_public))
    setNewEventMembersOnly(Boolean(event.members_only))
    setNewEventInternalOnly(Boolean(event.internal_only))
    setNewEventPublicStatus(event.public_status || 'draft')
    setNewEventPublicTitle(event.public_title || '')
    setNewEventShortDescription(event.short_description || '')
    setNewEventPublicDescription(event.public_description || '')
    setNewEventPublicDescriptionHtml(event.public_description_html || '')
    setNewEventRegistrationEnabled(Boolean(event.registration_enabled))
    setNewEventAllowWaitlist(event.allow_waitlist !== false)
    setNewEventContactPerson(event.contact_person || '')
    setNewEventContactName(event.contact_name || '')
    setNewEventContactEmail(event.contact_email || '')
    setNewEventContactPhone(event.contact_phone || '')
    setNewEventRegistrationDeadline(formatDateTimeLocal(event.registration_deadline))
    setNewEventMaxParticipants(event.max_participants ? String(event.max_participants) : '')
    setNewEventInternalNotes(event.internal_notes || '')
    setNewEventPublicSortOrder(String(event.public_sort_order ?? 0))
    setNewEventPublicPublishedAt(formatDateTimeLocal(event.public_published_at))
    setNewEventPublicImagePath(event.public_image_path || '')
    setNewEventPublicImageUrl(event.public_image_url || '')
    setNewEventImageUrl(event.event_image_url || '')
    setNewEventPublicRegistrationUrl(event.public_registration_url || '')
    setNewEventPublicExternalUrl(event.public_external_url || '')

    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function getEventPublicPayload() {
    const publicSortOrder = Number.parseInt(newEventPublicSortOrder, 10)
    const maxParticipants = Number.parseInt(newEventMaxParticipants, 10)
    const publicTitle = newEventPublicTitle.trim() || newEventName.trim()
    const publicDescription = newEventPublicDescription.trim() || null
    const publicDescriptionHtml = normalizeRichTextHtml(newEventPublicDescriptionHtml) || null
    const startsAt = newEventStartsAt ? new Date(newEventStartsAt).toISOString() : null
    const eventDate = startsAt ? startsAt.slice(0, 10) : (newEventDate || getTodayDate())

    return {
      is_public: newEventIsPublic,
      members_only: newEventMembersOnly,
      internal_only: newEventInternalOnly,
      public_status: newEventPublicStatus,
      title: newEventName.trim(),
      public_title: publicTitle || null,
      short_description: newEventShortDescription.trim() || null,
      description: publicDescription,
      public_description: publicDescription,
      public_description_html: publicDescriptionHtml,
      starts_at: startsAt,
      ends_at: newEventEndsAt ? new Date(newEventEndsAt).toISOString() : null,
      meeting_point: newEventMeetingPoint.trim() || null,
      registration_enabled: newEventRegistrationEnabled,
      allow_waitlist: newEventAllowWaitlist,
      contact_person: newEventContactPerson.trim() || null,
      contact_name: newEventContactName.trim() || null,
      contact_email: newEventContactEmail.trim() || null,
      contact_phone: newEventContactPhone.trim() || null,
      registration_deadline: newEventRegistrationDeadline ? new Date(newEventRegistrationDeadline).toISOString() : null,
      max_participants: Number.isNaN(maxParticipants) ? null : Math.max(1, maxParticipants),
      internal_notes: newEventInternalNotes.trim() || null,
      public_sort_order: Number.isNaN(publicSortOrder) ? 0 : Math.max(0, publicSortOrder),
      public_published_at: newEventPublicPublishedAt ? new Date(newEventPublicPublishedAt).toISOString() : null,
      public_image_path: newEventPublicImagePath.trim() || null,
      public_image_url: newEventPublicImageUrl.trim() || null,
      event_image_url: newEventImageUrl.trim() || null,
      public_registration_url: newEventPublicRegistrationUrl.trim() || null,
      public_external_url: newEventPublicExternalUrl.trim() || null,
      event_date: eventDate,
    }
  }

  async function createEvent() {
    if (!canManageEvents()) return alert('Keine Berechtigung für Event-Verwaltung.')

    if (!newEventName.trim()) {
      alert('Bitte einen Eventnamen eingeben.')
      return
    }

    if (
      newEventIsPublic
      && newEventPublicStatus === 'published'
      && !newEventPublicDescription.trim()
      && !normalizeRichTextHtml(newEventPublicDescriptionHtml)
    ) {
      alert('Bitte für veröffentlichte Homepage-Events eine Beschreibung eingeben.')
      return
    }

    await createEventRecord({
      payload: {
        name: newEventName.trim(),
        event_date: newEventDate || getTodayDate(),
        event_category: newEventCategory || 'treffen',
        location: newEventLocation.trim() || null,
        notes: newEventNotes.trim() || null,
        ...getEventPublicPayload(),
      },
      createAuditLog,
      loadEvents,
      resetEventForm,
      setSelectedEventId,
      setEventName,
    })
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

    if (
      newEventIsPublic
      && newEventPublicStatus === 'published'
      && !newEventPublicDescription.trim()
      && !normalizeRichTextHtml(newEventPublicDescriptionHtml)
    ) {
      alert('Bitte für veröffentlichte Homepage-Events eine Beschreibung eingeben.')
      return
    }

    await updateEventRecord({
      editingEventId,
      payload: {
        name: newEventName.trim(),
        event_date: newEventDate || getTodayDate(),
        event_category: newEventCategory || 'treffen',
        location: newEventLocation.trim() || null,
        notes: newEventNotes.trim() || null,
        ...getEventPublicPayload(),
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
    if (!canManageEvents()) return alert('Keine Berechtigung für Event-Verwaltung.')

    await updateEventStatusRecord({
      eventId,
      status,
      events,
      createAuditLog,
      loadEvents,
    })
  }

  async function deleteEvent(event) {
    if (!isAdmin()) return alert('Nur Admins dürfen Events löschen.')

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
    if (!canManageMembers()) return alert('Keine Berechtigung für Mitgliederverwaltung.')

    await changeMemberStatusRecord({
      id,
      status,
      members,
      createAuditLog,
      loadMembers,
    })
  }

  async function markFeePaid(fee, paymentMethod = 'bar') {
    if (!canManageCash()) return alert('Keine Berechtigung für Kassa.')

    await saveMembershipFee({
      fee,
      paymentMethod,
      members,
      createAuditLog,
      loadAll,
    })
  }

  async function markFeeOpen(fee) {
    if (!canManageCash()) return alert('Keine Berechtigung für Kassa.')

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
    return buildCashEntrySignedAmount(entry)
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

    await updateCashEntryRecord({
      editingCashId,
      payload: {
        type: cashType,
        category: cashCategory,
        event_id: cashEventId || null,
        payment_method: cashPaymentMethod,
        amount: Math.abs(Number(cashAmount)),
        description: cashDescription,
      },
      cashEntries,
      createAuditLog,
      loadCashEntries,
      resetCashForm,
    })
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
      amount: Math.abs(Number(cashAmount)),
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

    await addCashEntryRecord({
      baseEntry,
      receiptUrl,
      createAuditLog,
      loadCashEntries,
      resetCashForm,
    })
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
    setDocumentShowInMemberArea(false)
    setDocumentMembersOnly(true)
    setDocumentMemberAreaCategory('')
    setDocumentSortOrder('0')
    setDocumentIsActive(true)
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

    const sortOrder = Number.parseInt(documentSortOrder, 10)

    if (Number.isNaN(sortOrder) || sortOrder < 0) {
      alert('Sortierung muss eine positive ganze Zahl sein.')
      return
    }

    const { error } = await uploadDocumentRecord({
      documentTitle,
      documentCategory,
      documentDate,
      documentDescription,
      documentFile,
      documentShowInMemberArea,
      documentMembersOnly,
      documentMemberAreaCategory: documentMemberAreaCategory.trim(),
      documentSortOrder: sortOrder,
      documentIsActive,
      createAuditLog,
      loadDocuments,
      resetDocumentForm,
    })

    if (error) alert(error.message)
  }

  async function saveDocumentMemberAreaSettings(document, settings) {
    if (!canManageMembers() && !isAdmin()) {
      alert('Keine Berechtigung fuer Dokument-Einstellungen.')
      return
    }

    const { error } = await updateDocumentMemberAreaSettings({
      documentId: document.id,
      settings,
      createAuditLog,
      loadDocuments,
    })

    if (error) alert(error.message)
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
  const pressePathMatch = window.location.pathname.match(/^\/presse(?:\/([^/]+))?\/?$/)

  if (pressePathMatch) {
    return <PublicPressPage detailIdentifier={pressePathMatch[1] || ''} />
  }

  if (!user) {
    return (
      <main style={{ ...pageStyle, padding: 30, fontFamily: 'Arial, Helvetica, sans-serif', maxWidth: 760, margin: '0 auto', fontSize: 16, lineHeight: 1.55 }}>
        <h1 style={headingStyle}>Styrian Bastards Login</h1>

        <div style={{ maxWidth: 520, margin: '0 auto' }}>
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
        </div>

        <PublicSponsors />
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
        {navigationItems
          .filter(([pageKey]) => pageKey !== 'purchase' || canManagePurchase())
          .map(([pageKey, label]) => (
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
            Hinweis schließen
          </button>
        </div>
      )}

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

      {activePage === 'fees' && (
        <MembershipFeesPage
          canAccess={isAdmin()}
          members={members}
          membershipFeePeriods={membershipFeePeriods}
          membershipFeeItems={membershipFeeItems}
          yearFilter={membershipFeeYearFilter}
          setYearFilter={setMembershipFeeYearFilter}
          statusFilter={membershipFeeStatusFilter}
          setStatusFilter={setMembershipFeeStatusFilter}
          memberTypeFilter={membershipFeeMemberTypeFilter}
          setMemberTypeFilter={setMembershipFeeMemberTypeFilter}
          paymentFilter={membershipFeePaymentFilter}
          setPaymentFilter={setMembershipFeePaymentFilter}
          createYear={membershipFeeCreateYear}
          setCreateYear={setMembershipFeeCreateYear}
          createTitle={membershipFeeCreateTitle}
          setCreateTitle={setMembershipFeeCreateTitle}
          createDueDate={membershipFeeCreateDueDate}
          setCreateDueDate={setMembershipFeeCreateDueDate}
          createCashEntryOnPayment={membershipFeeCreateCashEntry}
          setCreateCashEntryOnPayment={setMembershipFeeCreateCashEntry}
          paymentMethod={membershipFeePaymentMethod}
          setPaymentMethod={setMembershipFeePaymentMethod}
          generationResult={membershipFeeGenerationResult}
          generationLoading={membershipFeeGenerationLoading}
          createMembershipFeesForYear={createMembershipFeesForYear}
          sendMembershipFeeNotification={sendMembershipFeeNotificationAction}
          markMembershipFeeItemPaid={markMembershipFeeItemPaidAction}
          reopenMembershipFeeItem={reopenMembershipFeeItemAction}
          deleteMembershipFeeItem={deleteMembershipFeeItemAction}
          notificationLoadingId={membershipFeeActionLoadingId}
          setNotificationLoadingId={setMembershipFeeActionLoadingId}
        />
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
          newEventStartsAt={newEventStartsAt}
          setNewEventStartsAt={setNewEventStartsAt}
          newEventEndsAt={newEventEndsAt}
          setNewEventEndsAt={setNewEventEndsAt}
          newEventCategory={newEventCategory}
          setNewEventCategory={setNewEventCategory}
          newEventLocation={newEventLocation}
          setNewEventLocation={setNewEventLocation}
          newEventMeetingPoint={newEventMeetingPoint}
          setNewEventMeetingPoint={setNewEventMeetingPoint}
          newEventNotes={newEventNotes}
          setNewEventNotes={setNewEventNotes}
          newEventIsPublic={newEventIsPublic}
          setNewEventIsPublic={setNewEventIsPublic}
          newEventMembersOnly={newEventMembersOnly}
          setNewEventMembersOnly={setNewEventMembersOnly}
          newEventInternalOnly={newEventInternalOnly}
          setNewEventInternalOnly={setNewEventInternalOnly}
          newEventPublicStatus={newEventPublicStatus}
          setNewEventPublicStatus={setNewEventPublicStatus}
          newEventPublicTitle={newEventPublicTitle}
          setNewEventPublicTitle={setNewEventPublicTitle}
          newEventShortDescription={newEventShortDescription}
          setNewEventShortDescription={setNewEventShortDescription}
          newEventPublicDescription={newEventPublicDescription}
          setNewEventPublicDescription={setNewEventPublicDescription}
          newEventPublicDescriptionHtml={newEventPublicDescriptionHtml}
          setNewEventPublicDescriptionHtml={setNewEventPublicDescriptionHtml}
          newEventRegistrationEnabled={newEventRegistrationEnabled}
          setNewEventRegistrationEnabled={setNewEventRegistrationEnabled}
          newEventAllowWaitlist={newEventAllowWaitlist}
          setNewEventAllowWaitlist={setNewEventAllowWaitlist}
          newEventContactPerson={newEventContactPerson}
          setNewEventContactPerson={setNewEventContactPerson}
          newEventContactName={newEventContactName}
          setNewEventContactName={setNewEventContactName}
          newEventContactEmail={newEventContactEmail}
          setNewEventContactEmail={setNewEventContactEmail}
          newEventContactPhone={newEventContactPhone}
          setNewEventContactPhone={setNewEventContactPhone}
          newEventRegistrationDeadline={newEventRegistrationDeadline}
          setNewEventRegistrationDeadline={setNewEventRegistrationDeadline}
          newEventMaxParticipants={newEventMaxParticipants}
          setNewEventMaxParticipants={setNewEventMaxParticipants}
          newEventInternalNotes={newEventInternalNotes}
          setNewEventInternalNotes={setNewEventInternalNotes}
          newEventPublicSortOrder={newEventPublicSortOrder}
          setNewEventPublicSortOrder={setNewEventPublicSortOrder}
          newEventPublicPublishedAt={newEventPublicPublishedAt}
          setNewEventPublicPublishedAt={setNewEventPublicPublishedAt}
          newEventPublicImagePath={newEventPublicImagePath}
          setNewEventPublicImagePath={setNewEventPublicImagePath}
          newEventPublicImageUrl={newEventPublicImageUrl}
          setNewEventPublicImageUrl={setNewEventPublicImageUrl}
          newEventImageUrl={newEventImageUrl}
          setNewEventImageUrl={setNewEventImageUrl}
          newEventPublicRegistrationUrl={newEventPublicRegistrationUrl}
          setNewEventPublicRegistrationUrl={setNewEventPublicRegistrationUrl}
          newEventPublicExternalUrl={newEventPublicExternalUrl}
          setNewEventPublicExternalUrl={setNewEventPublicExternalUrl}
          createEvent={createEvent}
          updateEvent={updateEvent}
          resetEventForm={resetEventForm}
          loadEvents={loadEvents}
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
          cockpitTasks={getDashboardCockpitTasks()}
          onNavigate={setActivePage}
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
          commercialData={getCommercialDashboardData()}
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
            documentShowInMemberArea,
            setDocumentShowInMemberArea,
            documentMembersOnly,
            setDocumentMembersOnly,
            documentMemberAreaCategory,
            setDocumentMemberAreaCategory,
            documentSortOrder,
            setDocumentSortOrder,
            documentIsActive,
            setDocumentIsActive,
            uploadDocument,
            resetDocumentForm,
          }}
          listProps={{
            documents,
            isAdmin,
            canManageDocuments: () => canManageMembers() || isAdmin(),
            openDocument,
            deleteDocument,
            saveDocumentMemberAreaSettings,
          }}
        />
      )}

      {activePage === 'memberArea' && (
        <MemberAreaPage canManageMemberArea={isAdmin} />
      )}

      {activePage === 'media' && (
        <MediaPage
          mediaItems={mediaItems}
          canManageMedia={canManageMedia}
          mediaEditingId={mediaEditingId}
          mediaTitle={mediaTitle}
          setMediaTitle={setMediaTitle}
          mediaSlug={mediaSlug}
          setMediaSlug={setMediaSlug}
          mediaCategory={mediaCategory}
          setMediaCategory={setMediaCategory}
          mediaSourceName={mediaSourceName}
          setMediaSourceName={setMediaSourceName}
          mediaSummary={mediaSummary}
          setMediaSummary={setMediaSummary}
          mediaContent={mediaContent}
          setMediaContent={setMediaContent}
          mediaContentHtml={mediaContentHtml}
          setMediaContentHtml={setMediaContentHtml}
          mediaExternalUrl={mediaExternalUrl}
          setMediaExternalUrl={setMediaExternalUrl}
          mediaAudioUrl={mediaAudioUrl}
          setMediaAudioUrl={setMediaAudioUrl}
          mediaImagePath={mediaImagePath}
          setMediaImagePath={setMediaImagePath}
          mediaImageAlt={mediaImageAlt}
          setMediaImageAlt={setMediaImageAlt}
          mediaPublicationDate={mediaPublicationDate}
          setMediaPublicationDate={setMediaPublicationDate}
          mediaPublishedAt={mediaPublishedAt}
          setMediaPublishedAt={setMediaPublishedAt}
          mediaStatus={mediaStatus}
          setMediaStatus={setMediaStatus}
          mediaIsPublic={mediaIsPublic}
          setMediaIsPublic={setMediaIsPublic}
          mediaMembersOnly={mediaMembersOnly}
          setMediaMembersOnly={setMediaMembersOnly}
          mediaInternalOnly={mediaInternalOnly}
          setMediaInternalOnly={setMediaInternalOnly}
          mediaIsFeatured={mediaIsFeatured}
          setMediaIsFeatured={setMediaIsFeatured}
          mediaPublicSortOrder={mediaPublicSortOrder}
          setMediaPublicSortOrder={setMediaPublicSortOrder}
          mediaInternalNotes={mediaInternalNotes}
          setMediaInternalNotes={setMediaInternalNotes}
          mediaSaving={mediaSaving}
          mediaDeletingId={mediaDeletingId}
          saveMediaItem={saveMediaItem}
          resetMediaForm={resetMediaForm}
          editMediaItem={editMediaItem}
          deleteMediaItem={deleteMediaItem}
        />
      )}

      {activePage === 'sponsors' && (
        <SponsorsPage
          sponsors={sponsors}
          sponsorContracts={sponsorContracts}
          canManageSponsors={canManageSponsors}
          sponsorEditingId={sponsorEditingId}
          sponsorName={sponsorName}
          setSponsorName={setSponsorName}
          sponsorContactPerson={sponsorContactPerson}
          setSponsorContactPerson={setSponsorContactPerson}
          sponsorEmail={sponsorEmail}
          setSponsorEmail={setSponsorEmail}
          sponsorPhone={sponsorPhone}
          setSponsorPhone={setSponsorPhone}
          sponsorWebsite={sponsorWebsite}
          setSponsorWebsite={setSponsorWebsite}
          sponsorLogoPath={sponsorLogoPath}
          setSponsorLogoPath={setSponsorLogoPath}
          sponsorLogoFile={sponsorLogoFile}
          setSponsorLogoFile={setSponsorLogoFile}
          sponsorLogoAlt={sponsorLogoAlt}
          setSponsorLogoAlt={setSponsorLogoAlt}
          sponsorIsPublic={sponsorIsPublic}
          setSponsorIsPublic={setSponsorIsPublic}
          sponsorLevel={sponsorLevel}
          setSponsorLevel={setSponsorLevel}
          sponsorPublicSortOrder={sponsorPublicSortOrder}
          setSponsorPublicSortOrder={setSponsorPublicSortOrder}
          sponsorPublicDescription={sponsorPublicDescription}
          setSponsorPublicDescription={setSponsorPublicDescription}
          sponsorPublicDescriptionHtml={sponsorPublicDescriptionHtml}
          setSponsorPublicDescriptionHtml={setSponsorPublicDescriptionHtml}
          sponsorStatus={sponsorStatus}
          setSponsorStatus={setSponsorStatus}
          sponsorNotes={sponsorNotes}
          setSponsorNotes={setSponsorNotes}
          sponsorSaving={sponsorSaving}
          sponsorDeletingId={sponsorDeletingId}
          saveSponsor={saveSponsor}
          resetSponsorForm={resetSponsorForm}
          editSponsor={editSponsor}
          deleteSponsor={deleteSponsor}
          sponsorContractEditingId={sponsorContractEditingId}
          contractSponsorId={contractSponsorId}
          setContractSponsorId={setContractSponsorId}
          contractTitle={contractTitle}
          setContractTitle={setContractTitle}
          contractLevel={contractLevel}
          setContractLevel={setContractLevel}
          contractStatus={contractStatus}
          setContractStatus={setContractStatus}
          contractStartsOn={contractStartsOn}
          setContractStartsOn={setContractStartsOn}
          contractEndsOn={contractEndsOn}
          setContractEndsOn={setContractEndsOn}
          contractAmount={contractAmount}
          setContractAmount={setContractAmount}
          contractPaymentStatus={contractPaymentStatus}
          setContractPaymentStatus={setContractPaymentStatus}
          contractBillingCycle={contractBillingCycle}
          setContractBillingCycle={setContractBillingCycle}
          contractBenefits={contractBenefits}
          setContractBenefits={setContractBenefits}
          contractNotes={contractNotes}
          setContractNotes={setContractNotes}
          sponsorContractSaving={sponsorContractSaving}
          sponsorContractDeletingId={sponsorContractDeletingId}
          saveSponsorContract={saveSponsorContract}
          resetSponsorContractForm={resetSponsorContractForm}
          editSponsorContract={editSponsorContract}
          deleteSponsorContract={deleteSponsorContract}
        />
      )}

      {activePage === 'merch' && (
        <MerchPage
          merchItems={merchItems}
          merchVariants={merchVariants}
          merchSales={merchSales}
          merchSaleItems={merchSaleItems}
          shopOrders={shopOrders}
          shopOrderItems={shopOrderItems}
          invoices={invoices}
          invoiceCustomers={invoiceCustomers}
          members={members}
          events={events}
          canManageMerch={canManageMerch}
          merchItemEditingId={merchItemEditingId}
          merchItemNumber={merchItemNumber}
          setMerchItemNumber={setMerchItemNumber}
          merchItemName={merchItemName}
          setMerchItemName={setMerchItemName}
          merchItemCategory={merchItemCategory}
          setMerchItemCategory={setMerchItemCategory}
          merchItemImagePath={merchItemImagePath}
          setMerchItemImagePath={setMerchItemImagePath}
          merchItemStatus={merchItemStatus}
          setMerchItemStatus={setMerchItemStatus}
          merchItemBasePrice={merchItemBasePrice}
          setMerchItemBasePrice={setMerchItemBasePrice}
          merchItemPurchasePrice={merchItemPurchasePrice}
          setMerchItemPurchasePrice={setMerchItemPurchasePrice}
          merchItemMemberPrice={merchItemMemberPrice}
          setMerchItemMemberPrice={setMerchItemMemberPrice}
          merchItemTaxRate={merchItemTaxRate}
          setMerchItemTaxRate={setMerchItemTaxRate}
          merchItemSkuPrefix={merchItemSkuPrefix}
          setMerchItemSkuPrefix={setMerchItemSkuPrefix}
          merchItemShortDescription={merchItemShortDescription}
          setMerchItemShortDescription={setMerchItemShortDescription}
          merchItemDescription={merchItemDescription}
          setMerchItemDescription={setMerchItemDescription}
          merchItemStorageLocation={merchItemStorageLocation}
          setMerchItemStorageLocation={setMerchItemStorageLocation}
          merchItemIsPreorder={merchItemIsPreorder}
          setMerchItemIsPreorder={setMerchItemIsPreorder}
          merchItemIsLimited={merchItemIsLimited}
          setMerchItemIsLimited={setMerchItemIsLimited}
          merchItemIsBestseller={merchItemIsBestseller}
          setMerchItemIsBestseller={setMerchItemIsBestseller}
          merchItemIsNew={merchItemIsNew}
          setMerchItemIsNew={setMerchItemIsNew}
          merchItemIsClearance={merchItemIsClearance}
          setMerchItemIsClearance={setMerchItemIsClearance}
          merchItemPickupAvailable={merchItemPickupAvailable}
          setMerchItemPickupAvailable={setMerchItemPickupAvailable}
          merchItemShippingAvailable={merchItemShippingAvailable}
          setMerchItemShippingAvailable={setMerchItemShippingAvailable}
          merchItemShippingCost={merchItemShippingCost}
          setMerchItemShippingCost={setMerchItemShippingCost}
          merchItemIsPublic={merchItemIsPublic}
          setMerchItemIsPublic={setMerchItemIsPublic}
          merchItemPublicSortOrder={merchItemPublicSortOrder}
          setMerchItemPublicSortOrder={setMerchItemPublicSortOrder}
          merchItemPublicTitle={merchItemPublicTitle}
          setMerchItemPublicTitle={setMerchItemPublicTitle}
          merchItemPublicDescription={merchItemPublicDescription}
          setMerchItemPublicDescription={setMerchItemPublicDescription}
          merchItemPublicDescriptionHtml={merchItemPublicDescriptionHtml}
          setMerchItemPublicDescriptionHtml={setMerchItemPublicDescriptionHtml}
          merchItemPublicImageAlt={merchItemPublicImageAlt}
          setMerchItemPublicImageAlt={setMerchItemPublicImageAlt}
          merchItemPublicCtaLabel={merchItemPublicCtaLabel}
          setMerchItemPublicCtaLabel={setMerchItemPublicCtaLabel}
          merchItemPublicCtaUrl={merchItemPublicCtaUrl}
          setMerchItemPublicCtaUrl={setMerchItemPublicCtaUrl}
          merchItemSaving={merchItemSaving}
          merchItemDeletingId={merchItemDeletingId}
          saveMerchItem={saveMerchItem}
          resetMerchItemForm={resetMerchItemForm}
          editMerchItem={editMerchItem}
          deleteMerchItem={deleteMerchItem}
          merchVariantEditingId={merchVariantEditingId}
          merchVariantItemId={merchVariantItemId}
          setMerchVariantItemId={setMerchVariantItemId}
          merchVariantSku={merchVariantSku}
          setMerchVariantSku={setMerchVariantSku}
          merchVariantName={merchVariantName}
          setMerchVariantName={setMerchVariantName}
          merchVariantSize={merchVariantSize}
          setMerchVariantSize={setMerchVariantSize}
          merchVariantColor={merchVariantColor}
          setMerchVariantColor={setMerchVariantColor}
          merchVariantPrice={merchVariantPrice}
          setMerchVariantPrice={setMerchVariantPrice}
          merchVariantStock={merchVariantStock}
          setMerchVariantStock={setMerchVariantStock}
          merchVariantReorderLevel={merchVariantReorderLevel}
          setMerchVariantReorderLevel={setMerchVariantReorderLevel}
          merchVariantStatus={merchVariantStatus}
          setMerchVariantStatus={setMerchVariantStatus}
          merchVariantIsPublic={merchVariantIsPublic}
          setMerchVariantIsPublic={setMerchVariantIsPublic}
          merchVariantPublicSortOrder={merchVariantPublicSortOrder}
          setMerchVariantPublicSortOrder={setMerchVariantPublicSortOrder}
          merchVariantSaving={merchVariantSaving}
          merchVariantDeletingId={merchVariantDeletingId}
          saveMerchVariant={saveMerchVariant}
          resetMerchVariantForm={resetMerchVariantForm}
          editMerchVariant={editMerchVariant}
          deleteMerchVariant={deleteMerchVariant}
          merchSaleVariantId={merchSaleVariantId}
          setMerchSaleVariantId={setMerchSaleVariantId}
          merchSaleQuantity={merchSaleQuantity}
          setMerchSaleQuantity={setMerchSaleQuantity}
          merchSaleDiscount={merchSaleDiscount}
          setMerchSaleDiscount={setMerchSaleDiscount}
          merchSaleMemberId={merchSaleMemberId}
          setMerchSaleMemberId={setMerchSaleMemberId}
          merchSaleBuyerName={merchSaleBuyerName}
          setMerchSaleBuyerName={setMerchSaleBuyerName}
          merchSaleEventId={merchSaleEventId}
          setMerchSaleEventId={setMerchSaleEventId}
          merchSalePaymentMethod={merchSalePaymentMethod}
          setMerchSalePaymentMethod={setMerchSalePaymentMethod}
          merchSaleCreateCashEntry={merchSaleCreateCashEntry}
          setMerchSaleCreateCashEntry={setMerchSaleCreateCashEntry}
          merchSaleCreateInvoice={merchSaleCreateInvoice}
          setMerchSaleCreateInvoice={setMerchSaleCreateInvoice}
          merchSaleInvoiceCustomerId={merchSaleInvoiceCustomerId}
          setMerchSaleInvoiceCustomerId={setMerchSaleInvoiceCustomerId}
          merchSaleInvoiceEmail={merchSaleInvoiceEmail}
          setMerchSaleInvoiceEmail={setMerchSaleInvoiceEmail}
          merchSaleInvoiceStatus={merchSaleInvoiceStatus}
          setMerchSaleInvoiceStatus={setMerchSaleInvoiceStatus}
          merchSaleSendInvoiceEmail={merchSaleSendInvoiceEmail}
          setMerchSaleSendInvoiceEmail={setMerchSaleSendInvoiceEmail}
          merchSaleSaving={merchSaleSaving}
          merchSaleCancellingId={merchSaleCancellingId}
          shopOrderEditingId={shopOrderEditingId}
          shopOrderVariantId={shopOrderVariantId}
          setShopOrderVariantId={setShopOrderVariantId}
          shopOrderQuantity={shopOrderQuantity}
          setShopOrderQuantity={setShopOrderQuantity}
          shopOrderDiscount={shopOrderDiscount}
          setShopOrderDiscount={setShopOrderDiscount}
          shopOrderShippingCost={shopOrderShippingCost}
          setShopOrderShippingCost={setShopOrderShippingCost}
          shopOrderMemberId={shopOrderMemberId}
          setShopOrderMemberId={setShopOrderMemberId}
          shopOrderBuyerName={shopOrderBuyerName}
          setShopOrderBuyerName={setShopOrderBuyerName}
          shopOrderBuyerEmail={shopOrderBuyerEmail}
          setShopOrderBuyerEmail={setShopOrderBuyerEmail}
          shopOrderBuyerPhone={shopOrderBuyerPhone}
          setShopOrderBuyerPhone={setShopOrderBuyerPhone}
          shopOrderStatus={shopOrderStatus}
          setShopOrderStatus={setShopOrderStatus}
          shopOrderPaymentStatus={shopOrderPaymentStatus}
          setShopOrderPaymentStatus={setShopOrderPaymentStatus}
          shopOrderPaymentMethod={shopOrderPaymentMethod}
          setShopOrderPaymentMethod={setShopOrderPaymentMethod}
          shopOrderDeliveryMethod={shopOrderDeliveryMethod}
          setShopOrderDeliveryMethod={setShopOrderDeliveryMethod}
          shopOrderNotes={shopOrderNotes}
          setShopOrderNotes={setShopOrderNotes}
          shopOrderInternalNotes={shopOrderInternalNotes}
          setShopOrderInternalNotes={setShopOrderInternalNotes}
          shopOrderSaving={shopOrderSaving}
          shopOrderDeletingId={shopOrderDeletingId}
          saveMerchSale={saveMerchSale}
          saveShopOrder={saveShopOrder}
          editShopOrder={editShopOrder}
          deleteShopOrder={deleteShopOrder}
          cancelMerchSale={cancelMerchSale}
          openMerchSaleInvoice={openMerchSaleInvoice}
          sendMerchSaleInvoice={sendMerchSaleInvoice}
          resetMerchSaleForm={resetMerchSaleForm}
          resetShopOrderForm={resetShopOrderForm}
          getMerchSaleUnitPriceCents={getMerchSaleUnitPriceCents}
          getMerchSaleTotals={getMerchSaleTotals}
          getShopOrderTotals={getShopOrderTotals}
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

      {activePage === 'purchase' && (
        <section style={{
          ...sectionStyle,
          background: colors.offWhite,
          color: colors.text,
          minHeight: 400,
          overflow: 'visible',
          opacity: 1,
        }}>
          <h2 style={headingStyle}>Einkauf & Preisvergleich</h2>
          <div style={{
            ...cardStyle,
            background: colors.white,
            color: colors.text,
            borderLeft: `6px solid ${colors.red}`,
          }}>
            <strong>Einkauf & Preisvergleich Startseite</strong>
            <br />
            Die Route wurde geladen. Darunter erscheinen Dashboard, Produkte, Lieferanten, Preise und Einkaufslisten.
          </div>
          <PurchaseRouteErrorBoundary>
            <PurchasePage canManagePurchase={canManagePurchase} />
          </PurchaseRouteErrorBoundary>
        </section>
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
