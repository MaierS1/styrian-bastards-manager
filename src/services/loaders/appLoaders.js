import { fetchMembers } from '../repositories/membersRepository'
import { fetchMembershipFees } from '../repositories/membershipFeesRepository'
import { fetchCurrentMemberByAuthUserId } from '../repositories/currentMemberRepository'
import { fetchCashEntries, fetchCashMonthClosings } from '../repositories/cashRepository'
import { fetchAuditLogs } from '../repositories/auditLogsRepository'
import { fetchEventCheckins, fetchEventRegistrationCounts, fetchEvents } from '../repositories/eventsRepository'
import { fetchDocuments } from '../repositories/documentsRepository'
import { fetchMediaItems } from '../repositories/mediaRepository'
import { fetchInventoryItems } from '../repositories/inventoryRepository'
import { fetchInvoiceCustomers, fetchInvoiceItems, fetchInvoices } from '../repositories/invoicesRepository'
import { fetchMemberChangeRequests } from '../repositories/memberChangeRequestsRepository'
import {
  fetchMerchItems,
  fetchMerchSaleItems,
  fetchMerchSales,
  fetchMerchVariants,
  fetchShopOrderItems,
  fetchShopOrders,
} from '../repositories/merchRepository'
import { fetchSponsorContracts, fetchSponsors } from '../repositories/sponsorsRepository'

export async function loadCurrentMember({ authUserId, setCurrentMember, alertFn = alert }) {
  const { data, error } = await fetchCurrentMemberByAuthUserId(authUserId)

  if (error) {
    alertFn(error.message)
    return
  }

  setCurrentMember(data)
  return data
}

export async function loadMembers({ setMembers, alertFn = alert }) {
  const { data, error } = await fetchMembers()

  if (error) return alertFn(error.message)
  setMembers(data || [])
}

export async function loadFees({ year = 2026, setFees, alertFn = alert }) {
  const { data, error } = await fetchMembershipFees(year)

  if (error) return alertFn(error.message)
  setFees(data || [])
}

export async function loadCashEntries({ setCashEntries, alertFn = alert }) {
  const { data, error } = await fetchCashEntries()

  if (error) return alertFn(error.message)
  setCashEntries(data || [])
}

export async function loadCashMonthClosings({ setCashMonthClosings, alertFn = alert }) {
  const { data, error } = await fetchCashMonthClosings()

  if (error) return alertFn(error.message)
  setCashMonthClosings(data || [])
}

export async function loadAuditLogs({ setAuditLogs }) {
  const { data, error } = await fetchAuditLogs()

  if (error) {
    console.warn(error.message)
    return
  }

  setAuditLogs(data || [])
}

export async function loadEventCheckins({ setEventCheckins, alertFn = alert }) {
  const { data, error } = await fetchEventCheckins()

  if (error) return alertFn(error.message)
  setEventCheckins(data || [])
}

export async function loadEvents({ setEvents, selectedEventId, setSelectedEventId, setEventName, alertFn = alert }) {
  const { data, error } = await fetchEvents()

  if (error) return alertFn(error.message)

  const { data: registrationRows, error: registrationError } = await fetchEventRegistrationCounts()

  if (registrationError) return alertFn(registrationError.message)

  const registrationCountsByEventId = (registrationRows || []).reduce((counts, registration) => {
    const eventCounts = counts[registration.event_id] || {
      registered: 0,
      waitlist: 0,
      cancelled: 0,
    }
    const participantCount = Number(registration.participant_count) || 0

    if (registration.status === 'registered') eventCounts.registered += participantCount
    if (registration.status === 'waitlist') eventCounts.waitlist += participantCount
    if (registration.status === 'cancelled') eventCounts.cancelled += participantCount

    counts[registration.event_id] = eventCounts
    return counts
  }, {})

  const getRegistrationStatus = (event, registeredCount) => {
    if (!event.registration_enabled) return 'disabled'

    const deadline = event.registration_deadline ? new Date(event.registration_deadline) : null
    if (deadline && !Number.isNaN(deadline.getTime()) && deadline < new Date()) return 'closed'

    if (event.max_participants && registeredCount >= event.max_participants) {
      return event.allow_waitlist ? 'waitlist' : 'full'
    }

    return 'open'
  }

  const loadedEvents = (data || []).map((event) => {
    const registrationCounts = registrationCountsByEventId[event.id] || {}
    const registeredCount = registrationCounts.registered || 0

    return {
      ...event,
      registered_count: registeredCount,
      waitlist_count: registrationCounts.waitlist || 0,
      cancelled_count: registrationCounts.cancelled || 0,
      registration_status: getRegistrationStatus(event, registeredCount),
    }
  })

  setEvents(loadedEvents)

  if (!selectedEventId && loadedEvents.length > 0) {
    setSelectedEventId(loadedEvents[0].id)
    setEventName(loadedEvents[0].name)
  }
}

export async function loadDocuments({ setDocuments, alertFn = alert }) {
  const { data, error } = await fetchDocuments()

  if (error) return alertFn(error.message)
  setDocuments(data || [])
}

