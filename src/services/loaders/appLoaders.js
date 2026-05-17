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

export async function loadCurrentMember({ authUserId, setCurrentMember, alertFn = alert }) {
  const { data, error } = await fetchCurrentMemberByAuthUserId(authUserId)

  if (error) {
    alertFn(error.message)
    return
  }

  setCurrentMember(data)
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
}) {
  await Promise.all([
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
  ])
}
