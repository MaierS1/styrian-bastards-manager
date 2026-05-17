import { supabase } from '../../lib/supabase'

export async function fetchEvents() {
  return supabase
    .from('events')
    .select('*')
    .order('event_date', { ascending: false })
    .order('created_at', { ascending: false })
}

export async function fetchEventCheckins() {
  return supabase
    .from('event_checkins')
    .select('*')
    .order('checkin_time', { ascending: false })
}
