import { headingStyle, sectionStyle } from '../../styles/appStyles'
import { InvoiceArchiveSummary } from './InvoiceArchiveSummary'
import { InvoiceCustomerSection } from './InvoiceCustomerSection'
import { InvoiceDashboardCards } from './InvoiceDashboardCards'
import { InvoiceFilters } from './InvoiceFilters'
import { InvoiceForm } from './InvoiceForm'
import { InvoiceList } from './InvoiceList'

export function InvoicesPage(props) {
  const {
    invoices,
    invoiceCustomers,
    selectedInvoiceCustomerId,
    setSelectedInvoiceCustomerId,
    invoiceCustomerName,
    setInvoiceCustomerName,
    invoiceCustomerEmail,
    setInvoiceCustomerEmail,
    invoiceCustomerStreet,
    setInvoiceCustomerStreet,
    invoiceCustomerHouseNumber,
    setInvoiceCustomerHouseNumber,
    invoiceCustomerAddressAddition,
    setInvoiceCustomerAddressAddition,
    invoiceCustomerPostalCode,
    setInvoiceCustomerPostalCode,
    invoiceCustomerCity,
    setInvoiceCustomerCity,
    invoiceCustomerCountry,
    setInvoiceCustomerCountry,
    invoiceIssueDate,
    setInvoiceIssueDate,
    invoiceDueDate,
    setInvoiceDueDate,
    invoiceRows,
    updateInvoiceRow,
    addInvoiceRow,
    removeInvoiceRow,
    invoiceNotes,
    setInvoiceNotes,
    invoiceIsTest,
    setInvoiceIsTest,
    getInvoiceRowsTotal,
    getNextInvoiceNumber,
    createInvoice,
    resetInvoiceForm,
    editingCustomerId,
    customerName,
    setCustomerName,
    customerEmail,
    setCustomerEmail,
    customerStreet,
    setCustomerStreet,
    customerHouseNumber,
    setCustomerHouseNumber,
    customerAddressAddition,
    setCustomerAddressAddition,
    customerPostalCode,
    setCustomerPostalCode,
    customerCity,
    setCustomerCity,
    customerCountry,
    setCustomerCountry,
    customerNotes,
    setCustomerNotes,
    saveInvoiceCustomer,
    resetCustomerForm,
    customerSearch,
    setCustomerSearch,
    getFilteredInvoiceCustomers,
    selectInvoiceCustomer,
    editInvoiceCustomer,
    deleteInvoiceCustomer,
    getSelectedInvoiceCustomer,
    formatCustomerAddressFromFields,
    invoiceSearch,
    setInvoiceSearch,
    invoiceStatusFilter,
    setInvoiceStatusFilter,
    invoiceTestFilter,
    setInvoiceTestFilter,
    exportInvoicesCsv,
    getFilteredInvoices,
    getInvoiceCustomerAddress,
    getItemsForInvoice,
    getMemberById,
    exportInvoicePdf,
    archiveInvoicePdf,
    openArchivedInvoice,
    sendInvoiceEmail,
    markInvoicePaid,
    createCancellationInvoice,
    cancelInvoice,
    deleteInvoice,
    getOverdueInvoices,
    canManageCash,
    isAdmin,
  } = props

  return (
    <section style={sectionStyle}>
      <h2 style={headingStyle}>Vereinsrechnung PRO</h2>

      <InvoiceDashboardCards invoices={invoices} />

      <InvoiceArchiveSummary
        invoices={invoices}
        getOverdueInvoices={getOverdueInvoices}
        sendInvoiceEmail={sendInvoiceEmail}
      />

      {(canManageCash() || isAdmin()) && (
        <>
          <InvoiceCustomerSection
            editingCustomerId={editingCustomerId}
            customerName={customerName}
            setCustomerName={setCustomerName}
            customerEmail={customerEmail}
            setCustomerEmail={setCustomerEmail}
            customerStreet={customerStreet}
            setCustomerStreet={setCustomerStreet}
            customerHouseNumber={customerHouseNumber}
            setCustomerHouseNumber={setCustomerHouseNumber}
            customerAddressAddition={customerAddressAddition}
            setCustomerAddressAddition={setCustomerAddressAddition}
            customerPostalCode={customerPostalCode}
            setCustomerPostalCode={setCustomerPostalCode}
            customerCity={customerCity}
            setCustomerCity={setCustomerCity}
            customerCountry={customerCountry}
            setCustomerCountry={setCustomerCountry}
            customerNotes={customerNotes}
            setCustomerNotes={setCustomerNotes}
            saveInvoiceCustomer={saveInvoiceCustomer}
            resetCustomerForm={resetCustomerForm}
            customerSearch={customerSearch}
            setCustomerSearch={setCustomerSearch}
            getFilteredInvoiceCustomers={getFilteredInvoiceCustomers}
            selectInvoiceCustomer={selectInvoiceCustomer}
            editInvoiceCustomer={editInvoiceCustomer}
            deleteInvoiceCustomer={deleteInvoiceCustomer}
            formatCustomerAddressFromFields={formatCustomerAddressFromFields}
            isAdmin={isAdmin}
          />

          <InvoiceForm
            selectedInvoiceCustomerId={selectedInvoiceCustomerId}
            setSelectedInvoiceCustomerId={setSelectedInvoiceCustomerId}
            invoiceCustomers={invoiceCustomers}
            getSelectedInvoiceCustomer={getSelectedInvoiceCustomer}
            formatCustomerAddressFromFields={formatCustomerAddressFromFields}
            invoiceCustomerName={invoiceCustomerName}
            setInvoiceCustomerName={setInvoiceCustomerName}
            invoiceCustomerEmail={invoiceCustomerEmail}
            setInvoiceCustomerEmail={setInvoiceCustomerEmail}
            invoiceCustomerStreet={invoiceCustomerStreet}
            setInvoiceCustomerStreet={setInvoiceCustomerStreet}
            invoiceCustomerHouseNumber={invoiceCustomerHouseNumber}
            setInvoiceCustomerHouseNumber={setInvoiceCustomerHouseNumber}
            invoiceCustomerAddressAddition={invoiceCustomerAddressAddition}
            setInvoiceCustomerAddressAddition={setInvoiceCustomerAddressAddition}
            invoiceCustomerPostalCode={invoiceCustomerPostalCode}
            setInvoiceCustomerPostalCode={setInvoiceCustomerPostalCode}
            invoiceCustomerCity={invoiceCustomerCity}
            setInvoiceCustomerCity={setInvoiceCustomerCity}
            invoiceCustomerCountry={invoiceCustomerCountry}
            setInvoiceCustomerCountry={setInvoiceCustomerCountry}
            invoiceIssueDate={invoiceIssueDate}
            setInvoiceIssueDate={setInvoiceIssueDate}
            invoiceDueDate={invoiceDueDate}
            setInvoiceDueDate={setInvoiceDueDate}
            invoiceRows={invoiceRows}
            updateInvoiceRow={updateInvoiceRow}
            addInvoiceRow={addInvoiceRow}
            removeInvoiceRow={removeInvoiceRow}
            invoiceNotes={invoiceNotes}
            setInvoiceNotes={setInvoiceNotes}
            invoiceIsTest={invoiceIsTest}
            setInvoiceIsTest={setInvoiceIsTest}
            getInvoiceRowsTotal={getInvoiceRowsTotal}
            getNextInvoiceNumber={getNextInvoiceNumber}
            createInvoice={createInvoice}
            resetInvoiceForm={resetInvoiceForm}
          />
        </>
      )}

      <InvoiceFilters
        invoiceSearch={invoiceSearch}
        setInvoiceSearch={setInvoiceSearch}
        invoiceStatusFilter={invoiceStatusFilter}
        setInvoiceStatusFilter={setInvoiceStatusFilter}
        invoiceTestFilter={invoiceTestFilter}
        setInvoiceTestFilter={setInvoiceTestFilter}
        exportInvoicesCsv={exportInvoicesCsv}
        getFilteredInvoices={getFilteredInvoices}
        invoices={invoices}
      />

      <InvoiceList
        getFilteredInvoices={getFilteredInvoices}
        getInvoiceCustomerAddress={getInvoiceCustomerAddress}
        getItemsForInvoice={getItemsForInvoice}
        getMemberById={getMemberById}
        exportInvoicePdf={exportInvoicePdf}
        archiveInvoicePdf={archiveInvoicePdf}
        openArchivedInvoice={openArchivedInvoice}
        sendInvoiceEmail={sendInvoiceEmail}
        markInvoicePaid={markInvoicePaid}
        createCancellationInvoice={createCancellationInvoice}
        cancelInvoice={cancelInvoice}
        deleteInvoice={deleteInvoice}
        canManageCash={canManageCash}
        isAdmin={isAdmin}
      />
    </section>
  )
}
