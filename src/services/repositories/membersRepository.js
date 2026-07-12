import { supabase } from '../../lib/supabase'

export async function fetchMembers() {
  return supabase
    .from('members')
    .select('*')
    .order('created_at', { ascending: false })
}

export async function saveMemberRecord({
  editingId,
  payload,
  members,
  createAuditLog,
  loadAll,
  getAmountByType,
  memberType,
  resetForm,
}) {
  if (editingId) {
    const oldMember = members.find((member) => member.id === editingId)
    const { error } = await supabase.from('members').update(payload).eq('id', editingId)
    if (error) return { error }
    await createAuditLog('update', 'members', editingId, oldMember, payload)
  } else {
    const { data, error } = await supabase.from('members').insert(payload).select().single()
    if (error) return { error }
    await createAuditLog('insert', 'members', data.id, null, data)

    const { error: feeError } = await supabase.from('membership_fees').insert({
      member_id: data.id,
      year: new Date().getFullYear(),
      amount: getAmountByType(memberType),
      paid: false,
      payment_method: 'bar',
    })

    if (feeError) return { error: feeError }
  }

  resetForm()
  await loadAll()
  return { ok: true }
}

export async function changeMemberStatusRecord({
  id,
  status,
  members,
  createAuditLog,
  loadMembers,
}) {
  const oldMember = members.find((member) => member.id === id)
  const { error } = await supabase.from('members').update({ status }).eq('id', id)
  if (error) return { error }
  await createAuditLog('status_change', 'members', id, oldMember, { status })
  await loadMembers()
  return { ok: true }
}

export async function markMemberAsTestRecord({
  member,
  createAuditLog,
  loadMembers,
  alertFn = alert,
}) {
  const { error } = await supabase
    .from('members')
    .update({ is_test: true })
    .eq('id', member.id)

  if (error) return { error }

  await createAuditLog('mark_test_member', 'members', member.id, member, { is_test: true })
  await loadMembers()
  alertFn('Mitglied wurde als Testmitglied markiert.')
  return { ok: true }
}

export async function deleteMemberRecord({
  member,
  editingId,
  resetForm,
  loadAll,
  alertFn = alert,
}) {
  const { error } = await supabase
    .from('members')
    .delete()
    .eq('id', member.id)

  if (error) return { error }

  if (editingId === member.id) {
    resetForm()
  }

  await loadAll()
  alertFn('Mitglied wurde gelöscht.')
  return { ok: true }
}

export async function inviteMemberUserRecord({
  member,
  selectedRole,
  getAppRoleLabel,
  loadMembers,
  loadAuditLogs,
  setInvitingMemberId,
  alertFn = alert,
}) {
  if (!member?.id) {
    alertFn('Mitglied fehlt.')
    return { blocked: true }
  }

  const email = String(member.email || '').trim()

  if (!email) {
    alertFn('Dieses Mitglied hat keine E-Mail-Adresse.')
    return { blocked: true }
  }

  const confirmed = window.confirm(
    `Benutzer einladen?\n\n${member.first_name || ''} ${member.last_name || ''}\n${email}\nRolle: ${getAppRoleLabel(selectedRole)}`
  )

  if (!confirmed) return { skipped: true }

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

    if (error) return { error }

    if (data?.error) return { error: new Error(data.error) }

    await loadMembers()
    await loadAuditLogs()

    alertFn('Einladung wurde versendet und das Mitglied wurde mit dem Auth-User verknüpft.')
    return { ok: true }
  } finally {
    setInvitingMemberId(null)
  }
}
