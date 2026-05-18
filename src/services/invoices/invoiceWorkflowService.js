import { supabase } from '../../lib/supabase'

export async function archiveInvoicePdfService({
  invoice,
  canManageCash,
  isAdmin,
  buildInvoicePdfBlob,
  getInvoiceFilePath,
  createAuditLog,
  loadInvoices,
  alertFn = alert,
}) {
  if (!canManageCash() && !isAdmin()) return alertFn('Keine Berechtigung fÃ¼r Rechnungsarchiv.')

  const { blob, filename } = await buildInvoicePdfBlob(invoice)
  const filePath = getInvoiceFilePath(invoice, filename)

  const { error: uploadError } = await supabase.storage
    .from('invoice-archive')
    .upload(filePath, blob, {
      contentType: 'application/pdf',
      upsert: true,
    })

  if (uploadError) return alertFn(uploadError.message)

  const { error } = await supabase
    .from('invoices')
    .update({
      pdf_url: filePath,
      pdf_archived_at: new Date().toISOString(),
    })
    .eq('id', invoice.id)

  if (error) return alertFn(error.message)

  await createAuditLog('archive_pdf', 'invoices', invoice.id, invoice, { pdf_url: filePath })
  await loadInvoices()

  alertFn('Rechnung wurde im Archiv gespeichert.')
}

export async function openArchivedInvoiceService({
  invoice,
  alertFn = alert,
  openFn = window.open,
}) {
  if (!invoice.pdf_url) {
    alertFn('FÃ¼r diese Rechnung ist noch kein Archiv-PDF gespeichert.')
    return
  }

  const { data, error } = await supabase.storage
    .from('invoice-archive')
    .createSignedUrl(invoice.pdf_url, 300)

  if (error) return alertFn(error.message)

  openFn(data.signedUrl, '_blank')
}

export async function sendInvoiceEmailService({
  invoice,
  reminder = false,
  canManageCash,
  isAdmin,
  buildInvoicePdfBlob,
  blobToBase64,
  createAuditLog,
  loadInvoices,
  alertFn = alert,
  confirmFn = window.confirm,
}) {
  if (!canManageCash() && !isAdmin()) return alertFn('Keine Berechtigung fÃ¼r Rechnungsversand.')

  if (!invoice.customer_email) {
    alertFn('Diese Rechnung hat keine E-Mail-Adresse.')
    return
  }

  const confirmed = confirmFn(
    `${reminder ? 'Zahlungserinnerung' : 'Rechnung'} per E-Mail senden?\n\n${invoice.customer_email}\n${invoice.invoice_number}`
  )

  if (!confirmed) return

  const { blob, filename } = await buildInvoicePdfBlob(invoice)
  const pdfBase64 = await blobToBase64(blob)

  const subject = reminder
    ? `Zahlungserinnerung ${invoice.invoice_number}`
    : `Rechnung ${invoice.invoice_number}`

  const html = reminder
    ? `<p>Hallo,</p><p>wir mÃ¶chten freundlich an die offene Rechnung <strong>${invoice.invoice_number}</strong> erinnern.</p><p>Danke und sportliche GrÃ¼ÃŸe<br/>Styrian Bastards Eishockey-Fanclub</p>`
    : `<p>Hallo,</p><p>anbei senden wir die Rechnung <strong>${invoice.invoice_number}</strong>.</p><p>Danke und sportliche GrÃ¼ÃŸe<br/>Styrian Bastards Eishockey-Fanclub</p>`

  const { data, error } = await supabase.functions.invoke('send-invoice-email', {
    body: {
      to: invoice.customer_email,
      subject,
      html,
      pdf_base64: pdfBase64,
      filename,
      invoice_number: invoice.invoice_number,
    },
  })

  if (error) {
    alertFn(error.message)
    return
  }

  if (data?.error) {
    alertFn(data.error)
    return
  }

  const updatePayload = reminder
    ? {
        last_reminder_at: new Date().toISOString(),
        reminder_count: Number(invoice.reminder_count || 0) + 1,
      }
    : {
        emailed_at: new Date().toISOString(),
      }

  await supabase.from('invoices').update(updatePayload).eq('id', invoice.id)

  await createAuditLog(reminder ? 'send_invoice_reminder' : 'send_invoice_email', 'invoices', invoice.id, invoice, {
    to: invoice.customer_email,
  })

  await loadInvoices()

  alertFn(reminder ? 'Zahlungserinnerung wurde gesendet.' : 'Rechnung wurde per E-Mail gesendet.')
}

