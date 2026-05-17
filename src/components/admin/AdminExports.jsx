import { headingStyle, sectionStyle, secondaryButtonStyle } from '../../styles/appStyles'

export function AdminExports({
  exportMembersPdf,
  exportAllMemberCardsPdf,
  exportCashPdf,
  exportDetailedCashbookPdf,
  exportTaxAdvisorCsv,
  exportTaxAdvisorProCsv,
  exportCategorySummaryCsv,
  exportExcelStyleCashbookCsv,
  exportExcelStyleCashbookPdf,
  exportOpenFeesPdf,
  exportCheckinsPdf,
}) {
  return (
    <section style={sectionStyle}>
      <h2 style={headingStyle}>Schnellexporte</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <button onClick={exportMembersPdf} style={secondaryButtonStyle}>
          Mitgliederliste PDF
        </button>

        <button onClick={exportAllMemberCardsPdf} style={secondaryButtonStyle}>
          Mitgliedsausweise Druckbogen
        </button>
        <button onClick={exportCashPdf} style={secondaryButtonStyle}>
          Kassabuch PDF
        </button>
        <button onClick={exportDetailedCashbookPdf} style={secondaryButtonStyle}>
          Kassabuch Detail PDF
        </button>

        <button onClick={exportTaxAdvisorCsv} style={secondaryButtonStyle}>
          Steuerberater CSV
        </button>

        <button onClick={exportTaxAdvisorProCsv} style={secondaryButtonStyle}>
          Steuerberater PRO CSV
        </button>

        <button onClick={exportCategorySummaryCsv} style={secondaryButtonStyle}>
          Kategorien-Auswertung CSV
        </button>

        <button onClick={exportExcelStyleCashbookCsv} style={secondaryButtonStyle}>
          Kassabuch wie Excel CSV
        </button>

        <button onClick={exportExcelStyleCashbookPdf} style={secondaryButtonStyle}>
          Kassabuch wie Excel PDF
        </button>
        <button onClick={exportOpenFeesPdf} style={secondaryButtonStyle}>
          Offene Beiträge PDF
        </button>
        <button onClick={exportCheckinsPdf} style={secondaryButtonStyle}>
          Anwesenheitsliste PDF
        </button>
      </div>
    </section>
  )
}
