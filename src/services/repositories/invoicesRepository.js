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

export async function saveInvoiceCustomerRecord({
  editingCustomerId,
  payload,
  invoiceCustomers,
  createAuditLog,
  loadInvoiceCustomers,
  resetCustomerForm,
  alertFn = alert,
}) {
  if (editingCustomerId) {
    const oldCustomer = invoiceCustomers.find((customer) => customer.id === editingCustomerId)

    const { error } = await supabase
      .from('invoice_customers')
      .update(payload)
      .eq('id', editingCustomerId)

    if (error) return { error }

    await createAuditLog('update', 'invoice_customers', editingCustomerId, oldCustomer, payload)
    alertFn('Kunde wurde aktualisiert.')
  } else {
    const { data, error } = await supabase
      .from('invoice_customers')
      .insert(payload)
      .select()
      .single()

    if (error) return { error }

    await createAuditLog('insert', 'invoice_customers', data?.id, null, data)
    alertFn('Kunde wurde angelegt.')
  }

  resetCustomerForm()
  await loadInvoiceCustomers()

  return { ok: true }
}

export async function deleteInvoiceCustomerRecord({
  customer,
  invoices,
  createAuditLog,
  loadInvoiceCustomers,
  alertFn = alert,
}) {
  const used = invoices.some((invoice) => invoice.customer_id === customer.id)

  if (used) {
    alertFn('Dieser Kunde wird bereits in Rechnungen verwendet und kann nicht gel�scht werden.')
    return { blocked: true }
  }

  const { error } = await supabase
    .from('invoice_customers')
    .delete()
    .eq('id', customer.id)

  if (error) return { error }

  await createAuditLog('delete', 'invoice_customers', customer.id, customer, null)
  await loadInvoiceCustomers()
  alertFn('Kunde wurde gel�scht.')

  return { ok: true }
}
