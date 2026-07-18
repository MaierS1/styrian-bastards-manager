import {
  buttonStyle,
  cardStyle,
  colors,
  dashboardLabelStyle,
  headingStyle,
  inputStyle,
  isMobile,
  mutedTextStyle,
  secondaryButtonStyle,
  sectionStyle,
} from '../../styles/appStyles'
import { BulkReceiptUpload } from './BulkReceiptUpload'
import { CashEntriesList } from './CashEntriesList'

export function CashPage({
  selectedCashYear,
  setSelectedCashYear,
  getAvailableCashYears,
  getTestMembers,
  fees,
  getMemberById,
  getTestCashEntries,
  getCashEntrySignedAmount,
  carryoverFromYear,
  setCarryoverFromYear,
  carryoverToYear,
  setCarryoverToYear,
  getCashBalanceForYear,
  hasOpeningForYear,
  createAutomaticCarryover,
  cashMonthClosings,
  isOnline,
  offlineCashEntries,
  syncOfflineCashEntries,
  getCashBalance,
  editingCashId,
  cashType,
  setCashType,
  cashCategory,
  setCashCategory,
  cashPaymentMethod,
  setCashPaymentMethod,
  cashEventId,
  setCashEventId,
  events,
  cashAmount,
  setCashAmount,
  cashDescription,
  setCashDescription,
  receiptFile,
  setReceiptFile,
  updateCashEntry,
  resetCashForm,
  addCashEntry,
  getCashbookDetailedSummary,
  getCashMonthLabel,
  isCashMonthClosed,
  isAdmin,
  reopenCashMonth,
  closeCashMonth,
  exportDetailedCashbookPdf,
  exportTaxAdvisorCsv,
  exportExcelStyleCashbookCsv,
  exportExcelStyleCashbookPdf,
  getCategorySummary,
  handleCashbookFile,
  cashbookFileName,
  cashbookRows,
  importCashbookRows,
  cashbookImporting,
  setCashbookRows,
  setCashbookFileName,
  cashSearch,
  setCashSearch,
  cashTypeFilter,
  setCashTypeFilter,
  cashCategoryFilter,
  setCashCategoryFilter,
  resetCashFilters,
  filteredCashEntries,
  getCashEntriesForSelectedYear,
  getPaymentMethodLabel,
  getPaymentMethod,
  isCashEntryMonthClosed,
  getInvoiceById,
  exportInvoicePdf,
  openReceipt,
  editCashEntry,
  deleteCashEntry,
}) {
  return (
<section style={sectionStyle}>
        <h2 style={headingStyle}>Kassa</h2>

        <h3 style={headingStyle}>Kassajahr</h3>

        <select value={selectedCashYear} onChange={(e) => setSelectedCashYear(e.target.value)} style={inputStyle}>
          <option value="alle">Alle Jahre</option>
          {getAvailableCashYears().map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>

        <div style={{ ...cardStyle, borderTop: `6px solid ${colors.red}` }}>
          <strong style={dashboardLabelStyle}>Testdaten im Kassasystem</strong>
          <br />
          Testmitglieder: {getTestMembers().length}
          <br />
          Offene Test-Mitgliedsbeiträge:{' '}
          <strong>
            {fees
              .filter((fee) => getMemberById(fee.member_id)?.is_test && !fee.paid && Number(fee.amount || 0) > 0)
              .reduce((sum, fee) => sum + Number(fee.amount || 0), 0)
              .toFixed(2)} €
          </strong>
          <br />
          Test-Kassa-Einträge: {getTestCashEntries().length}
          <br />
          Summe Test-Kassa:{' '}
          <strong>
            {getTestCashEntries().reduce((sum, entry) => sum + getCashEntrySignedAmount(entry), 0).toFixed(2)} €
          </strong>
          <br />
          <span style={mutedTextStyle}>
            Testdaten sind getrennt sichtbar und können im Adminbereich gelöscht werden.
          </span>
        </div>

        <h3 style={headingStyle}>Automatischer Jahresübertrag</h3>

        <div style={{ ...cardStyle, borderTop: `6px solid ${colors.blue}` }}>
          <p style={mutedTextStyle}>
            Berechnet den Endsaldo eines Jahres und legt im Folgejahr automatisch einen Startsaldo
            als „Übertrag Vorjahr“ an. Die App prüft vorher, ob im Zieljahr bereits ein Übertrag existiert.
          </p>

          <div style={{ width: '100%', boxSizing: 'border-box', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(180px, 260px))', gap: 12 }}>
            <div>
              <label style={{ fontWeight: 800, color: colors.black }}>Von Jahr</label>
              <select value={carryoverFromYear} onChange={(e) => setCarryoverFromYear(e.target.value)} style={inputStyle}>
                {getAvailableCashYears().map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontWeight: 800, color: colors.black }}>Nach Jahr</label>
              <input
                type="number"
                value={carryoverToYear}
                onChange={(e) => setCarryoverToYear(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          <p>
            Endsaldo {carryoverFromYear}:{' '}
            <strong style={{ color: colors.black }}>
              {getCashBalanceForYear(carryoverFromYear).toFixed(2)} €
            </strong>
          </p>

          <p>
            Übertrag in {carryoverToYear}:{' '}
            <strong style={{ color: hasOpeningForYear(carryoverToYear) ? colors.red : colors.successText }}>
              {hasOpeningForYear(carryoverToYear) ? 'bereits vorhanden' : 'noch nicht vorhanden'}
            </strong>
          </p>

          <button onClick={createAutomaticCarryover} style={buttonStyle}>
            Übertrag automatisch erstellen
          </button>
        </div>

        <h3 style={headingStyle}>Monatsabschlüsse</h3>

        <div style={cardStyle}>
          {cashMonthClosings.length === 0 && <p style={mutedTextStyle}>Noch keine Monate abgeschlossen.</p>}

          {cashMonthClosings.map((closing) => (
            <div key={closing.id} style={{ marginBottom: 10 }}>
              <strong>
                {String(closing.month).padStart(2, '0')}/{closing.year}
              </strong>
              {' '}abgeschlossen am{' '}
              {closing.closed_at ? new Date(closing.closed_at).toLocaleString('de-AT') : '-'}
              {closing.note && (
                <>
                  <br />
                  Notiz: {closing.note}
                </>
              )}
            </div>
          ))}
        </div>

        <p>
          Verbindung:{' '}
          <strong style={{ color: isOnline ? '#2e7d32' : '#c62828' }}>
            {isOnline ? 'Online' : 'Offline'}
          </strong>
        </p>

        <p>
          Offline gespeicherte Kassa-Einträge:{' '}
          <strong>{offlineCashEntries.length}</strong>
        </p>

        <button onClick={syncOfflineCashEntries} style={buttonStyle}>
          Offline-Einträge synchronisieren
        </button>

        <h3 style={headingStyle}>Aktueller Kassastand: {getCashBalance().toFixed(2)} €</h3>

        <h3 style={headingStyle}>{editingCashId ? 'Kassa-Eintrag bearbeiten' : 'Kassa-Eintrag erfassen'}</h3>

        <select value={cashType} onChange={(e) => setCashType(e.target.value)} style={inputStyle}>
          <option value="einnahme">Einnahme</option>
          <option value="ausgabe">Ausgabe</option>
        </select>

        <select value={cashCategory} onChange={(e) => setCashCategory(e.target.value)} style={inputStyle}>
          <option value="mitgliedsbeitrag">Mitgliedsbeitrag</option>
          <option value="pfandbecher">Pfandbecher</option>
          <option value="veranstaltung">Veranstaltung</option>
          <option value="fanartikel">Fanartikel</option>
          <option value="sonstiges">Sonstiges</option>
        </select>

        <select value={cashPaymentMethod} onChange={(e) => setCashPaymentMethod(e.target.value)} style={inputStyle}>
          <option value="bar">Bar</option>
          <option value="ebanking">E-Banking</option>
        </select>

        <select value={cashEventId} onChange={(e) => setCashEventId(e.target.value)} style={inputStyle}>
          <option value="">Keinem Event zuordnen</option>
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.name} · {event.event_date}
            </option>
          ))}
        </select>

        <input
          type="number"
          placeholder="Betrag"
          value={cashAmount}
          onChange={(e) => setCashAmount(e.target.value)}
          style={inputStyle}
        />

        <input
          placeholder="Beschreibung"
          value={cashDescription}
          onChange={(e) => setCashDescription(e.target.value)}
          style={inputStyle}
        />

        <BulkReceiptUpload />

        <input
          type="file"
          accept="image/*,.pdf"
          onChange={(e) => setReceiptFile(e.target.files[0])}
          style={inputStyle}
        />

        {cashType === 'ausgabe' && !receiptFile && (
          <p style={{ ...mutedTextStyle, color: colors.red }}>
            Hinweis: Für Ausgaben sollte ein Beleg hochgeladen werden.
          </p>
        )}

        {!isOnline && (
          <p style={{ color: '#c62828' }}>
            Offline-Modus: Belege werden offline noch nicht gespeichert. Der Kassa-Eintrag wird lokal vorgemerkt.
          </p>
        )}

        {editingCashId ? (
          <>
            <button onClick={updateCashEntry} style={buttonStyle}>
              Änderungen speichern
            </button>
            <button onClick={resetCashForm} style={secondaryButtonStyle}>
              Bearbeiten abbrechen
            </button>
          </>
        ) : (
          <button onClick={addCashEntry} style={buttonStyle}>
            Kassa-Eintrag speichern
          </button>
        )}

        {offlineCashEntries.length > 0 && (
          <>
            <h3 style={headingStyle}>Offline vorgemerkte Einträge</h3>
            {offlineCashEntries.map((entry) => (
              <div key={entry.offline_id} style={{ ...cardStyle, background: '#fffbeb' }}>
                <strong>
                  {entry.type === 'einnahme' ? '+' : '-'} {Number(entry.amount).toFixed(2)} €
                </strong>
                <br />
                {entry.category} · {entry.entry_date}
                <br />
                {entry.description}
              </div>
            ))}
          </>
        )}

        <h3 style={headingStyle}>Kassabuch Detailübersicht</h3>

        <div style={{ ...cardStyle, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
            <thead>
              <tr>
                {[
                  'Monat',
                  'Übertrag Bank netto',
                  'Übertrag Bar netto',
                  'Einnahme E-Banking',
                  'Ausgabe E-Banking',
                  'Einnahme Bar',
                  'Ausgabe Bar',
                  'Einnahmen gesamt',
                  'Ausgaben gesamt',
                  'Differenz',
                  'Saldo laufend',
                  'Abschluss',
                ].map((header) => (
                  <th key={header} style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #d1d5db' }}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {getCashbookDetailedSummary().map((month) => (
                <tr key={month.monthKey}>
                  <td style={{ padding: 8, borderBottom: '1px solid #e5e7eb' }}>{getCashMonthLabel(month.monthKey)}</td>
                  <td style={{ padding: 8, borderBottom: '1px solid #e5e7eb' }}>{month.openingBank.toFixed(2)} €</td>
                  <td style={{ padding: 8, borderBottom: '1px solid #e5e7eb' }}>{month.openingCash.toFixed(2)} €</td>
                  <td style={{ padding: 8, borderBottom: '1px solid #e5e7eb' }}>{month.incomeBank.toFixed(2)} €</td>
                  <td style={{ padding: 8, borderBottom: '1px solid #e5e7eb' }}>{month.expenseBank.toFixed(2)} €</td>
                  <td style={{ padding: 8, borderBottom: '1px solid #e5e7eb' }}>{month.incomeCash.toFixed(2)} €</td>
                  <td style={{ padding: 8, borderBottom: '1px solid #e5e7eb' }}>{month.expenseCash.toFixed(2)} €</td>
                  <td style={{ padding: 8, borderBottom: '1px solid #e5e7eb' }}><strong>{month.totalIncome.toFixed(2)} €</strong></td>
                  <td style={{ padding: 8, borderBottom: '1px solid #e5e7eb' }}><strong>{month.totalExpense.toFixed(2)} €</strong></td>
                  <td style={{ padding: 8, borderBottom: '1px solid #e5e7eb', color: month.monthMovement >= 0 ? '#166534' : '#b91c1c' }}>
                    <strong>{month.monthMovement.toFixed(2)} €</strong>
                  </td>
                  <td style={{ padding: 8, borderBottom: '1px solid #e5e7eb' }}><strong>{month.runningBalance.toFixed(2)} €</strong></td>
                  <td style={{ padding: 8, borderBottom: '1px solid #e5e7eb' }}>
                    {isCashMonthClosed(Number(month.monthKey.slice(0, 4)), Number(month.monthKey.slice(5, 7))) ? (
                      <>
                        <strong style={{ color: colors.successText }}>Abgeschlossen</strong>
                        {isAdmin() && (
                          <>
                            <br />
                            <button
                              onClick={() => reopenCashMonth(Number(month.monthKey.slice(0, 4)), Number(month.monthKey.slice(5, 7)))}
                              style={secondaryButtonStyle}
                            >
                              Öffnen
                            </button>
                          </>
                        )}
                      </>
                    ) : (
                      <>
                        <strong style={{ color: colors.red }}>Offen</strong>
                        {isAdmin() && (
                          <>
                            <br />
                            <button
                              onClick={() => closeCashMonth(Number(month.monthKey.slice(0, 4)), Number(month.monthKey.slice(5, 7)))}
                              style={buttonStyle}
                            >
                              Abschließen
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button onClick={exportDetailedCashbookPdf} style={secondaryButtonStyle}>
          Kassabuch Detail PDF
        </button>

        <button onClick={exportTaxAdvisorCsv} style={secondaryButtonStyle}>
          Steuerberater CSV
        </button>

        <button onClick={exportExcelStyleCashbookCsv} style={secondaryButtonStyle}>
          Kassabuch wie Excel CSV
        </button>

        <button onClick={exportExcelStyleCashbookPdf} style={secondaryButtonStyle}>
          Kassabuch wie Excel PDF
        </button>

        <h3 style={headingStyle}>Kategorien-Auswertung</h3>

        <div style={{ ...cardStyle, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 650 }}>
            <thead>
              <tr>
                {['Kategorie', 'Einnahmen', 'Ausgaben', 'Ergebnis', 'Buchungen'].map((header) => (
                  <th key={header} style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #d1d5db' }}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {getCategorySummary().map((item) => (
                <tr key={item.category}>
                  <td style={{ padding: 8, borderBottom: '1px solid #e5e7eb' }}>{item.category}</td>
                  <td style={{ padding: 8, borderBottom: '1px solid #e5e7eb' }}>{item.income.toFixed(2)} €</td>
                  <td style={{ padding: 8, borderBottom: '1px solid #e5e7eb' }}>{item.expense.toFixed(2)} €</td>
                  <td style={{ padding: 8, borderBottom: '1px solid #e5e7eb' }}>
                    <strong>{item.balance.toFixed(2)} €</strong>
                  </td>
                  <td style={{ padding: 8, borderBottom: '1px solid #e5e7eb' }}>{item.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 style={headingStyle}>Kassabuch CSV importieren</h3>

        <p style={mutedTextStyle}>
          Unterstützt dein altes Format mit Einnahme/Ausgabe Bar und E-Banking. Leere Zeilen und Summenzeilen werden ignoriert.
          Wenn oben ein Event ausgewählt ist, werden die importierten Einträge diesem Event zugeordnet.
        </p>

        <input
          type="file"
          accept=".csv,text/csv"
          onChange={handleCashbookFile}
          style={inputStyle}
        />

        {cashbookFileName && (
          <p style={mutedTextStyle}>
            Datei: <strong>{cashbookFileName}</strong>
          </p>
        )}

        {cashbookRows.length > 0 && (
          <>
            <h3 style={headingStyle}>Vorschau: {cashbookRows.length} Kassa-Einträge</h3>

            {cashbookRows.slice(0, 5).map((entry, index) => (
              <div key={`${entry.entry_date}-${entry.description}-${index}`} style={cardStyle}>
                <strong>
                  {entry.type === 'einnahme' ? '+' : '-'} {Number(entry.amount || 0).toFixed(2)} €
                </strong>
                <br />
                {entry.entry_date} · {entry.category}
                <br />
                {entry.description}
              </div>
            ))}

            {cashbookRows.length > 5 && (
              <p style={mutedTextStyle}>
                Es werden nur die ersten 5 Einträge angezeigt. Insgesamt werden {cashbookRows.length} Einträge importiert.
              </p>
            )}

            <button onClick={importCashbookRows} style={buttonStyle} disabled={cashbookImporting}>
              {cashbookImporting ? 'Import läuft...' : 'Kassabuch importieren'}
            </button>

            <button
              onClick={() => {
                setCashbookRows([])
                setCashbookFileName('')
              }}
              style={secondaryButtonStyle}
              disabled={cashbookImporting}
            >
              Import abbrechen
            </button>
          </>
        )}

        <h3 style={{ marginTop: 25 }}>Kassa Suche & Filter</h3>

        <input
          placeholder="Kassa suchen..."
          value={cashSearch}
          onChange={(e) => setCashSearch(e.target.value)}
          style={inputStyle}
        />

        <select value={cashTypeFilter} onChange={(e) => setCashTypeFilter(e.target.value)} style={inputStyle}>
          <option value="alle">Alle Typen</option>
          <option value="einnahme">Einnahmen</option>
          <option value="ausgabe">Ausgaben</option>
        </select>

        <select value={cashCategoryFilter} onChange={(e) => setCashCategoryFilter(e.target.value)} style={inputStyle}>
          <option value="alle">Alle Kategorien</option>
          <option value="mitgliedsbeitrag">Mitgliedsbeitrag</option>
          <option value="pfandbecher">Pfandbecher</option>
          <option value="veranstaltung">Veranstaltung</option>
          <option value="fanartikel">Fanartikel</option>
          <option value="sonstiges">Sonstiges</option>
        </select>

        <button onClick={resetCashFilters} style={buttonStyle}>
          Filter zurücksetzen
        </button>

        <p>
          Angezeigt: <strong>{filteredCashEntries.length}</strong> von {getCashEntriesForSelectedYear().length} Kassa-Einträgen
        </p>

        <CashEntriesList
          filteredCashEntries={filteredCashEntries}
          getPaymentMethodLabel={getPaymentMethodLabel}
          getPaymentMethod={getPaymentMethod}
          getTestCashEntries={getTestCashEntries}
          isCashEntryMonthClosed={isCashEntryMonthClosed}
          getInvoiceById={getInvoiceById}
          exportInvoicePdf={exportInvoicePdf}
          openReceipt={openReceipt}
          editCashEntry={editCashEntry}
          deleteCashEntry={deleteCashEntry}
        />
      </section>
  )
}
