import { supabase } from '../../lib/supabase'

export const defaultClubPaymentSettings = {
  id: 1,
  account_holder: '',
  iban: '',
  bic: '',
  bank_name: '',
  paypal_enabled: false,
  paypal_address: '',
  paypal_link: '',
  cash_enabled: true,
  default_payment_method: 'ebanking',
}

export async function fetchClubPaymentSettings() {
  const { data, error } = await supabase
    .from('club_payment_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle()

  if (error) return { error }

  return {
    data: data ? { ...defaultClubPaymentSettings, ...data } : defaultClubPaymentSettings,
    error: null,
  }
}

export async function saveClubPaymentSettings(settings) {
  const defaultPaymentMethod =
    (settings.default_payment_method === 'paypal' && !settings.paypal_enabled) ||
    (settings.default_payment_method === 'bar' && !settings.cash_enabled)
      ? 'ebanking'
      : settings.default_payment_method || 'ebanking'

  const payload = {
    id: 1,
    account_holder: settings.account_holder || null,
    iban: settings.iban || null,
    bic: settings.bic || null,
    bank_name: settings.bank_name || null,
    paypal_enabled: Boolean(settings.paypal_enabled),
    paypal_address: settings.paypal_address || null,
    paypal_link: settings.paypal_link || null,
    cash_enabled: Boolean(settings.cash_enabled),
    default_payment_method: defaultPaymentMethod,
  }

  return supabase
    .from('club_payment_settings')
    .upsert(payload, { onConflict: 'id' })
    .select()
    .single()
}
