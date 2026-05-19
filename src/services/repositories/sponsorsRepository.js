import { supabase } from '../../lib/supabase'

export async function fetchSponsors() {
  return supabase
    .from('sponsors')
    .select('*')
    .order('name', { ascending: true })
}

export async function fetchSponsorContracts() {
  return supabase
    .from('sponsor_contracts')
    .select('*')
    .order('starts_on', { ascending: false })
    .order('created_at', { ascending: false })
}

export async function saveSponsorRecord({
  sponsorEditingId,
  payload,
  sponsors,
  createAuditLog,
  loadSponsors,
  resetSponsorForm,
  alertFn = alert,
}) {
  if (sponsorEditingId) {
    const oldSponsor = sponsors.find((sponsor) => sponsor.id === sponsorEditingId)

    const { error } = await supabase
      .from('sponsors')
      .update(payload)
      .eq('id', sponsorEditingId)

    if (error) return { error }

    await createAuditLog('update', 'sponsors', sponsorEditingId, oldSponsor, payload)
    alertFn('Sponsor wurde aktualisiert.')
  } else {
    const { data, error } = await supabase
      .from('sponsors')
      .insert(payload)
      .select()
      .single()

    if (error) return { error }

    await createAuditLog('insert', 'sponsors', data?.id, null, data)
    alertFn('Sponsor wurde angelegt.')
  }

  resetSponsorForm()
  await loadSponsors()
  return { ok: true }
}

export async function deleteSponsorRecord({
  sponsor,
  createAuditLog,
  loadSponsors,
  alertFn = alert,
}) {
  const { error } = await supabase
    .from('sponsors')
    .delete()
    .eq('id', sponsor.id)

  if (error) return { error }

  await createAuditLog('delete', 'sponsors', sponsor.id, sponsor, null)
  await loadSponsors()
  alertFn('Sponsor wurde geloscht.')

  return { ok: true }
}