export async function createCancellationInvoiceService({
  invoice,
  invoices,
  isAdmin,
  getInvoiceYear,
  getNextInvoiceNumber,
  getItemsForInvoice,
  user,
  createAuditLog,
  loadInvoices,
  loadInvoiceItems,
  alertFn = alert,
  promptFn = window.prompt,
}) {
  if (!isAdmin()) return alertFn('Nur Admins dÃ¼rfen Stornorechnungen erstellen.')

  const existingCancellation = invoices.find(
    (item) => item.original_invoice_id === invoice.id && item.invoice_type === 'storno'
  )

  if (existingCancellation) {
    alertFn(`FÃ¼r diese Rechnung existiert bereits eine Stornorechnung: ${existingCancellation.invoice_number}`)
    return
  }

  const reason = promptFn(`Grund fÃ¼r Stornorechnung zu ${invoice.invoice_number}:`)

  if (!reason || !reason.trim()) return

  const year = Number(getInvoiceYear(invoice))
  const invoiceNumber = `STORNO-${getNextInvoiceNumber(year, Boolean(invoice.is_test))}`
  const originalItems = getItemsForInvoice(invoice.id)

  const { data: cancellation, error } = await supabase
    .from('invoices')
    .insert({
      invoice_number: invoiceNumber,
      customer_id: invoice.customer_id || null,
      customer_name: invoice.customer_name,
      customer_email: invoice.customer_email || null,
      customer_address: invoice.customer_address || null,
      customer_street: invoice.customer_street || null,
      customer_house_number: invoice.customer_house_number || null,
      customer_address_addition: invoice.customer_address_addition || null,
      customer_postal_code: invoice.customer_postal_code || null,
      customer_city: invoice.customer_city || null,
      customer_country: invoice.customer_country || 'Ã–sterreich',
      issue_date: new Date().toISOString().slice(0, 10),
      due_date: null,
      total_amount: -Math.abs(Number(invoice.total_amount || 0)),
      status: 'storniert',
      is_test: Boolean(invoice.is_test),
      invoice_type: 'storno',
      original_invoice_id: invoice.id,
      cancellation_reason: reason.trim(),
      notes: `Stornorechnung zu ${invoice.invoice_number}`,
      created_by: user?.id || null,
      member_id: invoice.member_id || null,
      membership_fee_id: invoice.membership_fee_id || null,
    })
    .select()
    .single()

  if (error) return alertFn(error.message)

  const rowsToInsert = originalItems.map((item) => ({
    invoice_id: cancellation.id,
    description: `Storno: ${item.description || ''}`,
    quantity: Number(item.quantity || 0),
    unit_price: -Math.abs(Number(item.unit_price || 0)),
    total_price: -Math.abs(Number(item.total_price || 0)),
  }))

  if (rowsToInsert.length > 0) {
    const { error: itemsError } = await supabase.from('invoice_items').insert(rowsToInsert)
    if (itemsError) return alertFn(itemsError.message)
  }

  await supabase
    .from('invoices')
    .update({
      status: 'storniert',
      cancelled_at: new Date().toISOString(),
      cancellation_reason: reason.trim(),
    })
    .eq('id', invoice.id)

  await createAuditLog('create_cancellation_invoice', 'invoices', invoice.id, invoice, {
    cancellation_invoice_id: cancellation.id,
    cancellation_invoice_number: invoiceNumber,
    reason: reason.trim(),
  })

  await loadInvoices()
  await loadInvoiceItems()

  alertFn(`Stornorechnung ${invoiceNumber} wurde erstellt.`)
}

