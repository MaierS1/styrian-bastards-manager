export function getCurrentMemberFee(currentMember, getFee) {
  if (!currentMember) return null
  return getFee(currentMember.id)
}

export function getPendingMemberChangeRequests(memberChangeRequests) {
  return memberChangeRequests.filter((request) => request.status === 'offen')
}

export function getMyMemberChangeRequests(memberChangeRequests, currentMember) {
  if (!currentMember) return []
  return memberChangeRequests.filter((request) => request.member_id === currentMember.id)
}

export function getTodayDate() {
  return new Date().toISOString().slice(0, 10)
}

export function getSelectedEvent(events, selectedEventId) {
  return events.find((event) => event.id === selectedEventId)
}

export function getActiveEventName(events, selectedEventId, eventName) {
  const selectedEvent = getSelectedEvent(events, selectedEventId)
  return selectedEvent?.name || String(eventName || '').trim()
}

export function getEventNameById(events, eventId) {
  const event = events.find((item) => item.id === eventId)
  return event ? event.name : ''
}

export function getCashEntriesForEvent(cashEntries, eventId) {
  if (!eventId) return []
  return cashEntries.filter((entry) => entry.event_id === eventId && !entry.is_cancelled)
}

export function getEventIncomeTotal(cashEntries, eventId) {
  return getCashEntriesForEvent(cashEntries, eventId)
    .filter((entry) => entry.type === 'einnahme' && !entry.is_opening && !entry.is_cancelled)
    .reduce((sum, entry) => sum + Number(entry.amount || 0), 0)
}

export function getEventExpenseTotal(cashEntries, eventId) {
  return getCashEntriesForEvent(cashEntries, eventId)
    .filter((entry) => entry.type === 'ausgabe' && !entry.is_opening && !entry.is_cancelled)
    .reduce((sum, entry) => sum + Number(entry.amount || 0), 0)
}

export function getEventBalance(cashEntries, eventId) {
  return getEventIncomeTotal(cashEntries, eventId) - getEventExpenseTotal(cashEntries, eventId)
}

export function getSelectedEventIncomeTotal(cashEntries, selectedEventId) {
  return getEventIncomeTotal(cashEntries, selectedEventId)
}

export function getSelectedEventExpenseTotal(cashEntries, selectedEventId) {
  return getEventExpenseTotal(cashEntries, selectedEventId)
}

export function getSelectedEventBalance(cashEntries, selectedEventId) {
  return getEventBalance(cashEntries, selectedEventId)
}

export function getMemberName(members, memberId) {
  const member = members.find((m) => m.id === memberId)
  return member ? `${member.first_name || ''} ${member.last_name || ''}` : 'Unbekannt'
}

export function getMemberQrValue(member, origin = window.location.origin, pathname = window.location.pathname) {
  const memberCode = member.member_number || member.id
  return `${origin}${pathname}?member=${encodeURIComponent(memberCode)}`
}

export function getMemberFromQrValue(value, members) {
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

export function getTodayCheckins(eventCheckins, getActiveEventNameFn, getTodayDateFn) {
  const today = getTodayDateFn()
  const activeEventName = getActiveEventNameFn()
  return eventCheckins.filter(
    (checkin) => checkin.checkin_date === today && checkin.event_name === activeEventName
  )
}
