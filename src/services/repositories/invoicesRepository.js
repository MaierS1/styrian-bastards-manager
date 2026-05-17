import { supabase } from '../../lib/supabase'

export async function fetchInvoices() {
  return supabase
    .from('invoices')
    .select('*')
    .order('issue_date', { ascending: false })
    .order('created_at', { ascending: false })
}

export async function fetchInvoiceItems() {
  return supabase
    .from('invoice_items')
    .select('*')
    .order('created_at', { ascending: true })
}

export async function fetchInvoiceCustomers() {
  return supabase
    .from('invoice_customers')
    .select('*')
    .order('name', { ascending: true })
}
