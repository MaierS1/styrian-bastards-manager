import {
  buttonStyle,
  cardStyle,
  headingStyle,
  inputStyle,
  mutedTextStyle,
  secondaryButtonStyle,
  sectionStyle,
} from '../../styles/appStyles'

export function MembersCsvImport({
  csvRows,
  csvFileName,
  csvImporting,
  getRoleLabel,
  handleCsvFile,
  importCsvMembers,
  setCsvRows,
  setCsvFileName,
}) {
  return (
    <section style={sectionStyle}>
      <h2 style={headingStyle}>CSV Mitglieder-Import</h2>

      <p style={mutedTextStyle}>
        CSV-Datei mit Spalten wie Vorname, Nachname, E-Mail, Telefon, Mitgliedsart, Straße, PLZ, Ort,
        Geburtsdatum und Kleidergröße hochladen. Trennzeichen Komma oder Semikolon funktionieren.
      </p>

      <input
        type="file"
        accept=".csv,text/csv"
        onChange={handleCsvFile}
        style={inputStyle}
      />

      {csvFileName && (
        <p style={mutedTextStyle}>
          Datei: <strong>{csvFileName}</strong>
        </p>
      )}

      {csvRows.length > 0 && (
        <>
          <h3 style={headingStyle}>Vorschau: {csvRows.length} Mitglieder</h3>

          {csvRows.slice(0, 5).map((member, index) => (
            <div key={`${member.first_name}-${member.last_name}-${index}`} style={cardStyle}>
              <strong>
                {member.first_name} {member.last_name}
              </strong>
              <br />
              {member.email || '-'}
              <br />
              Mitgliedsart: {member.member_type}
              <br />
              Funktion: {getRoleLabel(member.role || 'mitglied')}
              <br />
              Adresse: {member.street || '-'}, {member.postal_code || '-'} {member.city || '-'}
            </div>
          ))}

          {csvRows.length > 5 && (
            <p style={mutedTextStyle}>
              Es werden nur die ersten 5 Zeilen angezeigt. Insgesamt werden {csvRows.length} Mitglieder importiert.
            </p>
          )}

          <button onClick={importCsvMembers} style={buttonStyle} disabled={csvImporting}>
            {csvImporting ? 'Import läuft...' : 'CSV Mitglieder importieren'}
          </button>

          <button
            onClick={() => {
              setCsvRows([])
              setCsvFileName('')
            }}
            style={secondaryButtonStyle}
            disabled={csvImporting}
          >
            Import abbrechen
          </button>
        </>
      )}
    </section>
  )
}