export async function createMembershipFeeInvoiceService({
  member,
  fee,
  canManageCash,
  isAdmin,
  invoices,
  getNextInvoiceNumber,
  exportInvoicePdf,
  user,
  createAuditLog,
  loadInvoices,
  loadInvoiceItems,
  alertFn = alert,
  confirmFn = window.confirm,
}) {
  if (!canManageCash() && !isAdmin()) return alertFn('Keine Berechtigung fÃ¼r Rechnungen.')

  if (!member || !fee) {
    alertFn('Mitglied oder Beitrag fehlt.')
    return
  }

  if (fee.paid) {
    alertFn('Dieser Mitgliedsbeitrag ist bereits bezahlt.')
    return
  }

  const existingInvoice = invoices.find(
    (invoice) =>
      invoice.membership_fee_id === fee.id &&
      invoice.status !== 'storniert'
  )

  if (existingInvoice) {
    const openExisting = confirmFn(
      `FÃ¼r diesen Beitrag gibt es bereits eine Rechnung:\n\n${existingInvoice.invoice_number}\n\nPDF jetzt Ã¶ffnen?`
    )

    if (openExisting) {
      await exportInvoicePdf(existingInvoice)
    }

    return
  }

  const year = Number(fee.year || new Date().getFullYear())
  const invoiceNumber = getNextInvoiceNumber(year, false)
  const amount = Number(fee.amount || 0)

  const confirmed = confirmFn(
    `Mitgliedsbeitrag-Rechnung erstellen?\n\n${member.first_name || ''} ${member.last_name || ''}\nBetrag: ${amount.toFixed(2)} â‚¬\nRechnungsnummer: ${invoiceNumber}`
  )

  if (!confirmed) return

  const { data: invoice, error } = await supabase
    .from('invoices')
    .insert({
      invoice_number: invoiceNumber,
      customer_name: `${member.first_name || ''} ${member.last_name || ''}`.trim(),
      customer_email: member.email || null,
      customer_address: [member.street, `${member.postal_code || ''} ${member.city || ''}`.trim()]
        .filter(Boolean)
        .join(', ') || null,
      customer_street: member.street || null,
      customer_house_number: null,
      customer_address_addition: null,
      customer_postal_code: member.postal_code || null,
      customer_city: member.city || null,
      customer_country: 'Ã–sterreich',
      issue_date: new Date().toISOString().slice(0, 10),
      due_date: null,
      total_amount: amount,
      status: 'offen',
      is_test: Boolean(member.is_test),
      notes: `Mitgliedsbeitrag ${year}`,
      created_by: user?.id || null,
      member_id: member.id,
      membership_fee_id: fee.id,
    })
    .select()
    .single()

  if (error) return alertFn(error.message)

  const { error: itemError } = await supabase.from('invoice_items').insert({
    invoice_id: invoice.id,
    description: `Mitgliedsbeitrag ${year} - ${member.first_name || ''} ${member.last_name || ''}`,
    quantity: 1,
    unit_price: amount,
    total_price: amount,
  })

  if (itemError) return alertFn(itemError.message)

  await createAuditLog('insert_membership_fee_invoice', 'invoices', invoice.id, null, {
    invoice,
    member_id: member.id,
    membership_fee_id: fee.id,
  })

  await loadInvoices()
  await loadInvoiceItems()

  alertFn(`Mitgliedsbeitrag-Rechnung ${invoiceNumber} wurde erstellt.`)
}

