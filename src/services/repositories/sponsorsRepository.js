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
