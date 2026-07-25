import { supabase } from '../../lib/supabase'
import { notifyDomainEvent } from '../notifications/domainNotificationService'

export async function fetchPublicSponsors() {
  return supabase.rpc('get_public_sponsors')
}

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
  notificationContext,
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
    await notifyDomainEvent({
      type: 'sponsor_created',
      targetId: data?.id,
      targetType: 'sponsor',
      variables: {
        sponsor_name: data?.name || payload.name,
        created_at: data?.created_at,
      },
      metadata: { sponsor_id: data?.id },
      ...notificationContext,
    })
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
  alertFn('Sponsor wurde gelöscht.')

  return { ok: true }
}

export async function saveSponsorContractRecord({
  sponsorContractEditingId,
  payload,
  sponsorContracts,
  createAuditLog,
  loadSponsorContracts,
  resetSponsorContractForm,
  notificationContext,
  alertFn = alert,
}) {
  if (sponsorContractEditingId) {
    const oldContract = sponsorContracts.find((contract) => contract.id === sponsorContractEditingId)

    const { error } = await supabase
      .from('sponsor_contracts')
      .update(payload)
      .eq('id', sponsorContractEditingId)

    if (error) return { error }

    await createAuditLog('update', 'sponsor_contracts', sponsorContractEditingId, oldContract, payload)
    if (
      oldContract
      && payload.ends_on
      && oldContract.ends_on
      && payload.ends_on > oldContract.ends_on
    ) {
      await notifyDomainEvent({
        type: 'sponsorship_renewed',
        targetId: sponsorContractEditingId,
        targetType: 'sponsor_contract',
        variables: {
          contract_title: payload.title || oldContract.title,
          updated_at: new Date().toISOString(),
        },
        metadata: { sponsor_contract_id: sponsorContractEditingId },
        ...notificationContext,
      })
    }

    if (oldContract?.payment_status !== 'paid' && payload.payment_status === 'paid') {
      await notifyDomainEvent({
        type: 'sponsorship_payment_received',
        targetId: sponsorContractEditingId,
        targetType: 'sponsor_contract',
        variables: {
          contract_title: payload.title || oldContract?.title,
          payment_status: payload.payment_status,
        },
        metadata: { sponsor_contract_id: sponsorContractEditingId },
        ...notificationContext,
      })
    }
    alertFn('Sponsor-Vertrag wurde aktualisiert.')
  } else {
    const { data, error } = await supabase
      .from('sponsor_contracts')
      .insert(payload)
      .select()
      .single()

    if (error) return { error }

    await createAuditLog('insert', 'sponsor_contracts', data?.id, null, data)
    if (data?.payment_status === 'paid') {
      await notifyDomainEvent({
        type: 'sponsorship_payment_received',
        targetId: data.id,
        targetType: 'sponsor_contract',
        variables: {
          contract_title: data.title,
          payment_status: data.payment_status,
        },
        metadata: { sponsor_contract_id: data.id },
        ...notificationContext,
      })
    }
    alertFn('Sponsor-Vertrag wurde angelegt.')
  }

  resetSponsorContractForm()
  await loadSponsorContracts()
  return { ok: true }
}

export async function deleteSponsorContractRecord({
  contract,
  createAuditLog,
  loadSponsorContracts,
  alertFn = alert,
}) {
  const { error } = await supabase
    .from('sponsor_contracts')
    .delete()
    .eq('id', contract.id)

  if (error) return { error }

  await createAuditLog('delete', 'sponsor_contracts', contract.id, contract, null)
  await loadSponsorContracts()
  alertFn('Sponsor-Vertrag wurde gelöscht.')

  return { ok: true }
}
