import { supabase } from '../../lib/supabase'

export async function fetchMemberChangeRequests() {
  return supabase
    .from('member_change_requests')
    .select('*')
    .order('created_at', { ascending: false })
}

export async function submitMemberChangeRequestRecord({
  currentMember,
  user,
  requestedData,
  createAuditLog,
  loadMemberChangeRequests,
  alertFn = alert,
}) {
  const { error } = await supabase.from('member_change_requests').insert({
    member_id: currentMember.id,
    requested_by: user?.id || null,
    requested_data: requestedData,
    status: 'offen',
  })

  if (error) return { error }

  await createAuditLog('request_member_change', 'members', currentMember.id, currentMember, requestedData)
  await loadMemberChangeRequests()
  alertFn('Änderungsantrag wurde eingereicht.')

  return { ok: true }
}

export async function approveMemberChangeRequestRecord({
  request,
  members,
  user,
  createAuditLog,
  loadMembers,
  loadCurrentMember,
  loadMemberChangeRequests,
  alertFn = alert,
}) {
  const member = members.find((item) => item.id === request.member_id)
  const requestedData = request.requested_data || {}

  const { error: memberError } = await supabase
    .from('members')
    .update(requestedData)
    .eq('id', request.member_id)

  if (memberError) return { error: memberError }

  const { error } = await supabase
    .from('member_change_requests')
    .update({
      status: 'genehmigt',
      reviewed_by: user?.id || null,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', request.id)

  if (error) return { error }

  await createAuditLog('approve_member_change', 'members', request.member_id, member, requestedData)
  await loadMembers()
  await loadCurrentMember(user.id)
  await loadMemberChangeRequests()

  alertFn('Änderung wurde genehmigt und übernommen.')
  return { ok: true }
}

export async function rejectMemberChangeRequestRecord({
  request,
  user,
  note,
  createAuditLog,
  loadMemberChangeRequests,
  alertFn = alert,
}) {
  const { error } = await supabase
    .from('member_change_requests')
    .update({
      status: 'abgelehnt',
      reviewed_by: user?.id || null,
      reviewed_at: new Date().toISOString(),
      review_note: note || null,
    })
    .eq('id', request.id)

  if (error) return { error }

  await createAuditLog('reject_member_change', 'member_change_requests', request.id, request, { note })
  await loadMemberChangeRequests()

  alertFn('Änderungsantrag wurde abgelehnt.')
  return { ok: true }
}
