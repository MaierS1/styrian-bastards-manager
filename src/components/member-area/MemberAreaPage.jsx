import {
  cardStyle,
  headingStyle,
  mutedTextStyle,
  sectionStyle,
} from '../../styles/appStyles'

export function MemberAreaPage({ canManageMemberArea }) {
  const canManage = canManageMemberArea()

  return (
    <section style={sectionStyle}>
      <h2 style={headingStyle}>Mitgliederbereich</h2>

      {!canManage && (
        <p style={mutedTextStyle}>Keine Berechtigung fuer die Mitgliederbereich-Verwaltung.</p>
      )}

      {canManage && (
        <div style={cardStyle}>
          <h3 style={headingStyle}>Dokumente</h3>
          <p style={mutedTextStyle}>
            Mitgliederbereich-Dokumente werden im bestehenden Dokumente-Bereich verwaltet.
            Dort koennen hochgeladene Dokumente mit "Im Mitgliederbereich anzeigen",
            "Nur fuer Mitglieder", Kategorie, Sortierung und Aktiv/Inaktiv markiert werden.
          </p>
          <p style={mutedTextStyle}>
            Die separate Tabelle member_documents bleibt aus Kompatibilitaetsgruenden bestehen,
            wird fuer die Dokumentenanzeige im Mitgliederbereich aber nicht mehr verwendet.
          </p>
        </div>
      )}
    </section>
  )
}