export async function loadMediaItems({ setMediaItems, alertFn = alert }) {
  const { data, error } = await fetchMediaItems()

  if (error) return alertFn(error.message)
  setMediaItems(data || [])
}

export async function loadInventoryItems({ setInventoryItems }) {
  const { data, error } = await fetchInventoryItems()

  if (error) {
    console.warn(error.message)
    return
  }

  setInventoryItems(data || [])
}

export async function loadInvoices({ setInvoices }) {
  const { data, error } = await fetchInvoices()

  if (error) {
    console.warn(error.message)
    return
  }

  setInvoices(data || [])
}

export async function loadInvoiceItems({ setInvoiceItems }) {
  const { data, error } = await fetchInvoiceItems()

  if (error) {
    console.warn(error.message)
    return
  }

  setInvoiceItems(data || [])
}

export async function loadInvoiceCustomers({ setInvoiceCustomers }) {
  const { data, error } = await fetchInvoiceCustomers()

  if (error) {
    console.warn(error.message)
    return
  }

  setInvoiceCustomers(data || [])
}

export async function loadMemberChangeRequests({ setMemberChangeRequests }) {
  const { data, error } = await fetchMemberChangeRequests()

  if (error) {
    console.warn(error.message)
    return
  }

  setMemberChangeRequests(data || [])
}

export async function loadSponsors({ setSponsors }) {
  const { data, error } = await fetchSponsors()

  if (error) {
    console.warn(error.message)
    return
  }

  setSponsors(data || [])
}

export async function loadSponsorContracts({ setSponsorContracts }) {
  const { data, error } = await fetchSponsorContracts()

  if (error) {
    console.warn(error.message)
    return
  }

  setSponsorContracts(data || [])
}

export async function loadMerchItems({ setMerchItems }) {
  const { data, error } = await fetchMerchItems()

  if (error) {
    console.warn(error.message)
    return
  }

  setMerchItems(data || [])
}

export async function loadMerchVariants({ setMerchVariants }) {
  const { data, error } = await fetchMerchVariants()

  if (error) {
    console.warn(error.message)
    return
  }

  setMerchVariants(data || [])
}

export async function loadMerchSales({ setMerchSales }) {
  const { data, error } = await fetchMerchSales()

  if (error) {
    console.warn(error.message)
    return
  }

  setMerchSales(data || [])
}

export async function loadMerchSaleItems({ setMerchSaleItems }) {
  const { data, error } = await fetchMerchSaleItems()

  if (error) {
    console.warn(error.message)
    return
  }

  setMerchSaleItems(data || [])
}

export async function loadShopOrders({ setShopOrders }) {
  const { data, error } = await fetchShopOrders()

  if (error) {
    console.warn(error.message)
    return
  }

  setShopOrders(data || [])
}

export async function loadShopOrderItems({ setShopOrderItems }) {
  const { data, error } = await fetchShopOrderItems()

  if (error) {
    console.warn(error.message)
    return
  }

  setShopOrderItems(data || [])
}

export async function loadAll({
  loadMembersFn,
  loadFeesFn,
  loadCashEntriesFn,
  loadCashMonthClosingsFn,
  loadAuditLogsFn,
  loadEventCheckinsFn,
  loadEventsFn,
  loadDocumentsFn,
  loadMediaItemsFn,
  loadInventoryItemsFn,
  loadInvoicesFn,
  loadInvoiceItemsFn,
  loadMemberChangeRequestsFn,
  loadSponsorsFn,
  loadSponsorContractsFn,
  loadMerchItemsFn,
  loadMerchVariantsFn,
  loadMerchSalesFn,
  loadMerchSaleItemsFn,
  loadShopOrdersFn,
  loadShopOrderItemsFn,
}) {
  const loaders = [
    loadMembersFn(),
    loadFeesFn(),
    loadCashEntriesFn(),
    loadCashMonthClosingsFn(),
    loadAuditLogsFn(),
    loadEventCheckinsFn(),
    loadEventsFn(),
    loadDocumentsFn(),
    loadInventoryItemsFn(),
    loadInvoicesFn(),
    loadInvoiceItemsFn(),
    loadMemberChangeRequestsFn(),
  ]

  if (loadMediaItemsFn) loaders.push(loadMediaItemsFn())
  if (loadSponsorsFn) loaders.push(loadSponsorsFn())
  if (loadSponsorContractsFn) loaders.push(loadSponsorContractsFn())
  if (loadMerchItemsFn) loaders.push(loadMerchItemsFn())
  if (loadMerchVariantsFn) loaders.push(loadMerchVariantsFn())
  if (loadMerchSalesFn) loaders.push(loadMerchSalesFn())
  if (loadMerchSaleItemsFn) loaders.push(loadMerchSaleItemsFn())
  if (loadShopOrdersFn) loaders.push(loadShopOrdersFn())
  if (loadShopOrderItemsFn) loaders.push(loadShopOrderItemsFn())

  await Promise.all(loaders)
}