export async function createInvoiceService({
  canManageCash,
  isAdmin,
  selectedInvoiceCustomerId,
  invoiceCustomerName,
  invoiceCustomerEmail,
  invoiceCustomerStreet,
  invoiceCustomerHouseNumber,
  invoiceCustomerAddressAddition,
  invoiceCustomerPostalCode,
  invoiceCustomerCity,
  invoiceCustomerCountry,
  invoiceIssueDate,
  invoiceDueDate,
  invoiceNotes,
  invoiceRows,
  invoiceIsTest,
  formatCustomerAddressFromFields,
  getNextInvoiceNumber,
  user,
  createAuditLog,
  resetInvoiceForm,
  loadInvoices,
  loadInvoiceItems,
  alertFn = alert,
}) {
  if (!canManageCash() && !isAdmin()) return alertFn('Keine Berechtigung fÃ¼r Rechnungen.')

  if (!invoiceCustomerName.trim()) {
    alertFn('Kundenname ist Pflicht.')
    return
  }

  const validRows = invoiceRows
    .map((row) => ({
      description: String(row.description || '').trim(),
      quantity: Number(row.quantity || 0),
      unit_price: Number(row.unit_price || 0),
    }))
    .filter((row) => row.description && row.quantity > 0 && row.unit_price >= 0)

  if (validRows.length === 0) {
    alertFn('Bitte mindestens eine gÃ¼ltige Rechnungsposition eingeben.')
    return
  }

  const issueYear = Number(String(invoiceIssueDate || new Date().toISOString().slice(0, 10)).slice(0, 4))
  const invoiceNumber = getNextInvoiceNumber(issueYear, invoiceIsTest)
  const totalAmount = validRows.reduce((sum, row) => sum + row.quantity * row.unit_price, 0)

  const { data: invoice, error } = await supabase
    .from('invoices')
    .insert({
      invoice_number: invoiceNumber,
      customer_id: selectedInvoiceCustomerId || null,
      customer_name: invoiceCustomerName.trim(),
      customer_email: invoiceCustomerEmail.trim() || null,
      customer_address: formatCustomerAddressFromFields({
        street: invoiceCustomerStreet,
        house_number: invoiceCustomerHouseNumber,
        address_addition: invoiceCustomerAddressAddition,
        postal_code: invoiceCustomerPostalCode,
        city: invoiceCustomerCity,
        country: invoiceCustomerCountry,
      }) || null,
      customer_street: invoiceCustomerStreet.trim() || null,
      customer_house_number: invoiceCustomerHouseNumber.trim() || null,
      customer_address_addition: invoiceCustomerAddressAddition.trim() || null,
      customer_postal_code: invoiceCustomerPostalCode.trim() || null,
      customer_city: invoiceCustomerCity.trim() || null,
      customer_country: invoiceCustomerCountry.trim() || 'Ã–sterreich',
      issue_date: invoiceIssueDate || new Date().toISOString().slice(0, 10),
      due_date: invoiceDueDate || null,
      total_amount: totalAmount,
      status: 'offen',
      is_test: invoiceIsTest,
      notes: invoiceNotes.trim() || null,
      created_by: user?.id || null,
    })
    .select()
    .single()

  if (error) return alertFn(error.message)

  const rowsToInsert = validRows.map((row) => ({
    invoice_id: invoice.id,
    description: row.description,
    quantity: row.quantity,
    unit_price: row.unit_price,
    total_price: row.quantity * row.unit_price,
  }))

  const { error: itemsError } = await supabase.from('invoice_items').insert(rowsToInsert)

  if (itemsError) return alertFn(itemsError.message)

  await createAuditLog('insert', 'invoices', invoice.id, null, {
    ...invoice,
    items: rowsToInsert,
  })

  resetInvoiceForm()
  await loadInvoices()
  await loadInvoiceItems()

  alertFn(`${invoiceIsTest ? 'Testrechnung' : 'Rechnung'} ${invoiceNumber} wurde erstellt.`)
}

