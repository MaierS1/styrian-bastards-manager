import { formatCustomerAddressFromFields } from '../../utils/formatters'

export function getInvoiceCustomerAddress(invoice) {
  return (
    formatCustomerAddressFromFields({
      customer_street: invoice.customer_street,
      customer_house_number: invoice.customer_house_number,
      customer_address_addition: invoice.customer_address_addition,
      customer_postal_code: invoice.customer_postal_code,
      customer_city: invoice.customer_city,
      customer_country: invoice.customer_country,
    }) || invoice.customer_address || '-'
  )
}

export function getSelectedInvoiceCustomer(invoiceCustomers, selectedInvoiceCustomerId) {
  return invoiceCustomers.find((customer) => customer.id === selectedInvoiceCustomerId)
}

export function getFilteredInvoiceCustomers(invoiceCustomers, customerSearch) {
  const search = String(customerSearch || '').toLowerCase()

  return invoiceCustomers.filter((customer) => {
    return (
      !search ||
      (customer.name || '').toLowerCase().includes(search) ||
      (customer.email || '').toLowerCase().includes(search) ||
      (customer.city || '').toLowerCase().includes(search) ||
      (customer.street || '').toLowerCase().includes(search)
    )
  })
}

export function getInvoiceYear(invoice) {
  return String(invoice.issue_date || new Date().toISOString().slice(0, 10)).slice(0, 4)
}

export function getInvoiceFilePath(invoice, filename) {
  return `invoices/${getInvoiceYear(invoice)}/${filename}`
}

export function getOverdueInvoices(invoices, isInvoiceOverdue) {
  return invoices.filter((invoice) => isInvoiceOverdue(invoice))
}

export function getNextInvoiceNumber(invoices, year = new Date().getFullYear(), isTest = false) {
  const prefix = isTest ? `TEST-SB-${year}-` : `SB-${year}-`

  const maxNumber = invoices.reduce((max, invoice) => {
    const invoiceNumber = String(invoice.invoice_number || '')

    if (!invoiceNumber.startsWith(prefix)) return max

    const numberPart = Number(invoiceNumber.replace(prefix, ''))
    return Number.isFinite(numberPart) ? Math.max(max, numberPart) : max
  }, 0)

  return `${prefix}${String(maxNumber + 1).padStart(4, '0')}`
}

export function getInvoiceRowsTotal(rows = []) {
  return rows.reduce((sum, row) => {
    return sum + Number(row.quantity || 0) * Number(row.unit_price || 0)
  }, 0)
}

export function getItemsForInvoice(invoiceItems, invoiceId) {
  return invoiceItems.filter((item) => item.invoice_id === invoiceId)
}

export function getInvoiceById(invoices, invoiceId) {
  return invoices.find((invoice) => invoice.id === invoiceId)
}

export function getFilteredInvoices(invoices, invoiceSearch, invoiceStatusFilter, invoiceTestFilter) {
  const search = String(invoiceSearch || '').toLowerCase()

  return invoices.filter((invoice) => {
    const matchesSearch =
      !search ||
      (invoice.invoice_number || '').toLowerCase().includes(search) ||
      (invoice.customer_name || '').toLowerCase().includes(search) ||
      (invoice.customer_email || '').toLowerCase().includes(search) ||
      (invoice.notes || '').toLowerCase().includes(search)

    const matchesStatus = invoiceStatusFilter === 'alle' || invoice.status === invoiceStatusFilter
    const matchesTest =
      invoiceTestFilter === 'alle' ||
      (invoiceTestFilter === 'test' && invoice.is_test) ||
      (invoiceTestFilter === 'echt' && !invoice.is_test)

    return matchesSearch && matchesStatus && matchesTest
  })
}
