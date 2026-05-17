import { buttonStyle, headingStyle, sectionStyle, secondaryButtonStyle } from '../../styles/appStyles'
import { InventoryOverviewCards } from './InventoryOverviewCards'
import { InventoryForm } from './InventoryForm'
import { InventoryCsvImport } from './InventoryCsvImport'
import { InventoryFilters } from './InventoryFilters'
import { InventoryList } from './InventoryList'

export function InventoryPage(props) {
  const {
    inventoryItems,
    getInventoryTotalValue,
    inventoryEditingId,
    inventoryNumber,
    setInventoryNumber,
    inventoryName,
    setInventoryName,
    inventoryCategory,
    setInventoryCategory,
    inventoryResponsible,
    setInventoryResponsible,
    inventoryLocation,
    setInventoryLocation,
    inventoryPurchaseDate,
    setInventoryPurchaseDate,
    inventoryCondition,
    setInventoryCondition,
    inventoryStatus,
    setInventoryStatus,
    inventoryLastCheckDate,
    setInventoryLastCheckDate,
    inventoryCheckStatus,
    setInventoryCheckStatus,
    inventorySerialNumber,
    setInventorySerialNumber,
    inventoryValue,
    setInventoryValue,
    inventoryNotes,
    setInventoryNotes,
    getNextInventoryNumber,
    saveInventoryItem,
    resetInventoryForm,
    handleInventoryCsvFile,
    inventoryCsvFileName,
    inventoryCsvRows,
    importInventoryRows,
    inventoryImporting,
    setInventoryCsvRows,
    setInventoryCsvFileName,
    inventorySearch,
    setInventorySearch,
    inventoryCategoryFilter,
    setInventoryCategoryFilter,
    inventoryStatusFilter,
    setInventoryStatusFilter,
    inventorySortBy,
    setInventorySortBy,
    inventorySortDirection,
    setInventorySortDirection,
    getInventoryCategories,
    exportInventoryCsv,
    exportInventoryPdf,
    exportInventoryLabelsPdf,
    getFilteredInventoryItems,
    getInventoryQrValue,
    showInventoryQr,
    setShowInventoryQr,
    editInventoryItem,
    retireInventoryItem,
    deleteInventoryItem,
    canManageMembers,
    isAdmin,
  } = props

  return (
    <section style={sectionStyle}>
      <h2 style={headingStyle}>Inventar PRO</h2>

      <InventoryOverviewCards
        inventoryItems={inventoryItems}
        getInventoryTotalValue={getInventoryTotalValue}
      />

      {(canManageMembers() || isAdmin()) && (
        <InventoryForm
          inventoryEditingId={inventoryEditingId}
          inventoryNumber={inventoryNumber}
          setInventoryNumber={setInventoryNumber}
          inventoryName={inventoryName}
          setInventoryName={setInventoryName}
          inventoryCategory={inventoryCategory}
          setInventoryCategory={setInventoryCategory}
          inventoryResponsible={inventoryResponsible}
          setInventoryResponsible={setInventoryResponsible}
          inventoryLocation={inventoryLocation}
          setInventoryLocation={setInventoryLocation}
          inventoryPurchaseDate={inventoryPurchaseDate}
          setInventoryPurchaseDate={setInventoryPurchaseDate}
          inventoryCondition={inventoryCondition}
          setInventoryCondition={setInventoryCondition}
          inventoryStatus={inventoryStatus}
          setInventoryStatus={setInventoryStatus}
          inventoryLastCheckDate={inventoryLastCheckDate}
          setInventoryLastCheckDate={setInventoryLastCheckDate}
          inventoryCheckStatus={inventoryCheckStatus}
          setInventoryCheckStatus={setInventoryCheckStatus}
          inventorySerialNumber={inventorySerialNumber}
          setInventorySerialNumber={setInventorySerialNumber}
          inventoryValue={inventoryValue}
          setInventoryValue={setInventoryValue}
          inventoryNotes={inventoryNotes}
          setInventoryNotes={setInventoryNotes}
          getNextInventoryNumber={getNextInventoryNumber}
          saveInventoryItem={saveInventoryItem}
          resetInventoryForm={resetInventoryForm}
        />
      )}

      {(canManageMembers() || isAdmin()) && (
        <InventoryCsvImport
          handleInventoryCsvFile={handleInventoryCsvFile}
          inventoryCsvFileName={inventoryCsvFileName}
          inventoryCsvRows={inventoryCsvRows}
          importInventoryRows={importInventoryRows}
          inventoryImporting={inventoryImporting}
          setInventoryCsvRows={setInventoryCsvRows}
          setInventoryCsvFileName={setInventoryCsvFileName}
        />
      )}

      <InventoryFilters
        inventorySearch={inventorySearch}
        setInventorySearch={setInventorySearch}
        inventoryCategoryFilter={inventoryCategoryFilter}
        setInventoryCategoryFilter={setInventoryCategoryFilter}
        inventoryStatusFilter={inventoryStatusFilter}
        setInventoryStatusFilter={setInventoryStatusFilter}
        inventorySortBy={inventorySortBy}
        setInventorySortBy={setInventorySortBy}
        inventorySortDirection={inventorySortDirection}
        setInventorySortDirection={setInventorySortDirection}
        getInventoryCategories={getInventoryCategories}
      />

      <button onClick={exportInventoryCsv} style={secondaryButtonStyle}>
        Inventar CSV
      </button>

      <button onClick={exportInventoryPdf} style={secondaryButtonStyle}>
        Inventarliste PDF
      </button>

      <button onClick={exportInventoryLabelsPdf} style={buttonStyle}>
        Etiketten PDF
      </button>

      <InventoryList
        inventoryItems={inventoryItems}
        getFilteredInventoryItems={getFilteredInventoryItems}
        getInventoryTotalValue={getInventoryTotalValue}
        getInventoryQrValue={getInventoryQrValue}
        showInventoryQr={showInventoryQr}
        setShowInventoryQr={setShowInventoryQr}
        exportInventoryLabelPdf={props.exportInventoryLabelPdf}
        editInventoryItem={editInventoryItem}
        retireInventoryItem={retireInventoryItem}
        deleteInventoryItem={deleteInventoryItem}
        canManageMembers={canManageMembers}
        isAdmin={isAdmin}
      />
    </section>
  )
}
