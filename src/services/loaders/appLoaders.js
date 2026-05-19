import { fetchMembers } from '../repositories/membersRepository'
import { fetchMembershipFees } from '../repositories/membershipFeesRepository'
import { fetchCurrentMemberByAuthUserId } from '../repositories/currentMemberRepository'
import { fetchCashEntries, fetchCashMonthClosings } from '../repositories/cashRepository'
import { fetchAuditLogs } from '../repositories/auditLogsRepository'
import { fetchEventCheckins, fetchEvents } from '../repositories/eventsRepository'
import { fetchDocuments } from '../repositories/documentsRepository'
import { fetchInventoryItems } from '../repositories/inventoryRepository'
import { fetchInvoiceCustomers, fetchInvoiceItems, fetchInvoices } from '../repositories/invoicesRepository'
import { fetchMemberChangeRequests } from '../repositories/memberChangeRequestsRepository'
import {
  fetchMerchItems,
  fetchMerchSaleItems,
  fetchMerchSales,
  fetchMerchVariants,
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

  const loadedEvents = data || []
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

export async function loadAll({
  loadMembersFn,
  loadFeesFn,
  loadCashEntriesFn,
  loadCashMonthClosingsFn,
  loadAuditLogsFn,
  loadEventCheckinsFn,
  loadEventsFn,
  loadDocumentsFn,
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

  if (loadSponsorsFn) loaders.push(loadSponsorsFn())
  if (loadSponsorContractsFn) loaders.push(loadSponsorContractsFn())
  if (loadMerchItemsFn) loaders.push(loadMerchItemsFn())
  if (loadMerchVariantsFn) loaders.push(loadMerchVariantsFn())
  if (loadMerchSalesFn) loaders.push(loadMerchSalesFn())
  if (loadMerchSaleItemsFn) loaders.push(loadMerchSaleItemsFn())

  await Promise.all(loaders)
}