export async function markInvoicePaidService({
  invoice,
  canManageCash,
  isAdmin,
  getNextReceiptNumber,
  createAuditLog,
  loadInvoices,
  loadCashEntries,
  loadFees,
  alertFn = alert,
  confirmFn = window.confirm,
}) {
  if (!canManageCash() && !isAdmin()) return alertFn('Keine Berechtigung fÃ¼r Rechnungen.')

  if (invoice.status === 'bezahlt') {
    alertFn('Diese Rechnung ist bereits bezahlt.')
    return
  }

  const confirmed = confirmFn(
    `Rechnung als bezahlt markieren?\n\n${invoice.invoice_number}\n${invoice.customer_name}\n${Number(invoice.total_amount || 0).toFixed(2)} â‚¬\n\n` +
      (invoice.is_test ? 'Testrechnung: Es wird KEINE Kassa-Einnahme erstellt.' : 'Es wird automatisch eine Kassa-Einnahme erstellt.')
  )

  if (!confirmed) return

  const today = new Date().toISOString().slice(0, 10)
  const year = Number(today.slice(0, 4))

  if (!invoice.is_test) {
    const { error: cashError } = await supabase.from('cash_entries').insert({
      entry_date: today,
      entry_year: year,
      receipt_number: getNextReceiptNumber(year),
      is_cancelled: false,
      type: 'einnahme',
      category: 'sonstiges',
      event_id: null,
      payment_method: 'ebanking',
      is_opening: false,
      amount: Number(invoice.total_amount || 0),
      description: `Rechnung bezahlt: ${invoice.invoice_number} - ${invoice.customer_name}`,
      receipt_url: null,
      invoice_id: invoice.id,
      membership_fee_id: invoice.membership_fee_id || null,
      member_id: invoice.member_id || null,
    })

    if (cashError) return alertFn(cashError.message)
  }

  const { error } = await supabase
    .from('invoices')
    .update({
      status: 'bezahlt',
      paid_at: today,
    })
    .eq('id', invoice.id)

  if (error) return alertFn(error.message)

  if (invoice.membership_fee_id) {
    const { error: feeError } = await supabase
      .from('membership_fees')
      .update({
        paid: true,
        paid_at: today,
        payment_method: 'ueberweisung',
      })
      .eq('id', invoice.membership_fee_id)

    if (feeError) return alertFn(feeError.message)
  }

  await createAuditLog('mark_paid', 'invoices', invoice.id, invoice, {
    status: 'bezahlt',
    paid_at: today,
  })

  await loadInvoices()
  await loadCashEntries()
  await loadFees()

  alertFn('Rechnung wurde als bezahlt markiert und in die Kassa Ã¼bernommen.')
}

export async function cancelInvoiceService({
  invoice,
  isAdmin,
  createAuditLog,
  loadInvoices,
  alertFn = alert,
  promptFn = window.prompt,
}) {
  if (!isAdmin()) return alertFn('Nur Admins dÃ¼rfen Rechnungen stornieren.')

  if (invoice.status === 'storniert') {
    alertFn('Diese Rechnung ist bereits storniert.')
    return
  }

  const reason = promptFn(`Storno-Grund fÃ¼r ${invoice.invoice_number} eingeben:`)

  if (!reason || !reason.trim()) return

  const { error } = await supabase
    .from('invoices')
    .update({
      status: 'storniert',
      cancelled_at: new Date().toISOString(),
      cancellation_reason: reason.trim(),
    })
    .eq('id', invoice.id)

  if (error) return alertFn(error.message)

  await createAuditLog('cancel', 'invoices', invoice.id, invoice, {
    status: 'storniert',
    cancellation_reason: reason.trim(),
  })

  await loadInvoices()
  alertFn('Rechnung wurde storniert.')
}

export async function deleteInvoiceService({
  invoice,
  isAdmin,
  createAuditLog,
  loadInvoices,
  loadInvoiceItems,
  alertFn = alert,
  confirmFn = window.confirm,
}) {
  if (!isAdmin()) return alertFn('Nur Admins dÃ¼rfen Rechnungen lÃ¶schen.')

  const confirmed = confirmFn(
    `Rechnung wirklich endgÃ¼ltig lÃ¶schen?\n\n${invoice.invoice_number} Â· ${invoice.customer_name}\n\nBei echten Rechnungen ist normalerweise Storno besser. Testrechnungen kÃ¶nnen gefahrlos gelÃ¶scht werden.`
  )

  if (!confirmed) return

  const secondConfirm = confirmFn(
    'Bitte nochmals bestÃ¤tigen: Die Rechnung inklusive Positionen wird endgÃ¼ltig gelÃ¶scht.'
  )

  if (!secondConfirm) return

  const { error } = await supabase
    .from('invoices')
    .delete()
    .eq('id', invoice.id)

  if (error) return alertFn(error.message)

  await createAuditLog('delete', 'invoices', invoice.id, invoice, null)
  await loadInvoices()
  await loadInvoiceItems()

  alertFn('Rechnung wurde gelÃ¶scht.')
}
